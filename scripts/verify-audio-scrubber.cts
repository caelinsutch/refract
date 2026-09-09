import assert from "node:assert/strict";
import { app, BrowserWindow } from "electron";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
const directory = path.resolve("work/audio-scrubber");
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
      "-f",
      "lavfi",
      "-i",
      "sine=frequency=440:duration=2",
      "-shortest",
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
      window.scrubPlayers=[]; window.scrubCalls=[]; window.scrubPauses=0;
      const OriginalAudio=window.Audio;
      window.Audio=class extends OriginalAudio {
        constructor(...args) {super(...args);window.scrubPlayers.push(this);}
        play() {window.scrubCalls.push({time:this.currentTime,volume:this.volume});return Promise.resolve();}
        pause() {window.scrubPauses++;super.pause();}
      };
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
    await wait(200);
    const seekFrame = async () => {
      await read(
        "document.activeElement?.blur();window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}))",
      );
      await wait(20);
    };
    await seekFrame();
    assert.equal(
      await read("scrubCalls.length"),
      0,
      "Disabled scrubber played",
    );
    await read(
      `document.querySelector('button[aria-label="Enable audio scrubber (experimental)"]').click()`,
    );
    await read(
      `new Promise((resolve,reject)=>{const start=performance.now(); const check=()=>{if(scrubPlayers[0]?.readyState>=3)resolve(true);else if(performance.now()-start>5000)reject(Error('Audio did not load'));else setTimeout(check,20)};check()})`,
    );
    await seekFrame();
    const sample = await read("scrubCalls.at(-1)");
    assert.ok(
      Math.abs(sample.time - 2 / 60) < 0.002,
      "Audio not aligned to seek",
    );
    assert.equal(sample.volume, 0.75);
    const before = await read("scrubPauses");
    await wait(180);
    assert.ok((await read("scrubPauses")) > before, "Sample did not stop");
    await read(
      `document.querySelector('button[aria-label="Mute source audio"]').click()`,
    );
    await wait(50);
    const count = await read("scrubCalls.length");
    await seekFrame();
    assert.equal(await read("scrubCalls.length"), count, "Muted clip scrubbed");
    await read(
      `document.querySelector('button[aria-label="Disable audio scrubber"]').click()`,
    );
    await wait(50);
    assert.equal(
      await read("localStorage.getItem('refract.audio.scrubber')"),
      "false",
    );
    assert.equal(
      await read('scrubPlayers[0].getAttribute("src")'),
      null,
      "Disabled scrubber retained media",
    );
    console.log(
      JSON.stringify({
        audioScrubber: "aligned 150ms audition at 75% gain",
        disabled: "silent and released",
        mute: "respected",
        output: "play mocked to avoid audible test tones",
      }),
    );
    app.exit(0);
  } catch (error) {
    console.error(error);
    app.exit(1);
  }
});
