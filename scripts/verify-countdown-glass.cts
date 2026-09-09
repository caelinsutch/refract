import { app, BrowserWindow, ipcMain, screen } from "electron";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
app.on("window-all-closed", () => {});
app.setPath(
  "userData",
  path.resolve(`work/countdown-glass/profile-${process.pid}`),
);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(check: () => Promise<boolean> | boolean) {
  const deadline = Date.now() + 8000;
  while (!(await check())) {
    assert.ok(Date.now() < deadline, "Timed out");
    await wait(30);
  }
}
void app.whenReady().then(async () => {
  try {
    const { createCountdownWindow } = require(
      path.resolve("dist-electron/desktop/countdown-window.cjs"),
    );
    let cancelled = 0;
    const countdown = createCountdownWindow(() => {
      cancelled++;
      void countdown.close();
    });
    const display = screen.getPrimaryDisplay();
    const cancelledOpen = countdown.open(3, display.id);
    await countdown.close();
    assert.equal(
      await cancelledOpen,
      false,
      "Immediate cancellation resurrected overlay",
    );
    assert.equal(BrowserWindow.getAllWindows().length, 0);
    const superseded = countdown.open(5, display.id);
    const replacement = countdown.open(3, display.id);
    assert.equal(await superseded, false, "Superseded open completed");
    assert.equal(await replacement, true);
    assert.equal(
      BrowserWindow.getAllWindows().length,
      1,
      "Concurrent opens leaked overlay",
    );
    await countdown.close();

    assert.equal(await countdown.open(5, display.id), true);
    let overlay = BrowserWindow.getAllWindows()[0];
    assert.deepEqual(overlay.getBounds(), display.bounds);
    await until(() =>
      overlay.webContents.executeJavaScript(
        "document.querySelector('[role=timer]')?.textContent === '5'",
      ),
    );
    countdown.update(4);
    await until(() =>
      overlay.webContents.executeJavaScript(
        "document.querySelector('[role=timer]')?.textContent === '4'",
      ),
    );
    await fs.mkdir("work/countdown-glass", { recursive: true });
    await fs.writeFile(
      "work/countdown-glass/countdown.png",
      (await overlay.webContents.capturePage()).toPNG(),
    );
    void overlay.webContents
      .executeJavaScript(
        "window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'})); void 0",
      )
      .catch(() => {});
    await until(() => overlay.isDestroyed());
    assert.equal(cancelled, 1);
    await countdown.open(3, display.id);
    overlay = BrowserWindow.getAllWindows()[0];
    await countdown.close();
    assert.ok(
      overlay.isDestroyed(),
      "Capture handoff resolved before overlay closed",
    );
    assert.equal(cancelled, 1, "Programmatic completion cancelled recording");

    const { installRecorderGlass, updateRecorderPanelGlass } = require(
      path.resolve("dist-electron/desktop/recorder-glass.cjs"),
    );
    const preload = path.resolve("work/countdown-glass/preload.cjs");
    await fs.writeFile(
      preload,
      `const {contextBridge,ipcRenderer}=require('electron'); contextBridge.exposeInMainWorld('refract',{
      recorderState:async()=>({phase:'error',countdown:3,elapsed:0,error:''}),
      recorderDirectory:async()=>'/tmp', recorderSymbols:async()=>({}),
      onRecorderState:cb=>{setTimeout(()=>cb({phase:'error',countdown:3,elapsed:0,error:''}),100);return()=>{}},
      onAreaSelected:()=>()=>{},recorderPanelGlass:r=>ipcRenderer.invoke('test-panel',r)
    });`,
    );
    const bar = new BrowserWindow({
      width: 520,
      height: 500,
      frame: false,
      transparent: true,
      webPreferences: { preload, sandbox: true, contextIsolation: true },
    });
    assert.equal(installRecorderGlass(bar), true);
    let rect: any;
    ipcMain.handle("test-panel", (_event, value) => {
      rect = value;
      return updateRecorderPanelGlass(bar, value);
    });
    await bar.loadFile(path.resolve("dist/index.html"), {
      hash: "recorder",
      query: { nativeGlass: "1" },
    });
    await until(() =>
      bar.webContents.executeJavaScript(
        "document.querySelector('[data-native-panel-glass=true]') !== null",
      ),
    );
    const result = await bar.webContents.executeJavaScript(
      `({text:document.querySelector('[role=alert]')?.textContent,background:getComputedStyle(document.querySelector('[data-floating-surface]')).backgroundColor})`,
    );
    assert.ok(result.text.length > 40, "Empty error message");
    assert.equal(result.background, "rgba(0, 0, 0, 0)");
    assert.ok(rect.width > 0 && rect.height > 0);
    assert.equal(
      updateRecorderPanelGlass(bar, { x: 0, y: 0, width: 9999, height: 2 }),
      false,
    );
    await fs.writeFile(
      "work/countdown-glass/error.png",
      (await bar.webContents.capturePage()).toPNG(),
    );
    bar.close();
    console.log(
      JSON.stringify({
        openingRaces: true,
        fullscreen: true,
        ticks: true,
        escape: true,
        closedBeforeCapture: true,
        nativePanelGlass: true,
        errorFallback: result.text,
      }),
    );
    app.exit(0);
  } catch (error) {
    console.error(error);
    app.exit(1);
  }
});
