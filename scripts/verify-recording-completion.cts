import {
  execFileSync,
  spawn,
  type ChildProcessWithoutNullStreams,
} from "node:child_process";
import { app, BrowserWindow, ipcMain } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
const directory = path.resolve("work/recording-completion");
app.setPath("userData", path.join(directory, `profile-${process.pid}`));
app.on("window-all-closed", () => {});
app.whenReady().then(async () => {
  let window: BrowserWindow | undefined;
  let encoder: ChildProcessWithoutNullStreams | undefined;
  let failed = false;
  try {
    await fs.mkdir(directory, { recursive: true });
    const { build } = await import("vite");
    await build({
      configFile: false,
      logLevel: "error",
      build: {
        outDir: path.join(directory, "bundle"),
        lib: {
          entry: path.resolve("src/core/project.ts"),
          formats: ["es"],
          fileName: () => "project.js",
        },
      },
    });
    const preload = path.join(directory, "preload.cjs");
    await fs.writeFile(
      preload,
      `const {contextBridge,ipcRenderer}=require('electron');
    contextBridge.exposeInMainWorld('refract',{
      onMenu:()=>()=>{},onProjectGuard:()=>()=>{},
      onRecordingFinished:callback=>{const listener=(_,r)=>callback(r);ipcRenderer.on('recording-finished',listener);return()=>ipcRenderer.removeListener('recording-finished',listener);},
      exportStart:settings=>ipcRenderer.invoke('verify-export',settings),exportCancel:async()=>{},exportFrame:(id,data)=>ipcRenderer.invoke("verify-frame",data),exportFinish:()=>ipcRenderer.invoke("verify-finish"),
    });`,
    );
    const requests: any[] = [];
    let encode = false;
    const frames: Buffer[] = [];
    let output = path.join(directory, "completed.mp4");
    const matrix: object[] = [];
    const { exportArgs } = await import(
      pathToFileURL(path.resolve("dist-electron/src/core/export.js")).href
    );
    const { writeEncoderFrame, waitForEncoderFinalization } = await import(
      pathToFileURL(path.resolve("dist-electron/src/core/export-process.js"))
        .href
    );
    let encoderDone: Promise<void> | undefined;
    const source = path.join(directory, "source.mp4");
    execFileSync("/opt/homebrew/bin/ffmpeg", [
      "-v",
      "error",
      "-y",
      "-f",
      "lavfi",
      "-i",
      "testsrc2=size=320x240:rate=24:duration=0.25",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      source,
    ]);
    ipcMain.handle("verify-frame", async (_, data) => {
      const frame = Buffer.from(data);
      frames.push(frame);
      await writeEncoderFrame(encoder!, frame);
    });
    ipcMain.handle("verify-finish", async () => {
      encoder!.stdin.end();
      await waitForEncoderFinalization(encoder!, encoderDone!, output);
      return output;
    });
    ipcMain.handle("verify-export", (_, settings) => {
      requests.push(settings);
      if (!encode) return null;
      const current = spawn(
        "/opt/homebrew/bin/ffmpeg",
        exportArgs(settings.project, source, output, settings.fps, "mp4"),
      );
      encoder = current;
      let errors = "";
      current.stderr.on("data", (data) => {
        errors = (errors + data).slice(-4000);
      });
      current.stdin.on("error", () => {});
      encoderDone = new Promise<void>((resolve, reject) => {
        current.once("error", reject);
        current.once("close", (code) =>
          code === 0
            ? resolve()
            : reject(Error(errors || `Encoder exit ${code}`)),
        );
      });
      void encoderDone.catch(() => {});
      return "verification-export";
    });
    window = new BrowserWindow({
      show: false,
      webPreferences: { preload, sandbox: true, backgroundThrottling: false },
    });
    await window.loadFile(path.resolve("dist/index.html"));
    const projectURL = pathToFileURL(
      path.join(directory, "bundle/project.js"),
    ).href;
    const project = await window.webContents.executeJavaScript(`(async()=>{
    const {createProject}=await import(${JSON.stringify(projectURL)});
    return createProject({file:'media/recording.mp4',width:1280,height:720,duration:2000,hasAudio:false},'Completion verification');
  })()`);
    const result = {
      project,
      url: "",
      completion: { action: "export-file", resolution: 720, fps: 24 },
    };
    window.webContents.send("recording-finished", result);
    const until = async (predicate: () => boolean) => {
      const deadline = Date.now() + 5000;
      while (!predicate()) {
        assert.ok(Date.now() < deadline, "Completion event did not dispatch");
        await new Promise((r) => setTimeout(r, 20));
      }
    };
    await until(() => requests.length === 1);
    window.webContents.send("recording-finished", result);
    await window.webContents.executeJavaScript(
      `new Promise(resolve=>setTimeout(resolve,100))`,
    );
    assert.equal(requests.length, 1, "Duplicate event exported twice");
    assert.equal(requests[0].fps, 24);
    assert.equal(requests[0].format, "mp4");
    assert.equal(Math.max(requests[0].width, requests[0].height), 720);
    assert.equal(
      await window.webContents.executeJavaScript(
        `document.querySelectorAll('dialog[open]').length`,
      ),
      0,
      "Cancelled destination left modal open",
    );
    window.webContents.send("recording-finished", {
      ...result,
      project: { ...project, id: "second" },
      completion: { ...result.completion, action: "create-project" },
    });
    await window.webContents.executeJavaScript(
      `new Promise(resolve=>setTimeout(resolve,100))`,
    );
    assert.equal(requests.length, 1, "Create-project action exported");
    encode = true;
    for (const resolution of [720, 1080, 1920, 2560, 3840]) {
      for (const fps of [24, 30, 60]) {
        frames.length = 0;
        output = path.join(directory, `completed-${resolution}-${fps}.mp4`);
        const basename = path.basename(output);
        window.webContents.send("recording-finished", {
          ...result,
          project: {
            ...project,
            id: `matrix-${resolution}-${fps}`,
            source: {
              ...project.source,
              width: 320,
              height: 240,
              duration: 250,
            },
            segments: [{ id: "short", start: 0, end: 250, speed: 1 }],
          },
          completion: { action: "export-file", resolution, fps },
          url: pathToFileURL(source).href,
        });
        await window.webContents.executeJavaScript(`(async()=>{
          const deadline=performance.now()+30000;
          while(!document.querySelector('[role="status"]')?.textContent.includes(${JSON.stringify("Exported " + basename)})) {
            if(performance.now()>deadline) throw Error('Completion export did not finish: '+document.body.textContent.slice(-500));
            await new Promise(resolve=>setTimeout(resolve,20));
          }
        })()`);
        const probe = JSON.parse(
          execFileSync(
            "/opt/homebrew/bin/ffprobe",
            [
              "-v",
              "error",
              "-count_frames",
              "-show_entries",
              "stream=codec_name,width,height,nb_read_frames,r_frame_rate:format=duration",
              "-of",
              "json",
              output,
            ],
            { encoding: "utf8" },
          ),
        );
        const video = probe.streams[0];
        assert.equal(video.codec_name, "h264");
        assert.equal(
          probe.streams.length,
          1,
          "Silent source gained an audio stream",
        );
        assert.equal(Number(video.nb_read_frames), Math.ceil(fps / 4));
        assert.equal(frames.length, Math.ceil(fps / 4));
        assert.equal(video.r_frame_rate, `${fps}/1`);
        assert.equal(Math.max(video.width, video.height), resolution);
        assert.ok(
          Math.abs(Number(probe.format.duration) - Math.ceil(fps / 4) / fps) <
            0.002,
        );
        matrix.push({
          resolution,
          fps,
          width: video.width,
          height: video.height,
          frames: frames.length,
          duration: Number(probe.format.duration),
        });
        console.log(`Verified ${resolution}px / ${fps} fps`);
      }
    }
    const report = {
      matrix,
      productionEncoderArguments: true,
      duplicateSuppressed: true,
      captureSettingsUsed: true,
      destinationCancellation: true,
      createProjectNoExport: true,
    };
    await fs.writeFile(
      path.join(directory, "matrix.json"),
      JSON.stringify(report, null, 2),
    );
    console.log(JSON.stringify(report));
  } catch (error) {
    console.error(error);
    failed = true;
  } finally {
    encoder?.kill();
    window?.destroy();
    app.exit(failed ? 1 : 0);
  }
});
