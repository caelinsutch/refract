import { test } from "node:test";
import assert from "node:assert/strict";
import { createCanvas } from "@napi-rs/canvas";
import { createProject } from "./project";
import { drawFrame } from "./compositor";

test("idle hiding yields to a moving cursor loop while explicit hiding still wins", () => {
  const source = createCanvas(400, 400);
  source.getContext("2d").fillStyle = "white";
  source.getContext("2d").fillRect(0, 0, 400, 400);
  const p = createProject({
    file: "test",
    width: 400,
    height: 400,
    duration: 4000,
    hasAudio: false,
  });
  p.cursor = [
    { time: 0, x: 0.2, y: 0.5 },
    { time: 500, x: 0.8, y: 0.5 },
  ];
  Object.assign(p.appearance, {
    padding: 0,
    radius: 0,
    shadow: 0,
    cursorSize: 2,
    cursorSmooth: false,
    cursorIdleMs: 500,
    cursorLoopMs: 1000,
  });
  const canvas = createCanvas(400, 400);
  const c = canvas.getContext("2d");
  const darkPixels = (time: number) => {
    drawFrame(
      c as unknown as CanvasRenderingContext2D,
      source as unknown as CanvasImageSource,
      p,
      time,
      400,
      400,
    );
    const pixels = c.getImageData(0, 0, 400, 400).data;
    let count = 0;
    for (let i = 0; i < pixels.length; i += 4) if (pixels[i] < 100) count++;
    return count;
  };
  assert.equal(
    darkPixels(2500),
    0,
    "Stationary cursor should disappear before the loop",
  );
  assert.ok(darkPixels(3500) > 20, "The returning pointer must be visible");
  p.appearance.hideCursor = true;
  assert.equal(
    darkPixels(3500),
    0,
    "Explicit hide overrides the automatic return",
  );
  p.appearance.hideCursor = false;
  p.cursor = [
    { time: 0, x: 0.5, y: 0.5 },
    { time: 500, x: 0.5, y: 0.5 },
  ];
  assert.equal(
    darkPixels(3500),
    0,
    "A loop with no displacement should stay idle",
  );
});

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

test("preview targeting resolves the visible source through padding, crop, and zoom", async () => {
  const { sourcePointAt } = await import("./compositor");
  const p = createProject({
    file: "test",
    width: 1000,
    height: 500,
    duration: 4000,
    hasAudio: false,
  });
  p.crop = { x: 200, y: 100, width: 400, height: 200 };
  p.appearance.padding = 10;
  p.appearance.radius = 0;
  p.appearance.animation = "instant";
  p.zooms = [
    {
      id: "zoom",
      disabled: false,
      start: 0,
      end: 4000,
      scale: 2,
      x: 0.5,
      y: 0.4,
      mode: "manual",
    },
  ];
  assert.deepEqual(sourcePointAt(p, 1000, 1000, 1000, 300, 400), {
    x: 0.4,
    y: 0.35,
  });
  assert.equal(sourcePointAt(p, 1000, 1000, 1000, -1, 500), null);
  assert.equal(sourcePointAt(p, 1000, 1000, 1000, 500, 50), null);
  // Independently render a known source landmark at the queried preview position.
  const source = createCanvas(1000, 500),
    sc = source.getContext("2d");
  sc.fillStyle = "red";
  sc.fillRect(0, 0, 1000, 500);
  sc.fillStyle = "lime";
  sc.fillRect(399, 174, 3, 3);
  const output = createCanvas(1000, 1000),
    c = output.getContext("2d");
  drawFrame(
    c as unknown as CanvasRenderingContext2D,
    source as unknown as CanvasImageSource,
    p,
    1000,
    1000,
    1000,
  );
  assert.deepEqual([...c.getImageData(300, 400, 1, 1).data], [0, 255, 0, 255]);
});

