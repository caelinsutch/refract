import { Readable, type Writable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { alignMicrophoneArgs } from "./microphone-audio.cjs";
import {
  audioExtensions,
  listAudioLibrary,
  resolveLibraryTrack,
} from "./audio-library.cjs";
import { setupEditorLifecycle } from "./editor-lifecycle.cjs";
import { setupCropWindow } from "./crop-window.cjs";
import { setupProjectGuard } from "./project-guard.cjs";
import { setupRecorder } from "./recorder.cjs";
import {
  app,
  BrowserWindow,
  nativeTheme,
  shell,
  ipcMain,
  dialog,
  protocol,
  Menu,
  type IpcMainInvokeEvent,
} from "electron";
import type { Project } from "../src/core/project.js" with {
  "resolution-mode": "import",
};
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import {
  spawn,
  execFile,
  type ChildProcessWithoutNullStreams,
} from "node:child_process";
import { promisify } from "node:util";
import { serveMediaFile } from "./media.cjs";
const run = promisify(execFile);
const media = new Map<string, string>();
let win: BrowserWindow;
let projectDir: string | null = null;
type ExportJob = {
  id: string;
  child: ReturnType<typeof spawn>;
  temp: string;
  dest: string;
  error: string;
  cancelled: boolean;
  done: Promise<void>;
};
let job: ExportJob | null = null;
const tool = (name: string) =>
  process.env[`REFRACT_${name.toUpperCase()}`] ||
  (["darwin"].includes(process.platform) ? `/opt/homebrew/bin/${name}` : name);
protocol.registerSchemesAsPrivileged([
  {
    scheme: "refract-media",
    privileges: {
      standard: true,
      secure: true,
      stream: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);
const expose = (file: string) => {
  const id = crypto.randomUUID();
  media.set(id, file);
  return `refract-media://media/${id}`;
};
const inside = (base: string, relative: string) => {
  const resolved = path.resolve(base, relative);
  if (!resolved.startsWith(path.resolve(base) + path.sep))
    throw Error("Invalid project media path.");
  return resolved;
};
const probe = async (file: string): Promise<Project["source"]> => {
  const { stdout } = await run(tool("ffprobe"), [
    "-v",
    "error",
    "-show_format",
    "-show_streams",
    "-of",
    "json",
    file,
  ]);
  const info = JSON.parse(stdout) as {
      format: { duration: string };
      streams: { codec_type: string; width: number; height: number }[];
    },
    v = info.streams.find((s) => s.codec_type === "video");
  if (!v) throw Error("This file does not contain video.");
  return {
    file: "media/source" + path.extname(file),
    duration: Number(info.format.duration) * 1000,
    width: v.width,
    height: v.height,
    hasAudio: info.streams.some((s) => s.codec_type === "audio"),
  };
};
const check = (e: IpcMainInvokeEvent) => {
  if (e.sender !== win?.webContents) throw Error("Unknown sender");
};
const handle = (name: string, fn: (...args: any[]) => unknown) =>
  ipcMain.handle(name, async (e, ...args) => {
    check(e);
    return fn(...args);
  });
app.whenReady().then(() => {
  // Keep native materials, dialogs, and every renderer's media query in sync
  // with macOS, including appearance changes while a window is open.
  nativeTheme.themeSource = "system";
  protocol.handle("refract-media", async (request) => {
    const id = new URL(request.url).pathname.slice(1),
      file = media.get(id);
    if (!file) return new Response("Not found", { status: 404 });
    const origin = request.headers.get("Origin") ?? "null";
    if (
      !["null", "http://127.0.0.1:5173", "http://localhost:5173"].includes(
        origin,
      )
    )
      return new Response("Forbidden", { status: 403 });
    return serveMediaFile(file, request, origin);
  });
  win = new BrowserWindow({
    width: 1320,
    height: 880,
    minWidth: 1000,
    minHeight: 660,
    title: "Refract",
    show: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#08090d" : "#e9ebef",
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 17, y: 18 },
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("will-navigate", (e) => e.preventDefault());
  if (process.env.REFRACT_DEV_URL) win.loadURL(process.env.REFRACT_DEV_URL);
  else win.loadFile(path.join(__dirname, "../../dist/index.html"));
  nativeTheme.on("updated", () => {
    if (!win.isDestroyed())
      win.setBackgroundColor(
        nativeTheme.shouldUseDarkColors ? "#08090d" : "#e9ebef",
      );
  });
  setupCropWindow(win);
  const send = (action: string) => win.webContents.send("menu-action", action);
  const editAction = (action: "undo" | "redo") => {
    const focused = BrowserWindow.getFocusedWindow();
    if (!focused || focused.isDestroyed()) return;
    if (focused !== win) focused.webContents[action]();
    else send(action);
  };
  handle("edit-text", (action: string) => {
    if (action === "undo") win.webContents.undo();
    else if (action === "redo") win.webContents.redo();
    else throw Error("Unsupported text editing action");
  });

  const guardProject = setupProjectGuard(win);
  const recorder = setupRecorder(
    win,
    async (dir, choice) => {
      const raw = path.join(dir, "media/screen.mp4");
      const mic = path.join(dir, "media/microphone.mov");
      const file = raw;
      let microphoneAudio: Project["microphoneAudio"];
      if (choice.microphoneId) {
        const { stdout } = await run(
          tool("ffprobe"),
          [
            "-v",
            "error",
            "-show_entries",
            "stream=codec_type:format=duration",
            "-of",
            "json",
            mic,
          ],
          { timeout: 15000 },
        );
        const info = JSON.parse(stdout);
        if (
          !info.streams?.some(
            (stream: { codec_type: string }) => stream.codec_type === "audio",
          ) ||
          !(Number(info.format?.duration) > 0)
        )
          throw Error(
            "The microphone recording could not be read. The original recording files remain in the project folder.",
          );
        const aligned = path.join(dir, "media/microphone.wav");
        await run(tool("ffmpeg"), alignMicrophoneArgs(mic, aligned));
        microphoneAudio = {
          file: "media/microphone.wav",
          volume: 1,
          muted: false,
        };
      }
      const source = await probe(file);
      source.file = "media/" + path.basename(file);
      let cameraUrl: string | undefined;
      if (choice.cameraId) {
        const cameraFile = path.join(dir, "media/camera.mp4");
        const info = await probe(cameraFile);
        source.camera = {
          file: "media/camera.mp4",
          width: info.width,
          height: info.height,
        };
        cameraUrl = expose(cameraFile);
      }
      const cursor = JSON.parse(
        await fs.readFile(path.join(dir, "media/cursor.json"), "utf8"),
      );
      let keys = [];
      try {
        keys = JSON.parse(
          await fs.readFile(path.join(dir, "media/keyboard.json"), "utf8"),
        );
        if (!Array.isArray(keys))
          throw Error("Invalid recorded keyboard data.");
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
      const { recordedProject } = await import("../src/core/recording.js");
      const project = recordedProject(
        source,
        cursor,
        "Recording " + new Date().toLocaleString(),
        keys,
        { automaticZooms: choice.automaticZooms },
      );
      if (microphoneAudio) project.microphoneAudio = microphoneAudio;
      const { writeProjectManifest } =
        await import("../src/core/project-storage.js");
      await writeProjectManifest(dir, project);
      app.addRecentDocument(dir);
      if (!(await guardProject())) {
        const decision = await dialog.showMessageBox(win, {
          type: "info",
          message: "Your recording is saved.",
          detail:
            "The current project is still open. You can open the new recording later from its project folder.",
          buttons: ["Keep Editing", "Show Recording in Finder"],
          defaultId: 0,
          cancelId: 0,
        });
        if (decision.response === 1) shell.showItemInFolder(dir);
        return false;
      }
      projectDir = dir;
      win.webContents.send("recording-finished", {
        project,
        source,
        url: expose(file),
        cursor,
        cameraUrl,
        title: "Recording " + new Date().toLocaleString(),
      });
    },
    () => send("import"),
    guardProject,
  );
  // Keep the editor alive when its window closes so the recorder and menu
  // callbacks never target a destroyed webContents. Dock activation restores UI.
  setupEditorLifecycle(app, win, recorder.prepareQuit, guardProject);
  app.on("activate", () => {
    if (win.isVisible()) {
      win.show();
      win.focus();
    } else recorder.show();
  });
  recorder.show();

  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: "Refract",
        submenu: [
          { role: "about" },
          { type: "separator" },
          { role: "hide" },
          { role: "hideOthers" },
          { role: "unhide" },
          { type: "separator" },
          { role: "quit" },
        ],
      },
      {
        label: "File",
        submenu: [
          {
            label: "New recording",
            accelerator: "CmdOrCtrl+N",
            click: () => recorder.show(),
          },
          {
            label: "Create project from video…",
            accelerator: "CmdOrCtrl+I",
            click: () => send("import"),
          },
          {
            label: "Open project…",
            accelerator: "CmdOrCtrl+O",
            click: () => send("open"),
          },
          {
            label: "Save",
            accelerator: "CmdOrCtrl+S",
            click: () => send("save"),
          },
          {
            label: "Save As…",
            accelerator: "CmdOrCtrl+Shift+S",
            click: () => send("saveAs"),
          },
          { type: "separator" },
          {
            label: "Export…",
            accelerator: "CmdOrCtrl+E",
            click: () => send("export"),
          },
          { role: "close" },
        ],
      },
      {
        label: "Edit",
        submenu: [
          {
            label: "Undo",
            accelerator: "CmdOrCtrl+Z",
            click: () => editAction("undo"),
          },
          {
            label: "Redo",
            accelerator: "CmdOrCtrl+Shift+Z",
            click: () => editAction("redo"),
          },
          { type: "separator" },
          { role: "cut" },
          { role: "copy" },
          { role: "paste" },
          { role: "selectAll" },
        ],
      },
      {
        label: "View",
        submenu: [
          {
            label: "Command menu…",
            accelerator: "CmdOrCtrl+K",
            click: () => send("commands"),
          },
          { type: "separator" },
          { role: "reload" },
          { role: "toggleDevTools" },
          { role: "togglefullscreen" },
        ],
      },
      { role: "windowMenu" },
    ]),
  );
});
handle("confirm-unsaved", async (title: string) => {
  win.show();
  win.focus();
  const result = await dialog.showMessageBox(win, {
    type: "question",
    message: `Save changes to “${String(title).slice(0, 200)}”?`,
    detail: "Your changes will be lost if you don't save them.",
    buttons: ["Save", "Don't Save", "Cancel"],
    defaultId: 0,
    cancelId: 2,
    noLink: true,
  });
  return ["save", "discard", "cancel"][result.response] ?? "cancel";
});
handle("import-video", async () => {
  win.show();
  win.focus();
  const chosen = await dialog.showOpenDialog(win, {
    properties: ["openFile"],
    filters: [{ name: "Video", extensions: ["mp4", "mov", "webm", "m4v"] }],
  });
  if (chosen.canceled) return null;
  const file = chosen.filePaths[0],
    source = await probe(file);
  const dir = path.join(
    app.getPath("userData"),
    "projects",
    crypto.randomUUID() + ".refract",
  );
  await fs.mkdir(path.join(dir, "media"), { recursive: true });
  await fs.copyFile(file, path.join(dir, source.file));
  projectDir = dir;
  return {
    source,
    url: expose(path.join(dir, source.file)),
    title: path.basename(file, path.extname(file)),
  };
});
handle("project-audio-url", async (file: string) => {
  if (!projectDir || typeof file !== "string")
    throw Error("Open a project first.");
  const resolved = inside(projectDir, file);
  await fs.access(resolved);
  return expose(resolved);
});
const audioLibraryDirectory = () =>
  path.join(app.getPath("userData"), "audio-library");
handle("audio-library-list", () => listAudioLibrary(audioLibraryDirectory()));
handle("audio-library-open", async () => {
  const directory = audioLibraryDirectory();
  await fs.mkdir(directory, { recursive: true });
  const error = await shell.openPath(directory);
  if (error) throw Error(error);
});
handle("audio-library-import", async (name: unknown) => {
  if (!projectDir) throw Error("Open a video first.");
  const directory = projectDir;
  const source = await resolveLibraryTrack(audioLibraryDirectory(), name);
  if (projectDir !== directory) return null;
  return importAudioAsset(source, directory);
});
handle("import-background-audio", async () => {
  if (!projectDir) throw Error("Open a video first.");
  const directory = projectDir;
  const selected = await dialog.showOpenDialog(win, {
    title: "Add background audio",
    properties: ["openFile"],
    filters: [{ name: "Audio", extensions: audioExtensions }],
  });
  if (selected.canceled || projectDir !== directory) return null;
  return importAudioAsset(selected.filePaths[0], directory);
});
async function importAudioAsset(source: string, directory: string) {
  const { stdout } = await run(
    tool("ffprobe"),
    [
      "-v",
      "error",
      "-select_streams",
      "a:0",
      "-show_entries",
      "stream=duration:format=duration",
      "-of",
      "json",
      source,
    ],
    { timeout: 15000 },
  );
  const info = JSON.parse(stdout);
  const duration =
    (Number(info.streams?.[0]?.duration) || Number(info.format?.duration)) *
    1000;
  if (!info.streams?.length || !Number.isFinite(duration) || duration <= 0)
    throw Error("Choose a file with a playable audio track.");
  if (projectDir !== directory) return null;
  const file =
    "media/" + crypto.randomUUID() + path.extname(source).toLowerCase();
  await fs.mkdir(path.join(directory, "media"), { recursive: true });
  await fs.copyFile(source, inside(directory, file));
  if (projectDir !== directory) return null;
  return {
    file,
    name: path.basename(source),
    duration,
    volume: 0.05,
    muted: false,
  };
}

handle("open-project", async () => {
  win.show();
  win.focus();
  const chosen = await dialog.showOpenDialog(win, {
    properties: ["openDirectory", "treatPackageAsDirectory"],
  });
  if (chosen.canceled) return null;
  const dir = chosen.filePaths[0];
  const { readProjectManifest } =
    await import("../src/core/project-storage.js");
  const { project, recovered } = await readProjectManifest(dir);
  if (recovered) {
    const decision = await dialog.showMessageBox(win, {
      type: "warning",
      message: "Recover this project from its backup?",
      detail:
        "The current project data could not be opened. The backup contains the previous saved version. Recent edits may be missing. Save after reviewing it to restore the project.",
      buttons: ["Recover", "Cancel"],
      defaultId: 0,
      cancelId: 1,
    });
    if (decision.response !== 0) return null;
  }
  const file = inside(dir, project.source.file);
  await fs.access(file);
  projectDir = dir;
  return {
    project,
    url: expose(file),
    cameraUrl: project.source.camera
      ? expose(inside(dir, project.source.camera.file))
      : undefined,
  };
});
handle("save-project", async (project: Project, saveAs = false) => {
  if (!projectDir) throw Error("Import a video first.");
  const originalDirectory = projectDir;
  let destination = originalDirectory;
  const { validateProject } = await import("../src/core/project.js");
  project = validateProject(project);
  if (saveAs) {
    const chosen = await dialog.showSaveDialog(win, {
      defaultPath: project.title + ".refract",
      title: "Save project as",
    });
    if (chosen.canceled) return null;
    const dest = chosen.filePath!;
    if (path.resolve(dest) !== path.resolve(originalDirectory)) {
      try {
        await fs.access(dest);
        throw Error(
          "Choose a new project name. Existing folders will not be overwritten.",
        );
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
      }
      await fs.cp(originalDirectory, dest, { recursive: true });
      destination = dest;
    }
  }
  const { writeProjectManifest } =
    await import("../src/core/project-storage.js");
  await writeProjectManifest(destination, project);
  if (projectDir === originalDirectory) projectDir = destination;
  return destination;
});
handle(
  "export-start",
  async ({
    project,
    width,
    height,
    fps,
    format,
  }: {
    project: Project;
    width: number;
    height: number;
    fps: number;
    format: string;
  }) => {
    if (job) throw Error("An export is already running.");
    if (!projectDir) throw Error("Import a video first.");
    if (
      !(format === "gif" ? [24, 30, 50] : [24, 30, 60]).includes(fps) ||
      !["mp4", "gif"].includes(format) ||
      ![width, height].every((n) => Number.isInteger(n) && n > 0 && n <= 4096)
    )
      throw Error("Invalid export settings.");
    const pick = await dialog.showSaveDialog(win, {
      defaultPath: project.title + "." + format,
      filters: [{ name: format.toUpperCase(), extensions: [format] }],
    });
    if (pick.canceled) return null;
    const temp = pick.filePath! + "." + crypto.randomUUID() + ".tmp." + format;
    const { exportArgs } = await import("../src/core/export.js");
    const args = exportArgs(
      project,
      inside(projectDir, project.source.file),
      temp,
      fps,
      format as "mp4" | "gif",
      project.backgroundAudio
        ? inside(projectDir, project.backgroundAudio.file)
        : undefined,
      project.microphoneAudio
        ? inside(projectDir, project.microphoneAudio.file)
        : undefined,
      "pipe:3",
    );
    const child = spawn(tool("ffmpeg"), args, {
      stdio: ["pipe", "ignore", "pipe", "pipe"],
    });
    const current: ExportJob = {
      id: crypto.randomUUID(),
      child,
      temp,
      dest: pick.filePath!,
      error: "",
      cancelled: false,
      done: Promise.resolve(),
    };
    current.done = new Promise<void>((resolve, reject) => {
      child.on("error", reject);
      child.on("close", (code) =>
        code === 0
          ? resolve()
          : reject(Error(current.error || "Export process stopped.")),
      );
    });
    const clicks =
      format === "mp4" &&
      project.appearance.clickSound !== "none" &&
      (project.appearance.clickSoundVolume ?? 0) > 0;
    const clickPipe = child.stdio[3] as Writable;
    clickPipe.on("error", () => {});
    if (clicks) {
      const audioDone = (async () => {
        const { clickSoundBank, clickAudioChunk } =
          await import("../src/core/click-audio.js");
        const { clickSoundCues } = await import("../src/core/click-sounds.js");
        const { duration } = await import("../src/core/project.js");
        const bank = clickSoundBank(
          project.appearance.clickSound as "soft" | "mechanical",
        );
        const cues = clickSoundCues(project),
          frames = Math.ceil(duration(project) * 48);
        function* chunks() {
          for (let start = 0; start < frames; start += 48000) {
            const data = clickAudioChunk(
              cues,
              bank,
              48000,
              start,
              Math.min(48000, frames - start),
              project.appearance.clickSoundVolume ?? 0.25,
            );
            yield Buffer.from(data.buffer, data.byteOffset, data.byteLength);
          }
        }
        await pipeline(Readable.from(chunks()), clickPipe);
      })();
      current.done = Promise.all([current.done, audioDone]).then(() => {});
    } else clickPipe.end();
    current.done.catch(() => {});
    // A failed/cancelled pipe must not become an uncaught main-process error.
    child.stdin!.on("error", () => {});
    child.stderr!.on("data", (d) => {
      current.error = (current.error + d.toString()).slice(-4000);
    });
    job = current;
    return current.id;
  },
);
let transcription: AbortController | null = null;
handle("captions-generate", async (project: Project, locale: string) => {
  if (transcription) throw Error("Caption generation is already running.");
  if (!projectDir) throw Error("Open a video first.");
  if (!project.source.hasAudio && !project.microphoneAudio)
    throw Error("This video has no audio to transcribe.");
  if (
    typeof locale !== "string" ||
    !/^[a-z]{2,3}[-_][A-Za-z]{2,4}$/.test(locale)
  )
    throw Error("Choose a supported caption language.");
  const source = inside(
    projectDir,
    project.microphoneAudio?.file ?? project.source.file,
  );
  const controller = new AbortController();
  transcription = controller;
  let temp: string | undefined;
  try {
    temp = await fs.mkdtemp(
      path.join(app.getPath("temp"), "refract-captions-"),
    );
    const audio = path.join(temp, "speech.wav");
    await run(
      tool("ffmpeg"),
      [
        "-v",
        "error",
        "-y",
        "-i",
        source,
        "-vn",
        "-ac",
        "1",
        "-ar",
        "16000",
        audio,
      ],
      { signal: controller.signal, timeout: 300000 },
    );
    const helper = path.join(
      __dirname,
      "../../native/.build/refract-transcribe",
    );
    const { stdout } = await run(helper, [audio, locale], {
      signal: controller.signal,
      timeout: 1200000,
      maxBuffer: 32 * 1024 * 1024,
    });
    const result = JSON.parse(stdout.trim().split("\n").at(-1)!);
    if (!Array.isArray(result.words))
      throw Error(result.error || "No transcript returned.");
    const { captionsFromWords } = await import("../src/core/captions.js");
    return {
      captions: captionsFromWords(result.words, project.source.duration),
      locale: result.locale,
    };
  } catch (error) {
    if (controller.signal.aborted) throw Error("Caption generation cancelled.");
    throw error;
  } finally {
    if (transcription === controller) transcription = null;
    if (temp) await fs.rm(temp, { recursive: true, force: true });
  }
});
handle("captions-cancel", () => transcription?.abort());
app.on("will-quit", () => transcription?.abort());

handle("export-frame", async (id: string, data: ArrayBuffer) => {
  if (!job || job.id !== id) throw Error("Export is no longer active.");
  if (job.cancelled) throw Error("Export cancelled.");
  const { writeEncoderFrame } = await import("../src/core/export-process.js");
  await writeEncoderFrame(job.child, Buffer.from(data));
});
handle("export-finish", async (id: string) => {
  if (!job || job.id !== id) throw Error("Export is no longer active.");
  const current = job;
  try {
    current.child.stdin!.end();
    const { finishExport } = await import("../src/core/export-job.js");
    const { waitForEncoderFinalization } =
      await import("../src/core/export-process.js");
    return await finishExport(
      current,
      waitForEncoderFinalization(current.child, current.done, current.temp),
    );
  } finally {
    if (job === current) job = null;
  }
});
handle("export-cancel", async () => {
  if (!job) return;
  const current = job;
  current.cancelled = true;
  const { stopEncoder } = await import("../src/core/export-process.js");
  await stopEncoder(current.child);
  await fs.rm(current.temp, { force: true });
  if (job === current) job = null;
});
app.on("window-all-closed", () => {
  job?.child.kill();
  app.quit();
});
