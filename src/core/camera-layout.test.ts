import { test } from "node:test";
import assert from "node:assert/strict";
import { createCanvas } from "@napi-rs/canvas";
import { cameraFrameAt } from "./camera-layout";
import { createProject, validateProject } from "./project";
import { drawFrame } from "./compositor";
const project = () =>
  createProject({
    file: "screen.mp4",
    width: 400,
    height: 400,
    duration: 4000,
    hasAudio: false,
    camera: { file: "camera.mp4", width: 800, height: 400 },
  });
test("camera layout boundaries blend from their presentation state and seek deterministically", () => {
  const p = project();
  p.cameraLayouts = [
    { id: "a", start: 1000, end: 1100, type: "fullscreen", x: 1, y: 1 },
    { id: "b", start: 1100, end: 2000, type: "hidden", x: 1, y: 1 },
  ];
  const start = cameraFrameAt(p, 1000, 400, 400, 1);
  const interrupted = cameraFrameAt(p, 1100, 400, 400, 1);
  assert.ok(interrupted.width > start.width && interrupted.width < 400);
  assert.ok(
    Math.abs(
      cameraFrameAt(p, 1099.999, 400, 400, 1).width - interrupted.width,
    ) < 0.01,
  );
  assert.equal(cameraFrameAt(p, 1500, 400, 400, 1).opacity, 0);
  const settled = cameraFrameAt(p, 2400, 400, 400, 1);
  assert.equal(settled.opacity, 1);
  assert.equal(settled.width, start.width);
  assert.deepEqual(cameraFrameAt(p, 1100, 400, 400, 1), interrupted);
  p.appearance.cameraHidden = true;
  assert.equal(cameraFrameAt(p, 1100, 400, 400, 1).opacity, 0);
});
test("camera layouts survive serialization, reject overlap, and load older projects", () => {
  const p = project();
  p.cameraLayouts = [
    { id: "a", start: 1000, end: 2000, type: "default", x: 0, y: 0.2 },
  ];
  assert.deepEqual(
    validateProject(JSON.parse(JSON.stringify(p))).cameraLayouts,
    p.cameraLayouts,
  );
  p.cameraLayouts.push({ ...p.cameraLayouts[0], id: "b", start: 1500 });
  assert.throws(() => validateProject(p), /camera layout/);
  delete p.cameraLayouts;
  assert.deepEqual(validateProject(p).cameraLayouts, []);
});
test("fullscreen camera preserves aspect ratio and the edited playback clock", () => {
  const p = project();
  p.appearance.cameraMirror = false;
  p.appearance.animation = "instant";
  p.cameraLayouts = [
    { id: "a", start: 500, end: 1500, type: "fullscreen", x: 1, y: 1 },
  ];
  const source = createCanvas(400, 400),
    camera = createCanvas(800, 400),
    canvas = createCanvas(400, 400);
  const cam = camera.getContext("2d");
  cam.fillStyle = "red";
  cam.fillRect(0, 0, 800, 400);
  cam.fillStyle = "blue";
  cam.fillRect(200, 0, 400, 400);
  const c = canvas.getContext("2d");
  const frame = (time: number) => {
    drawFrame(
      c as unknown as CanvasRenderingContext2D,
      source as unknown as CanvasImageSource,
      p,
      time,
      400,
      400,
      undefined,
      camera as unknown as CanvasImageSource,
    );
    return Buffer.from(c.getImageData(0, 0, 400, 400).data);
  };
  const full = frame(1000);
  for (const offset of [0, (399 * 400 + 399) * 4, (200 * 400 + 200) * 4])
    assert.deepEqual([...full.subarray(offset, offset + 4)], [0, 0, 255, 255]);
  p.segments = [{ id: "cut", start: 500, end: 2000, speed: 2 }];
  assert.deepEqual(frame(250), full);
  p.cameraLayouts[0].type = "hidden";
  assert.notDeepEqual(frame(250), full);
});
