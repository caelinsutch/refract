import assert from "node:assert/strict";
import { app, BrowserWindow, nativeTheme } from "electron";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
const directory = path.resolve("work/inspector-fields");
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
      "testsrc2=size=320x240:rate=30:duration=2",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      source,
    ]);
    const encoded = (await fs.readFile(source)).toString("base64");
    window = new BrowserWindow({
      show: false,
      width: 1320,
      height: 880,
      webPreferences: {
        sandbox: true,
        backgroundThrottling: false,
        autoplayPolicy: "no-user-gesture-required",
      },
    });
    window.webContents.on("console-message", (_event, level, message) => {
      if (level >= 3) console.error(message);
    });
    await window.loadFile(path.resolve("dist/index.html"));
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
      transfer.items.add(new File([bytes], 'Inspector verification.mp4', {type:'video/mp4'}));
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
    await read(`window.slider=document.querySelector('input[aria-label="Padding"]');
      slider.scrollIntoView({block:'center'});
      window.field=slider.closest('[data-setting-field]');
      window.bubble=field.querySelector('[data-setting-value]');
      window.geometry=()=>{const r=slider.getBoundingClientRect();return [r.x,r.y,r.width,r.height]};
      window.before=geometry(); void 0;`);
    c.sendInputEvent({ type: "mouseMove", x: 1, y: 1 });
    await wait(500);
    assert.equal(await read("Number(getComputedStyle(bubble).opacity)"), 0);
    assert.equal(await read("getComputedStyle(field).rowGap"), "8px");
    assert.equal(
      await read("getComputedStyle(field.firstElementChild).fontSize"),
      "13px",
    );
    const blurRect = await read(
      `(()=>{window.blurSlider=document.querySelector('input[aria-label="Background blur"]');const r=blurSlider.getBoundingClientRect();return {x:Math.round(r.x+20),y:Math.round(r.y+r.height/2)}})()`,
    );
    c.sendInputEvent({ type: "mouseMove", ...blurRect });
    await wait(500);
    assert.equal(
      await read(
        `(()=>{const b=blurSlider.parentElement.querySelector('[data-setting-value]');return Number(getComputedStyle(b).opacity)===1 && b.getBoundingClientRect().bottom < blurSlider.getBoundingClientRect().top})()`,
      ),
      true,
      "Blur tooltip should appear above thumb",
    );
    assert.equal(
      await read(`bubble.textContent.trim()`),
      "10.0%",
      "Padding preview precision",
    );
    await read("slider.focus()");
    c.sendInputEvent({ type: "keyDown", keyCode: "Right" });
    c.sendInputEvent({ type: "keyUp", keyCode: "Right" });
    await wait(100);
    assert.equal(
      await read("Number(slider.value)"),
      10.35,
      "Padding lost fractional precision",
    );
    await read(
      `document.querySelector('button[aria-label="Reset Padding"]').click();document.activeElement.blur()`,
    );
    await wait(100);
    const rect = await read(
      "(()=>{const r=slider.getBoundingClientRect();return {x:Math.round(r.x+20),y:Math.round(r.y+r.height/2)}})()",
    );
    c.sendInputEvent({ type: "mouseMove", ...rect });
    await wait(500);
    assert.equal(await read("Number(getComputedStyle(bubble).opacity)"), 1);
    assert.deepEqual(await read("geometry()"), await read("before"));
    const alignment = await read(
      `(()=>{const b=bubble.getBoundingClientRect(),r=slider.getBoundingClientRect();return Math.abs(b.x+b.width/2-(r.x+10+(r.width-20)*Number(slider.value)/35));})()`,
    );
    assert.ok(alignment < 1, "Preview does not follow thumb");
    await read(
      `document.querySelector('button[aria-label="Edit Padding"]').click()`,
    );
    await c.insertText("18");
    c.sendInputEvent({ type: "keyDown", keyCode: "Return" });
    c.sendInputEvent({ type: "keyUp", keyCode: "Return" });
    await wait(100);
    assert.equal(await read("Number(slider.value)"), 18);
    await read(
      `document.querySelector('button[aria-label="Edit Padding"]').click()`,
    );
    await c.insertText("21");
    c.sendInputEvent({ type: "keyDown", keyCode: "Escape" });
    c.sendInputEvent({ type: "keyUp", keyCode: "Escape" });
    await wait(100);
    assert.equal(await read("Number(slider.value)"), 18);
    await read(
      `window.corners=document.querySelector('input[aria-label="Rounded corners"]');window.cornerBefore=Number(corners.value);corners.focus()`,
    );
    c.sendInputEvent({ type: "keyDown", keyCode: "Right" });
    c.sendInputEvent({ type: "keyUp", keyCode: "Right" });
    await wait(100);
    assert.equal(await read("Number(corners.value)-cornerBefore"), 2);
    await read(
      `document.querySelector('button[aria-label="Reset Padding"]').click()`,
    );
    await wait(100);
    assert.equal(await read("Number(slider.value)"), 10);
    await read("slider.focus()");
    c.sendInputEvent({ type: "mouseMove", x: 1, y: 1 });
    await wait(500);
    assert.equal(
      await read("Number(getComputedStyle(bubble).opacity)"),
      1,
      "Keyboard focus hid value",
    );
    await fs.writeFile(
      path.join(directory, "inspector.png"),
      (await c.capturePage()).toPNG(),
    );
    await read(
      `document.querySelector('button[aria-label="Edit Inset"]').click()`,
    );
    await c.insertText("45.5");
    c.sendInputEvent({ type: "keyDown", keyCode: "Return" });
    c.sendInputEvent({ type: "keyUp", keyCode: "Return" });
    await wait(100);
    assert.equal(
      await read(
        `Number(document.querySelector('input[aria-label="Inset"]').value)`,
      ),
      45.5,
    );
    assert.equal(
      await read("Number(corners.value)"),
      58,
      "Inset did not update outer radius",
    );
    await wait(600);
    const suggested = await read(
      `(()=>{const buttons=[...document.querySelectorAll('[aria-label="Suggested inset colors"] button')];return buttons.map(button=>button.title)})()`,
    );
    assert.ok(
      suggested.length > 0 && suggested.length <= 24,
      "Missing source color suggestions",
    );
    const previousColor = await read(
      `document.querySelector('input[aria-label="Inset color"]').value`,
    );
    await read(
      `document.querySelector('[aria-label="Suggested inset colors"] button').click()`,
    );
    await wait(100);
    assert.equal(
      await read(
        `document.querySelector('input[aria-label="Inset color"]').value`,
      ),
      suggested[0],
    );
    await read(`document.querySelector('button[aria-label="Undo"]').click()`);
    await wait(100);
    assert.equal(
      await read(
        `document.querySelector('input[aria-label="Inset color"]').value`,
      ),
      previousColor,
    );
    await read(`document.querySelector('button[aria-label="Undo"]').click()`);
    await wait(100);
    assert.equal(
      await read(
        `Number(document.querySelector('input[aria-label="Inset"]').value)`,
      ),
      0,
    );
    assert.equal(
      await read("Number(corners.value)"),
      14,
      "Undo did not restore both fields",
    );
    await read(`document.querySelector('button[aria-label="Redo"]').click()`);
    await wait(100);
    assert.equal(await read("Number(corners.value)"), 58);
    await read(
      `document.querySelector('button[aria-label="Edit Inset opacity"]').click()`,
    );
    await c.insertText("0.375");
    c.sendInputEvent({ type: "keyDown", keyCode: "Return" });
    c.sendInputEvent({ type: "keyUp", keyCode: "Return" });
    await wait(100);
    assert.equal(
      await read(
        `Number(document.querySelector('input[aria-label="Inset opacity"]').value)`,
      ),
      0.375,
    );
    await read(`document.querySelector('button[aria-label="Undo"]').click()`);
    await wait(100);
    assert.equal(
      await read(
        `Number(document.querySelector('input[aria-label="Inset opacity"]').value)`,
      ),
      1,
    );
    await read(
      `Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Inset balance').click()`,
    );
    await wait(100);
    await read(
      `window.balance=document.querySelector('[data-inset-balance]');balance.scrollIntoView({block:'center'});balance.focus()`,
    );
    c.sendInputEvent({
      type: "keyDown",
      keyCode: "Right",
      modifiers: ["shift"],
    });
    c.sendInputEvent({ type: "keyUp", keyCode: "Right", modifiers: ["shift"] });
    await wait(100);
    assert.ok(
      (await read(`balance.getAttribute('aria-description')`)).includes(
        "Left 60 percent",
      ),
    );
    const balanceRect = await read(
      `(()=>{const r=balance.getBoundingClientRect();return {x:Math.round(r.left+r.width*.25),y:Math.round(r.top+r.height*.75)}})()`,
    );
    c.sendInputEvent({ type: "mouseMove", ...balanceRect });
    c.sendInputEvent({ type: "mouseDown", button: "left", ...balanceRect });
    const dragged = await read(
      `(()=>{const r=balance.getBoundingClientRect();return {x:Math.round(r.left+r.width*.75),y:Math.round(r.top+r.height*.25)}})()`,
    );
    c.sendInputEvent({ type: "mouseMove", ...dragged });
    c.sendInputEvent({ type: "mouseUp", button: "left", ...dragged });
    await wait(100);
    assert.ok(
      (await read(`balance.getAttribute('aria-description')`)).includes(
        "Left 75 percent",
      ),
    );
    await read(
      `document.querySelector('button[aria-label="Reset inset balance"]').click()`,
    );
    await wait(100);
    assert.ok(
      (await read(`balance.getAttribute('aria-description')`)).includes(
        "Left 50 percent, top 50 percent",
      ),
    );
    await read(
      `document.querySelector('button[aria-label="Reset Inset"]').click()`,
    );
    await wait(100);
    assert.equal(
      await read("Number(corners.value)"),
      12,
      "Inset reset did not reset radius",
    );
    c.debugger.attach("1.3");
    await c.debugger.sendCommand("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });
    assert.equal(
      await read("getComputedStyle(bubble).transitionDuration"),
      "0s",
    );
    nativeTheme.themeSource = "dark";
    await wait(100);
    assert.equal(
      await read("matchMedia('(prefers-color-scheme: dark)').matches"),
      true,
    );
    assert.notEqual(
      await read("getComputedStyle(bubble).backgroundColor"),
      "rgba(0, 0, 0, 0)",
    );
    c.debugger.detach();
    console.log(
      JSON.stringify({
        rest: "hidden",
        hover: "thumb-aligned",
        geometry: "stationary",
        enter: "committed",
        escape: "cancelled",
        arrows: "reference increment",
        reset: "restored",
        keyboard: "visible",
      }),
    );
    app.exit(0);
  } catch (error) {
    console.error(error);
    app.exit(1);
  }
});