test("long captions render inside portrait video margins on multiple lines", () => {
  const p = createProject({
    file: "test",
    width: 100,
    height: 100,
    duration: 1000,
    hasAudio: false,
  });
  const source = createCanvas(100, 100),
    sc = source.getContext("2d");
  sc.fillStyle = "#eeeeee";
  sc.fillRect(0, 0, 100, 100);
  const out = createCanvas(720, 1280),
    ctx = out.getContext("2d");
  const render = () => {
    drawFrame(
      ctx as unknown as CanvasRenderingContext2D,
      source as unknown as CanvasImageSource,
      p,
      500,
      720,
      1280,
    );
    return ctx.getImageData(0, 0, 720, 1280).data;
  };
  const before = render();
  p.captions = [
    {
      id: "long",
      start: 0,
      end: 1000,
      text: "A longer caption should wrap across multiple readable lines instead of running outside the edges of a portrait video.",
    },
  ];
  const after = render();
  let minX = 720,
    maxX = 0,
    minY = 1280,
    maxY = 0;
  for (let y = 0; y < 1280; y++)
    for (let x = 0; x < 720; x++) {
      const i = (y * 720 + x) * 4;
      if (
        before[i] !== after[i] ||
        before[i + 1] !== after[i + 1] ||
        before[i + 2] !== after[i + 2]
      ) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  assert.ok(minX >= 720 * 0.08 - 1 && maxX < 720 * 0.92 + 1);
  assert.ok(maxY - minY > 30, "caption should occupy multiple lines");
  assert.ok(maxY < 1280 - 10);
});

test("zoom expands the screen body into letterbox space rather than recropping a fixed rectangle", () => {
  const p = createProject({
    file: "test",
    width: 200,
    height: 100,
    duration: 2000,
    hasAudio: false,
  });
  Object.assign(p.appearance, {
    padding: 10,
    radius: 0,
    inset: 0,
    shadow: 0,
    hideCursor: true,
    background: "color",
    color: "#0000ff",
    animation: "instant",
    screenMoveBlur: 0,
    screenZoomBlur: 0,
  });
  const source = createCanvas(200, 100);
  source.getContext("2d").fillStyle = "red";
  source.getContext("2d").fillRect(0, 0, 200, 100);
  const out = createCanvas(400, 400),
    ctx = out.getContext("2d");
  const render = () =>
    drawFrame(
      ctx as unknown as CanvasRenderingContext2D,
      source as unknown as CanvasImageSource,
      p,
      500,
      400,
      400,
    );
  render();
  assert.deepEqual([...ctx.getImageData(200, 60, 1, 1).data], [0, 0, 255, 255]);
  p.zooms = [
    {
      id: "zoom",
      start: 0,
      end: 2000,
      scale: 2,
      x: 0.5,
      y: 0.5,
      mode: "manual",
      disabled: false,
    },
  ];
  render();
  assert.deepEqual([...ctx.getImageData(200, 60, 1, 1).data], [255, 0, 0, 255]);
  assert.deepEqual([...ctx.getImageData(200, 20, 1, 1).data], [0, 0, 255, 255]);
});

test("outer-radius rendering preserves equivalent legacy frames and changes both corner clips", () => {
  const source = createCanvas(1280, 720);
  const sc = source.getContext("2d");
  sc.fillStyle = "#ff0000";
  sc.fillRect(0, 0, 1280, 720);
  const p = createProject({
    file: "test",
    width: 1280,
    height: 720,
    duration: 2000,
    hasAudio: false,
  });
  Object.assign(p.appearance, {
    radius: 24,
    inset: 30,
    shadow: 0,
    background: "color",
    color: "#000000",
    insetColor: "#ffffff",
    padding: 10,
  });
  const output = createCanvas(1280, 720),
    c = output.getContext("2d");
  const render = () => {
    drawFrame(
      c as unknown as CanvasRenderingContext2D,
      source as unknown as CanvasImageSource,
      p,
      0,
      1280,
      720,
    );
    return Buffer.from(c.getImageData(0, 0, 1280, 720).data);
  };
  const legacy = render();
  p.appearance.outerRadius = 54;
  assert.deepEqual(
    render(),
    legacy,
    "Equivalent radius semantics changed pixels",
  );
  p.appearance.outerRadius = 0;
  const square = render();
  assert.notDeepEqual(
    square,
    legacy,
    "Outer radius did not affect rendered corners",
  );
  let moreRed = 0,
    moreWhite = 0;
  for (let i = 0; i < square.length; i += 4) {
    if (square[i] === 255 && square[i + 1] === 0 && legacy[i + 1] !== 0)
      moreRed++;
    if (square[i] === 255 && square[i + 1] === 255 && legacy[i] !== 255)
      moreWhite++;
  }
  assert.ok(moreRed > 0, "Video clip did not become square");
  assert.ok(moreWhite > 0, "Inset frame did not become square");
});

test("inset opacity blends its color without fading video or outside shadow", () => {
  const source = createCanvas(1280, 720),
    sc = source.getContext("2d");
  sc.fillStyle = "#ff0000";
  sc.fillRect(0, 0, 1280, 720);
  const p = createProject({
    file: "test",
    width: 1280,
    height: 720,
    duration: 2000,
    hasAudio: false,
  });
  Object.assign(p.appearance, {
    padding: 20,
    inset: 30,
    radius: 0,
    outerRadius: 0,
    insetColor: "#ffffff",
    background: "color",
    color: "#0000ff",
    shadow: 1,
    shadowDirectional: false,
    shadowBlur: 10,
  });
  const output = createCanvas(1280, 720),
    c = output.getContext("2d");
  const render = () => {
    drawFrame(
      c as unknown as CanvasRenderingContext2D,
      source as unknown as CanvasImageSource,
      p,
      0,
      1280,
      720,
    );
  };
  const pixel = (x: number, y: number) => [...c.getImageData(x, y, 1, 1).data];
  render();
  const shadow = pixel(215, 360),
    opaque = pixel(240, 360);
  assert.deepEqual(opaque, [255, 255, 255, 255]);
  assert.ok(shadow[2] < 255);
  for (const opacity of [0, 0.5, 1]) {
    p.appearance.insetOpacity = opacity;
    render();
    const inset = pixel(240, 360);
    assert.ok(Math.abs(inset[0] - opacity * 255) <= 1);
    assert.ok(Math.abs(inset[1] - opacity * 255) <= 1);
    assert.equal(inset[2], 255);
    assert.deepEqual(pixel(640, 360), [255, 0, 0, 255]);
    assert.deepEqual(pixel(215, 360), shadow, "Outside shadow opacity changed");
  }
});

test("custom gradients interpolate from top-left to bottom-right without repeating a color", () => {
  const source = createCanvas(1280, 720);
  const p = createProject({
    file: "test",
    width: 1280,
    height: 720,
    duration: 2000,
    hasAudio: false,
  });
  Object.assign(p.appearance, {
    background: "gradient",
    color: "#ff0000",
    color2: "#0000ff",
    padding: 35,
    shadow: 0,
  });
  for (const [width, height] of [
    [1280, 720],
    [720, 1280],
  ]) {
    const output = createCanvas(width, height),
      c = output.getContext("2d");
    drawFrame(
      c as unknown as CanvasRenderingContext2D,
      source as unknown as CanvasImageSource,
      p,
      0,
      width,
      height,
    );
    const pixel = (x: number, y: number) => [
      ...c.getImageData(x, y, 1, 1).data,
    ];
    const start = pixel(0, 0),
      end = pixel(width - 1, height - 1);
    assert.ok(start[0] > 253 && start[2] < 2);
    assert.ok(end[2] > 253 && end[0] < 2);
    const x = Math.floor(width / 2),
      y = 1;
    const fraction =
      ((x + 0.5) * width + (y + 0.5) * height) /
      (width * width + height * height);
    const middle = pixel(x, y);
    assert.ok(Math.abs(middle[0] - 255 * (1 - fraction)) <= 1);
    assert.ok(Math.abs(middle[2] - 255 * fraction) <= 1);
  }
});
