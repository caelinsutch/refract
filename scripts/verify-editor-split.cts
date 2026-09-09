import assert from "node:assert/strict";
import { app, BrowserWindow } from "electron";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
const directory = path.resolve("work/editor-split");
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
    await wait(500);
    const count = () =>
      read(
        `document.querySelectorAll('[data-timeline] [aria-label^="Clip "]').length`,
      );
    const active = () =>
      read(
        `document.querySelector('button[aria-label="Split clip (Option)"]').getAttribute('aria-pressed')`,
      );
    const key = (type: string, key: string) =>
      read(
        `window.dispatchEvent(new KeyboardEvent(${JSON.stringify(type)},{key:${JSON.stringify(key)},bubbles:true}))`,
      );
    const clickClip = async () => {
      const point = await read(
        `(() => {const r=document.querySelector('[data-timeline] [aria-label^="Clip "]').getBoundingClientRect(); return {x:Math.round(r.x+r.width/4),y:Math.round(r.y+r.height/2)}})()`,
      );
      c.sendInputEvent({ type: "mouseMove", ...point });
      c.sendInputEvent({
        type: "mouseDown",
        button: "left",
        clickCount: 1,
        ...point,
      });
      c.sendInputEvent({
        type: "mouseUp",
        button: "left",
        clickCount: 1,
        ...point,
      });
      await wait(100);
    };
    const undo = async () => {
      await read(`document.querySelector('button[aria-label="Undo"]').click()`);
      await wait(100);
      assert.equal(await count(), 1);
    };
    await read(
      `document.querySelector('button[aria-label="Split clip (Option)"]').click()`,
    );
    await wait(100);
    assert.equal(await active(), "true");
    assert.equal(
      await count(),
      1,
      "Enabling scissors immediately cut at playhead",
    );
    await clickClip();
    assert.equal(await count(), 2);
    const first = await read(
      `document.querySelector('[data-timeline] [aria-label^="Clip "]').textContent`,
    );
    assert.match(first, /Clip 0.5s/, "Split did not follow click position");
    await undo();
    await key("keydown", "Escape");
    await wait(50);
    assert.equal(await active(), "false");
    await read("document.activeElement?.blur()");
    await key("keydown", "Alt");
    await wait(50);
    assert.equal(await active(), "true");
    await clickClip();
    assert.equal(await count(), 2);
    await key("keyup", "Alt");
    await wait(50);
    assert.equal(await active(), "false");
    await undo();
    await clickClip();
    assert.equal(await count(), 1, "Normal selection split the clip");
    await key("keydown", "Alt");
    await wait(50);
    await read("window.dispatchEvent(new Event('blur'))");
    await wait(50);
    assert.equal(await active(), "false", "Option got stuck after blur");
    await read(
      `document.querySelector('button[aria-label="Split clip (Option)"]').click()`,
    );
    await wait(50);
    await key("keydown", "Alt");
    await key("keyup", "Alt");
    await wait(50);
    assert.equal(await active(), "true", "Option release cleared latched tool");
    await key("keydown", "Escape");
    await wait(50);
    assert.equal(await active(), "false");
    console.log(
      JSON.stringify({
        splitTool: "toggle and click position verified",
        temporaryOption: "release and blur verified",
        undo: "one step",
        normalSelection: "unchanged",
      }),
    );
    app.exit(0);
  } catch (error) {
    console.error(error);
    app.exit(1);
  }
});
