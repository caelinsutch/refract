import assert from "node:assert/strict";
import { app, BrowserWindow, nativeTheme, clipboard } from "electron";
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
      const renderBlockEnds=performance.now()+120;
      while(performance.now()<renderBlockEnds) {}
      const beforePause=video().currentTime;
      button('Pause').click();
      await until(() => video().paused, 'Pause did not reach media');
      const paused = video().currentTime;
      check(Math.abs(paused-beforePause)<0.03, 'Pause moved media from '+beforePause+' to '+paused);
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
    const openCrop = async (stall = false) => {
      await window!.webContents.executeJavaScript(`(async () => {
        const trigger = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Crop');
        if (!trigger) throw Error('Missing Crop control');
        if (${stall}) {
          const video=Array.from(document.querySelectorAll('video')).find(v=>v.src.startsWith('blob:'));
          const until=performance.now()+120; while(performance.now()<until) {}
          window.beforeCropTime=video.currentTime;
        }
        trigger.focus(); trigger.click();
        const deadline = performance.now() + 3000;
        while (!document.querySelector('[aria-label="Crop width"]')) {
          if (performance.now() > deadline) throw Error('Crop did not open');
          await new Promise(resolve => setTimeout(resolve, 20));
        }
      })()`);
    };
    await window.webContents.executeJavaScript(`(async () => {
      document.querySelector('button[aria-label="Start"]').click();
      await new Promise(resolve=>setTimeout(resolve,50));
      document.querySelector('button[aria-label="Play"]').click();
      const video=Array.from(document.querySelectorAll('video')).find(v=>v.src.startsWith('blob:'));
      const deadline=performance.now()+3000;
      while(video.currentTime<0.3) {
        if(performance.now()>deadline) throw Error('Crop playback setup failed');
        await new Promise(resolve=>setTimeout(resolve,20));
      }
    })()`);
    await openCrop(true);
    await window.webContents.executeJavaScript(`(async () => {
      const video=Array.from(document.querySelectorAll('video')).find(v=>v.src.startsWith('blob:'));
      if (!video.paused || Math.abs(video.currentTime-window.beforeCropTime)>0.03)
        throw Error('Opening crop moved media from '+window.beforeCropTime+' to '+video.currentTime);
    })()`);
    await window.webContents.executeJavaScript(
      `const field=document.querySelector('[aria-label="Crop width"]'); field.focus(); field.select();`,
    );
    for (const digit of ["2", "5", "6"])
      await window.webContents.insertText(digit);
    window.webContents.sendInputEvent({ type: "keyDown", keyCode: "Return" });
    window.webContents.sendInputEvent({ type: "keyUp", keyCode: "Return" });
    const waitForCropClose = async () =>
      window!.webContents.executeJavaScript(`(async () => {
      const deadline = performance.now() + 3000;
      while (document.querySelector('[aria-label="Crop width"]')) {
        if (performance.now() > deadline) throw Error('Crop did not dismiss');
        await new Promise(resolve => setTimeout(resolve, 20));
      }
    })()`);
    await waitForCropClose();
    await openCrop();
    await window.webContents.executeJavaScript(`(() => {
      const field=document.querySelector('[aria-label="Crop width"]');
      if (field.value !== '256') throw Error('Multi-digit crop was not retained: '+field.value);
      field.focus(); field.select();
    })()`);
    await window.webContents.insertText("123");
    window.webContents.sendInputEvent({ type: "keyDown", keyCode: "Escape" });
    window.webContents.sendInputEvent({ type: "keyUp", keyCode: "Escape" });
    await waitForCropClose();
    await openCrop();
    await window.webContents.executeJavaScript(`
      if (document.querySelector('[aria-label="Crop width"]').value !== '256') throw Error('Escape committed a crop draft');
    `);
    window.webContents.sendInputEvent({ type: "keyDown", keyCode: "Escape" });
    window.webContents.sendInputEvent({ type: "keyUp", keyCode: "Escape" });
    await waitForCropClose();
    const originalTrim = await window.webContents.executeJavaScript(
      `document.querySelector('input[aria-label="Trim start"]').getAttribute("value")`,
    );
    await window.webContents.executeJavaScript(
      `document.querySelector('button[aria-label="Edit Trim start"]').click()`,
    );
    for (const digit of ["0", ".", "7", "5", "5"])
      await window.webContents.insertText(digit);
    assert.equal(
      await window.webContents.executeJavaScript(
        `document.querySelector('input[aria-label="Trim start"]').getAttribute("value")`,
      ),
      originalTrim,
      "Typing committed a partial trim",
    );
    window.webContents.sendInputEvent({ type: "keyDown", keyCode: "Return" });
    window.webContents.sendInputEvent({ type: "keyUp", keyCode: "Return" });
    await window.webContents.executeJavaScript(`(async () => {
      const deadline=performance.now()+3000;
      while(Number(document.querySelector('input[aria-label="Trim start"]').getAttribute("value"))!==0.755) {
        if(performance.now()>deadline) throw Error('Exact trim entry did not commit: '+document.querySelector('input[aria-label="Trim start"]').outerHTML+' draft='+document.querySelector('input[aria-label="Trim start value"]')?.value);
        await new Promise(resolve=>setTimeout(resolve,20));
      }
      document.querySelector('button[aria-label="Edit Trim start"]').click();
    })()`);
    window.webContents.sendInputEvent({ type: "keyDown", keyCode: "Return" });
    window.webContents.sendInputEvent({ type: "keyUp", keyCode: "Return" });
    await window.webContents.executeJavaScript(`(async () => {
      await new Promise(resolve=>setTimeout(resolve,30));
      const value=Number(document.querySelector('input[aria-label="Trim start"]').getAttribute('value'));
      if (value !== 0.755) throw Error('Unchanged numeric confirmation rounded trim to '+value);
      document.querySelector('button[aria-label="Edit Trim start"]').click();
    })()`);
    await window.webContents.insertText("0.9");
    window.webContents.sendInputEvent({ type: "keyDown", keyCode: "Escape" });
    window.webContents.sendInputEvent({ type: "keyUp", keyCode: "Escape" });
    await window.webContents.executeJavaScript(`(async () => {
      await new Promise(resolve=>setTimeout(resolve,30));
      if(Number(document.querySelector('input[aria-label="Trim start"]').getAttribute("value"))!==0.755) throw Error('Escape changed trim');
    })()`);
    const trimHandle = async () =>
      window!.webContents.executeJavaScript(`(() => {
      const handles=document.querySelectorAll('button[aria-label="Trim clip end"]');
      const rect=handles[handles.length-1].getBoundingClientRect();
      return {x:Math.round(rect.left+rect.width/2),y:Math.round(rect.top+rect.height/2)};
    })()`);
    const initialEnd = await window.webContents.executeJavaScript(
      `document.querySelector('input[aria-label="Trim end"]').getAttribute('value')`,
    );
    let handle = await trimHandle();
    window.webContents.sendInputEvent({
      type: "mouseDown",
      ...handle,
      button: "left",
      clickCount: 1,
    });
    window.webContents.sendInputEvent({
      type: "mouseMove",
      x: handle.x - 40,
      y: handle.y,
      button: "left",
    });
    await window.webContents.executeJavaScript(
      `new Promise(resolve=>setTimeout(resolve,40))`,
    );
    assert.equal(
      await window.webContents.executeJavaScript(
        `document.querySelector('input[aria-label="Trim end"]').getAttribute('value')`,
      ),
      initialEnd,
      "Drag committed before release",
    );
    window.webContents.sendInputEvent({ type: "keyDown", keyCode: "Escape" });
    window.webContents.sendInputEvent({ type: "keyUp", keyCode: "Escape" });
    window.webContents.sendInputEvent({
      type: "mouseUp",
      x: handle.x - 40,
      y: handle.y,
      button: "left",
      clickCount: 1,
    });
    await window.webContents.executeJavaScript(
      `new Promise(resolve=>setTimeout(resolve,40))`,
    );
    assert.equal(
      await window.webContents.executeJavaScript(
        `document.querySelector('input[aria-label="Trim end"]').getAttribute('value')`,
      ),
      initialEnd,
      "Cancelled trim changed the clip",
    );
    handle = await trimHandle();
    window.webContents.sendInputEvent({
      type: "mouseDown",
      ...handle,
      button: "left",
      clickCount: 1,
    });
    window.webContents.sendInputEvent({
      type: "mouseUp",
      x: handle.x - 60,
      y: handle.y,
      button: "left",
      clickCount: 1,
    });
    await window.webContents.executeJavaScript(`(async () => {
      const deadline=performance.now()+3000;
      while(Number(document.querySelector('input[aria-label="Trim end"]').getAttribute('value'))>=${Number(initialEnd)}) {
        if(performance.now()>deadline) throw Error('Trim ignored final release position');
        await new Promise(resolve=>setTimeout(resolve,20));
      }
      document.querySelector('button[aria-label="Undo"]').click();
    })()`);
    await window.webContents.executeJavaScript(
      `new Promise(resolve=>setTimeout(resolve,40))`,
    );
    assert.equal(
      await window.webContents.executeJavaScript(
        `document.querySelector('input[aria-label="Trim end"]').getAttribute('value')`,
      ),
      initialEnd,
      "One undo did not restore the trim",
    );
    const zoomTrack = await window.webContents.executeJavaScript(`(() => {
      const rect=document.querySelector('[aria-label="Zoom timeline"]').getBoundingClientRect();
      return {x:Math.round(rect.left+20), y:Math.round(rect.top+rect.height/2)};
    })()`);
    const countZooms = async () =>
      window!.webContents.executeJavaScript(
        `document.querySelectorAll('[aria-label="Zoom timeline"] [role="button"]').length`,
      );
    const originalZooms = await countZooms();

    window.webContents.sendInputEvent({
      type: "mouseDown",
      ...zoomTrack,
      button: "left",
      clickCount: 1,
    });
    window.webContents.sendInputEvent({
      type: "mouseMove",
      x: zoomTrack.x + 160,
      y: zoomTrack.y,
      button: "left",
    });
    window.webContents.sendInputEvent({ type: "keyDown", keyCode: "Escape" });
    window.webContents.sendInputEvent({ type: "keyUp", keyCode: "Escape" });
    window.webContents.sendInputEvent({
      type: "mouseUp",
      x: zoomTrack.x + 160,
      y: zoomTrack.y,
      button: "left",
      clickCount: 1,
    });
    await window.webContents.executeJavaScript(
      `new Promise(resolve=>setTimeout(resolve,40))`,
    );
    assert.equal(
      await countZooms(),
      originalZooms,
      "Cancelled drag created a zoom",
    );
    window.webContents.sendInputEvent({
      type: "mouseDown",
      ...zoomTrack,
      button: "left",
      clickCount: 1,
    });
    window.webContents.sendInputEvent({
      type: "mouseUp",
      x: zoomTrack.x + 160,
      y: zoomTrack.y,
      button: "left",
      clickCount: 1,
    });
    await window.webContents.executeJavaScript(`(async () => {
      const deadline=performance.now()+3000;
      while(document.querySelectorAll('[aria-label="Zoom timeline"] [role="button"]').length!==${originalZooms + 1}) {
        if(performance.now()>deadline) throw Error('Release did not create zoom');
        await new Promise(resolve=>setTimeout(resolve,20));
      }
      const width=document.querySelector('[aria-label="Zoom timeline"] [role="button"]').getBoundingClientRect().width;
      if (Math.abs(width-158)>3) throw Error('Zoom used click duration instead of release distance: '+width);
    })()`);
    const rangeRect = () =>
      window!.webContents.executeJavaScript(`(() => {
      const r=document.querySelector('[aria-label="Zoom timeline"] [role="button"]').getBoundingClientRect();
      return {left:r.left,width:r.width,x:Math.round(r.right-3),y:Math.round(r.top+r.height/2)};
    })()`);
    const initialRange = await rangeRect();
    const settle = () =>
      window!.webContents.executeJavaScript(
        `new Promise(resolve=>setTimeout(resolve,40))`,
      );
    window.webContents.sendInputEvent({
      type: "mouseDown",
      x: initialRange.x,
      y: initialRange.y,
      button: "left",
      clickCount: 1,
    });
    window.webContents.sendInputEvent({
      type: "mouseMove",
      x: initialRange.x + 50,
      y: initialRange.y,
      button: "left",
    });
    await settle();
    assert.ok(
      (await rangeRect()).width > initialRange.width + 30,
      "Range draft did not follow pointer",
    );
    window.webContents.sendInputEvent({ type: "keyDown", keyCode: "Escape" });
    window.webContents.sendInputEvent({ type: "keyUp", keyCode: "Escape" });
    window.webContents.sendInputEvent({
      type: "mouseUp",
      x: initialRange.x + 50,
      y: initialRange.y,
      button: "left",
      clickCount: 1,
    });
    await settle();
    assert.equal(
      (await rangeRect()).width,
      initialRange.width,
      "Escape retained range draft",
    );
    window.webContents.sendInputEvent({
      type: "mouseDown",
      x: initialRange.x,
      y: initialRange.y,
      button: "left",
      clickCount: 1,
    });
    window.webContents.sendInputEvent({
      type: "mouseUp",
      x: initialRange.x + 60,
      y: initialRange.y,
      button: "left",
      clickCount: 1,
    });
    await settle();
    assert.ok(
      Math.abs((await rangeRect()).width - initialRange.width - 60) < 2,
      "Range ignored final release position",
    );
    await window.webContents.executeJavaScript(
      `document.querySelector('button[aria-label="Undo"]').click()`,
    );
    await settle();
    assert.equal(
      (await rangeRect()).width,
      initialRange.width,
      "One undo did not restore range",
    );
    const moveX = Math.round(initialRange.left + initialRange.width / 2);
    window.webContents.sendInputEvent({
      type: "mouseDown",
      x: moveX,
      y: initialRange.y,
      button: "left",
      clickCount: 1,
    });
    window.webContents.sendInputEvent({
      type: "mouseUp",
      x: moveX + 40,
      y: initialRange.y,
      button: "left",
      clickCount: 1,
    });
    await settle();
    assert.ok(
      Math.abs((await rangeRect()).left - initialRange.left - 40) < 2,
      "Range move ignored release",
    );
    assert.ok(
      Math.abs((await rangeRect()).width - initialRange.width) < 2,
      "Moving range changed duration",
    );
    await window.webContents.executeJavaScript(
      `document.querySelector('button[aria-label="Undo"]').click()`,
    );
    await settle();
    assert.equal(
      (await rangeRect()).left,
      initialRange.left,
      "One undo did not restore range move",
    );
    await window.webContents.executeJavaScript(`(async () => {
      const status=document.querySelector('[role="status"]');
      const timeline=document.querySelector('[data-timeline]');
      if (!status || status.getBoundingClientRect().bottom > timeline.getBoundingClientRect().top)
        throw Error('Status message overlaps timeline');
    })()`);
    await window.webContents.executeJavaScript(`(async () => {
      const close=document.querySelector('button[title="Close Zoom editor"]');
      if (!close) throw Error('Selected zoom has no close-editor row');
      close.click();
      await new Promise(resolve=>setTimeout(resolve,40));
      if (document.querySelector('input[aria-label="Zoom level"]')) throw Error('Close did not leave zoom editor');
      if (!document.querySelector('button[aria-label="Wallpaper 1"]')) throw Error('Close did not restore background panel');
    })()`);
    assert.equal(
      await countZooms(),
      originalZooms + 1,
      "Closing editor removed the zoom",
    );
    await window.webContents.executeJavaScript(`(async () => {
      const reset=document.querySelector('button[aria-label="Reset Padding"]');
      const slider=document.querySelector('input[aria-label="Padding"]');
      if (!reset.disabled) throw Error('Default padding reset should be disabled');
      document.querySelector('button[aria-label="Edit Padding"]').click();
    })()`);
    await window.webContents.insertText("18");
    window.webContents.sendInputEvent({ type: "keyDown", keyCode: "Return" });
    window.webContents.sendInputEvent({ type: "keyUp", keyCode: "Return" });
    await window.webContents.executeJavaScript(`(async () => {
      await new Promise(resolve=>setTimeout(resolve,40));
      const reset=document.querySelector('button[aria-label="Reset Padding"]');
      const slider=document.querySelector('input[aria-label="Padding"]');
      if (reset.disabled || Number(slider.value)!==18) throw Error('Changed padding did not enable reset');
      const r=reset.getBoundingClientRect(), s=slider.getBoundingClientRect();
      if (r.left<s.right || Math.abs((r.top+r.bottom)/2-(s.top+s.bottom)/2)>1) throw Error('Reset is not beside slider');
      reset.click();
      await new Promise(resolve=>setTimeout(resolve,40));
      if (!reset.disabled || Number(slider.value)!==10) throw Error('Reset did not restore default');
    })()`);
    await window.webContents.executeJavaScript(`(async () => {
      const button=document.querySelector('button[aria-label="Playback speed"]');
      for(const rate of [2,4,8,1]) {
        button.click();
        await new Promise(resolve=>setTimeout(resolve,30));
        if(button.textContent!==rate+'×') throw Error('Incorrect speed cycle');
      }
      button.focus();
    })()`);
    window.webContents.sendInputEvent({ type: "keyDown", keyCode: "Down" });
    window.webContents.sendInputEvent({ type: "keyUp", keyCode: "Down" });
    await window.webContents.executeJavaScript(`(async () => {
      await new Promise(resolve=>setTimeout(resolve,30));
      if(document.activeElement.textContent.trim()!=='1×') throw Error('Speed menu did not focus selected rate');
    })()`);
    window.webContents.sendInputEvent({ type: "keyDown", keyCode: "Home" });
    window.webContents.sendInputEvent({ type: "keyUp", keyCode: "Home" });
    window.webContents.sendInputEvent({ type: "keyDown", keyCode: "Return" });
    window.webContents.sendInputEvent({ type: "keyUp", keyCode: "Return" });
    await window.webContents.executeJavaScript(`(async () => {
      await new Promise(resolve=>setTimeout(resolve,50));
      const button=document.querySelector('button[aria-label="Playback speed"]');
      if(button.textContent!=='0.25×' || document.activeElement!==button) throw Error('Speed selection or focus restoration failed: '+button.textContent+' focus='+document.activeElement.outerHTML.slice(0,300));
      document.querySelector('button[aria-label="Play"]').click();
      await new Promise(resolve=>setTimeout(resolve,100));
      const video=Array.from(document.querySelectorAll('video')).find(video=>video.src.startsWith('blob:'));
      if(video.playbackRate!==0.25) throw Error('Selected speed did not reach media');
      document.querySelector('button[aria-label="Pause"]').click();
      button.click();
      await new Promise(resolve=>setTimeout(resolve,30));
      if(button.textContent!=='1×') throw Error('Slow speed did not cycle to normal');
      button.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true}));
    })()`);
    window.webContents.sendInputEvent({ type: "keyDown", keyCode: "Escape" });
    window.webContents.sendInputEvent({ type: "keyUp", keyCode: "Escape" });
    await window.webContents.executeJavaScript(`(async () => {
      await new Promise(resolve=>setTimeout(resolve,30));
      if(document.querySelector('[aria-label="Playback speed options"]').matches(':popover-open')) throw Error('Escape did not dismiss speed menu');
      if(document.activeElement.getAttribute('aria-label')!=='Playback speed') throw Error('Escape did not restore speed focus');
    })()`);
    await window.webContents.executeJavaScript(`(async () => {
      const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
      const trigger=document.querySelector('button[aria-label="Video preview performance settings"]');
      trigger.click();await wait(30);
      const panel=document.querySelector('[role="dialog"][aria-label="Video preview performance settings"]');
      if(!panel.matches(':popover-open')) throw Error('Preview settings did not open');
      const choice=label=>Array.from(panel.querySelectorAll('button')).find(b=>b.textContent===label);
      choice('Performance').click();await wait(30);
      if(choice('Performance').getAttribute('aria-pressed')!=='true'||!document.querySelector('[data-preview-reduced]')) throw Error('Performance selection did not activate');
      const power=panel.querySelector('[role="switch"]');power.click();await wait(30);
      if(power.getAttribute('aria-checked')!=='true') throw Error('Power saving did not activate');
      panel.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
      if(document.activeElement!==trigger) throw Error('Preview settings Escape did not restore focus');
      document.querySelector('button[aria-label="Start"]').click();await wait(100);
      const canvas=document.querySelector('canvas[aria-label="Video composition preview"]'),ctx=canvas.getContext('2d');
      const clear=ctx.clearRect;let draws=0;ctx.clearRect=function(...args){draws++;return clear.apply(this,args);};
      try {
        document.querySelector('button[aria-label="Play"]').click();await wait(650);
        document.querySelector('button[aria-label="Pause"]').click();
        const video=Array.from(document.querySelectorAll('video')).find(v=>v.src.startsWith('blob:'));
        if(draws<2||draws>23) throw Error('Power-saving redraw count outside expected cap: '+draws);
        if(video.currentTime<0.3) throw Error('Power saving stalled playback');
      } finally {ctx.clearRect=clear;}
      trigger.click();await wait(30);choice('Quality').click();power.click();await wait(30);
      if(document.querySelector('[data-preview-reduced]')) throw Error('Reduced-preview indicator remained after reset');
      panel.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
    })()`);
    await window.webContents.executeJavaScript(`(async () => {
      document.querySelector('button[aria-label="Aspect ratio"]').click();
      await new Promise(resolve=>setTimeout(resolve,30));
      const menu=document.querySelector('[role="menu"][aria-label="Output aspect ratio"]');
      if(!menu.matches(':popover-open')) throw Error('Aspect ratio picker did not open');
      menu.querySelector('button[aria-label="Tall"]').focus();
    })()`);
    window.webContents.sendInputEvent({ type: "keyDown", keyCode: "Return" });
    window.webContents.sendInputEvent({ type: "keyUp", keyCode: "Return" });
    await window.webContents.executeJavaScript(`(async () => {
      await new Promise(resolve=>setTimeout(resolve,100));
      const menu=document.querySelector('[role="menu"][aria-label="Output aspect ratio"]');
      if(!menu.matches(':popover-open')) throw Error('Ratio selection closed picker');
      if(menu.querySelector('[aria-label="Tall"]').getAttribute('aria-checked')!=='true') throw Error('Tall ratio not selected');
      const canvas=document.querySelector('canvas[aria-label="Video composition preview"]');
      if(Math.abs(canvas.width/canvas.height-0.75)>0.005) throw Error('Tall ratio did not reach composition');
    })()`);
    window.webContents.sendInputEvent({ type: "keyDown", keyCode: "End" });
    window.webContents.sendInputEvent({ type: "keyUp", keyCode: "End" });
    await window.webContents.executeJavaScript(`(() => {
      if(document.activeElement.getAttribute('aria-label')!=='Always keep zoomed in') throw Error('Vertical framing option is not keyboard reachable');
    })()`);

    window.webContents.sendInputEvent({ type: "keyDown", keyCode: "Escape" });
    window.webContents.sendInputEvent({ type: "keyUp", keyCode: "Escape" });
    await window.webContents.executeJavaScript(`(async () => {
      if(document.activeElement.getAttribute('aria-label')!=='Aspect ratio') throw Error('Ratio Escape did not restore focus');
      document.querySelector('button[aria-label="Undo"]').click();
      await new Promise(resolve=>setTimeout(resolve,100));
      if(document.querySelector('button[aria-label="Aspect ratio"]').textContent!=='Auto') throw Error('Ratio was not restored by one Undo');
    })()`);
    await window.webContents.executeJavaScript(`(() => {
      const button=Array.from(document.querySelectorAll('[data-disclosure-header]')).find(b=>b.textContent==='Advanced shadow settings');
      if(!button || button.getAttribute('aria-expanded')!=='false') throw Error('Shadow disclosure should start collapsed');
      button.focus();
    })()`);
    window.webContents.sendInputEvent({ type: "keyDown", keyCode: "Space" });
    window.webContents.sendInputEvent({ type: "keyUp", keyCode: "Space" });
    await window.webContents.executeJavaScript(`(async () => {
      await new Promise(resolve=>setTimeout(resolve,30));
      const button=Array.from(document.querySelectorAll('[data-disclosure-header]')).find(b=>b.textContent==='Advanced shadow settings');
      if(button.getAttribute('aria-expanded')!=='true'||!document.querySelector('input[aria-label="Shadow Distance"]')) throw Error('Space did not expand advanced shadows');
      if(!Array.from(document.querySelectorAll('video')).find(v=>v.src.startsWith('blob:')).paused) throw Error('Disclosure Space also started playback');
      button.click();await new Promise(resolve=>setTimeout(resolve,30));
      if(document.querySelector('input[aria-label="Shadow Distance"]')) throw Error('Collapsed disclosure retained interactive controls');
    })()`);
    const smallBounds = window.getBounds();
    assert.equal(
      await window.webContents.executeJavaScript(
        `getComputedStyle(document.querySelector('[data-playback-time]')).display`,
      ),
      "none",
    );
    window.setSize(1700, 880);
    window.show();
    app.focus({ steal: true });
    window.focus();
    window.webContents.focus();
    await window.webContents.executeJavaScript(
      `new Promise(resolve => setTimeout(resolve, 100))`,
    );
    assert.equal(
      await window.webContents.executeJavaScript(
        `getComputedStyle(document.querySelector('[data-playback-time]')).display`,
      ),
      "block",
    );
    await window.webContents.executeJavaScript(`(async () => {
      const deadline=performance.now()+2000;
      while(!document.hasFocus()) {
        if(performance.now()>deadline) throw Error('Clipboard test window is not focused');
        await new Promise(resolve=>setTimeout(resolve,25));
      }
    })()`);
    const timestamp = await window.webContents.executeJavaScript(`(() => {
      const button=document.querySelector('button[title="Copy playback position"]');
      const rect=button.getBoundingClientRect();
      return {x:Math.round(rect.x+rect.width/2),y:Math.round(rect.y+rect.height/2),text:button.textContent};
    })()`);
    window.webContents.sendInputEvent({
      type: "mouseDown",
      button: "left",
      clickCount: 1,
      x: timestamp.x,
      y: timestamp.y,
    });
    window.webContents.sendInputEvent({
      type: "mouseUp",
      button: "left",
      clickCount: 1,
      x: timestamp.x,
      y: timestamp.y,
    });
    await window.webContents.executeJavaScript(
      `new Promise(resolve => setTimeout(resolve, 100))`,
    );
    assert.equal(
      await clipboard.readText(),
      timestamp.text,
      "Timestamp click did not copy the paused position",
    );
    await fs.writeFile(
      path.join(directory, "wide-playback.png"),
      (await window.webContents.capturePage()).toPNG(),
    );
    window.setBounds(smallBounds);
    for (const theme of ["dark", "light"] as const) {
      nativeTheme.themeSource = theme;
      await window.webContents.executeJavaScript(`(async () => {
        const deadline=performance.now()+3000;
        while(getComputedStyle(document.documentElement).colorScheme!==${JSON.stringify(theme)}) {
          if(performance.now()>deadline) throw Error('Editor theme did not change');
          await new Promise(resolve=>setTimeout(resolve,20));
        }
        await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
        await Promise.allSettled(document.getAnimations().filter(animation => animation.effect?.getTiming().iterations !== Infinity).map(animation => animation.finished));
      })()`);
      await fs.writeFile(
        path.join(directory, theme + ".png"),
        (await window.webContents.capturePage()).toPNG(),
      );
    }
    console.log(
      JSON.stringify({
        ...result,
        focusedButtonSpace: "passed",
        reservedSpace: "passed",
        presetEnterEscapeFocus: "passed",
        modalTabContainment: "passed",
        cropKeyboard: "passed",
        exactTrimEntry: "passed",
        trimGesture: "passed",
        rangeCreation: "passed",
        existingRangeGestures: "passed",
        sidebarClose: "passed",
        settingsReset: "passed",
        responsivePlaybackAndCopy: "passed",
        speedMenuAndMediaRate: "passed",
        previewSettingsAndPowerCap: "passed",
        aspectRatioCompositionAndUndo: "passed",
        disclosureKeyboard: "passed",
      }),
    );
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    nativeTheme.themeSource = "system";
    window?.destroy();
    app.exit(Number(process.exitCode ?? 0));
  }
});
