import assert from "node:assert/strict";
import { app, BrowserWindow } from "electron";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
const directory = path.resolve("work/export-preferences");
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
    const loadSynthetic = () =>
      window!.webContents.executeJavaScript(`(async () => {
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
    await loadSynthetic();
    const c = window.webContents;
    const read = (code: string) => c.executeJavaScript(code);
    const wait = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));
    const open = async () => {
      await read(
        `[...document.querySelectorAll('button')].find(button=>button.textContent.trim()==='Export').click()`,
      );
      await wait(100);
    };
    const values = () =>
      read(
        `Object.fromEntries(['Export format','Output size','Frame rate'].map(label=>[label,document.querySelector('select[aria-label="'+label+'"]').value]))`,
      );
    const change = async (label: string, value: string) => {
      await read(
        `(()=>{const node=document.querySelector('select[aria-label="'+${JSON.stringify(label)}+'"]');node.value=${JSON.stringify(value)};node.dispatchEvent(new Event('change',{bubbles:true}));})()`,
      );
      await wait(50);
    };
    await open();
    assert.deepEqual(await values(), {
      "Export format": "mp4",
      "Output size": "720",
      "Frame rate": "60",
    });
    await change("Output size", "2160");
    await change("Frame rate", "50");
    await change("Export format", "gif");
    assert.deepEqual(await values(), {
      "Export format": "gif",
      "Output size": "480",
      "Frame rate": "15",
    });
    await change("Output size", "720");
    await change("Frame rate", "20");
    await change("Export format", "mp4");
    assert.deepEqual(await values(), {
      "Export format": "mp4",
      "Output size": "2160",
      "Frame rate": "50",
    });
    await change("Export format", "gif");
    assert.deepEqual(await values(), {
      "Export format": "gif",
      "Output size": "720",
      "Frame rate": "20",
    });
    await new Promise<void>((resolve) => {
      c.once("did-finish-load", () => resolve());
      c.reload();
    });
    await loadSynthetic();
    await open();
    assert.deepEqual(await values(), {
      "Export format": "gif",
      "Output size": "720",
      "Frame rate": "20",
    });
    await change("Export format", "mp4");
    assert.deepEqual(await values(), {
      "Export format": "mp4",
      "Output size": "2160",
      "Frame rate": "50",
    });
    console.log(
      JSON.stringify({
        formatDefaults: "verified",
        independentSettings: "verified",
        reloadPersistence: "verified",
      }),
    );
    app.exit(0);
  } catch (error) {
    console.error(error);
    app.exit(1);
  }
});
