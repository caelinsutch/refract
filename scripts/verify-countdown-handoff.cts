import { app, BrowserWindow, ipcMain, screen } from "electron";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs";
import childProcess from "node:child_process";
import { promisify } from "node:util";
app.setPath(
  "userData",
  path.resolve(`work/countdown-handoff/profile-${process.pid}`),
);
app.on("window-all-closed", () => {});
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(check: () => boolean, message: string) {
  const deadline = Date.now() + 8000;
  while (!check()) {
    assert.ok(Date.now() < deadline, message);
    await wait(20);
  }
}
void app.whenReady().then(async () => {
  try {
    const closes: (() => void)[] = [];
    const module = require(
      path.resolve("dist-electron/desktop/countdown-window.cjs"),
    );
    module.createCountdownWindow = () => ({
      open: async () => true,
      update: () => {},
      close: () => new Promise<void>((resolve) => closes.push(resolve)),
    });
    // No renderer or native capture is launched by this state-machine fixture.
    BrowserWindow.prototype.loadFile = async () => {};
    const captures: any[] = [];
    childProcess.spawn = ((_command: string, args: string[]) => {
      captures.push(JSON.parse(fs.readFileSync(args[1], "utf8")));
      throw Error("Capture stub: intentionally not recording");
    }) as unknown as typeof childProcess.spawn;
    const display = screen.getPrimaryDisplay();
    let nativeSources = {
      permission: "granted",
      windows: [
        {
          id: 404,
          name: "Fixture",
          width: 400,
          height: 300,
          bounds: {
            x: display.bounds.x + 10,
            y: display.bounds.y + 10,
            width: 400,
            height: 300,
          },
        },
      ],
      displays: [],
      microphones: [],
      cameras: [],
    };
    childProcess.execFile = ((
      _file: string,
      _args: string[],
      _options: unknown,
      callback: (error: Error | null, stdout: string, stderr: string) => void,
    ) => {
      queueMicrotask(() => callback(null, JSON.stringify(nativeSources), ""));
    }) as unknown as typeof childProcess.execFile;
    Object.defineProperty(childProcess.execFile, promisify.custom, {
      value: async () => ({
        stdout: JSON.stringify(nativeSources),
        stderr: "",
      }),
    });
    const handlers = new Map<string, (...args: any[]) => any>();
    const original = ipcMain.handle.bind(ipcMain);
    ipcMain.handle = (channel, handler) => {
      handlers.set(channel, handler);
      original(channel, handler);
    };
    const editor = new BrowserWindow({ show: false });
    const { setupRecorder } = require(
      path.resolve("dist-electron/desktop/recorder.cjs"),
    );
    const recorder = setupRecorder(
      editor,
      async () => {},
      () => {},
      async () => true,
    );
    recorder.show();
    const invoke = (channel: string, ...args: any[]) =>
      handlers.get(channel)!({ sender: editor.webContents }, ...args);
    const choice = (displayId: number) => ({
      mode: "display",
      displayId,
      countdownSeconds: 3,
      systemAudio: false,
    });
    await invoke("recorder-start", choice(101));
    await until(() => closes.length === 1, "First countdown did not finish");
    recorder.stop();
    await invoke("recorder-start", choice(202));
    closes[0]();
    closes[1]();
    await wait(100);
    assert.equal(
      captures.length,
      0,
      "Old countdown started capture during replacement countdown",
    );
    await until(
      () => closes.length === 3,
      "Replacement countdown did not finish",
    );
    closes[2]();
    await until(
      () => captures.length === 1,
      "Current countdown did not dispatch capture",
    );
    assert.equal(captures[0].displayId, 202);
    await invoke("recorder-start", choice(303));
    assert.equal(recorder.prepareQuit(), true);
    assert.equal(
      invoke("recorder-state").phase,
      "idle",
      "Quit left countdown active",
    );
    await wait(100);
    assert.equal(captures.length, 1);
    await invoke("recorder-start", {
      mode: "window",
      windowId: 404,
      countdownSeconds: 0,
      systemAudio: false,
    });
    await until(
      () => captures.length === 2,
      "Window source did not reach capture",
    );
    assert.equal(captures[1].windowId, 404);
    assert.equal(
      captures[1].displayId,
      display.id,
      "Window countdown selected the wrong display",
    );
    await invoke("recorder-start", {
      mode: "window",
      windowId: 999,
      countdownSeconds: 0,
      systemAudio: false,
    }).then(
      () => assert.fail("Missing window was accepted"),
      (error: Error) => assert.match(error.message, /no longer available/),
    );
    nativeSources = { ...nativeSources, permission: "required" };
    await invoke("recorder-start", {
      mode: "window",
      windowId: 404,
      countdownSeconds: 0,
      systemAudio: false,
    }).then(
      () => assert.fail("Missing permission was accepted"),
      (error: Error) => assert.match(error.message, /macOS Settings/),
    );
    assert.equal(captures.length, 2);
    BrowserWindow.getAllWindows().forEach((window) => window.destroy());
    console.log(
      JSON.stringify({
        windowSourceValidation: true,
        oldCountdownCannotStart: true,
        currentSource: 202,
        quitCancels: true,
        actualCapture: false,
      }),
    );
    app.exit(0);
  } catch (error) {
    console.error(error);
    app.exit(1);
  }
});
