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
      if (action === "confirm") {
        await child.webContents.executeJavaScript(`(() => {
          const select=document.querySelector('[aria-label="Crop aspect ratio"]');
          select.value='1'; select.dispatchEvent(new Event('change',{bubbles:true}));
        })()`);
        await child.webContents.executeJavaScript(
          `(() => {const field=document.querySelector('[aria-label="Crop width"]');field.focus();field.select();})()`,
        );
        await child.webContents.insertText("199");
        const invalid = await child.webContents.executeJavaScript(
          `({disabled:document.querySelector('[data-dialog-default]').disabled,warning:document.querySelector('[role="status"]')?.textContent})`,
        );
        assert.equal(invalid.disabled, true);
        assert.match(invalid.warning, /200/);
        child.webContents.sendInputEvent({
          type: "keyDown",
          keyCode: "Return",
        });
        child.webContents.sendInputEvent({ type: "keyUp", keyCode: "Return" });
        await child.webContents.executeJavaScript(
          `new Promise(resolve=>setTimeout(resolve,50))`,
        );
        assert.equal(
          await parent.webContents.executeJavaScript(
            `window.cropResult === undefined`,
          ),
          true,
          "Enter accepted an undersized crop",
        );
        await child.webContents.executeJavaScript(
          `document.querySelector('[aria-label="Crop width"]').select()`,
        );
      }
      for (const digit of action === "confirm"
        ? ["1", "0", "0", "0"]
        : ["8", "0", "0"])
        await child.webContents.insertText(digit);
      if (action === "confirm") {
        const settle = () =>
          child!.webContents.executeJavaScript(
            `new Promise(resolve=>setTimeout(resolve,40))`,
          );
        const cropSize = () =>
          child!.webContents.executeJavaScript(`({
          width:Number(document.querySelector('[aria-label="Crop width"]').value),
          height:Number(document.querySelector('[aria-label="Crop height"]').value)
        })`);
        const handle = await child.webContents.executeJavaScript(`(() => {
          const r=document.querySelector('[aria-label="Resize crop e. Use arrow keys."]').getBoundingClientRect();
          return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)};
        })()`);
        child.webContents.sendInputEvent({
          type: "mouseDown",
          ...handle,
          button: "left",
          clickCount: 1,
        });
        child.webContents.sendInputEvent({
          type: "mouseMove",
          x: handle.x - 40,
          y: handle.y,
          button: "left",
        });
        await settle();
        assert.ok(
          (await cropSize()).width < 1000,
          "Crop draft did not follow drag",
        );
        child.webContents.sendInputEvent({
          type: "keyDown",
          keyCode: "Escape",
        });
        child.webContents.sendInputEvent({ type: "keyUp", keyCode: "Escape" });
        child.webContents.sendInputEvent({
          type: "mouseUp",
          x: handle.x - 40,
          y: handle.y,
          button: "left",
          clickCount: 1,
        });
        await settle();
        assert.deepEqual(
          await cropSize(),
          { width: 1000, height: 1000 },
          "Escape did not restore crop",
        );
        assert.equal(
          await parent.webContents.executeJavaScript(
            `window.cropResult===undefined`,
          ),
          true,
          "Drag Escape closed crop window",
        );
        child.webContents.sendInputEvent({
          type: "mouseDown",
          ...handle,
          button: "left",
          clickCount: 1,
        });
        child.webContents.sendInputEvent({
          type: "mouseUp",
          x: handle.x - 60,
          y: handle.y,
          button: "left",
          clickCount: 1,
        });
        await settle();
        const resized = await cropSize();
        assert.ok(resized.width < 950, "Crop ignored final release position");
        assert.equal(
          resized.width,
          resized.height,
          "Handle resize lost square aspect ratio",
        );
        await child.webContents.executeJavaScript(`(() => {
          const field=document.querySelector('[aria-label="Crop width"]');field.focus();field.select();
        })()`);
        await child.webContents.insertText("1000");
        console.log("crop pointer release and Escape passed");
      }
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
        assert.equal(
          result.height,
          1000,
          "Square ratio was lost during numeric entry",
        );
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
