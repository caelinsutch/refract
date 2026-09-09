import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { createProject } from "../src/core/project";
import { exportArgs } from "../src/core/export";

// Inputs are rendered by verify-background-filter.cts in Chromium's GPU path.
const results = [];
for (const [width, format] of [
  [1280, "mp4"],
  [1280, "gif"],
  [3840, "mp4"],
] as const) {
  const height = (width * 9) / 16;
  const png = await fs.readFile(`work/background-filter/gpu-${width}.png`);
  const project = createProject({
    file: "synthetic",
    width,
    height,
    duration: 100,
    hasAudio: false,
  });
  const destination = `work/background-filter/gpu-${width}.${format}`;
  const encoder = spawn(
    "/opt/homebrew/bin/ffmpeg",
    exportArgs(project, "unused", destination, 30, format),
  );
  let errors = "";
  encoder.stderr.on("data", (data) => {
    errors += data;
  });
  encoder.stdin.on("error", () => {});
  const done = new Promise<void>((resolve, reject) => {
    encoder.on("error", reject);
    encoder.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(errors)),
    );
  });
  encoder.stdin.end(Buffer.concat([png, png, png]));
  await done;
  const metadata = JSON.parse(
    execFileSync(
      "/opt/homebrew/bin/ffprobe",
      [
        "-v",
        "error",
        "-count_frames",
        "-show_streams",
        "-of",
        "json",
        destination,
      ],
      { encoding: "utf8" },
    ),
  ).streams[0];
  assert.equal(metadata.width, width);
  assert.equal(metadata.height, height);
  assert.equal(Number(metadata.nb_read_frames), 3);
  const pixels = execFileSync(
    "/opt/homebrew/bin/ffmpeg",
    [
      "-v",
      "error",
      "-i",
      destination,
      "-frames:v",
      "1",
      "-f",
      "rawvideo",
      "-pix_fmt",
      "rgba",
      "pipe:1",
    ],
    { maxBuffer: width * height * 4 + 1024 },
  );
  const image = await loadImage(png);
  const canvas = createCanvas(width, height),
    c = canvas.getContext("2d");
  c.drawImage(image, 0, 0);
  const expected = c.getImageData(0, 0, width, height).data;
  let error = 0,
    count = 0,
    max = 0;
  // Exclude transparent borders: GIF/MP4 do not preserve full alpha.
  for (let y = 40; y < height - 40; y += 3)
    for (let x = 40; x < width - 40; x += 3) {
      const i = (y * width + x) * 4;
      if (expected[i + 3] < 254) continue;
      for (let channel = 0; channel < 3; channel++) {
        const delta = Math.abs(expected[i + channel] - pixels[i + channel]);
        error += delta;
        max = Math.max(max, delta);
        count++;
      }
    }
  assert.ok(count > 1000);
  assert.ok(
    error / count < 3,
    `${width} ${format}: mean error ${error / count}`,
  );
  results.push({
    width,
    height,
    format,
    frames: 3,
    meanChannelError: error / count,
    maxChannelError: max,
  });
}
console.log(JSON.stringify(results));
