import assert from "node:assert/strict";
import { app, BrowserWindow } from "electron";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
const directory = path.resolve("work/editor-layout-modes");
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
    await wait(300);
    await read(
      `window.originalPreview=document.querySelector('canvas[aria-label="Video composition preview"]')`,
    );
    const state = () =>
      read(
        `({sidebar:!!document.querySelector('aside'),timeline:!!document.querySelector('[data-timeline]'),tools:!!document.querySelector('nav[aria-label="Recording tools"]'),zoom:!!document.querySelector('input[aria-label="Timeline zoom"]'),split:!!document.querySelector('button[aria-label="Split clip (Option)"]'),samePreview:window.originalPreview===document.querySelector('canvas[aria-label="Video composition preview"]')})`,
      );
    const check = async (sidebar: boolean, timeline: boolean) => {
      await wait(150);
      assert.deepEqual(await state(), {
        sidebar,
        timeline,
        tools: sidebar,
        zoom: timeline,
        split: timeline,
        samePreview: true,
      });
    };
    const command = async (id: string) => {
      await read(
        `document.activeElement?.blur(); window.dispatchEvent(new KeyboardEvent('keydown',{key:'k',metaKey:true,bubbles:true}))`,
      );
      await wait(80);
      await read(`document.querySelector('#command-${id}').click()`);
    };
    await check(true, true);
    await command("toggle-sidebar");
    await check(false, true);
    await command("toggle-timeline");
    await check(false, false);
    await command("toggle-sidebar");
    await check(true, false);
    await command("toggle-timeline");
    await check(true, true);
    await command("toggle-preview");
    await check(false, false);
    await command("toggle-preview");
    await check(true, true);
    await command("toggle-sidebar");
    await check(false, true);
    await read(
      `document.activeElement?.blur(); window.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',metaKey:true,shiftKey:true,bubbles:true}))`,
    );
    await check(false, false);
    await fs.writeFile(
      path.join(directory, "preview-mode.png"),
      (await c.capturePage()).toPNG(),
    );
    await read(
      `window.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',metaKey:true,shiftKey:true,bubbles:true}))`,
    );
    await check(true, true);
    console.log(
      JSON.stringify({
        layoutModes: "all transitions passed",
        shortcut: "Command Shift Return",
        preview: "canvas retained",
        timelineControls: "follow timeline visibility",
      }),
    );
    app.exit(0);
  } catch (error) {
    console.error(error);
    app.exit(1);
  }
});
