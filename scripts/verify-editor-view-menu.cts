import assert from "node:assert/strict";
import { app, BrowserWindow, Menu, ipcMain } from "electron";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
const directory = path.resolve("work/editor-view-menu");
app.setPath("userData", path.join(directory, `profile-${process.pid}`));
app.whenReady().then(async () => {
  let window: BrowserWindow | undefined;
  try {
    await fs.mkdir(directory, { recursive: true });
    const source = path.join(directory, "source.mp4");
    execFileSync("/opt/homebrew/bin/ffmpeg", [
      "-v",
      "error",
      "-y",
      "-f",
      "lavfi",
      "-i",
      "testsrc2=size=1280x720:rate=30:duration=2",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      source,
    ]);
    const encoded = (await fs.readFile(source)).toString("base64");
    const { editorViewMenu, updateEditorViewMenu } = require(
      path.resolve("dist-electron/desktop/editor-view-menu.cjs"),
    );
    const menu = Menu.buildFromTemplate([
      {
        label: "View",
        submenu: editorViewMenu((action: string) =>
          window!.webContents.send("menu-action", action),
        ),
      },
    ]);
    Menu.setApplicationMenu(menu);
    ipcMain.handle("verify-view", (_, state) => updateEditorViewMenu(state));
    const preload = path.join(directory, "preload.cjs");
    await fs.writeFile(
      preload,
      `const {contextBridge,ipcRenderer}=require('electron');contextBridge.exposeInMainWorld('refract',{
      onProjectGuard:()=>()=>{},onRecordingFinished:()=>()=>{},
      setEditorViewState:state=>ipcRenderer.invoke('verify-view',state),
      onMenu:callback=>{const listener=(_,action)=>callback(action);ipcRenderer.on('menu-action',listener);return()=>ipcRenderer.removeListener('menu-action',listener);}
    });`,
    );
    window = new BrowserWindow({
      show: false,
      width: 1320,
      height: 880,
      webPreferences: {
        preload,
        sandbox: true,
        backgroundThrottling: false,
        autoplayPolicy: "no-user-gesture-required",
      },
    });
    window.webContents.on("console-message", (_event, level, message) => {
      if (level >= 3) console.error(message);
    });
    await window.loadFile(path.resolve("dist/index.html"));
    await new Promise((resolve) => setTimeout(resolve, 100));
    assert.equal(menu.getMenuItemById("view-preview")?.enabled, false);
    await window.webContents.executeJavaScript(`(async () => {
      const check = (condition, message) => { if (!condition) throw Error(message); };
      const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
      const until = async (predicate, message) => {
        const deadline = performance.now() + 6000;
        while (!predicate()) { check(performance.now() < deadline, message); await wait(20); }
      };
      await until(() => document.querySelector('input[accept="video/*"]'), 'Editor did not mount');
      const bytes = Uint8Array.from(atob(${JSON.stringify(encoded)}), c => c.charCodeAt(0));
      const transfer = new DataTransfer();
      transfer.items.add(new File([bytes], 'Layout verification.mp4', {type:'video/mp4'}));
      const input = document.querySelector('input[accept="video/*"]');
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', {bubbles:true}));
      const button = label => document.querySelector('button[aria-label="' + label + '"]');
      const video = () => Array.from(document.querySelectorAll('video')).find(v => v.src.startsWith('blob:'));
      await until(() => video()?.readyState >= 2 && !button('Play')?.disabled, 'Video did not load');
      return true;
    })()`);
    const c = window.webContents;
    const read = (code: string) => c.executeJavaScript(code);
    const wait = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));
    await wait(200);
    const item = (id: string) => {
      const result = menu.getMenuItemById(id);
      assert.ok(result);
      return result;
    };
    const click = async (id: string) => {
      const target = item(id);
      assert.equal(target.enabled, true);
      target.click(target, window!, {} as any);
      await wait(150);
    };
    assert.equal(item("view-sidebar").checked, true);
    assert.equal(item("view-preview-1080").checked, true);
    await click("view-sidebar");
    assert.equal(await read("!!document.querySelector('aside')"), false);
    assert.equal(item("view-sidebar").checked, false);
    await click("view-preview");
    assert.equal(
      await read("!!document.querySelector('[data-timeline]')"),
      false,
    );
    assert.equal(item("view-preview").checked, true);
    await click("view-preview");
    assert.equal(item("view-sidebar").checked, true);
    assert.equal(item("view-timeline").checked, true);
    await click("view-loop");
    assert.equal(item("view-loop").checked, true);
    for (const height of [480, 720, 1080, 1440, 2160]) {
      await click("view-preview-" + height);
      assert.equal(item("view-preview-" + height).checked, true);
      assert.equal(
        await read("localStorage.getItem('refract.preview.height')"),
        String(height),
      );
    }
    await read(
      "window.dispatchEvent(new KeyboardEvent('keydown',{key:'k',metaKey:true,bubbles:true}))",
    );
    await wait(100);
    assert.equal(item("view-sidebar").enabled, false);
    updateEditorViewMenu({
      enabled: "yes",
      sidebar: 1,
      timeline: 1,
      loop: 1,
      previewHeight: 123,
    });
    assert.equal(item("view-sidebar").enabled, false);
    assert.equal(item("view-sidebar").checked, false);
    assert.equal(item("view-preview-1080").checked, true);
    console.log(
      JSON.stringify({
        nativeViewMenu: "clicks and checked states verified",
        previewSizes: "all five",
        availability: "empty editor and dialogs disabled",
        invalidState: "safe defaults",
      }),
    );
    app.exit(0);
  } catch (error) {
    console.error(error);
    app.exit(1);
  }
});
