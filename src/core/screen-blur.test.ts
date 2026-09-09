import test from "node:test";
import assert from "node:assert/strict";
import { createCanvas } from "@napi-rs/canvas";
import { createProject, zoomAt, validateProject } from "./project";
import { screenExposure, drawScreenExposure } from "./screen-blur";
import { drawFrame } from "./compositor";
function fixture() {
  const p = createProject({
    file: "unused",
    width: 400,
    height: 400,
    duration: 4000,
    hasAudio: false,
  });
  p.zooms = [
    {
      id: "z",
      start: 1000,
      end: 2000,
      scale: 2,
      x: 0.3,
      y: 0.4,
      mode: "manual",
      disabled: false,
    },
  ];
  Object.assign(p.appearance, {
    padding: 0,
    radius: 0,
    shadow: 0,
    hideCursor: true,
  });
  p.appearance.screenMoveBlur = 0;
  p.appearance.screenZoomBlur = 0;
  return p;
}
test("screen exposure separates translation and zoom, clamps cuts, and disables instant blur", () => {
  const p = fixture();
  const current = zoomAt(p, 1100);
  p.appearance.motionBlurAmount = 1;
  p.appearance.screenZoomBlur = 1;
  let samples = screenExposure(p, 1100);
  assert.equal(samples.length, 12);
  assert.ok(samples.some((v) => v.scale !== current.scale));
  assert.ok(samples.every((v) => v.x === current.x && v.y === current.y));
  p.appearance.screenZoomBlur = 0;
  p.appearance.screenMoveBlur = 1;
  samples = screenExposure(p, 1100);
  assert.ok(samples.some((v) => v.x !== current.x));
  assert.ok(samples.every((v) => v.scale === current.scale));
  p.segments = [{ id: "cut", start: 1100, end: 2000, speed: 2 }];
  assert.equal(screenExposure(p, 0).length, 1);
  p.appearance.animation = "instant";
  assert.equal(screenExposure(p, 100).length, 1);
  p.appearance.screenMoveBlur = 2;
  assert.throws(() => validateProject(p), /motion blur/);
});
test("screen blur is deterministic and stationary content takes the unchanged path", () => {
  const p = fixture(),
    source = createCanvas(400, 400),
    sc = source.getContext("2d"),
    canvas = createCanvas(400, 400),
    c = canvas.getContext("2d");
  sc.fillStyle = "#eee";
  sc.fillRect(0, 0, 400, 400);
  for (let x = 0; x < 400; x += 20) {
    sc.fillStyle = "#223344";
    sc.fillRect(x, 0, 5, 400);
  }
  const render = (
    t: number,
    quality: "quality" | "performance" = "quality",
  ) => {
    drawFrame(
      c as unknown as CanvasRenderingContext2D,
      source as unknown as CanvasImageSource,
      p,
      t,
      400,
      400,
      undefined,
      undefined,
      quality,
    );
    return Buffer.from(c.getImageData(0, 0, 400, 400).data);
  };
  const sharp = render(1100),
    stationary = render(0);
  p.appearance.motionBlurAmount = 1;
  p.appearance.screenZoomBlur = 1;
  p.appearance.screenMoveBlur = 1;
  const blur = render(1100);
  assert.notDeepEqual(blur, sharp);
  assert.deepEqual(render(1100, "performance"), sharp);
  assert.equal(p.appearance.screenZoomBlur, 1);
  assert.deepEqual(render(1100), blur);
  assert.deepEqual(render(0), stationary);
  render(3000);
  assert.deepEqual(render(1100), blur);
  p.appearance.screenZoomBlur = 0;
  p.appearance.screenMoveBlur = 0;
  assert.deepEqual(render(1100), sharp);
});
test("opaque masks cover every temporal screen sample", () => {
  const p = fixture();
  p.appearance.motionBlurAmount = 1;
  p.appearance.screenZoomBlur = 1;
  p.appearance.screenMoveBlur = 1;
  p.masks = [
    {
      id: "mask",
      start: 0,
      end: 4000,
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      type: "highlight",
      strength: 100,
    },
  ];
  const canvas = createCanvas(400, 400),
    c = canvas.getContext("2d"),
    source = createCanvas(400, 400);
  source.getContext("2d").fillRect(0, 0, 400, 400);
  drawFrame(
    c as unknown as CanvasRenderingContext2D,
    source as unknown as CanvasImageSource,
    p,
    1100,
    400,
    400,
  );
  const data = c.getImageData(0, 0, 400, 400).data;
  for (const [x, y] of [
    [50, 50],
    [200, 200],
    [350, 350],
  ]) {
    const i = (y * 400 + x) * 4;
    assert.ok(data[i] > 245 && data[i + 1] > 200 && data[i + 2] > 70);
    assert.equal(data[i + 3], 255);
  }
});

test("bounded exposure matches full-frame pixels across clips and buffer reuse", () => {
  const full = createCanvas(160, 120),
    bounded = createCanvas(160, 120);
  const source = createCanvas(160, 120),
    sc = source.getContext("2d");
  for (let x = 0; x < 160; x += 3) {
    sc.fillStyle = x % 2 ? "#25b5aacc" : "#fd7833";
    sc.fillRect(x, 0, 3, 120);
  }
  const transforms = screenExposure(
    Object.assign(fixture(), {
      appearance: {
        ...fixture().appearance,
        screenMoveBlur: 1,
        screenZoomBlur: 1,
        motionBlurAmount: 1,
      },
    }),
    1100,
  );
  for (const bounds of [
    { x: 20, y: 15, width: 90, height: 75 },
    { x: 20.25, y: 15.75, width: 90.5, height: 75.1 },
    { x: -12.25, y: -5.5, width: 90.5, height: 75.1 },
    { x: 100.25, y: 90.5, width: 90.5, height: 75.1 },
    { x: 21.25, y: 16.75, width: 90.5, height: 75.1 },
  ]) {
    for (const canvas of [full, bounded]) {
      const c = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;
      c.clearRect(0, 0, 160, 120);
      c.save();
      c.beginPath();
      c.roundRect(bounds.x, bounds.y, bounds.width, bounds.height, 7.5);
      c.clip();
      drawScreenExposure(
        c,
        160,
        120,
        transforms,
        (sample, transform) => {
          sample.drawImage(
            source as unknown as CanvasImageSource,
            transform.x * 10,
            0,
            120,
            100,
            bounds.x,
            bounds.y,
            bounds.width,
            bounds.height,
          );
          sample.save();
          sample.beginPath();
          sample.rect(bounds.x, bounds.y, 30, bounds.height);
          sample.clip();
          sample.filter = "blur(4px)";
          sample.drawImage(
            source as unknown as CanvasImageSource,
            bounds.x,
            bounds.y,
          );
          sample.restore();
          sample.fillStyle = "#ffd55088";
          sample.fillRect(bounds.x + 15, bounds.y + 10, 20, 30);
        },
        canvas === bounded ? bounds : undefined,
      );
      c.restore();
    }
    assert.deepEqual(
      Buffer.from(bounded.getContext("2d").getImageData(0, 0, 160, 120).data),
      Buffer.from(full.getContext("2d").getImageData(0, 0, 160, 120).data),
      JSON.stringify(bounds),
    );
  }
});
