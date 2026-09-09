import { app, BrowserWindow } from "electron";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
const directory = path.resolve("work/editor-playback");
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
      "testsrc2=size=320x180:rate=30:duration=2",
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
    await window.loadFile(path.resolve("dist/index.html"));
    const result = await window.webContents.executeJavaScript(`(async () => {
      const check = (condition, message) => { if (!condition) throw Error(message); };
      const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
      const until = async (predicate, message) => {
        const deadline = performance.now() + 6000;
        while (!predicate()) { check(performance.now() < deadline, message); await wait(20); }
      };
      await until(() => document.querySelector('input[accept="video/*"]'), 'Editor did not mount');
      const bytes = Uint8Array.from(atob(${JSON.stringify(encoded)}), c => c.charCodeAt(0));
      const transfer = new DataTransfer();
      transfer.items.add(new File([bytes], 'Playback verification.mp4', {type:'video/mp4'}));
      const input = document.querySelector('input[accept="video/*"]');
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', {bubbles:true}));
      const button = label => document.querySelector('button[aria-label="' + label + '"]');
      const video = () => Array.from(document.querySelectorAll('video')).find(v => v.src.startsWith('blob:'));
      await until(() => video()?.readyState >= 2 && !button('Play')?.disabled, 'Video did not load');
      button('Play').click();
      await until(() => video().currentTime > 0.35, 'Play did not advance media');
      button('Pause').click();
      await until(() => video().paused, 'Pause did not reach media');
      const paused = video().currentTime;
      await wait(150);
      check(Math.abs(video().currentTime - paused) < 0.01, 'Media moved while paused');
      document.dispatchEvent(new KeyboardEvent('keydown', {key:'c',code:'KeyC',bubbles:true}));
      await wait(100);
      button('End').click();
      await until(() => video().currentTime > 1.9 && !video().seeking, 'End did not seek');
      document.dispatchEvent(new KeyboardEvent('keydown', {key:' ',code:'Space',bubbles:true}));
      await until(() => !video().paused && video().currentTime < 1, 'Space did not restart from the end');
      await until(() => video().currentTime > 0.1, 'Restart did not advance');
      const label = document.querySelector('[role="timer"]').textContent;
      const match = label.match(/([0-9]+):([0-9]+)[.]([0-9]+)/);
      check(match, 'Missing playback position');
      const displayed = Number(match[1])*60 + Number(match[2]) + Number('0.'+match[3]);
      check(Math.abs(displayed - video().currentTime) < 0.1, 'Restart used the wrong clip: '+label+' media='+video().currentTime);
      button('Pause').click();
      return { pausedAt:paused, restartedAt:video().currentTime, canvasCount:document.querySelectorAll('canvas').length };
    })()`);
    await window.webContents.executeJavaScript(
      `document.querySelector('button[aria-label="End"]').focus()`,
    );
    window.webContents.sendInputEvent({ type: "keyDown", keyCode: "Space" });
    window.webContents.sendInputEvent({ type: "keyUp", keyCode: "Space" });
    await window.webContents.executeJavaScript(`(async () => {
      const video = Array.from(document.querySelectorAll('video')).find(v => v.src.startsWith('blob:'));
      const deadline = performance.now() + 3000;
      while (video.currentTime < 1.9 || video.seeking) {
        if (performance.now() > deadline) throw Error('Space did not activate the focused End button');
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      if (!video.paused) throw Error('Focused button Space also started playback');
    })()`);
    await window.webContents.executeJavaScript(`(async () => {
      document.activeElement.blur();
      for (const extra of [{repeat:true}, {isComposing:true}, {metaKey:true}]) {
        document.dispatchEvent(new KeyboardEvent('keydown', {key:' ',code:'Space',bubbles:true,...extra}));
        await new Promise(resolve => setTimeout(resolve, 30));
        const video = Array.from(document.querySelectorAll('video')).find(v => v.src.startsWith('blob:'));
        if (!video.paused) throw Error('Reserved or repeated Space toggled playback');
      }
    })()`);
    await window.webContents.executeJavaScript(`(async () => {
      const preset = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Presets');
      if (!preset) throw Error('Missing Presets control');
      preset.focus();
      preset.click();
      const deadline = performance.now() + 3000;
      while (document.activeElement?.getAttribute('aria-label') !== 'Preset name') {
        if (performance.now() > deadline) throw Error('Preset input did not receive initial focus');
        await new Promise(resolve => setTimeout(resolve, 20));
      }
    })()`);
    for (let index = 0; index < 16; index++) {
      window.webContents.sendInputEvent({
        type: "keyDown",
        keyCode: "Tab",
        modifiers: index >= 8 ? ["shift"] : [],
      });
      window.webContents.sendInputEvent({
        type: "keyUp",
        keyCode: "Tab",
        modifiers: index >= 8 ? ["shift"] : [],
      });
      const focus = await window.webContents.executeJavaScript(
        `({inside: document.querySelector('dialog[open]')?.contains(document.activeElement), tag:document.activeElement.tagName, label:document.activeElement.getAttribute('aria-label')})`,
      );
      if (!focus.inside)
        throw Error(
          `Tab ${index + 1} escaped dialog: ${JSON.stringify(focus)}`,
        );
    }
    await window.webContents.executeJavaScript(
      `document.querySelector('[aria-label="Preset name"]').focus()`,
    );
    await window.webContents.insertText("Keyboard verification");
    window.webContents.sendInputEvent({ type: "keyDown", keyCode: "Return" });
    window.webContents.sendInputEvent({ type: "keyUp", keyCode: "Return" });
    await window.webContents.executeJavaScript(`(async () => {
      const deadline = performance.now() + 3000;
      while (JSON.parse(localStorage.getItem('refract-presets') || '[]').length !== 1) {
        if (performance.now() > deadline) throw Error('Enter did not save the preset');
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      const saved = JSON.parse(localStorage.getItem('refract-presets'));
      if (saved[0].name !== 'Keyboard verification') throw Error('Incorrect preset text');
      if (document.querySelector('[aria-label="Preset name"]').value !== '') throw Error('Preset input did not reset');
      const video = Array.from(document.querySelectorAll('video')).find(v => v.src.startsWith('blob:'));
      if (!video.paused) throw Error('Dialog keyboard action started video');
    })()`);
    window.webContents.sendInputEvent({ type: "keyDown", keyCode: "Escape" });
    window.webContents.sendInputEvent({ type: "keyUp", keyCode: "Escape" });
    await window.webContents.executeJavaScript(`(async () => {
      const deadline = performance.now() + 3000;
      while (document.querySelector('dialog[open]')) {
        if (performance.now() > deadline) throw Error('Escape did not dismiss the preset dialog');
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      if (document.activeElement.textContent.trim() !== 'Presets') throw Error('Dialog did not restore trigger focus');
    })()`);
    console.log(
      JSON.stringify({
        ...result,
        focusedButtonSpace: "passed",
        reservedSpace: "passed",
        presetEnterEscapeFocus: "passed",
        modalTabContainment: "passed",
      }),
    );
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    window?.destroy();
    app.exit(Number(process.exitCode ?? 0));
  }
});
