import { app, BrowserWindow } from "electron";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const directory = path.resolve("work/preview-transport");
app.setPath("userData", path.join(directory, "profile"));
app.whenReady().then(async () => {
  let window: BrowserWindow | undefined;
  try {
    await fs.mkdir(directory, { recursive: true });
    const { build } = await import("vite");
    await build({
      configFile: false,
      logLevel: "error",
      build: {
        outDir: path.join(directory, "bundle"),
        emptyOutDir: true,
        lib: {
          entry: path.resolve("src/core/preview-transport.ts"),
          formats: ["es"],
          fileName: () => "transport.js",
        },
      },
    });
    const video = path.join(directory, "source.mp4");
    execFileSync("/opt/homebrew/bin/ffmpeg", [
      "-v",
      "error",
      "-y",
      "-f",
      "lavfi",
      "-i",
      "testsrc2=size=64x64:rate=30:duration=5",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      video,
    ]);
    const fixture = path.join(directory, "fixture.html");
    await fs.writeFile(
      fixture,
      `<video id="video" muted src="${pathToFileURL(video).href}"></video>`,
    );
    window = new BrowserWindow({
      show: false,
      webPreferences: {
        sandbox: true,
        backgroundThrottling: false,
        autoplayPolicy: "no-user-gesture-required",
      },
    });
    await window.loadFile(fixture);
    const moduleURL = pathToFileURL(
      path.join(directory, "bundle/transport.js"),
    ).href;
    const results = await window.webContents.executeJavaScript(`(async () => {
      const { previewTransport } = await import(${JSON.stringify(moduleURL)});
      const video = document.querySelector('video');
      const check = (condition, message) => { if (!condition) throw Error(message); };
      const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
      const project = { segments: [{start:500,end:1500,speed:1}, {start:3000,end:5000,speed:2}] };
      const results = [];
      for (const previewSpeed of [1, 1.5]) for (const loop of [false, true]) {
        video.pause();
        video.currentTime = 0.5;
        const deadline = performance.now() + 15000;
        while (video.seeking || video.readyState < 2) {
          check(performance.now() < deadline, 'Initial video seek timed out');
          await wait(10);
        }
        video.playbackRate = previewSpeed;
        await video.play();
        let position = 0, held = false, seekHolds = 0, observations = 0;
        const cuts = [];
        const started = performance.now();
        while (true) {
          check(performance.now() < deadline, 'Transport timed out');
          const previous = position;
          const seeking = video.seeking;
          const next = previewTransport(project, position, { time: video.currentTime * 1000, seeking, ready: video.readyState >= 2, ended: video.ended }, loop);
          position = next.position;
          observations++;
          if (seeking) { check(position === previous, 'Timeline moved while seeking'); seekHolds++; }
          if (next.seek !== undefined) {
            cuts.push({ position, source: next.seek });
            video.currentTime = next.seek / 1000;
            check(video.seeking, 'Expected an asynchronous media seek');
            const duringSeek = previewTransport(project, position, {time:video.currentTime*1000,seeking:video.seeking,ready:video.readyState>=2,ended:video.ended}, loop);
            check(duringSeek.position === position && duringSeek.seek === undefined, 'Seek was repeated or moved the timeline');
            seekHolds++;
            video.playbackRate = (position >= 1000 ? 2 : 1) * previewSpeed;
            await video.play();
            if (loop && cuts.length === 2) {
              while (video.seeking) { check(performance.now() < deadline, 'Loop seek timed out'); await wait(5); }
              check(Math.abs(video.currentTime - 0.5) < 0.05, 'Loop source seek did not complete');
              break;
            }
          }
          if (!held && position >= 200 && position < 900) {
            video.pause();
            const pausedSource = video.currentTime;
            const paused = previewTransport(project, position, {time: pausedSource * 1000, seeking:false,ready:true,ended:false}, loop).position;
            await wait(200);
            const after = previewTransport(project, paused, {time:video.currentTime * 1000,seeking:video.seeking,ready:video.readyState>=2,ended:video.ended}, loop);
            check(Math.abs(after.position - paused) < 1, 'Timeline advanced during media hold');
            held = true;
            await video.play();
          }
          if (next.ended) { check(!loop && position === 2000, 'Incorrect final boundary'); break; }
          await wait(10);
        }
        video.pause();
        check(held, 'Media hold was not exercised');
        check(cuts[0]?.position === 1000 && cuts[0]?.source === 3000, 'Cut did not seek retained source');
        if (loop) check(cuts[1]?.position === 0 && cuts[1]?.source === 500, 'Loop did not seek trimmed start');
        results.push({previewSpeed,loop,position,cuts,seekHolds,observations,elapsedMs:Math.round(performance.now()-started)});
      }
      return results;
    })()`);
    console.log(JSON.stringify(results, null, 2));
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    window?.destroy();
    app.exit(Number(process.exitCode ?? 0));
  }
});
