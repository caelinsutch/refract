import { createCanvas } from "@napi-rs/canvas";
import { mkdirSync, writeFileSync } from "node:fs";
import { createProject } from "../src/core/project";
import { drawFrame } from "../src/core/compositor";
mkdirSync("work", { recursive: true });
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

project.appearance.showShortcuts = true;
project.shortcuts = [
  { id: "badge", start: 0, end: 500, key: "K", modifiers: ["command"] },
];
const combined = createCanvas(1280, 360);
drawFrame(
  combined.getContext("2d") as any,
  source as any,
  project,
  0,
  1280,
  360,
);
writeFileSync("work/caption-shortcut-fit.png", combined.toBuffer("image/png"));
