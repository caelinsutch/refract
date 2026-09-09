import { app, BrowserWindow, ipcMain } from "electron";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
app.on("window-all-closed", () => {});
app.setPath(
  "userData",
  path.resolve(`work/recorder-recovery/profile-${process.pid}`),
);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(check: () => Promise<boolean> | boolean, message: string) {
  const deadline = Date.now() + 6000;
  while (!(await check())) {
    assert.ok(Date.now() < deadline, message);
    await wait(20);
  }
}
void app.whenReady().then(async () => {
  try {
    await fs.mkdir("work/recorder-recovery", { recursive: true });
    const preload = path.resolve("work/recorder-recovery/preload.cjs");
    await fs.writeFile(
      preload,
      `const {contextBridge,ipcRenderer}=require('electron');
      contextBridge.exposeInMainWorld('refract',{
        recorderState:async()=>({phase:'error',error:'Initial failure',countdown:3,elapsed:0}),
        recorderDirectory:async()=>'',recorderExpand:async()=>{},recorderSymbols:async()=>({}),
        onAreaSelected:()=>()=>{},onRecorderState:cb=>{const listener=(_,v)=>cb(v);ipcRenderer.on('state',listener);return()=>ipcRenderer.removeListener('state',listener)},
        recorderSources:()=>ipcRenderer.invoke('sources'),recorderStart:()=>ipcRenderer.invoke('capture')
      });`,
    );
    let pending:
      | { resolve: (value: unknown) => void; reject: (error: Error) => void }
      | undefined;
    let requests = 0,
      captures = 0;
    ipcMain.handle("sources", () => {
      requests++;
      return new Promise((resolve, reject) => {
        pending = { resolve, reject };
      });
    });
    ipcMain.handle("capture", () => {
      captures++;
    });
    const window = new BrowserWindow({
      show: false,
      width: 855,
      height: 404,
      webPreferences: { preload, sandbox: true, backgroundThrottling: false },
    });
    await window.loadFile(path.resolve("dist/index.html"), {
      hash: "recorder",
    });
    const evaluate = (code: string) =>
      window.webContents.executeJavaScript(code);
    const click = (label: string) =>
      evaluate(
        `[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(label)}).click();void 0;`,
      );
    const sources = (permission: string) => ({
      permission,
      displays: [],
      windows: [],
      cameras: [],
      microphones: [],
    });
    const showError = async () => {
      window.webContents.send("state", {
        phase: "error",
        error: "Capture failure",
        countdown: 3,
        elapsed: 0,
      });
      await until(
        () =>
          evaluate(
            "document.querySelector('[role=alert]')?.textContent === 'Capture failure'",
          ),
        "Missing error",
      );
    };
    await until(
      () => evaluate("!!document.querySelector('[role=alert]')"),
      "Initial error not hydrated",
    );
    await click("Check again");
    await until(() => !!pending, "No recovery request");
    assert.equal(requests, 1);
    pending!.resolve(sources("required"));
    pending = undefined;
    await until(
      () =>
        evaluate(
          "document.body.textContent.includes('Allow screen recording')",
        ),
      "Missing permission instructions",
    );
    await click("Refresh sources");
    await until(() => !!pending, "No permission refresh");
    pending!.resolve(sources("granted"));
    pending = undefined;
    await until(
      () => evaluate("!document.querySelector('[data-floating-surface]')"),
      "Granted access left empty panel",
    );
    await showError();
    await click("Check again");
    await until(() => !!pending, "No failed recovery");
    pending!.reject(Error("Source service unavailable"));
    pending = undefined;
    await until(
      () =>
        evaluate(
          "document.querySelector('[role=alert]')?.textContent.includes('Source service unavailable')",
        ),
      "Failure message disappeared",
    );
    await click("Check again");
    await until(() => !!pending, "No retry request");
    pending!.resolve(sources("granted"));
    pending = undefined;
    await until(
      () => evaluate("!document.querySelector('[data-floating-surface]')"),
      "Successful recovery remained stuck",
    );
    await showError();
    await click("Check again");
    await until(() => !!pending, "No pending recovery");
    await evaluate(
      "window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));void 0;",
    );
    await until(
      () => evaluate("!document.querySelector('[data-floating-surface]')"),
      "Escape did not close error",
    );
    pending!.resolve(sources("required"));
    pending = undefined;
    await wait(100);
    assert.equal(
      await evaluate("!!document.querySelector('[data-floating-surface]')"),
      false,
      "Late recovery reopened panel",
    );
    assert.equal(captures, 0);
    window.destroy();
    console.log(
      JSON.stringify({
        permissionRecovery: true,
        successDismissal: true,
        failureMessage: true,
        escapeDuringCheck: true,
        captureNotStarted: true,
      }),
    );
    app.exit(0);
  } catch (error) {
    console.error(error);
    app.exit(1);
  }
});
