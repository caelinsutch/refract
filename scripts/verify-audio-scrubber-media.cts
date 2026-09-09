import assert from "node:assert/strict";
import { app, BrowserWindow } from "electron";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
const directory = path.resolve("work/audio-scrubber-media");
app.setPath("userData", path.join(directory, `profile-${process.pid}`));
app.whenReady().then(async () => {
  try {
    await fs.mkdir(directory, { recursive: true });
    const source = path.join(directory, "source.wav"),
      microphone = path.join(directory, "microphone.wav");
    for (const [file, frequency] of [
      [source, 440],
      [microphone, 880],
    ] as const)
      execFileSync("/opt/homebrew/bin/ffmpeg", [
        "-v",
        "error",
        "-y",
        "-f",
        "lavfi",
        "-i",
        `sine=frequency=${frequency}:duration=6`,
        "-c:a",
        "pcm_s16le",
        file,
      ]);
    const entry = path.join(directory, "harness.tsx");
    await fs.writeFile(
      entry,
      `
import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {useAudioScrubber} from ${JSON.stringify(path.resolve("src/media/use-audio-scrubber.ts"))};
import {createProject} from ${JSON.stringify(path.resolve("src/core/project.ts"))};
const context=new AudioContext(); window.analysisContext=context;
const OriginalAudio=window.Audio;
window.players=[];window.calls=[];
window.Audio=class extends OriginalAudio {
  constructor() {
    super();this.crossOrigin='anonymous';
    const node=context.createMediaElementSource(this), analyser=context.createAnalyser(), silence=context.createGain();
    silence.gain.value=1;node.connect(analyser);analyser.connect(silence);silence.connect(context.destination);
    window.players.push({audio:this,analyser});
  }
  play(){window.calls.push({url:this.src,time:this.currentTime,volume:this.volume});void context.resume();return super.play();}
};
window.refract={projectAudioUrl:async()=>${JSON.stringify(pathToFileURL(microphone).href)}};
const original=createProject({file:'source.wav',width:1280,height:720,duration:6000,hasAudio:true});
original.segments=[{id:'trimmed',start:1000,end:3000,speed:2,volume:0.5},{id:'later',start:4000,end:6000,speed:1}];
original.microphoneAudio={file:'microphone.wav',volume:0.8,muted:false};
function Harness(){
 const [project,setProject]=useState(original),[suspended,setSuspended]=useState(false),[enabled,setEnabled]=useState(true);
 const scrub=useAudioScrubber(project,${JSON.stringify(pathToFileURL(source).href)},enabled,suspended);
 window.fixture={scrub,setProject,setSuspended,setEnabled,original};return <div>Audio scrubber media verification</div>;
}
createRoot(document.getElementById('root')).render(<Harness/>);
`,
    );
    const { build } = await import("vite");
    await build({
      configFile: false,
      define: { "process.env.NODE_ENV": JSON.stringify("production") },
      logLevel: "error",
      build: {
        outDir: path.join(directory, "bundle"),
        lib: {
          entry,
          formats: ["iife"],
          name: "ScrubberMedia",
          fileName: () => "harness.js",
        },
      },
    });
    const html = path.join(directory, "index.html");
    await fs.writeFile(
      html,
      '<div id="root"></div><script src="./bundle/harness.js"></script>',
    );
    const window = new BrowserWindow({
      show: false,
      webPreferences: {
        sandbox: true,
        backgroundThrottling: false,
        autoplayPolicy: "no-user-gesture-required",
      },
    });
    window.webContents.on("console-message", (event) => {
      if (event.level === "error") console.error(event.message);
    });
    window.webContents.setAudioMuted(true);
    await window.loadFile(html);
    const c = window.webContents,
      read = (code: string) => c.executeJavaScript(code),
      wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    await read(
      `new Promise((resolve,reject)=>{const start=performance.now();const check=()=>{if(players.length===2&&players.every(p=>p.audio.readyState>=3))resolve(true);else if(performance.now()-start>8000)reject(Error('Media not decoded'));else setTimeout(check,20)};check()})`,
    );
    await read("analysisContext.resume()");
    await wait(250);
    await read("fixture.scrub(500)");
    await wait(100);
    const first = await read("calls.slice()");
    assert.equal(first.length, 2);
    for (const sample of first)
      assert.equal(sample.time, 2, "Clip speed/source trim mapping");
    assert.equal(first[0].volume, 0.375);
    assert.ok(Math.abs(first[1].volume - 0.3) < 1e-8);
    const peaks = await read(
      `players.map(({audio,analyser})=>{const data=new Float32Array(analyser.frequencyBinCount);analyser.getFloatFrequencyData(data);let index=0;for(let i=1;i<data.length;i++)if(data[i]>data[index])index=i;return {frequency:index*analyser.context.sampleRate/analyser.fftSize,level:data[index],paused:audio.paused}})`,
    );
    assert.ok(
      Math.abs(peaks[0].frequency - 440) < 30 && peaks[0].level > -90,
      JSON.stringify(peaks),
    );
    assert.ok(
      Math.abs(peaks[1].frequency - 880) < 30 && peaks[1].level > -90,
      JSON.stringify(peaks),
    );
    await wait(180);
    assert.equal(
      await read("players.every(p=>p.audio.paused)"),
      true,
      "Audition did not stop",
    );
    await read("fixture.scrub(700)");
    await wait(30);
    await read("fixture.setSuspended(true)");
    await wait(30);
    assert.equal(
      await read("players.every(p=>p.audio.paused)"),
      true,
      "Playback did not stop audition",
    );
    const count = await read("calls.length");
    await read("fixture.scrub(600)");
    assert.equal(await read("calls.length"), count);
    await read("fixture.setSuspended(false)");
    await wait(30);
    await read("fixture.scrub(990)");
    await wait(45);
    assert.equal(
      await read("players.every(p=>p.audio.paused)"),
      true,
      "Sample crossed clip boundary",
    );
    await read("fixture.setEnabled(false)");
    await wait(30);
    assert.equal(
      await read('players.every(p=>p.audio.getAttribute("src")===null)'),
      true,
    );
    console.log(
      JSON.stringify({
        sourceAndMicrophone: first,
        decodedFrequencyPeaks: peaks,
        stops: "timer, clip boundary, playback, disabled",
        output: "Decoded signal analyzed with Electron audio output muted",
      }),
    );
    app.exit(0);
  } catch (error) {
    console.error(error);
    app.exit(1);
  }
});
