import test from "node:test";
import assert from "node:assert/strict";
import { createCanvas } from "@napi-rs/canvas";
import { createProject, type Mask } from "./project";
import { drawFrame, videoGeometry } from "./compositor";
import { drawMaskSelection, maskRectangle } from "./mask-drag";
test("selection handles scale with display density and never persist in composed frames", () => {
  for (const density of [1, 2]) {
    const size = 200 * density,
      p = createProject({
        file: "fixture",
        width: 200,
        height: 200,
        duration: 1000,
        hasAudio: false,
      });
    Object.assign(p.appearance, { padding: 0, radius: 0, shadow: 0 });
    const m: Mask = {
      id: "m",
      start: 0,
      end: 500,
      x: 0.25,
      y: 0.25,
      width: 0.5,
      height: 0.5,
      type: "highlight",
      strength: 0,
    };
    p.masks = [m];
    const video = createCanvas(200, 200),
      canvas = createCanvas(size, size),
      c = canvas.getContext("2d");
    video.getContext("2d").fillRect(0, 0, 200, 200);
    const context = c as unknown as CanvasRenderingContext2D;
    const render = () =>
      drawFrame(
        context,
        video as unknown as CanvasImageSource,
        p,
        0,
        size,
        size,
      );
    const pixels = () => Buffer.from(c.getImageData(0, 0, size, size).data);
    render();
    const clean = pixels();
    drawMaskSelection(context, p, m, 0, size, size, density);
    const r = maskRectangle(p, m, 0, size, size);
    assert.equal(
      c.getImageData(r.x + density, r.y + density, 1, 1).data[0],
      255,
    );
    assert.equal(
      c.getImageData(r.x + 5 * density, r.y + 5 * density, 1, 1).data[0],
      0,
    );
    assert.notDeepEqual(pixels(), clean);
    render();
    assert.deepEqual(
      pixels(),
      clean,
      "shared composition must remove editor adornments",
    );
    drawMaskSelection(context, p, m, 500, size, size, density);
    assert.deepEqual(pixels(), clean, "expired mask must not show handles");
  }
});
test("selection outline stays clipped to visible recording bounds after cropping", () => {
  const p = createProject({
    file: "fixture",
    width: 400,
    height: 400,
    duration: 1000,
    hasAudio: false,
  });
  p.crop = { x: 100, y: 100, width: 200, height: 200 };
  p.appearance.padding = 10;
  const m: Mask = {
    id: "m",
    start: 0,
    end: 1000,
    x: 0.1,
    y: 0.3,
    width: 0.4,
    height: 0.4,
    type: "blur",
    strength: 1,
  };
  const canvas = createCanvas(200, 200),
    c = canvas.getContext("2d");
  c.fillStyle = "#806040";
  c.fillRect(0, 0, 200, 200);
  const before = Buffer.from(c.getImageData(0, 0, 200, 200).data);
  drawMaskSelection(
    c as unknown as CanvasRenderingContext2D,
    p,
    m,
    0,
    200,
    200,
    1,
  );
  const after = Buffer.from(c.getImageData(0, 0, 200, 200).data),
    g = videoGeometry(p, 0, 200, 200);
  assert.notDeepEqual(
    after,
    before,
    "visible portions of the outline must render",
  );
  for (let y = 0; y < 200; y++)
    for (let x = 0; x < 200; x++)
      if (x < g.x || x >= g.x + g.w || y < g.y || y >= g.y + g.h) {
        const i = (y * 200 + x) * 4;
        assert.deepEqual(after.subarray(i, i + 4), before.subarray(i, i + 4));
      }
});
