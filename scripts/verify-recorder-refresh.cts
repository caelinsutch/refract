import { app, BrowserWindow, ipcMain } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";

const directory = path.resolve("work/recorder-refresh");
app.setPath("userData", path.join(directory, `profile-${process.pid}`));
void app.whenReady().then(async () => {
  try {
    await fs.mkdir(directory, { recursive: true });
    const preload = path.join(directory, "preload.cjs");
    await fs.writeFile(
      preload,
      `const {contextBridge, ipcRenderer} = require('electron');
      contextBridge.exposeInMainWorld('refract', {
        recorderState: async () => ({phase:'idle',countdown:3,elapsed:0}),
        recorderDirectory: async () => '',
        onRecorderState: () => () => {}, onAreaSelected: () => () => {},
        recorderExpand: async () => {},
        recorderSourceMenu: request => ipcRenderer.invoke('verify-source-menu',request),
        recorderInputMenu: request => ipcRenderer.invoke('verify-input-menu',request),
        recorderSources: () => ipcRenderer.invoke('verify-sources'),
        recorderStart: choice => ipcRenderer.invoke('verify-start',choice),
      });`,
    );
    let settingsChoice: unknown = { settings: "advanced" };
    ipcMain.handle("verify-input-menu", (_, request) =>
      request.kind === "settings"
        ? settingsChoice
        : {
            value: "fixture-device",
            label: "A very long external camera and microphone device name",
          },
    );
    ipcMain.handle("verify-source-menu", (_, request) => ({
      kind: request.kind,
      source: {
        id: 2,
        name: "Selected window",
        app: "Example",
        width: 1200,
        height: 800,
      },
    }));
    let requests = 0;
    let complete: ((value: unknown) => void) | undefined;
    ipcMain.handle("verify-sources", () => {
      requests++;
      return new Promise((resolve) => {
        complete = resolve;
      });
    });
    let captureChoice:
      | {
          mode?: string;
          windowId?: number;
          countdownSeconds?: number;
          hideDesktopIcons?: boolean;
        }
      | undefined;
    ipcMain.handle("verify-start", (_, choice) => {
      captureChoice = choice;
    });
    const fixture = (name: string) => ({
      permission: "granted",
      cameras: [],
      microphones: [],
      displays: [
        {
          id: 1,
          name,
          width: name === "Updated display" ? 2560 : 1920,
          height: 1080,
        },
      ],
      windows: [
        {
          id: 2,
          name: "Example window",
          width: 1200,
          height: 800,
          app: "Example",
        },
      ],
    });
    const window = new BrowserWindow({
      show: false,
      width: 855,
      height: 404,
      webPreferences: { preload, sandbox: true },
    });
    await window.loadFile(path.resolve("dist/index.html"), {
      hash: "recorder",
    });
    const evaluate = (source: string) =>
      window.webContents.executeJavaScript(source);
    const until = async (
      predicate: () => Promise<boolean> | boolean,
      message: string,
    ) => {
      const deadline = Date.now() + 5000;
      while (!(await predicate())) {
        assert.ok(Date.now() < deadline, message);
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
    };
    await until(
      () => evaluate("!!document.querySelector('[data-recorder-bar]')"),
      "Recorder did not mount",
    );
    await evaluate(`window.bar = document.querySelector('[data-recorder-bar]');
      window.controls = Array.from(window.bar.querySelectorAll('button'));
      window.pick = label => window.controls.find(button => button.textContent === label || button.getAttribute('aria-label') === label).click();
      window.pick('Display');`);
    await until(() => requests === 1, "Source scan did not start");
    await evaluate("window.pick('Window')");
    assert.equal(requests, 1, "Switching panels started a duplicate scan");
    complete!(fixture("First display"));
    await until(
      () => evaluate("document.body.textContent.includes('Example window')"),
      "Latest panel did not receive sources",
    );
    await evaluate("window.pick('Recording options')");
    await until(() => requests === 2, "Background refresh did not start");
    assert.equal(
      await evaluate(
        "!!document.querySelector('[aria-label=\"After recording\"]')",
      ),
      true,
      "Cached settings disappeared behind loading",
    );
    await evaluate("window.pick('Display')");
    await until(
      () =>
        evaluate(
          "document.querySelector('h2')?.textContent === 'Record a display'",
        ),
      "Display panel did not open",
    );
    assert.equal(requests, 2, "Pending background refresh was duplicated");
    assert.equal(
      await evaluate("document.body.textContent.includes('1920 × 1080')"),
      true,
      "Cached sources were hidden during refresh",
    );
    complete!(fixture("Updated display"));
    await until(
      () => evaluate("document.body.textContent.includes('2560 × 1080')"),
      "Refreshed devices were not applied",
    );
    await evaluate("window.pick('Recording options')");
    await until(() => requests === 3, "Second refresh did not start");
    await evaluate(
      "window.field = document.querySelector('[aria-label=\"After recording\"]'); void 0;",
    );
    complete!(fixture("Updated display"));
    await new Promise((resolve) => setTimeout(resolve, 100));
    await evaluate(`(() => {
      if(window.field !== document.querySelector('[aria-label="After recording"]')) throw Error('Settings controls remounted on refresh');
      if(window.bar !== document.querySelector('[data-recorder-bar]') || window.controls.some(button=>!button.isConnected)) throw Error('Toolbar remounted');
      if(document.body.textContent.includes('Finding available sources')) throw Error('Cached controls replaced by loading');
    })()`);
    await evaluate(`window.cameraControl = window.controls.find(button => button.textContent === 'No camera');
      window.microphoneControl = window.controls.find(button => button.textContent === 'No microphone');
      window.geometry = window.controls.map(button => {const r=button.getBoundingClientRect(); return [r.x,r.width];});
      window.cameraControl.click();`);
    await until(
      () => evaluate("window.cameraControl.textContent.includes('very long')"),
      "Camera selection did not complete",
    );
    await evaluate("window.microphoneControl.click()");
    await until(
      () =>
        evaluate("window.microphoneControl.textContent.includes('very long')"),
      "Microphone selection did not complete",
    );
    await evaluate(`(() => {
      window.controls.forEach((button,index) => {
        const r=button.getBoundingClientRect(), old=window.geometry[index];
        if(Math.abs(r.x-old[0])>0.1 || Math.abs(r.width-old[1])>0.1) throw Error('Device name shifted toolbar controls');
        if(r.right>innerWidth || r.left<0) throw Error('Toolbar control clipped outside window');
      });
    })()`);
    await fs.writeFile(
      path.join(directory, "toolbar.png"),
      (await window.webContents.capturePage()).toPNG(),
    );
    await evaluate("window.pick('Recording options')");
    await until(
      () =>
        evaluate(
          "!!document.querySelector('[aria-label=\"Recording countdown\"]')",
        ),
      "Countdown options did not mount",
    );
    await evaluate(`const countdown = document.querySelector('[aria-label="Recording countdown"]');
      countdown.value = '0'; countdown.dispatchEvent(new Event('change',{bubbles:true}));`);
    await until(
      () =>
        evaluate(
          "localStorage.getItem('refract.recorder.countdownSeconds') === '0'",
        ),
      "Countdown preference was not saved",
    );
    settingsChoice = { hideDesktopIcons: true };
    await evaluate("window.pick('Recording options')");
    await until(
      () =>
        evaluate(
          "localStorage.getItem('refract.recorder.hideDesktopIcons') === 'true'",
        ),
      "Desktop-icon preference was not saved",
    );
    await evaluate("window.pick('Display')");
    await until(
      () =>
        evaluate(
          "document.body.textContent.includes('Click to start recording')",
        ),
      "No-countdown hint did not update",
    );
    await evaluate(
      "Array.from(document.querySelectorAll('button')).find(button => button.textContent.includes('Updated display')).click()",
    );
    await until(() => !!captureChoice, "Capture request was not sent");
    assert.equal(
      captureChoice!.countdownSeconds,
      0,
      "Capture ignored the no-countdown preference",
    );
    assert.equal(
      captureChoice!.hideDesktopIcons,
      true,
      "Capture ignored the desktop-icon preference",
    );
    const previousCapture = captureChoice;
    await evaluate(
      "window.controls.find(button => button.textContent === 'Window').dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true}))",
    );
    await until(
      () =>
        evaluate(
          "[...document.querySelectorAll('button')].some(button => button.textContent.trim() === 'Record window')",
        ),
      "Source selection was not prepared",
    );
    assert.equal(
      captureChoice,
      previousCapture,
      "Source selection started recording without confirmation",
    );
    await evaluate(
      "[...document.querySelectorAll('button')].find(button => button.textContent.trim() === 'Record window').click()",
    );
    await until(
      () => captureChoice !== previousCapture,
      "Record action did not send the selected source",
    );
    assert.equal(captureChoice!.mode, "window");
    assert.equal(captureChoice!.windowId, 2);
    assert.equal(captureChoice!.countdownSeconds, 0);
    assert.equal(captureChoice!.hideDesktopIcons, true);
    console.log(
      JSON.stringify({
        overlappingScans: "coalesced",
        cachedControls: "preserved",
        refreshedDevices: "applied",
        toolbarIdentity: "preserved",
      }),
    );
    app.exit(0);
  } catch (error) {
    console.error(error);
    app.exit(1);
  }
});
