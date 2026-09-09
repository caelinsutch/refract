import { app, BrowserWindow, nativeTheme } from "electron";
import assert from "node:assert/strict";
import path from "node:path";
const root = process.cwd();
app.setPath(
  "userData",
  path.join(root, "work/native-crop", `profile-${process.pid}`),
);
app.whenReady().then(async () => {
  let parent: BrowserWindow | undefined;
  try {
    const { setupCropWindow } = require(
      path.join(root, "dist-electron/desktop/crop-window.cjs"),
    );
    parent = new BrowserWindow({
      show: false,
      webPreferences: {
        preload: path.join(root, "dist-electron/desktop/preload.cjs"),
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
      },
    });
    setupCropWindow(parent);
    await parent.loadURL(
      "data:text/html,<title>Crop verification</title><body>Isolated crop host</body>",
    );
    let saved: unknown;
    for (const action of ["confirm", "escape", "close"] as const) {
      await parent.webContents.executeJavaScript(`(() => {
        const canvas = document.createElement('canvas'); canvas.width=1920; canvas.height=1080;
        const context=canvas.getContext('2d'); context.fillStyle='#386777'; context.fillRect(0,0,1920,1080);
        window.cropResult=undefined;
        void window.refract.cropOpen({width:1920,height:1080,initial:${JSON.stringify(saved) ?? "undefined"},image:canvas.toDataURL('image/png')}).then(value => {window.cropResult=value;});
      })()`);
      const deadline = Date.now() + 10000;
      let child: BrowserWindow | undefined;
      while (
        !(child = BrowserWindow.getAllWindows().find((w) => w !== parent)) ||
        child.webContents.isLoadingMainFrame() ||
        !child.webContents.getURL().includes("index.html")
      ) {
        assert.ok(Date.now() < deadline, "Native crop window did not load");
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      await child.webContents.executeJavaScript(`(async () => {
        const deadline=performance.now()+5000;
        while(!document.querySelector('[aria-label="Crop width"]')) {
          if(performance.now()>deadline) throw Error('Native crop fields did not render');
          await new Promise(resolve=>setTimeout(resolve,20));
        }
      })()`);
      assert.equal(child.getTitle(), "Crop recording");
      if (action === "confirm") {
        for (const theme of ["dark", "light"] as const) {
          nativeTheme.themeSource = theme;
          await child.webContents.executeJavaScript(`(async () => {
            const deadline=performance.now()+3000;
            while(getComputedStyle(document.documentElement).colorScheme!==${JSON.stringify(theme)}) {
              if(performance.now()>deadline) throw Error('Native crop theme did not update');
              await new Promise(resolve=>setTimeout(resolve,20));
            }
          })()`);
        }
      } else {
        const width = await child.webContents.executeJavaScript(
          `document.querySelector('[aria-label="Crop width"]').value`,
        );
        assert.equal(width, "1000", "Confirmed native crop was not restored");
      }
      await child.webContents.executeJavaScript(
        `(() => {const field=document.querySelector('[aria-label="Crop width"]');field.focus();field.select();})()`,
      );
      for (const digit of action === "confirm"
        ? ["1", "0", "0", "0"]
        : ["8", "0", "0"])
        await child.webContents.insertText(digit);
      if (action === "close") child.close();
      else {
        const keyCode = action === "confirm" ? "Return" : "Escape";
        child.webContents.sendInputEvent({ type: "keyDown", keyCode });
        child.webContents.sendInputEvent({ type: "keyUp", keyCode });
      }
      const result = await parent.webContents.executeJavaScript(`(async () => {
        const deadline=performance.now()+5000;
        while(window.cropResult===undefined) {
          if(performance.now()>deadline) throw Error('Native crop IPC did not resolve');
          await new Promise(resolve=>setTimeout(resolve,20));
        }
        return window.cropResult;
      })()`);
      if (action === "confirm") {
        assert.equal(result.width, 1000);
        assert.equal(result.height, 1080);
        saved = result;
      } else assert.equal(result, null);
      assert.ok(child.isDestroyed(), "Native child remained open");
      assert.ok(parent.isVisible(), "Parent was not restored");
      console.log(action, JSON.stringify(result));
    }
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    nativeTheme.themeSource = "system";
    for (const window of BrowserWindow.getAllWindows()) window.destroy();
    app.exit(Number(process.exitCode ?? 0));
  }
});
