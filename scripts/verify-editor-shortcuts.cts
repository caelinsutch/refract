import assert from "node:assert/strict";
import { app, BrowserWindow } from "electron";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
const directory = path.resolve("work/editor-shortcuts");
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
      "testsrc2=size=1280x720:rate=30:duration=6",
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
    await wait(300);
    const press = async (key: string, modifiers = {}) => {
      await read(
        `document.activeElement?.blur(); window.dispatchEvent(new KeyboardEvent('keydown',{key:${JSON.stringify(key)},bubbles:true,...${JSON.stringify(modifiers)}}))`,
      );
      await wait(100);
    };
    const position = () =>
      read(
        `Array.from(document.querySelectorAll('video')).find(v=>v.src.startsWith('blob:')).currentTime`,
      );
    const isPlaying = () =>
      read(`!!document.querySelector('button[aria-label="Pause"]')`);
    await press("ArrowRight");
    assert.ok(
      Math.abs((await position()) - 1 / 60) < 0.002,
      "One-frame seek was skipped",
    );
    await press("ArrowRight");
    assert.ok(Math.abs((await position()) - 2 / 60) < 0.002);
    await press("ArrowLeft");
    assert.ok(Math.abs((await position()) - 1 / 60) < 0.002);
    await press("ArrowRight", { metaKey: true });
    assert.ok((await position()) > 5.95, "Command-right did not reach end");
    assert.equal(await isPlaying(), false);
    await press("ArrowLeft", { metaKey: true });
    assert.ok(
      (await position()) < 0.002,
      "Command-left did not return to start",
    );
    await press("ArrowRight", { shiftKey: true });
    assert.ok(Math.abs((await position()) - 1) < 0.002);
    await press("ArrowRight", { shiftKey: true });
    await press("ArrowRight", { shiftKey: true });
    await press("ArrowLeft", { shiftKey: true });
    assert.ok(
      Math.abs((await position()) - 1) < 0.002,
      "Fast backward step mismatch",
    );
    await read(`document.querySelector('button[aria-label="Play"]').click()`);
    await wait(150);
    const before = await position();
    await press("ArrowRight");
    assert.equal(await isPlaying(), true, "Arrow seek stopped playback");
    assert.ok(
      (await position()) > before + 0.45,
      "Playing arrow seek did not advance",
    );
    await press("ArrowLeft", { metaKey: true });
    assert.equal(await isPlaying(), false);
    assert.ok((await position()) < 0.002);
    console.log(
      JSON.stringify({
        frameStep: "60fps preview clock",
        boundaries: "Command arrows",
        fastSteps: "reference increments",
        playingSeek: "continues playback",
      }),
    );
    app.exit(0);
  } catch (error) {
    console.error(error);
    app.exit(1);
  }
});
