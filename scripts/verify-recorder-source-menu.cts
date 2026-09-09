import { app, BrowserWindow, Menu } from "electron";
import assert from "node:assert/strict";
import path from "node:path";
app.setPath(
  "userData",
  path.resolve(`work/recorder-source-menu/profile-${process.pid}`),
);
let track = false,
  menu: Menu | undefined;
const build = Menu.buildFromTemplate.bind(Menu);
Menu.buildFromTemplate = (template) => {
  const next = build(template);
  if (track) menu = next;
  return next;
};
require(path.resolve("dist-electron/desktop/main.cjs"));
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(check: () => boolean | Promise<boolean>, message: string) {
  const deadline = Date.now() + 10000;
  while (!(await check())) {
    assert.ok(Date.now() < deadline, message);
    await wait(25);
  }
}
void app.whenReady().then(async () => {
  try {
    let bar: BrowserWindow | undefined;
    await until(() => {
      bar = BrowserWindow.getAllWindows().find((w) =>
        w.webContents.getURL().endsWith("#recorder"),
      );
      return !!bar;
    }, "Recorder not loaded");
    const c = bar!.webContents;
    await until(
      () =>
        c.executeJavaScript("!!document.querySelector('[data-recorder-bar]')"),
      "Toolbar not mounted",
    );
    app.focus({ steal: true });
    bar!.show();
    bar!.focus();
    c.focus();
    await until(
      () => c.executeJavaScript("document.hasFocus()"),
      "Recorder not focused",
    );
    const bounds = bar!.getBounds();
    await c.executeJavaScript(
      `window.originalBar=document.querySelector('[data-recorder-bar]'); void 0;`,
    );
    for (const select of [false, true]) {
      track = true;
      menu = undefined;
      const point = await c.executeJavaScript(
        `(()=>{const b=[...document.querySelectorAll('[data-recorder-bar] button')].find(b=>b.textContent==='Window');b.focus();const r=b.getBoundingClientRect();return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})()`,
      );
      if (select) {
        c.sendInputEvent({ type: "keyDown", keyCode: "Down" });
        c.sendInputEvent({ type: "keyUp", keyCode: "Down" });
      } else {
        c.sendInputEvent({ type: "mouseDown", button: "right", ...point });
        c.sendInputEvent({ type: "mouseUp", button: "right", ...point });
      }
      await until(() => !!menu, "Native source menu did not open");
      assert.deepEqual(
        bar!.getBounds(),
        bounds,
        "Opening source menu resized toolbar",
      );
      if (select) {
        let choice = menu!.items.find(
          (i) => i.enabled && i.type !== "separator",
        );
        if (choice?.submenu)
          choice = choice.submenu.items.find((i) => i.enabled);
        assert.ok(choice, "No available window to select");
        assert.equal(choice.type, "checkbox");
        choice.click();
      }
      menu!.closePopup(bar!);
      await until(
        () =>
          c.executeJavaScript(
            "!document.querySelector('[data-recorder-bar] [aria-expanded=true]')",
          ),
        "Source menu did not close",
      );
      if (!select)
        assert.deepEqual(bar!.getBounds(), bounds, "Cancel resized toolbar");
      await wait(1200);
    }
    await until(
      () =>
        c.executeJavaScript(
          "[...document.querySelectorAll('button')].some(b=>b.textContent===' Record window' || b.textContent.trim()==='Record window')",
        ),
      "Selection did not prepare target",
    );
    const result = await c.executeJavaScript(
      `(async()=>({phase:(await window.refract.recorderState()).phase,same:window.originalBar===document.querySelector('[data-recorder-bar]'),focus:document.activeElement.textContent.trim()}))()`,
    );
    assert.equal(result.phase, "idle", "Selecting a source started recording");
    assert.equal(result.same, true, "Toolbar remounted");
    assert.equal(result.focus, "Record window", "Ready action was not focused");
    console.log(
      JSON.stringify({
        contextMenu: "passed",
        keyboardMenu: "passed",
        cancel: "preserved",
        selection: "ready without recording",
        toolbar: "preserved",
      }),
    );
    app.exit(0);
  } catch (error) {
    console.error(error);
    app.exit(1);
  }
});
