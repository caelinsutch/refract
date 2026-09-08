import { test } from "node:test";
import assert from "node:assert/strict";
import { createCanvas } from "@napi-rs/canvas";
import { createProject } from "./project";
import { drawFrame } from "./compositor";

test("background blur leaves the recording itself sharp", () => {
  const source = createCanvas(100, 100),
    sc = source.getContext("2d");
  sc.fillStyle = "#ff0000";
  sc.fillRect(0, 0, 50, 100);
  sc.fillStyle = "#0000ff";
  sc.fillRect(50, 0, 50, 100);
  const p = createProject({
    file: "test",
    width: 100,
    height: 100,
    duration: 1000,
    hasAudio: false,
  });
  p.appearance.padding = 30;
  p.appearance.shadow = 0;
  const canvas = createCanvas(400, 400),
    c = canvas.getContext("2d");
  const render = () => {
    drawFrame(
      c as unknown as CanvasRenderingContext2D,
      source as unknown as CanvasImageSource,
      p,
      0,
      400,
      400,
    );
    return c.getImageData(0, 0, 400, 400).data;
  };
  const before = render();
  p.appearance.blur = 60;
  const after = render();
  for (const x of [190, 199, 200, 210]) {
    const i = (200 * 400 + x) * 4;
    assert.deepEqual([...after.slice(i, i + 4)], [...before.slice(i, i + 4)]);
  }
  assert.notDeepEqual(
    [...after.slice(0, 400 * 50 * 4)],
    [...before.slice(0, 400 * 50 * 4)],
  );
});

test("directional shadow follows angle without shifting the recording", () => {
  const source = createCanvas(100, 100),
    sc = source.getContext("2d");
  sc.fillStyle = "#ffffff";
  sc.fillRect(0, 0, 100, 100);
  const p = createProject({
    file: "test",
    width: 100,
    height: 100,
    duration: 1000,
    hasAudio: false,
  });
  Object.assign(p.appearance, {
    background: "color",
    color: "#ffffff",
    padding: 30,
    radius: 0,
    shadow: 1,
    shadowDirectional: true,
    shadowDistance: 100,
    shadowBlur: 5,
  });
  const canvas = createCanvas(400, 400),
    c = canvas.getContext("2d");
  function redAt(angle: number, x: number) {
    p.appearance.shadowAngle = angle;
    drawFrame(
      c as unknown as CanvasRenderingContext2D,
      source as unknown as CanvasImageSource,
      p,
      0,
      400,
      400,
    );
    return c.getImageData(x, 200, 1, 1).data[0];
  }
  assert.ok(redAt(0, 295) < redAt(0, 105) - 50);
  assert.ok(redAt(180, 105) < redAt(180, 295) - 50);
  assert.equal(redAt(0, 200), 255);
  assert.equal(redAt(180, 200), 255);
});

test("crop removes source pixels in the shared compositor, including during zoom", () => {
  const source = createCanvas(100, 100),
    sc = source.getContext("2d");
  sc.fillStyle = "#ff0000";
  sc.fillRect(0, 0, 50, 100);
  sc.fillStyle = "#0000ff";
  sc.fillRect(50, 0, 50, 100);
  const p = createProject({
    file: "test",
    width: 100,
    height: 100,
    duration: 1000,
    hasAudio: false,
  });
  p.crop = { x: 50, y: 0, width: 50, height: 100 };
  Object.assign(p.appearance, { padding: 0, radius: 0, shadow: 0, inset: 0 });
  const canvas = createCanvas(100, 200),
    c = canvas.getContext("2d");
  for (const zoom of [false, true]) {
    p.zooms = zoom
      ? [
          {
            id: "z",
            start: 0,
            end: 1000,
            scale: 2,
            x: 0,
            y: 0.5,
            mode: "manual",
            disabled: false,
          },
        ]
      : [];
    drawFrame(
      c as unknown as CanvasRenderingContext2D,
      source as unknown as CanvasImageSource,
      p,
      500,
      100,
      200,
    );
    assert.deepEqual([...c.getImageData(50, 100, 1, 1).data], [0, 0, 255, 255]);
  }
});
