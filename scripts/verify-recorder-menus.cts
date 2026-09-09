import { app, BrowserWindow, Menu } from "electron";
import path from "node:path";
import assert from "node:assert/strict";

app.setPath(
  "userData",
  path.resolve(`work/recorder-menus/profile-${process.pid}`),
);
const settingsMode = process.argv.includes("--settings");
const cameraMode = process.argv.includes("--camera");
const buildMenu = Menu.buildFromTemplate.bind(Menu);
let inputMenu: Menu | undefined;
Menu.buildFromTemplate = (template) => {
  const menu = buildMenu(template);
  if (
    template.some(
      (item) =>
        item.label ===
        (settingsMode
          ? "Recording countdown"
          : cameraMode
            ? "Max camera resolution"
            : "Don't record system audio"),
    )
  )
    inputMenu = menu;
  return menu;
};
require(path.resolve("dist-electron/desktop/main.cjs"));
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(check: () => boolean | Promise<boolean>, message: string) {
  const deadline = Date.now() + 8000;
  while (!(await check())) {
    assert.ok(Date.now() < deadline, message);
    await wait(20);
  }
}
void app.whenReady().then(async () => {
  try {
    let bar: BrowserWindow | undefined;
    await until(() => {
      bar = BrowserWindow.getAllWindows().find((window) =>
        window.webContents.getURL().endsWith("#recorder"),
      );
      return !!bar;
    }, "Recorder window did not load");
    const contents = bar!.webContents;
    app.focus({ steal: true });
    bar!.show();
    bar!.focus();
    await until(
      () =>
        contents.executeJavaScript(
          "!!document.querySelector('[data-recorder-bar]')",
        ),
      "Recorder did not mount",
    );
    contents.focus();
    await until(
      () => contents.executeJavaScript("document.hasFocus()"),
      "Recorder did not receive focus",
    );
    await contents.executeJavaScript(
      "new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(null))))",
    );
    const bounds = bar!.getBounds();
    assert.equal(
      await contents.executeJavaScript(
        "document.documentElement.classList.contains('native-recorder-glass') && getComputedStyle(document.querySelector('[data-recorder-bar]')).backdropFilter === 'none'",
      ),
      true,
      "Swift material was not installed, or CSS still obscures it",
    );
    let resizes = 0;
    bar!.on("resize", () => resizes++);
    await contents.executeJavaScript(`window.originalBar = document.querySelector('[data-recorder-bar]');
      window.originalControls = Array.from(window.originalBar.querySelectorAll('button'));
      window.openAudio = () => window.originalControls.find(button => /system audio/i.test(button.textContent)).click(); void 0;`);
    const interactions: Array<readonly [string, boolean]> = [
      ["context", false],
      ["keyboard", true],
      ["click", false],
    ];
    if (settingsMode)
      interactions.push(["click", true], ["click", true], ["click", true]);
    let settingsSelection = 0;
    for (const [activation, select] of interactions) {
      inputMenu = undefined;
      bar!.focus();
      const point = await contents.executeJavaScript(`(() => {
        const rect = window.originalControls.find(button => ${settingsMode ? "/Recording options/" : cameraMode ? "/camera/i" : "/system audio/i"}.test(button.getAttribute("aria-label") || button.textContent)).getBoundingClientRect();
        return {x: Math.round(rect.x + rect.width/2), y: Math.round(rect.y + rect.height/2)};
      })()`);
      if (activation === "keyboard") {
        await contents.executeJavaScript(
          `window.originalControls.find(button => ${settingsMode ? "/Recording options/" : cameraMode ? "/camera/i" : "/system audio/i"}.test(button.getAttribute("aria-label") || button.textContent)).focus()`,
        );
        contents.sendInputEvent({ type: "keyDown", keyCode: "Down" });
        contents.sendInputEvent({ type: "keyUp", keyCode: "Down" });
      } else {
        const button = activation === "context" ? "right" : "left";
        contents.sendInputEvent({ type: "mouseMove", ...point });
        contents.sendInputEvent({
          type: "mouseDown",
          button,
          clickCount: 1,
          ...point,
        });
        contents.sendInputEvent({
          type: "mouseUp",
          button,
          clickCount: 1,
          ...point,
        });
      }
      await until(() => !!inputMenu, "Native input menu was not built");
      await wait(100);
      assert.deepEqual(
        bar!.getBounds(),
        bounds,
        "Opening menu moved/resized the recorder",
      );
      if (settingsMode) {
        const choices = inputMenu!.items.find(
          (item) => item.label === "Recording countdown",
        )!.submenu!.items;
        assert.deepEqual(
          choices.map((item) => item.label),
          ["No countdown", "3s", "5s", "10s"],
        );
        if (select) {
          if (settingsSelection === 0) choices[2].click();
          else if (settingsSelection === 1)
            inputMenu!.items
              .find((item) => item.label === "Automatically create zooms")!
              .click();
          else if (settingsSelection === 2)
            inputMenu!.items
              .find((item) => item.label === "After recording")!
              .submenu!.items[1].click();
          if (settingsSelection === 3)
            inputMenu!.items
              .find(
                (item) => item.label === "Hide desktop icons in recorded video",
              )!
              .click();
          settingsSelection++;
        }
      } else if (cameraMode) {
        const choices = inputMenu!.items.find(
          (item) => item.label === "Max camera resolution",
        )!.submenu!.items;
        assert.deepEqual(
          choices.map((item) => item.label),
          ["720p", "1080p", "4K"],
        );
        if (select) choices[2].click();
      } else {
        assert.equal(
          inputMenu!.items[0].label,
          "Record system audio from all apps",
        );
        if (select) inputMenu!.items[0].click();
      }
      inputMenu!.closePopup(bar!);
      await until(
        () =>
          contents.executeJavaScript(
            "!document.querySelector('[data-recorder-bar] [aria-expanded=true]')",
          ),
        "Menu did not settle",
      );
      assert.deepEqual(
        bar!.getBounds(),
        bounds,
        "Closing menu moved/resized the recorder",
      );
      await contents.executeJavaScript(`(() => {
        if(window.originalBar !== document.querySelector('[data-recorder-bar]')) throw Error('Toolbar remounted');
        if(window.originalControls.some(button => !button.isConnected)) throw Error('Toolbar controls remounted');
        if(document.querySelector('[data-floating-surface="recorder"]')) throw Error('Input menu expanded the recorder panel');
      })()`);
      // Programmatic NSMenu cancellation finishes its native tracking after the callback.
      await wait(1200);
    }
    assert.equal(resizes, 0, "Input selection triggered a native resize");
    if (settingsMode) {
      assert.equal(
        await contents.executeJavaScript(
          "localStorage.getItem('refract.recorder.countdownSeconds')",
        ),
        "5",
      );
      assert.equal(
        await contents.executeJavaScript(
          "localStorage.getItem('refract.recorder.automaticZooms')",
        ),
        "false",
      );
      assert.equal(
        await contents.executeJavaScript(
          "JSON.parse(localStorage.getItem('refract.recorder.completion')).action",
        ),
        "export-file",
      );
      assert.equal(
        await contents.executeJavaScript(
          "localStorage.getItem('refract.recorder.hideDesktopIcons')",
        ),
        "true",
      );
    } else if (cameraMode) {
      assert.equal(
        await contents.executeJavaScript(
          "localStorage.getItem('refract.recorder.cameraResolution')",
        ),
        "2160",
      );
      assert.equal(
        await contents.executeJavaScript(
          "window.originalControls.some(button => button.textContent === 'No camera')",
        ),
        true,
        "Resolution selection changed the camera input",
      );
    } else {
      const label = await contents.executeJavaScript(
        "window.originalControls.find(button => /system audio/i.test(button.textContent)).textContent",
      );
      assert.equal(
        label,
        "System audio",
        "Native selection did not update the renderer",
      );
    }
    console.log(
      JSON.stringify({
        nativeMenu: "passed",
        cancelledSelection: "preserved",
        inputSelection: "passed",
        toolbarIdentity: "preserved",
        nativeResizes: resizes,
      }),
    );
    app.exit(0);
  } catch (error) {
    console.error(error);
    app.exit(1);
  }
});
