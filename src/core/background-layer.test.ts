import { test } from "node:test";
import assert from "node:assert/strict";
import { createCanvas } from "@napi-rs/canvas";
import { drawBackgroundLayer } from "./background-layer";

test("static background cache invalidates on setting, appearance, image, and output size", () => {
  const output = createCanvas(160, 100);
  const c = output.getContext("2d") as unknown as CanvasRenderingContext2D;
  let paints = 0;
  const paint = (context: CanvasRenderingContext2D) => {
    paints++;
    context.fillStyle = "red";
    context.fillRect(0, 0, 160, 100);
  };
  const render = (
    setting = 50,
    key = "image",
    image?: CanvasImageSource,
    width = 160,
  ) => drawBackgroundLayer(c, width, 100, setting, key, image, paint);
  render();
  render();
  assert.equal(paints, 1);
  render(60);
  assert.equal(paints, 2);
  render(60, "wallpaper:2");
  assert.equal(paints, 3);
  const image = createCanvas(10, 10) as unknown as CanvasImageSource;
  render(60, "wallpaper:2", image);
  assert.equal(paints, 4);
  render(60, "wallpaper:2", image);
  assert.equal(paints, 4);
  render(60, "wallpaper:2", image, 120);
  assert.equal(paints, 5);
  render(0);
  render(0);
  assert.equal(paints, 7);
});

test("background blur preserves the painted image geometry", () => {
  const output = createCanvas(1280, 720);
  const c = output.getContext("2d") as unknown as CanvasRenderingContext2D;
  const paint = (context: CanvasRenderingContext2D) => {
    context.fillStyle = "black";
    context.fillRect(0, 0, 1280, 720);
    context.fillStyle = "white";
    context.fillRect(320, 0, 960, 720);
  };
  drawBackgroundLayer(c, 1280, 720, 100, "edge", undefined, paint);
  const pixel = c.getImageData(320, 360, 1, 1).data;
  assert.ok(
    pixel[0] > 115 && pixel[0] < 140,
    "The boundary must stay at its original x position",
  );
  assert.equal(pixel[3], 255);
});
