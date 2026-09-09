import { app, BrowserWindow, screen, ipcMain } from "electron";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
app.on("window-all-closed", () => {});
app.setPath(
  "userData",
  path.resolve(`work/display-picker/profile-${process.pid}`),
);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(check: () => Promise<boolean> | boolean, message: string) {
  const deadline = Date.now() + 10000;
  while (!(await check())) {
    assert.ok(Date.now() < deadline, message);
    await wait(25);
  }
}
void app.whenReady().then(async () => {
  try {
    const { createDisplayPicker } = require(
      path.resolve("dist-electron/desktop/display-picker.cjs"),
    );
    const picker = createDisplayPicker() as {
      open(id?: number): Promise<number | null>;
      cancel(): void;
    };
    const target = screen.getPrimaryDisplay();
    for (const accept of [false, true]) {
      const selected = picker.open(target.id);
      let overlays: BrowserWindow[] = [];
      await until(() => {
        overlays = BrowserWindow.getAllWindows().filter((w) =>
          w.webContents.getURL().endsWith("#display-picker"),
        );
        return overlays.length === screen.getAllDisplays().length;
      }, "Missing display overlay");
      const window = overlays.find(
        (w) =>
          w.getBounds().x === target.bounds.x &&
          w.getBounds().y === target.bounds.y,
      )!;
      assert.deepEqual(
        window.getBounds(),
        target.bounds,
        "Overlay does not cover the whole display",
      );
      await until(
        () =>
          window.webContents.executeJavaScript(
            "!!document.querySelector('button')",
          ),
        "Start action did not mount",
      );
      const before = await window.webContents.executeJavaScript(
        "({title:document.querySelector('h1').textContent,button:document.querySelector('button').textContent,transparent:getComputedStyle(document.body).backgroundColor})",
      );
      assert.equal(before.title, target.label || "Display");
      assert.equal(before.button, "Start recording");
      assert.equal(before.transparent, "rgba(0, 0, 0, 0)");
      if (accept) {
        await fs.mkdir(path.resolve("work/display-picker"), {
          recursive: true,
        });
        await fs.writeFile(
          path.resolve("work/display-picker/overlay.png"),
          (await window.webContents.capturePage()).toPNG(),
        );
        void window.webContents
          .executeJavaScript(
            "document.querySelector('button').click(); void 0;",
          )
          .catch(() => {});
      } else {
        await window.webContents
          .executeJavaScript(
            "window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',cancelable:true})); void 0;",
          )
          .catch(() => {});
      }
      assert.equal(
        await selected,
        accept ? target.id : null,
        "Picker returned wrong result",
      );
      assert.ok(
        overlays.every((w) => w.isDestroyed()),
        "An overlay remained after finishing",
      );
    }
    const preload = path.resolve("work/display-picker/preload.cjs");
    await fs.writeFile(
      preload,
      `const {contextBridge,ipcRenderer}=require('electron');contextBridge.exposeInMainWorld('refract',{
      recorderState:async()=>({phase:'idle',countdown:3,elapsed:0}),recorderDirectory:async()=>'',onRecorderState:()=>()=>{},onAreaSelected:()=>()=>{},
      recorderSources:async()=>({permission:'granted',displays:[],windows:[],cameras:[],microphones:[]}),
      recorderExpand:value=>ipcRenderer.invoke('verify-expand',value),
      recorderDisplayPicker:()=>ipcRenderer.invoke('verify-picker'),recorderDisplayPickerCancel:()=>ipcRenderer.invoke('verify-cancel'),
      recorderStart:choice=>ipcRenderer.invoke('verify-capture',choice)
    });`,
    );
    let finish: ((id: number | null) => void) | undefined, capture: any;
    const expansions: boolean[] = [];
    ipcMain.handle("verify-expand", (_, value) => {
      expansions.push(value);
    });
    ipcMain.handle(
      "verify-picker",
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    ipcMain.handle("verify-cancel", () => {
      finish?.(null);
      finish = undefined;
    });
    ipcMain.handle("verify-capture", (_, choice) => {
      capture = choice;
    });
    const renderer = new BrowserWindow({
      show: false,
      width: 855,
      height: 404,
      webPreferences: { preload, backgroundThrottling: false, sandbox: true },
    });
    await renderer.loadFile(path.resolve("dist/index.html"), {
      hash: "recorder",
    });
    const evaluate = (source: string) =>
      renderer.webContents.executeJavaScript(source);
    await until(
      () => evaluate("!!document.querySelector('[data-recorder-bar]')"),
      "Recorder not mounted",
    );
    await evaluate(
      "window.pick=label=>[...document.querySelectorAll('[data-recorder-bar] button')].find(b=>b.textContent===label).click();window.pick('Display');void 0;",
    );
    await until(() => !!finish, "Display did not open native picker");
    assert.equal(Boolean(capture), false);
    assert.equal(
      await evaluate(
        "!!document.querySelector('[data-floating-surface=recorder]')",
      ),
      false,
      "Display expanded the old list",
    );
    assert.ok(!expansions.includes(true), "Display resized recorder");
    await evaluate("window.pick('Window')");
    await until(() => !finish, "Switching mode did not cancel pending picker");
    assert.equal(
      await evaluate("document.body.textContent.includes('Record a window')"),
      true,
      "Stale picker completion cleared new mode",
    );
    await evaluate("window.pick('Display')");
    await until(() => !!finish, "Display did not reopen");
    finish!(target.id);
    await until(
      () => !!capture,
      "Accepted display did not reach capture request",
    );
    assert.equal(capture.mode, "display");
    assert.equal(capture.displayId, target.id);
    renderer.destroy();
    console.log(
      JSON.stringify({
        displays: "all covered",
        escape: "cancelled",
        start: "selected display returned",
        cleanup: "all overlays closed",
        capture: "not started by picker",
        rendererHandoff: "selected ID and mode-switch cancellation passed",
      }),
    );
    app.exit(0);
  } catch (error) {
    console.error(error);
    app.exit(1);
  }
});
