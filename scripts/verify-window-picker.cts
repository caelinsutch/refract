import { app, BrowserWindow, screen, ipcMain, Menu } from "electron";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs/promises";
app.on("window-all-closed", () => {});
app.setPath(
  "userData",
  path.resolve(`work/window-picker/profile-${process.pid}`),
);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(check: () => boolean | Promise<boolean>, message: string) {
  const deadline = Date.now() + 8000;
  while (!(await check())) {
    assert.ok(Date.now() < deadline, message);
    await wait(25);
  }
}
void app.whenReady().then(async () => {
  try {
    let openedMenu: Menu | undefined;
    const originalBuild = Menu.buildFromTemplate;
    Menu.buildFromTemplate = (template) => {
      openedMenu = originalBuild.call(Menu, template);
      return openedMenu;
    };
    const display = screen.getPrimaryDisplay(),
      { x, y } = display.bounds;
    const back = {
      id: 101,
      name: "Back",
      app: "Fixture",
      width: 700,
      height: 500,
      bounds: { x: x + 100, y: y + 100, width: 700, height: 500 },
      order: 9,
    };
    const front = {
      id: 202,
      name: "Front",
      appPath: "/System/Applications/TextEdit.app",
      app: "Fixture",
      width: 500,
      height: 300,
      bounds: { x: x + 200, y: y + 200, width: 500, height: 300 },
      order: 1,
    };
    let sources = {
      permission: "granted",
      windows: [back, front],
      displays: [],
      microphones: [],
      cameras: [],
    };
    let release: ((value: typeof sources) => void) | undefined;
    const { createWindowPicker } = require(
      path.resolve("dist-electron/desktop/window-picker.cjs"),
    );
    const picker = createWindowPicker(() =>
      release === undefined
        ? Promise.resolve(sources)
        : new Promise((resolve) => {
            release = resolve;
          }),
    );
    release = () => {};
    const cancelledScan = picker.open();
    picker.cancel();
    release!(sources);
    release = undefined;
    assert.equal(await cancelledScan, null);
    assert.equal(
      BrowserWindow.getAllWindows().length,
      0,
      "Cancelled scan opened windows",
    );
    const selected = picker.open();
    let overlay: BrowserWindow | undefined;
    await until(() => {
      overlay = BrowserWindow.getAllWindows().find(
        (window) => window.getBounds().x === x && window.getBounds().y === y,
      );
      return !!overlay;
    }, "Missing window picker");
    const evaluate = (code: string) =>
      overlay!.webContents.executeJavaScript(code).catch((error) => {
        console.error("Evaluation failed:", code);
        throw error;
      });
    await until(
      () => evaluate("!!document.querySelector('.window-picker')"),
      "Picker did not mount",
    );
    assert.deepEqual(overlay!.getBounds(), display.bounds);
    assert.equal(
      BrowserWindow.getAllWindows().length,
      screen.getAllDisplays().length,
    );
    await evaluate(
      "document.querySelector('main').dispatchEvent(new PointerEvent('pointermove',{clientX:250,clientY:250,bubbles:true}));void 0;",
    );
    await until(
      () =>
        evaluate(
          "document.querySelector('.window-picker-highlight')?.getAttribute('aria-label') === 'Front'",
        ),
      "Hover selected covered window",
    );
    await evaluate(
      "document.querySelector('main').dispatchEvent(new MouseEvent('click',{clientX:250,clientY:250,bubbles:true}));void 0;",
    );
    await until(
      () =>
        evaluate(
          "!!document.querySelector('.window-picker-highlight.selected button')",
        ),
      "Click did not select window",
    );
    assert.equal(
      await evaluate("document.activeElement.textContent"),
      "Start recording",
    );
    await until(
      () =>
        evaluate(
          "document.querySelector('.window-picker-app-icon img')?.naturalWidth === 288",
        ),
      "Native app icon did not load at 3x",
    );
    assert.equal(
      await evaluate(
        "document.querySelector('.window-picker-app-icon img').naturalHeight",
      ),
      288,
    );
    assert.equal(
      await evaluate(
        "document.querySelector('.window-picker-app-icon').getBoundingClientRect().width",
      ),
      96,
    );
    assert.equal(
      await evaluate("window.refract.windowPickerIcon(-99)"),
      null,
      "Unknown source could request icon",
    );
    for (const [label, check] of [
      [
        "Export and save to file",
        "JSON.parse(localStorage.getItem('refract.recorder.completion') || '{}').action === 'export-file'",
      ],
      [
        "Automatically create zooms",
        "localStorage.getItem('refract.recorder.automaticZooms') === 'false'",
      ],
    ]) {
      openedMenu = undefined;
      await evaluate(
        `document.querySelector('[aria-label="Recording options"]').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));void 0;`,
      );
      await until(() => !!openedMenu, "Window options did not open");
      const menu = openedMenu!;
      menu.items
        .find((item) => item.label === label)!
        .click(undefined as any, overlay!, {} as any);
      menu.closePopup();
      await until(() => evaluate(check), "Window choice did not persist");
      assert.equal(
        await evaluate(
          "document.querySelector('.window-picker-highlight.selected').getAttribute('aria-label')",
        ),
        "Front",
        "Options changed selected window",
      );
      await wait(1200);
    }
    sources = { ...sources, windows: [back] };
    await until(
      () =>
        evaluate(
          "!document.querySelector('.window-picker-highlight.selected')",
        ),
      "Closed window remained selected",
    );
    await evaluate(
      "window.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',cancelable:true}));void 0;",
    );
    await until(
      () =>
        evaluate(
          "!!document.querySelector('.window-picker-highlight.selected button')",
        ),
      "Tab did not select available window",
    );
    void evaluate(
      "document.querySelector('.window-picker-highlight.selected button').click();void 0;",
    ).catch(() => {});
    assert.deepEqual(await selected, { windowId: 101 });
    assert.equal(
      BrowserWindow.getAllWindows().length,
      0,
      "Capture handoff left overlay open",
    );
    const settingsResult = picker.open();
    await until(
      () => BrowserWindow.getAllWindows().length > 0,
      "Settings picker missing",
    );
    overlay = BrowserWindow.getAllWindows()[0];
    await until(
      () => evaluate("!!document.querySelector('main')"),
      "Settings picker not mounted",
    );
    await evaluate("window.refract.windowPickerSelect(101)");
    await until(
      () =>
        evaluate(
          "!!document.querySelector('[aria-label=\"Recording options\"]')",
        ),
      "Settings action missing",
    );
    openedMenu = undefined;
    await evaluate(
      "document.querySelector('[aria-label=\"Recording options\"]').click();void 0;",
    );
    await until(() => !!openedMenu, "Settings menu missing");
    const settingsMenu = openedMenu! as Menu;
    settingsMenu.items
      .find((item) => item.label === "Quick export settings…")!
      .click(undefined as any, overlay!, {} as any);
    settingsMenu.closePopup();
    assert.deepEqual(await settingsResult, { settings: "quick-export" });
    assert.equal(
      BrowserWindow.getAllWindows().length,
      0,
      "Settings left overlay open",
    );
    const cancelled = picker.open();
    await until(
      () => BrowserWindow.getAllWindows().length > 0,
      "Cancel picker not opened",
    );
    overlay = BrowserWindow.getAllWindows()[0];
    await until(
      () => evaluate("!!document.querySelector('main')"),
      "Cancel UI not loaded",
    );
    void evaluate(
      "window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));void 0;",
    ).catch(() => {});
    assert.equal(await cancelled, null);
    sources = { ...sources, permission: "required" };
    await assert.rejects(picker.open(), /macOS Settings/);
    assert.equal(BrowserWindow.getAllWindows().length, 0);
    const preload = path.resolve("work/window-picker/preload.cjs");
    await fs.mkdir(path.dirname(preload), { recursive: true });
    await fs.writeFile(
      preload,
      `const {contextBridge,ipcRenderer}=require('electron');contextBridge.exposeInMainWorld('refract',{
      recorderState:async()=>({phase:'idle',countdown:3,elapsed:0}),recorderDirectory:async()=>'',onRecorderState:()=>()=>{},onAreaSelected:()=>()=>{},
      recorderSources:async()=>({permission:'granted',displays:[],windows:[],microphones:[],cameras:[]}),recorderExpand:async()=>{},
      recorderWindowPicker:()=>ipcRenderer.invoke('fixture-picker'),recorderWindowPickerCancel:()=>ipcRenderer.invoke('fixture-cancel'),recorderStart:c=>ipcRenderer.invoke('fixture-capture',c)
    });`,
    );
    let resolvePicker: ((value: unknown) => void) | undefined;
    let captured: any;
    ipcMain.handle(
      "fixture-picker",
      () =>
        new Promise((resolve) => {
          resolvePicker = resolve;
        }),
    );
    ipcMain.handle("fixture-cancel", () => {
      resolvePicker?.(null);
      resolvePicker = undefined;
    });
    ipcMain.handle("fixture-capture", (_, choice) => {
      captured = choice;
    });
    const recorder = new BrowserWindow({
      show: false,
      webPreferences: { preload, sandbox: true, backgroundThrottling: false },
    });
    await recorder.loadFile(path.resolve("dist/index.html"), {
      hash: "recorder",
    });
    const run = (source: string) =>
      recorder.webContents.executeJavaScript(source);
    await until(
      () => run("!!document.querySelector('[data-recorder-bar]')"),
      "Recorder did not mount",
    );
    await run(
      "window.pick=label=>[...document.querySelectorAll('button')].find(b=>b.textContent===label).click();window.pick('Window');void 0;",
    );
    await until(() => !!resolvePicker, "Window did not open native picker");
    assert.equal(
      await run("!!document.querySelector('[data-floating-surface]')"),
      false,
      "Picker expanded old list",
    );
    await run("window.pick('Area');void 0;");
    await until(() => !resolvePicker, "Mode switch did not cancel picker");
    assert.equal(
      await run("document.body.textContent.includes('Record an area')"),
      true,
      "Old completion cleared new panel",
    );
    await run("window.pick('Window');void 0;");
    await until(() => !!resolvePicker, "Window did not reopen");
    resolvePicker!({ settings: "quick-export" });
    resolvePicker = undefined;
    await until(
      () => run("document.body.textContent.includes('Quick export settings')"),
      "Window settings result did not open recorder settings",
    );
    assert.equal(Boolean(captured), false, "Settings started capture");
    await run("window.pick('Window');void 0;");
    await until(() => !!resolvePicker, "Window did not reopen after settings");
    resolvePicker!({ windowId: 101 });
    await until(() => !!captured, "Window result did not reach recorder");
    assert.equal(captured.windowId, 101);
    assert.equal(captured.mode, "window");
    recorder.destroy();
    console.log(
      JSON.stringify({
        nativeCompletionMenu: true,
        quickExportSettingsHandoff: true,
        nativeApplicationIcon: "96pt / 288px",
        rendererModeSwitchAndHandoff: true,
        fullDisplay: true,
        frontmostHover: true,
        twoStepSelection: true,
        refreshRemovesClosedWindow: true,
        keyboard: true,
        closedBeforeHandoff: true,
        permissionDenied: true,
        capture: false,
      }),
    );
    app.exit(0);
  } catch (error) {
    console.error(error);
    app.exit(1);
  }
});
