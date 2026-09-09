import assert from "node:assert/strict";
import { app, BrowserWindow } from "electron";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
const directory = path.resolve("work/editor-hover");
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
      transfer.items.add(new File([bytes], 'Hover verification.mp4', {type:'video/mp4'}));
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
    const results: string[] = [];
    async function hover(selector: string) {
      c.sendInputEvent({ type: "mouseMove", x: 1, y: 1 });
      await wait(650);
      const rect = await read(`(() => {
        window.subject = document.querySelector(${JSON.stringify(selector)});
        if (!subject?.dataset.hoverSurface) throw Error('Missing hover surface: '+${JSON.stringify(selector)});
        window.geometry = () => {const r=subject.getBoundingClientRect(); return [r.x,r.y,r.width,r.height]};
        window.before = geometry();
        window.sample = () => ({scale:Number(getComputedStyle(subject,'::before').scale),opacity:Number(getComputedStyle(subject,'::before').opacity)});
        const r=subject.getBoundingClientRect(); return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)};
      })()`);
      c.sendInputEvent({ type: "mouseMove", ...rect });
      await wait(60);
      const entering = await read("sample()");
      assert.ok(
        entering.scale > 0.8 && entering.scale < 1,
        selector +
          JSON.stringify({
            entering,
            rect,
            hit: await read(
              `document.elementFromPoint(${rect.x},${rect.y})?.outerHTML`,
            ),
            subject: await read("subject.outerHTML"),
          }),
      );
      await wait(650);
      assert.equal((await read("sample()")).scale, 1, selector);
      assert.equal((await read("sample()")).opacity, 1, selector);
      assert.deepEqual(
        await read("geometry()"),
        await read("before"),
        selector + " moved",
      );
      results.push(selector);
    }
    await hover('button[aria-label="Play"]');
    await hover("[data-wallpaper-swatch]");
    await hover('[data-timeline] [role="button"]');
    assert.equal(
      await read(
        `Number(getComputedStyle(subject.querySelector('button'),'::before').opacity)`,
      ),
      0,
      "Nested trim control inherited parent hover",
    );
    await read(
      `document.querySelector('button[aria-label="Playback speed"]').dispatchEvent(new MouseEvent("contextmenu",{bubbles:true}))`,
    );
    await wait(250);
    await hover('[aria-label="Playback speed options"] [role="menuitemradio"]');
    await read(
      `document.querySelector('[aria-label="Playback speed options"]').hidePopover()`,
    );
    await read(
      `document.querySelector('button[aria-label="Video preview performance settings"]').click()`,
    );
    await wait(250);
    await hover('[role="switch"][aria-label="Power saving mode"]');
    console.log(
      JSON.stringify({
        editorHover: results,
        geometry: "stationary",
        nestedControls: "isolated",
      }),
    );
    app.exit(0);
  } catch (error) {
    console.error(error);
    app.exit(1);
  }
});
