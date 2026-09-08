import {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  protocol,
  net,
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
import { pathToFileURL } from "node:url";
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
const probe = async (file: string) => {
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
  protocol.handle("refract-media", (request) => {
    const id = new URL(request.url).pathname.slice(1),
      file = media.get(id);
    return file
      ? net.fetch(pathToFileURL(file).toString())
      : new Response("Not found", { status: 404 });
  });
  win = new BrowserWindow({
    width: 1320,
    height: 880,
    minWidth: 1000,
    minHeight: 660,
    title: "Refract",
    backgroundColor: "#19191c",
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
  const send = (action: string) => win.webContents.send("menu-action", action);
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
            click: () => send("undo"),
          },
          {
            label: "Redo",
            accelerator: "CmdOrCtrl+Shift+Z",
            click: () => send("redo"),
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
          { role: "reload" },
          { role: "toggleDevTools" },
          { role: "togglefullscreen" },
        ],
      },
      { role: "windowMenu" },
    ]),
  );
});
handle("import-video", async () => {
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
handle("open-project", async () => {
  const chosen = await dialog.showOpenDialog(win, {
    properties: ["openDirectory"],
  });
  if (chosen.canceled) return null;
  const dir = chosen.filePaths[0],
    project = JSON.parse(
      await fs.readFile(path.join(dir, "project.json"), "utf8"),
    );
  if (project.version !== 1 || !project.source?.file)
    throw Error("Unsupported Refract project.");
  const file = inside(dir, project.source.file);
  await fs.access(file);
  projectDir = dir;
  return { project, url: expose(file) };
});
handle("save-project", async (project: Project, saveAs = false) => {
  if (!projectDir) throw Error("Import a video first.");
  if (saveAs) {
    const chosen = await dialog.showSaveDialog(win, {
      defaultPath: project.title + ".refract",
      title: "Save project as",
    });
    if (chosen.canceled) return null;
    const dest = chosen.filePath!;
    if (path.resolve(dest) !== path.resolve(projectDir)) {
      try {
        await fs.access(dest);
        throw Error(
          "Choose a new project name. Existing folders will not be overwritten.",
        );
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
      }
      await fs.cp(projectDir, dest, { recursive: true });
      projectDir = dest;
    }
  }
  const manifest = path.join(projectDir, "project.json"),
    tmp = manifest + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(project, null, 2));
  await fs.rename(tmp, manifest);
  return projectDir;
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
      ![24, 30, 60].includes(fps) ||
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
    const args = [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-f",
      "image2pipe",
      "-framerate",
      String(fps),
      "-vcodec",
      "png",
      "-i",
      "pipe:0",
    ];
    let audio =
      project.source.hasAudio && !project.appearance.muted && format === "mp4";
    if (audio) {
      args.push("-i", inside(projectDir, project.source.file));
      const filters = project.segments.map((s, i) => {
        if (
          !Number.isFinite(s.start) ||
          !Number.isFinite(s.end) ||
          !Number.isFinite(s.speed) ||
          s.speed < 0.1 ||
          s.speed > 16
        )
          throw Error("Invalid segment.");
        let speed = s.speed,
          at = [];
        while (speed > 2) {
          at.push("atempo=2");
          speed /= 2;
        }
        while (speed < 0.5) {
          at.push("atempo=0.5");
          speed /= 0.5;
        }
        at.push("atempo=" + speed);
        return `[1:a]atrim=start=${s.start / 1000}:end=${s.end / 1000},asetpts=PTS-STARTPTS,${at.join(",")},volume=${Math.max(0, Math.min(2, project.appearance.volume))}[a${i}]`;
      });
      filters.push(
        project.segments.map((_, i) => `[a${i}]`).join("") +
          `concat=n=${project.segments.length}:v=0:a=1[aout]`,
      );
      args.push(
        "-filter_complex",
        filters.join(";"),
        "-map",
        "0:v",
        "-map",
        "[aout]",
      );
    }
    if (format === "mp4")
      args.push(
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "18",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        ...(audio ? ["-c:a", "aac", "-b:a", "192k"] : []),
      );
    else
      args.push(
        "-vf",
        "split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse",
        "-loop",
        "0",
      );
    args.push(temp);
    const child = spawn(tool("ffmpeg"), args, {
      stdio: ["pipe", "ignore", "pipe"],
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
    current.done.catch(() => {});
    child.stderr!.on("data", (d) => {
      current.error = (current.error + d.toString()).slice(-4000);
    });
    job = current;
    return current.id;
  },
);
handle("export-frame", async (id: string, data: ArrayBuffer) => {
  if (!job || job.id !== id) throw Error("Export is no longer active.");
  const child = job.child;
  if (child.exitCode !== null) throw Error(job.error || "Encoder stopped.");
  await new Promise<void>((resolve, reject) =>
    child.stdin!.write(Buffer.from(data), (error) =>
      error ? reject(error) : resolve(),
    ),
  );
});
handle("export-finish", async (id: string) => {
  if (!job || job.id !== id) throw Error("Export is no longer active.");
  const current = job;
  try {
    current.child.stdin!.end();
    await current.done;
    const info = await fs.stat(current.temp);
    if (info.size === 0) throw Error("Encoder created an empty file.");
    await fs.rename(current.temp, current.dest);
    return current.dest;
  } finally {
    if (job === current) job = null;
  }
});
handle("export-cancel", async () => {
  if (!job) return;
  const current = job;
  job = null;
  current.child.kill("SIGTERM");
  try {
    await current.done;
  } catch {}
  await fs.rm(current.temp, { force: true });
});
app.on("window-all-closed", () => {
  job?.child.kill();
  app.quit();
});
