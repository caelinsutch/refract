import { createCanvas } from "@napi-rs/canvas";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createProject } from "../src/core/project";
import { dimensions, drawFrame } from "../src/core/compositor";
import { exportArgs } from "../src/core/export";

const exec = promisify(execFile);
const ffmpeg = process.env.REFRACT_FFMPEG ?? "/opt/homebrew/bin/ffmpeg";
const ffprobe = process.env.REFRACT_FFPROBE ?? "/opt/homebrew/bin/ffprobe";
const dir = path.resolve("work/export-settings");
await fs.mkdir(dir, { recursive: true });
const results: object[] = [];
// Short moving fixtures exercise every UI encoder setting without retaining many 4K frames.
for (const format of ["mp4", "gif"] as const) {
  for (const max of [1280, 1920, 3840]) {
    for (const fps of format === "gif" ? [24, 30, 50] : [24, 30, 60]) {
      const p = createProject({
        file: "unused",
        width: 320,
        height: 180,
        duration: 200,
        hasAudio: false,
      });
      p.appearance.background = "color";
      p.appearance.color = "#192030";
      const size = dimensions(p, max);
      const output = createCanvas(size.width, size.height),
        context = output.getContext("2d");
      const source = createCanvas(320, 180),
        sc = source.getContext("2d");
      const dest = path.join(dir, `${max}-${fps}.${format}`);
      const child = spawn(ffmpeg, exportArgs(p, "unused", dest, fps, format));
      let errors = "";
      child.stderr.on("data", (chunk) => {
        errors = (errors + chunk).slice(-8000);
      });
      // A failed encoder can close stdin before its process exit event.
      child.stdin.on("error", () => {});
      const done = new Promise<void>((resolve, reject) => {
        child.on("error", reject);
        child.on("close", (code) =>
          code === 0 ? resolve() : reject(Error(errors)),
        );
      });
      done.catch(() => {});
      const frames = Math.ceil(fps / 5);
      try {
        for (let i = 0; i < frames; i++) {
          sc.fillStyle = "#4466bb";
          sc.fillRect(0, 0, 320, 180);
          sc.fillStyle = "#ffaa44";
          sc.fillRect(10 + i * 15, 20, 30, 140);
          drawFrame(
            context as unknown as CanvasRenderingContext2D,
            source as unknown as CanvasImageSource,
            p,
            (i / fps) * 1000,
            size.width,
            size.height,
          );
          const png = output.toBuffer("image/png");
          await new Promise<void>((resolve, reject) =>
            child.stdin.write(png, (error) =>
              error ? reject(error) : resolve(),
            ),
          );
        }
        child.stdin.end();
        await done;
      } catch (error) {
        child.kill("SIGTERM");
        await done.catch(() => {});
        throw error;
      }
      const probe = JSON.parse(
        (
          await exec(ffprobe, [
            "-v",
            "error",
            "-show_streams",
            "-show_format",
            "-count_frames",
            "-of",
            "json",
            dest,
          ])
        ).stdout,
      );
      const video = probe.streams.find(
        (s: { codec_type: string }) => s.codec_type === "video",
      );
      assert.equal(video.width, size.width);
      assert.equal(video.height, size.height);
      assert.equal(Number(video.nb_read_frames), frames);
      assert.equal(video.codec_name, format === "mp4" ? "h264" : "gif");
      assert.equal(
        probe.streams.length,
        1,
        "silent footage must not invent an audio stream",
      );
      if (format === "gif") {
        const timing = await exec(ffprobe, [
          "-v",
          "error",
          "-min_delay",
          "0",
          "-show_entries",
          "frame=duration_time",
          "-of",
          "csv=p=0",
          dest,
        ]);
        const delays = timing.stdout.trim().split(/\s+/).map(Number);
        assert.equal(delays.length, frames);
        assert.ok(
          delays.every((delay) => delay >= 0.02),
          "GIF frame delays must avoid browser 10 ms clamping",
        );
      }
      const seconds = Number(probe.format.duration);
      // GIF timestamps are quantized to hundredths of a second.
      assert.ok(
        Math.abs(seconds - frames / fps) <= (format === "gif" ? 0.025 : 0.002),
        `Unexpected duration ${seconds}`,
      );
      if (format === "mp4") assert.equal(video.r_frame_rate, `${fps}/1`);
      const row = {
        format,
        ...size,
        requestedFps: fps,
        encodedRate: video.r_frame_rate,
        frames,
        seconds,
      };
      results.push(row);
      console.log(JSON.stringify(row));
      await fs.unlink(dest);
    }
  }
}
await fs.writeFile(
  path.join(dir, "results.json"),
  JSON.stringify(results, null, 2),
);
console.log(`Passed ${results.length} export setting combinations.`);
