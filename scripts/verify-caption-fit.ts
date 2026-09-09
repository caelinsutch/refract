import { createCanvas } from "@napi-rs/canvas";
import { writeFileSync } from "node:fs";
import { createProject } from "../src/core/project";
import { drawFrame } from "../src/core/compositor";
const source = createCanvas(1280, 720);
source.getContext("2d").fillStyle = "#596779";
source.getContext("2d").fillRect(0, 0, 1280, 720);
const project = createProject({
  file: "fixture",
  width: 1280,
  height: 720,
  duration: 1000,
  hasAudio: false,
});
project.appearance.background = "color";
project.appearance.color = "#263548";
project.captions = [
  {
    id: "long",
    start: 0,
    end: 1000,
    text: Array.from(
      { length: 24 },
      (_, i) => `Line ${i + 1}: This entire caption stays inside the video.`,
    ).join("\n"),
  },
];
for (const [width, height] of [
  [1280, 720],
  [720, 1280],
  [1280, 360],
]) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  drawFrame(ctx as any, source as any, project, 0, width, height);
  writeFileSync(
    `work/caption-fit-${width}x${height}.png`,
    canvas.toBuffer("image/png"),
  );
}
