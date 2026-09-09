import assert from "node:assert/strict";
import { app, BrowserWindow, nativeTheme } from "electron";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
const directory = path.resolve("work/editor-layout");
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
    const results = [];
    for (const theme of ["dark", "light"] as const) {
      nativeTheme.themeSource = theme;
      for (const [width, height] of [
        [1000, 660],
        [1320, 880],
        [1600, 1000],
      ]) {
        window.setSize(width, height);
        await wait(500);
        const layout = await read(`(() => {
          const rect = el => { const r=el.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}; };
          const timeline = document.querySelector('[data-timeline]');
          const scroll = timeline.children[0];
          const slider = document.querySelector('input[aria-label="Timeline zoom"]');
          const cut = document.querySelector('button[aria-label="Cut at playhead (C)"]');
          const controls = Array.from(slider.parentElement.children).filter(el=>el.getBoundingClientRect().width>0).map(rect);
          return {scroll:{width:scroll.clientWidth,content:scroll.scrollWidth},timeline:rect(timeline),clip:rect(document.querySelector('[aria-label^="Clip "]')),zoom:rect(document.querySelector('[aria-label="Zoom timeline"]')), sidebar:rect(document.querySelector('aside')), slider:rect(slider),cut:rect(cut),controls,playback:rect(document.querySelector('button[aria-label="Play"]').parentElement),sliderInTimeline:timeline.contains(slider),viewport:{width:innerWidth,height:innerHeight}};
        })()`);
        assert.equal(layout.timeline.height, 152);
        assert.equal(
          layout.scroll.content,
          layout.scroll.width,
          "Fitted timeline overflows horizontally",
        );
        assert.equal(layout.clip.height, 48);
        assert.equal(layout.clip.x, 20);
        assert.equal(layout.clip.y - layout.timeline.y, 29);
        assert.equal(layout.zoom.y - layout.clip.bottom, 12);
        assert.equal(layout.sidebar.width, 340);
        assert.equal(layout.sliderInTimeline, false);
        assert.ok(layout.cut.bottom <= layout.timeline.y);
        assert.ok(layout.slider.right <= layout.sidebar.x);
        assert.ok(
          layout.playback.right <= layout.cut.x,
          "Playback overlaps cutting controls",
        );
        for (let i = 1; i < layout.controls.length; i++)
          assert.ok(
            layout.controls[i].x >= layout.controls[i - 1].right - 1,
            "Playback controls overlap",
          );
        await fs.writeFile(
          path.join(directory, `${theme}-${width}.png`),
          (await c.capturePage()).toPNG(),
        );
        await read(`(() => {
          const slider = document.querySelector('input[aria-label="Timeline zoom"]');
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(slider,'4');
          slider.dispatchEvent(new Event('input',{bubbles:true}));
        })()`);
        await wait(100);
        const zoomed = await read(`(() => {
          const scroll = document.querySelector('[data-timeline]').children[0];
          scroll.scrollLeft = scroll.scrollWidth;
          return {width:scroll.clientWidth,content:scroll.scrollWidth,left:scroll.scrollLeft};
        })()`);
        assert.ok(
          zoomed.content > zoomed.width * 3,
          "Zoom did not expand timeline",
        );
        assert.ok(zoomed.left > 0, "Zoomed timeline cannot scroll to its end");
        await read(`(() => {
          const slider = document.querySelector('input[aria-label="Timeline zoom"]');
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(slider,'1');
          slider.dispatchEvent(new Event('input',{bubbles:true}));
        })()`);
        await wait(100);
        assert.equal(
          await read(
            "document.querySelector('[data-timeline]').children[0].scrollLeft",
          ),
          0,
          "Fit did not reset scroll",
        );
        results.push({ theme, width, height, ...layout, zoomed });
      }
    }
    await fs.writeFile(
      path.join(directory, "layout.json"),
      JSON.stringify(results, null, 2),
    );
    console.log(JSON.stringify(results));
    app.exit(0);
  } catch (error) {
    console.error(error);
    app.exit(1);
  }
});
