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
      onMenu:callback=>{const listener=(_,a)=>callback(a);ipcRenderer.on('menu-action',listener);return()=>ipcRenderer.removeListener('menu-action',listener);},onProjectGuard:()=>()=>{},
      showClipboardExports:()=>ipcRenderer.invoke('verify-clipboard-folder'),
      setExportAvailability:ready=>ipcRenderer.invoke('verify-export-availability',ready),
      onRecordingFinished:callback=>{const listener=(_,r)=>callback(r);ipcRenderer.on('recording-finished',listener);return()=>ipcRenderer.removeListener('recording-finished',listener);},
      exportStart:settings=>ipcRenderer.invoke('verify-export',settings),exportCancel:async()=>{},exportFrame:(id,data)=>ipcRenderer.invoke("verify-frame",data),exportFinish:()=>ipcRenderer.invoke("verify-finish"),
    });`,
    );
    const availability: boolean[] = [];
    ipcMain.handle("verify-export-availability", (_, ready: boolean) => {
      availability.push(ready);
    });
    let folderRequests = 0;
    ipcMain.handle("verify-clipboard-folder", () => {
      folderRequests++;
    });
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
      assert.equal(
        availability.at(-1),
        false,
        "Native export actions remained enabled during rendering",
      );
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
        exportArgs(
          settings.project,
          source,
          output,
          settings.fps,
          settings.format,
        ),
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
    await until(() => availability.at(-1) === true);
    encode = true;
    for (const resolution of process.env.REFRACT_EXPORT_DIALOG_ONLY
      ? [720]
      : [720, 1080, 1920, 2560, 3840]) {
      for (const fps of process.env.REFRACT_EXPORT_DIALOG_ONLY
        ? [24]
        : [24, 30, 60]) {
        frames.length = 0;
        output = path.join(directory, `completed-${resolution}-${fps}.mp4`);
        const basename = path.basename(output);
        const action =
          resolution === 720 && fps === 24 ? "export-clipboard" : "export-file";
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
          completion: { action, resolution, fps },
          url: pathToFileURL(source).href,
        });
        await window.webContents.executeJavaScript(`(async()=>{
          const deadline=performance.now()+30000;
          while(!document.querySelector('[role="status"]')?.textContent.includes(${JSON.stringify(action === "export-clipboard" ? "Video copied to clipboard." : "Exported " + basename)})) {
            if(performance.now()>deadline) throw Error('Completion export did not finish: '+document.body.textContent.slice(-500));
            await new Promise(resolve=>setTimeout(resolve,20));
          }
        })()`);
        assert.equal(
          requests.at(-1).destination,
          action === "export-clipboard" ? "clipboard" : "file",
        );
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
          action,
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
    output = path.join(directory, "manual-clipboard.gif");
    frames.length = 0;
    await window.webContents.executeJavaScript(`(async()=>{
      const wait=()=>new Promise(resolve=>setTimeout(resolve,100));
      [...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Export').click();
      await wait();
      const change=(label,value)=>{
        const node=document.querySelector('select[aria-label="'+label+'"]');
        if(!node) throw Error('Missing export field '+label);
        node.value=value;node.dispatchEvent(new Event('change',{bubbles:true}));
      };
      change('Export destination','clipboard');await wait();
      change('Export format','gif');await wait();
      change('Output size','1280');await wait();
      change('Frame rate','24');await wait();
      const button=document.querySelector('[data-dialog-default]');
      if(button.textContent.trim()!=='Export to clipboard') throw Error('Wrong default export action');
      button.focus();
    })()`);
    await fs.writeFile(
      path.join(directory, "clipboard-dialog.png"),
      (await window.webContents.capturePage()).toPNG(),
    );
    window.webContents.focus();
    window.webContents.sendInputEvent({ type: "keyDown", keyCode: "Return" });
    window.webContents.sendInputEvent({ type: "char", keyCode: "\r" });
    window.webContents.sendInputEvent({ type: "keyUp", keyCode: "Return" });
    await window.webContents.executeJavaScript(`(async()=>{
      const deadline=performance.now()+30000;
      while(document.querySelector('dialog[open]') || !document.querySelector('[role="status"]')?.textContent.includes('Video copied to clipboard.')) {
        if(performance.now()>deadline) throw Error('Manual clipboard export did not finish: '+document.body.textContent.slice(-1800));
        await new Promise(resolve=>setTimeout(resolve,20));
      }
      if(document.querySelector('dialog[open]')) throw Error('Export dialog stayed open');
    })()`);
    assert.equal(requests.at(-1).destination, "clipboard");
    assert.equal(requests.at(-1).format, "gif");
    const manualProbe = JSON.parse(
      execFileSync(
        "/opt/homebrew/bin/ffprobe",
        [
          "-v",
          "error",
          "-count_frames",
          "-show_entries",
          "stream=codec_name,width,height,nb_read_frames",
          "-of",
          "json",
          output,
        ],
        { encoding: "utf8" },
      ),
    );
    assert.equal(manualProbe.streams[0].codec_name, "gif");
    assert.equal(manualProbe.streams[0].width, 1280);
    assert.equal(Number(manualProbe.streams[0].nb_read_frames), 6);
    window.webContents.send("menu-action", "commands");
    await window.webContents.executeJavaScript(`(async()=>{
      const deadline=performance.now()+5000;
      while(!document.querySelector('#command-previous-clipboard-exports')) {
        if(performance.now()>deadline) throw Error('Previous exports command missing');
        await new Promise(resolve=>setTimeout(resolve,20));
      }
      document.querySelector('#command-previous-clipboard-exports').click();
    })()`);
    await until(() => folderRequests === 1);
    output = path.join(directory, "quick-clipboard.mp4");
    frames.length = 0;
    await window.webContents.executeJavaScript(
      `localStorage.setItem('refract.recorder.completion',JSON.stringify({action:'create-project',resolution:1080,fps:30}));`,
    );
    const beforeQuick = requests.length;
    window.webContents.send("menu-action", "quick-export-clipboard");
    await until(() => requests.length === beforeQuick + 1);
    await window.webContents.executeJavaScript(`(async()=>{
      const deadline=performance.now()+30000;
      while(document.querySelector('dialog[open]')) {
        if(performance.now()>deadline) throw Error('Quick clipboard export did not finish');
        await new Promise(resolve=>setTimeout(resolve,20));
      }
    })()`);
    assert.equal(
      requests.at(-1).format,
      "mp4",
      "Quick export inherited editor GIF format",
    );
    assert.equal(requests.at(-1).destination, "clipboard");
    assert.equal(requests.at(-1).fps, 30);
    assert.equal(requests.at(-1).width, 1080);
    assert.equal(frames.length, 8);
    encode = false;
    window.webContents.send("menu-action", "quick-export-file");
    await until(() => requests.length === beforeQuick + 2);
    assert.equal(requests.at(-1).destination, "file");
    assert.equal(requests.at(-1).fps, 30);
    await window.webContents.executeJavaScript(
      `new Promise(resolve=>setTimeout(resolve,100))`,
    );
    assert.equal(
      await window.webContents.executeJavaScript(
        `document.querySelectorAll('dialog[open]').length`,
      ),
      0,
      "Cancelled quick export left dialog open",
    );
    window.webContents.send("menu-action", "export-file");
    await until(() => requests.length === beforeQuick + 3);
    assert.equal(
      requests.at(-1).format,
      "gif",
      "Quick export changed editor settings",
    );
    assert.equal(requests.at(-1).fps, 24);
    assert.equal(requests.at(-1).width, 1280);
    assert.equal(availability[0], false, "Empty editor enabled exports");
    assert.ok(
      availability.includes(true),
      "Loaded project did not enable exports",
    );
    const report = {
      nativeExportAvailability: true,
      quickExportSavedSettings: true,
      quickExportCancellation: true,
      editorExportSettingsRetained: true,
      previousClipboardExportsCommand: true,
      manualClipboardGIF: true,
      enterDefaultAction: true,
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
