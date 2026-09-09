import { execFileSync } from "node:child_process";
import { app, BrowserWindow, ipcMain } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
const directory = path.resolve("work/recording-completion");
app.setPath("userData", path.join(directory, `profile-${process.pid}`));
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
    const output = path.join(directory, "completed.mp4");
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
    ipcMain.handle("verify-frame", (_, data) => {
      frames.push(Buffer.from(data));
    });
    ipcMain.handle("verify-finish", () => {
      execFileSync(
        "/opt/homebrew/bin/ffmpeg",
        [
          "-v",
          "error",
          "-y",
          "-f",
          "image2pipe",
          "-framerate",
          "24",
          "-i",
          "pipe:0",
          "-c:v",
          "libx264",
          "-pix_fmt",
          "yuv420p",
          output,
        ],
        { input: Buffer.concat(frames) },
      );
      return output;
    });
    ipcMain.handle("verify-export", (_, settings) => {
      requests.push(settings);
      return encode ? "verification-export" : null;
    });
    window = new BrowserWindow({
      show: false,
      webPreferences: { preload, sandbox: true },
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
    window.webContents.send("recording-finished", {
      ...result,
      project: {
        ...project,
        id: "third",
        source: { ...project.source, width: 320, height: 240, duration: 250 },
        segments: [{ id: "short", start: 0, end: 250, speed: 1 }],
      },
      url: pathToFileURL(source).href,
    });
    await until(() => frames.length === 6);
    await window.webContents.executeJavaScript(`(async()=>{
      const deadline=performance.now()+10000;
      while(!document.querySelector('[role="status"]')?.textContent.includes('Exported completed.mp4')) {
        if(performance.now()>deadline) throw Error('Completion export did not finish');
        await new Promise(resolve=>setTimeout(resolve,20));
      }
    })()`);
    const probe = JSON.parse(
      execFileSync(
        "/opt/homebrew/bin/ffprobe",
        [
          "-v",
          "error",
          "-show_entries",
          "stream=width,height,nb_frames,r_frame_rate:format=duration",
          "-of",
          "json",
          output,
        ],
        { encoding: "utf8" },
      ),
    );
    assert.equal(probe.streams[0].nb_frames, "6");
    assert.equal(probe.streams[0].r_frame_rate, "24/1");
    assert.equal(
      Math.max(probe.streams[0].width, probe.streams[0].height),
      720,
    );
    assert.ok(Math.abs(Number(probe.format.duration) - 0.25) < 0.001);
    console.log({
      encodedFrames: frames.length,
      duplicateSuppressed: true,
      captureSettingsUsed: true,
      destinationCancellation: true,
      createProjectNoExport: true,
    });
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    window?.destroy();
    app.exit(Number(process.exitCode ?? 0));
  }
});
