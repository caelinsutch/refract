import type { DisplayPickerResult } from "../src/core/recorder.js" with {
  "resolution-mode": "import",
};
import { app, BrowserWindow, screen, ipcMain, Menu } from "electron";
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
      open(id?: number): Promise<DisplayPickerResult>;
      cancel(): void;
    };
    const target = screen.getPrimaryDisplay();
    let openedMenu: Menu | undefined;
    const originalBuild = Menu.buildFromTemplate;
    Menu.buildFromTemplate = (template) => {
      openedMenu = originalBuild.call(Menu, template);
      return openedMenu;
    };
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
        const options =
          "document.querySelector('[aria-label=\"Recording options\"]')";
        await window.webContents.executeJavaScript(
          `${options}.click();void 0;`,
        );
        await until(() => !!openedMenu, "Options did not open a native menu");
        const menu = openedMenu!;
        assert.equal(
          menu.items.find((item) => item.label === "Automatically create zooms")
            ?.checked,
          true,
        );
        const exportItem = menu.items.find(
          (item) => item.label === "Export and save to file",
        )!;
        exportItem.click(undefined as any, window, {} as any);
        menu.closePopup();
        await until(
          () =>
            window.webContents.executeJavaScript(
              "JSON.parse(localStorage.getItem('refract.recorder.completion') || '{}').action === 'export-file'",
            ),
          "Export choice was not persisted",
        );
        await wait(1200);
        openedMenu = undefined;
        await window.webContents.executeJavaScript(
          `${options}.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));void 0;`,
        );
        await until(() => !!openedMenu, "Down arrow did not reopen menu");
        const zoomMenu = openedMenu! as Menu;
        assert.equal(
          zoomMenu.items.find(
            (item) => item.label === "Export and save to file",
          )?.checked,
          true,
        );
        zoomMenu.items
          .find((item) => item.label === "Automatically create zooms")!
          .click(undefined as any, window, {} as any);
        zoomMenu.closePopup();
        await until(
          () =>
            window.webContents.executeJavaScript(
              "localStorage.getItem('refract.recorder.automaticZooms') === 'false'",
            ),
          "Zoom preference was not persisted",
        );
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
    await wait(1200);
    openedMenu = undefined;
    const settingsResult = picker.open(target.id);
    let settingsWindow: BrowserWindow | undefined;
    await until(() => {
      settingsWindow = BrowserWindow.getAllWindows().find((window) =>
        window.webContents.getURL().endsWith("#display-picker"),
      );
      return !!settingsWindow;
    }, "Settings picker did not open");
    await until(
      () =>
        settingsWindow!.webContents.executeJavaScript(
          "!!document.querySelector('[aria-label=\"Recording options\"]')",
        ),
      "Settings menu button did not mount",
    );
    await settingsWindow!.webContents.executeJavaScript(
      "document.querySelector('[aria-label=\"Recording options\"]').click();void 0;",
    );
    await until(() => !!openedMenu, "Settings native menu did not open");
    const settingsMenu = openedMenu! as Menu;
    settingsMenu.items
      .find((item) => item.label === "Quick export settings…")!
      .click(undefined as any, settingsWindow!, {} as any);
    settingsMenu.closePopup();
    assert.deepEqual(await settingsResult, { settings: "quick-export" });
    assert.ok(
      settingsWindow!.isDestroyed(),
      "Settings handoff left picker open",
    );
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
    let finish: ((id: DisplayPickerResult) => void) | undefined, capture: any;
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
    finish!({ settings: "quick-export" });
    await until(
      () =>
        evaluate(
          "!!document.querySelector('[aria-label=\"Quick export resolution\"]')",
        ),
      "Quick export panel did not open",
    );
    assert.equal(Boolean(capture), false, "Opening settings started recording");
    assert.equal(await evaluate("document.activeElement?.textContent"), "Done");
    await evaluate(
      `const resolution=document.querySelector('[aria-label="Quick export resolution"]');resolution.value='3840';resolution.dispatchEvent(new Event('change',{bubbles:true}));void 0;`,
    );
    await until(
      () =>
        evaluate(
          "JSON.parse(localStorage.getItem('refract.recorder.completion')).resolution === 3840",
        ),
      "Resolution control did not persist",
    );
    await evaluate("document.activeElement.click();void 0;");
    await until(
      () =>
        evaluate("!document.querySelector('[data-floating-surface=recorder]')"),
      "Done did not close settings",
    );
    finish = undefined;
    await evaluate("window.pick('Display')");
    await until(() => !!finish, "Display did not reopen after settings");
    // Use a real second renderer: Electron must deliver the storage event.
    const preferences = new BrowserWindow({
      show: false,
      webPreferences: { sandbox: true },
    });
    await preferences.loadFile(path.resolve("dist/index.html"), {
      hash: "display-picker",
    });
    await preferences.webContents
      .executeJavaScript(`localStorage.setItem('refract.recorder.completion',JSON.stringify({action:'create-project',resolution:1080,fps:60}));
      localStorage.setItem('refract.recorder.automaticZooms','true');void 0;`);
    await until(
      () =>
        evaluate(
          "JSON.parse(localStorage.getItem('refract.recorder.completion') || '{}').fps === 60",
        ),
      "Cross-window preference did not propagate",
    );
    await wait(50);
    finish!(target.id);
    await until(
      () => !!capture,
      "Accepted display did not reach capture request",
    );
    assert.equal(capture.mode, "display");
    assert.equal(capture.displayId, target.id);
    assert.equal(capture.automaticZooms, true);
    assert.deepEqual(capture.completion, {
      action: "create-project",
      resolution: 1080,
      fps: 60,
    });
    preferences.destroy();
    renderer.destroy();
    console.log(
      JSON.stringify({
        quickExport:
          "native action, cleanup, no capture, editable settings and Done passed",
        nativeOptions:
          "click, keyboard, checked state and preference handoff passed",
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
