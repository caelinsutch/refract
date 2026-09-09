import { createCountdownWindow } from "./countdown-window.cjs";
import { createDisplayPicker } from "./display-picker.cjs";
import { recorderSourceItems } from "./recorder-source-menu.cjs";
import { countdownDuration, countdownRemaining } from "./countdown.cjs";
import {
  installRecorderGlass,
  updateRecorderPanelGlass,
  recorderSymbols,
} from "./recorder-glass.cjs";
import {
  readRecordingDestination,
  saveRecordingDestination,
} from "./recording-destination.cjs";
import {
  app,
  BrowserWindow,
  ipcMain,
  screen,
  globalShortcut,
  shell,
  systemPreferences,
  dialog,
  Menu,
} from "electron";
import path from "node:path";
import fs from "node:fs/promises";
import { readFileSync, writeFileSync, renameSync } from "node:fs";
import {
  recorderBounds,
  readRecorderPosition,
  rememberRecorderPosition,
  type RecorderPosition,
} from "./recorder-position.cjs";
import {
  spawn,
  execFile,
  type ChildProcessWithoutNullStreams,
} from "node:child_process";
import { promisify } from "node:util";
import crypto from "node:crypto";
import type {
  RecorderSourceMenu,
  RecorderSourceSelection,
  CaptureChoice,
  CaptureSources,
  RecorderState,
  RecorderInputMenu,
  RecorderInputSelection,
} from "../src/core/recorder.js" with { "resolution-mode": "import" };
const run = promisify(execFile);
export function setupRecorder(
  editor: BrowserWindow,
  onFinished: (dir: string, choice: CaptureChoice) => Promise<void | boolean>,
  onImport: () => void,
  beforeStart: () => Promise<boolean>,
) {
  let bar: BrowserWindow | null = null,
    areaWindow: BrowserWindow | null = null,
    child: ChildProcessWithoutNullStreams | null = null,
    countdownTimer: NodeJS.Timeout | null = null,
    timer: NodeJS.Timeout | null = null,
    started = 0,
    pauseStarted = 0,
    pausedTotal = 0,
    choice: CaptureChoice | null = null,
    areaDisplayId: number | undefined;
  let quitAfterCapture = false;
  let stopWhenStarted = false;
  let checkingStart = false;
  let startGeneration = 0;
  let state: RecorderState = { phase: "idle", countdown: 3, elapsed: 0 };
  const destinationFile = path.join(
    app.getPath("userData"),
    "recording-directory.json",
  );
  let recordingDirectory = readRecordingDestination(
    destinationFile,
    path.join(app.getPath("userData"), "projects"),
  );
  let choosingDirectory = false;
  const positionFile = path.join(
    app.getPath("userData"),
    "recorder-position.json",
  );
  let position: RecorderPosition | undefined;
  let positionTimer: ReturnType<typeof setTimeout> | undefined;
  let expanded = false;
  let positioning = false;
  let lastBounds: Electron.Rectangle | undefined;
  try {
    position = readRecorderPosition(
      JSON.parse(readFileSync(positionFile, "utf8")),
    );
  } catch {
    /* First launch or invalid preferences use the default position. */
  }
  function savePosition() {
    if (positionTimer) clearTimeout(positionTimer);
    positionTimer = undefined;
    if (!position) return;
    try {
      writeFileSync(positionFile + ".tmp", JSON.stringify(position));
      renameSync(positionFile + ".tmp", positionFile);
    } catch {
      /* Position persistence must not interrupt a recording. */
    }
  }
  const executable = path.join(
    __dirname,
    "../../native/.build/refract-capture",
  );
  const countdownWindow = createCountdownWindow(stop);
  function send() {
    if (state.phase === "countdown") countdownWindow.update(state.countdown);
    bar?.webContents.send("recorder-state", state);
  }
  function resize(nextExpanded: boolean) {
    expanded = nextExpanded;
    if (!bar) return;
    const next = recorderBounds(
      position,
      screen.getAllDisplays(),
      screen.getPrimaryDisplay(),
      expanded,
    );
    const current = bar.getBounds();
    if (
      next.x === current.x &&
      next.y === current.y &&
      next.width === current.width &&
      next.height === current.height
    )
      return;
    positioning = true;
    bar.setBounds(next);
    lastBounds = bar.getBounds();
    positioning = false;
  }
  function loadWindow(
    window: BrowserWindow,
    hash: string,
    nativeGlass = false,
  ) {
    if (process.env.REFRACT_DEV_URL)
      void window.loadURL(
        process.env.REFRACT_DEV_URL +
          (nativeGlass ? "/?nativeGlass=1#" : "/#") +
          hash,
      );
    else
      void window.loadFile(path.join(__dirname, "../../dist/index.html"), {
        hash,
        query: nativeGlass ? { nativeGlass: "1" } : undefined,
      });
  }
  const displayPicker = createDisplayPicker();
  function show() {
    if (!bar) {
      expanded = false;
      bar = new BrowserWindow({
        ...recorderBounds(
          position,
          screen.getAllDisplays(),
          screen.getPrimaryDisplay(),
          false,
        ),
        frame: false,
        transparent: true,
        resizable: false,
        movable: true,
        hasShadow: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        title: "Refract — Record",
        webPreferences: {
          preload: path.join(__dirname, "preload.cjs"),
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true,
        },
      });
      bar.setAlwaysOnTop(true, "floating", 2);
      bar.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      lastBounds = bar.getBounds();
      bar.on("moved", () => {
        if (!bar || positioning) return;
        const bounds = bar.getBounds();
        if (
          lastBounds &&
          bounds.x === lastBounds.x &&
          bounds.y === lastBounds.y &&
          bounds.width === lastBounds.width &&
          bounds.height === lastBounds.height
        )
          return;
        lastBounds = bounds;
        position = rememberRecorderPosition(
          bounds,
          screen.getDisplayMatching(bounds),
        );
        if (positionTimer) clearTimeout(positionTimer);
        positionTimer = setTimeout(savePosition, 300);
      });
      bar.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
      bar.webContents.on("will-navigate", (e) => e.preventDefault());
      bar.on("closed", () => {
        displayPicker.cancel();
        bar = null;
      });
      loadWindow(bar, "recorder", installRecorderGlass(bar));
    }
    // React retains the open panel when this existing window is shown again.
    resize(expanded);
    bar.show();
    bar.focus();
  }
  const allowed = (event: Electron.IpcMainInvokeEvent) => {
    if (
      event.sender !== bar?.webContents &&
      event.sender !== editor.webContents &&
      event.sender !== areaWindow?.webContents
    )
      throw Error("Unknown recorder sender.");
  };
  const register = (channel: string, fn: (...args: any[]) => unknown) =>
    ipcMain.handle(channel, (event, ...args) => {
      allowed(event);
      return fn(...args);
    });
  async function list(): Promise<CaptureSources> {
    try {
      const { stdout } = await run(executable, ["--list"], { timeout: 15000 });
      const data = JSON.parse(stdout.trim().split("\n").at(-1)!);
      if (data.event === "error") throw Error(data.message);
      return data;
    } catch (e) {
      throw Error("Capture sources are unavailable: " + String(e));
    }
  }
  function fail(error: unknown) {
    void countdownWindow.close();
    if (countdownTimer) clearInterval(countdownTimer);
    countdownTimer = null;
    state = { ...state, phase: "error", error: String(error) };
    if (timer) clearInterval(timer);
    send();
    resize(true);
    child?.kill();
    child = null;
    stopWhenStarted = false;
    if (quitAfterCapture) app.quit();
  }
  async function begin(selected: CaptureChoice) {
    if (!["idle", "error"].includes(state.phase)) return;
    choice = selected;
    stopWhenStarted = false;
    const seconds = countdownDuration(selected.countdownSeconds);
    resize(false);
    editor.hide();
    if (seconds === 0) {
      state = { phase: "starting", countdown: 0, elapsed: 0 };
      void record(selected);
      return;
    }
    state = { phase: "countdown", countdown: seconds, elapsed: 0 };
    send();
    try {
      if (!(await countdownWindow.open(seconds, selected.displayId))) return;
      if (state.phase !== "countdown") {
        await countdownWindow.close();
        return;
      }
    } catch (error) {
      fail(error);
      return;
    }
    const deadline = performance.now() + seconds * 1000;
    countdownTimer = setInterval(() => {
      const remaining = countdownRemaining(deadline, performance.now());
      if (remaining !== state.countdown) {
        state.countdown = remaining;
        send();
      }
      if (state.countdown <= 0) {
        clearInterval(countdownTimer!);
        countdownTimer = null;
        void countdownWindow.close().then(() => {
          if (state.phase === "countdown") void record(selected);
        });
      }
    }, 100);
  }
  async function record(selected: CaptureChoice) {
    state = { ...state, phase: "starting" };
    send();
    try {
      const root = path.join(
        recordingDirectory,
        crypto.randomUUID() + ".refract",
      );
      const dir = path.join(root, "media");
      await fs.mkdir(dir, { recursive: true });
      const config = path.join(root, "capture-config.json");
      await fs.writeFile(config, JSON.stringify({ ...selected, output: dir }));
      child = spawn(executable, ["--record", config]);
      let pending = "",
        errors = "",
        finished = false;
      child.stderr.on("data", (data) => {
        errors = (errors + data).slice(-4000);
      });
      child.stdout.on("data", (data) => {
        pending += data.toString();
        let end;
        while ((end = pending.indexOf("\n")) >= 0) {
          const line = pending.slice(0, end);
          pending = pending.slice(end + 1);
          try {
            const event = JSON.parse(line);
            if (event.event === "started") {
              state = {
                phase: "recording",
                countdown: 0,
                elapsed: 0,
                keyboardStatus: event.keyboardStatus,
              };
              started = Date.now();
              pausedTotal = 0;
              timer = setInterval(() => {
                if (state.phase === "recording") {
                  state.elapsed = Date.now() - started - pausedTotal;
                  send();
                }
              }, 100);
              send();
              if (stopWhenStarted) stop();
            } else if (event.event === "paused") {
              state.phase = "paused";
              pauseStarted = Date.now();
              send();
            } else if (event.event === "resumed") {
              pausedTotal += Date.now() - pauseStarted;
              state.phase = "recording";
              send();
            } else if (event.event === "finished") {
              finished = true;
              state.phase = "stopping";
              send();
              if (timer) clearInterval(timer);
              timer = null;
              child = null;
              void onFinished(root, selected)
                .then((opened) => {
                  state = { phase: "idle", countdown: 3, elapsed: 0 };
                  send();
                  if (quitAfterCapture && opened !== false) {
                    app.quit();
                  } else {
                    quitAfterCapture = false;
                    bar?.hide();
                    editor.show();
                    editor.focus();
                  }
                })
                .catch(fail);
            } else if (event.event === "error") fail(event.message);
          } catch (e) {
            if (line.trim()) errors += line;
          }
        }
      });
      child.on("error", fail);
      child.on("close", (code) => {
        if (!finished && state.phase !== "error")
          fail(errors || `The recorder exited before saving (code ${code}).`);
      });
    } catch (e) {
      fail(e);
    }
  }
  function stop() {
    if (state.phase === "starting") {
      stopWhenStarted = true;
      return;
    }
    if (state.phase === "countdown") {
      void countdownWindow.close();
      if (countdownTimer) clearInterval(countdownTimer);
      countdownTimer = null;
      state = { phase: "idle", countdown: 3, elapsed: 0 };
      send();
      return;
    }
    if (!child || !["recording", "paused"].includes(state.phase)) return;
    stopWhenStarted = false;
    state.phase = "stopping";
    send();
    child.stdin.write("stop\n");
  }
  register("recorder-panel-glass", (rect: unknown) =>
    bar ? updateRecorderPanelGlass(bar, rect) : false,
  );
  register("recorder-display-picker", (id?: number) => {
    if (!bar || !["idle", "error"].includes(state.phase)) return null;
    resize(false);
    return displayPicker.open(id);
  });
  register("recorder-display-picker-cancel", () => {
    displayPicker.cancel();
  });
  register("recorder-show", () => show());
  register("recorder-state", () => state);
  register("recorder-sources", list);
  register("recorder-symbols", recorderSymbols);
  let inputMenuOpen = false;
  register("recorder-source-menu", async (request: RecorderSourceMenu) => {
    if (
      inputMenuOpen ||
      !bar ||
      bar.isDestroyed() ||
      !["idle", "error"].includes(state.phase)
    )
      return null;
    if (
      !request ||
      !["display", "window"].includes(request.kind) ||
      !Number.isFinite(request.x) ||
      !Number.isFinite(request.y)
    )
      throw Error("Invalid source menu request.");
    inputMenuOpen = true;
    const owner = bar;
    try {
      const sources: CaptureSources =
        request.kind === "display"
          ? {
              permission: "granted",
              cameras: [],
              microphones: [],
              windows: [],
              displays: screen.getAllDisplays().map((display) => ({
                id: display.id,
                name: display.label || "Display",
                width: display.bounds.width,
                height: display.bounds.height,
              })),
            }
          : await list();
      if (owner.isDestroyed() || !["idle", "error"].includes(state.phase))
        return null;
      return await new Promise<RecorderSourceSelection | null>((resolve) => {
        let selection: RecorderSourceSelection | null = null;
        const finish = () => {
          owner.removeListener("closed", finish);
          resolve(selection);
        };
        const menu = Menu.buildFromTemplate(
          recorderSourceItems(request, sources, (source) => {
            selection = { kind: request.kind, source };
          }),
        );
        owner.once("closed", finish);
        menu.popup({
          window: owner,
          x: Math.max(0, Math.round(request.x)),
          y: Math.max(0, Math.round(request.y)),
          callback: finish,
        });
      });
    } finally {
      inputMenuOpen = false;
    }
  });
  register("recorder-input-menu", async (request: RecorderInputMenu) => {
    if (
      inputMenuOpen ||
      !bar ||
      bar.isDestroyed() ||
      !["idle", "error"].includes(state.phase)
    )
      return null;
    if (
      !request ||
      !["camera", "microphone", "audio", "settings"].includes(request.kind) ||
      !Number.isFinite(request.x) ||
      !Number.isFinite(request.y)
    )
      throw new Error("Invalid recorder input menu.");
    inputMenuOpen = true;
    const owner = bar;
    try {
      const sources =
        request.kind === "audio" || request.kind === "settings"
          ? null
          : await list();
      if (owner.isDestroyed() || !["idle", "error"].includes(state.phase))
        return null;
      const inputs =
        request.kind === "settings"
          ? []
          : request.kind === "audio"
            ? [{ value: "all", label: "Record system audio from all apps" }]
            : (request.kind === "camera"
                ? sources!.cameras
                : sources!.microphones
              ).map((input) => ({ value: input.id, label: input.name }));
      const offLabel =
        request.kind === "audio"
          ? "Don't record system audio"
          : `Don't record ${request.kind}`;
      return await new Promise<RecorderInputSelection | null>((resolve) => {
        let selection: RecorderInputSelection | null = null;
        const finish = () => {
          owner.removeListener("closed", finish);
          resolve(selection);
        };
        const menu = Menu.buildFromTemplate(
          request.kind === "settings"
            ? [
                {
                  label: "Hide desktop icons in recorded video",
                  type: "checkbox",
                  checked: request.hideDesktopIcons === true,
                  click: () => {
                    selection = {
                      hideDesktopIcons: request.hideDesktopIcons !== true,
                    };
                  },
                },
                {
                  label: "After recording",
                  submenu: [
                    {
                      label: "Create project",
                      type: "checkbox",
                      checked: request.completionAction !== "export-file",
                      click: () => {
                        selection = { completionAction: "create-project" };
                      },
                    },
                    {
                      label: "Export and save to file",
                      type: "checkbox",
                      checked: request.completionAction === "export-file",
                      click: () => {
                        selection = { completionAction: "export-file" };
                      },
                    },
                  ],
                },
                {
                  label: "Automatically create zooms",
                  type: "checkbox",
                  checked: request.automaticZooms !== false,
                  click: () => {
                    selection = {
                      automaticZooms: request.automaticZooms === false,
                    };
                  },
                },
                { type: "separator" },
                {
                  label: "Recording countdown",
                  submenu: ([0, 3, 5, 10] as const).map((countdownSeconds) => ({
                    label:
                      countdownSeconds === 0
                        ? "No countdown"
                        : `${countdownSeconds}s`,
                    type: "checkbox" as const,
                    checked:
                      countdownSeconds ===
                      countdownDuration(request.countdownSeconds),
                    click: () => {
                      selection = { countdownSeconds };
                    },
                  })),
                },
                { type: "separator" },
                {
                  label: "Recording settings…",
                  click: () => {
                    selection = { settings: "advanced" };
                  },
                },
              ]
            : [
                ...inputs.map((input) => ({
                  label: input.label,
                  type: "checkbox" as const,
                  checked: request.selected === input.value,
                  click: () => {
                    selection = input;
                  },
                })),
                ...(inputs.length ? [{ type: "separator" as const }] : []),
                ...(request.kind === "camera"
                  ? [
                      {
                        label: "Max camera resolution",
                        submenu: ([720, 1080, 2160] as const).map(
                          (cameraResolution) => ({
                            label:
                              cameraResolution === 2160
                                ? "4K"
                                : `${cameraResolution}p`,
                            type: "checkbox" as const,
                            checked:
                              cameraResolution ===
                              (request.cameraResolution ?? 720),
                            click: () => {
                              selection = { cameraResolution };
                            },
                          }),
                        ),
                      },
                      { type: "separator" as const },
                    ]
                  : []),
                {
                  label: offLabel,
                  type: "checkbox",
                  checked: !request.selected,
                  click: () => {
                    selection = { value: null, label: offLabel };
                  },
                },
              ],
        );
        owner.once("closed", finish);
        menu.popup({
          window: owner,
          x: Math.max(0, Math.round(request.x)),
          y: Math.max(0, Math.round(request.y)),
          callback: finish,
        });
      });
    } finally {
      inputMenuOpen = false;
    }
  });
  register("recorder-expand", (expanded: boolean) => resize(expanded));
  register("recorder-directory", () => recordingDirectory);
  register("recorder-directory-choose", async () => {
    if (
      choosingDirectory ||
      checkingStart ||
      !["idle", "error"].includes(state.phase)
    )
      return null;
    choosingDirectory = true;
    try {
      const selected = await dialog.showOpenDialog(bar ?? editor, {
        title: "Save new recordings to",
        defaultPath: recordingDirectory,
        properties: ["openDirectory", "createDirectory"],
        buttonLabel: "Choose folder",
      });
      if (selected.canceled || !["idle", "error"].includes(state.phase))
        return null;
      const directory = selected.filePaths[0];
      await saveRecordingDestination(destinationFile, directory);
      recordingDirectory = directory;
      return directory;
    } finally {
      choosingDirectory = false;
    }
  });
  register("recorder-start", async (selected: CaptureChoice) => {
    displayPicker.cancel();
    if (
      choosingDirectory ||
      checkingStart ||
      !["idle", "error"].includes(state.phase)
    )
      return;
    checkingStart = true;
    const requestedBar = bar;
    const generation = startGeneration;
    const stillWanted = () =>
      generation === startGeneration &&
      bar === requestedBar &&
      !!bar?.isVisible();
    try {
      if (!(await beforeStart()) || !stillWanted()) return;
      if (!["display", "window", "area"].includes(selected.mode))
        throw Error("Invalid source type.");
      if (selected.microphoneId) {
        const status = systemPreferences.getMediaAccessStatus("microphone");
        if (
          status !== "granted" &&
          !(await systemPreferences.askForMediaAccess("microphone"))
        )
          throw Error("Microphone access was not granted.");
      }
      if (selected.cameraId) {
        const status = systemPreferences.getMediaAccessStatus("camera");
        if (
          status !== "granted" &&
          !(await systemPreferences.askForMediaAccess("camera"))
        )
          throw Error("Camera access was not granted.");
      }
      if (!stillWanted()) return;
      await begin(selected);
    } finally {
      checkingStart = false;
    }
  });
  register("recorder-pause", () => {
    if (state.phase === "recording") child?.stdin.write("pause\n");
    else if (state.phase === "paused") child?.stdin.write("resume\n");
  });
  register("recorder-stop", stop);
  register("recorder-close", () => {
    displayPicker.cancel();
    startGeneration++;
    if (state.phase === "countdown") stop();
    if (["idle", "error"].includes(state.phase)) {
      bar?.hide();
      editor.show();
    }
  });
  register("recorder-import", () => {
    displayPicker.cancel();
    bar?.hide();
    editor.show();
    onImport();
  });
  register("recorder-keyboard-permissions", async () => {
    const { stdout } = await run(
      executable,
      ["--request-keyboard-permission"],
      { timeout: 60000 },
    );
    const result = JSON.parse(stdout.trim());
    if (result.keyboardPermission !== "granted")
      await shell.openExternal(
        "x-apple.systempreferences:com.apple.preference.security?Privacy_ListenEvent",
      );
  });
  register("recorder-permissions", async () => {
    const { stdout } = await run(executable, ["--request-permission"], {
      timeout: 60000,
    });
    const result = JSON.parse(stdout.trim());
    if (result.permission !== "granted") {
      await shell.openExternal(
        "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture",
      );
    }
  });
  register("recorder-area", async (displayId: number) => {
    const display = screen.getAllDisplays().find((d) => d.id === displayId);
    if (!display)
      throw Error(
        "The selected display is no longer available. Choose a display again.",
      );
    areaDisplayId = displayId;
    bar?.hide();
    areaWindow = new BrowserWindow({
      x: display.bounds.x,
      y: display.bounds.y,
      width: display.bounds.width,
      height: display.bounds.height,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      hasShadow: false,
      title: "Refract — Select area",
      webPreferences: {
        preload: path.join(__dirname, "preload.cjs"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
    loadWindow(areaWindow, "area");
    areaWindow.focus();
  });
  register("recorder-area-selected", (area: CaptureChoice["area"] | null) => {
    areaWindow?.close();
    areaWindow = null;
    show();
    if (area) {
      bar?.webContents.send("recorder-area-result", {
        area,
        displayId: areaDisplayId,
      });
    }
  });
  globalShortcut.register("CommandOrControl+Shift+2", () => {
    if (["recording", "paused"].includes(state.phase)) stop();
    else show();
  });
  globalShortcut.register("CommandOrControl+Shift+P", () => {
    if (state.phase === "recording") child?.stdin.write("pause\n");
    else if (state.phase === "paused") child?.stdin.write("resume\n");
  });
  function prepareQuit() {
    startGeneration++;
    if (["starting", "recording", "paused", "stopping"].includes(state.phase)) {
      // Keep Electron alive until capture finalization and project persistence finish.
      quitAfterCapture = true;
      stop();
      return false;
    }
    return true;
  }
  app.on("will-quit", () => {
    savePosition();
    if (countdownTimer) clearInterval(countdownTimer);
    if (timer) clearInterval(timer);
    globalShortcut.unregisterAll();
  });
  screen.on("display-removed", () => resize(expanded));
  screen.on("display-metrics-changed", () => resize(expanded));
  return { show, stop, prepareQuit };
}
