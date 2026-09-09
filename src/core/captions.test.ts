import test from "node:test";
import assert from "node:assert/strict";
import { captionsFromWords } from "./captions";
import { createProject, sourceAt } from "./project";

test("recognized word times stay in source time through cuts and speed changes", () => {
  const p = createProject({
    file: "speech",
    width: 100,
    height: 100,
    duration: 10000,
    hasAudio: true,
  });
  p.captions = captionsFromWords(
    [
      { text: "First.", start: 1000, end: 1500 },
      { text: "Removed.", start: 4000, end: 4500 },
      { text: "Last.", start: 8000, end: 9000 },
    ],
    10000,
  );
  p.segments = [
    { id: "a", start: 0, end: 2000, speed: 1 },
    { id: "b", start: 8000, end: 10000, speed: 2 },
  ];
  const captionAt = (t: number) => {
    const source = sourceAt(p, t)!.time;
    return p.captions.find((c) => source >= c.start && source < c.end)?.text;
  };
  assert.equal(captionAt(1100), "First.");
  assert.equal(captionAt(2100), "Last.");
  assert.equal(captionAt(2500), undefined);
  for (let t = 0; t < 3000; t += 25) assert.notEqual(captionAt(t), "Removed.");
});
test("caption grouping respects pauses, punctuation, duration, and bad timestamps", () => {
  const captions = captionsFromWords(
    [
      { text: "Hello", start: 0, end: 300 },
      { text: "world", start: 300, end: 700 },
      { text: ".", start: 700, end: 710 },
      { text: "Next", start: 1500, end: 1800 },
      { text: "phrase", start: 1800, end: 2300 },
      { text: "Later", start: 4000, end: 6000 },
      { text: "invalid", start: NaN, end: 9000 },
    ],
    5000,
  );
  assert.deepEqual(
    captions.map(({ start, end, text }) => ({ start, end, text })),
    [
      { start: 0, end: 710, text: "Hello world." },
      { start: 1500, end: 2300, text: "Next phrase" },
      { start: 4000, end: 5000, text: "Later" },
    ],
  );
  assert.deepEqual(captionsFromWords([], 5000), []);
});

test("caption wrapping preserves words, explicit lines, and grapheme clusters", async () => {
  const { wrapCaption } = await import("./captions");
  const measure = (s: string) =>
    [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(s)]
      .length;
  const text = "Captions stay readable on narrow video";
  const lines = wrapCaption(text, 12, measure);
  assert.equal(lines.join(" "), text);
  assert.ok(lines.every((line) => measure(line) <= 12));
  assert.deepEqual(wrapCaption("First line\nSecond line", 50, measure), [
    "First line",
    "Second line",
  ]);
  const emoji = "👨‍👩‍👧‍👦";
  assert.deepEqual(wrapCaption(emoji.repeat(5), 2, measure), [
    emoji.repeat(2),
    emoji.repeat(2),
    emoji,
  ]);
});

test("caption layout preserves normal sizing and fits long text without dropping lines", async () => {
  const { layoutCaption } = await import("./captions");
  const measure = (text: string, size: number) =>
    Array.from(text).length * size * 0.6;
  const normal = layoutCaption("Hello world", 1280, 720, measure);
  assert.equal(normal.fontSize, 30);
  assert.equal(normal.boxHeight, 52);
  assert.equal(normal.bottom, 33);
  for (const [width, height] of [
    [1280, 720],
    [720, 1280],
    [4096, 256],
    [320, 180],
  ]) {
    for (const text of [
      Array(150).fill("A caption line").join("\n"),
      "Long caption words ".repeat(200).trim(),
    ]) {
      const result = layoutCaption(text, width, height, measure);
      assert.ok(result.top >= result.bottom - 0.001);
      assert.ok(
        result.top + result.boxHeight <= height - result.bottom + 0.001,
      );
      assert.ok(result.textWidth + 36 * result.scale <= width * 0.84 + 0.001);
      assert.ok(result.fontSize > 0);
      assert.equal(
        result.lines.join(" ").replace(/\s+/g, " "),
        text.replace(/\s+/g, " "),
      );
    }
  }
});

test("caption layout reserves a separate shortcut band", async () => {
  const { layoutCaption } = await import("./captions");
  const { shortcutFontSize } = await import("./shortcuts");
  const measure = (text: string, size: number) => text.length * size * 0.6;
  for (const [width, height] of [
    [1280, 720],
    [720, 1280],
    [4096, 256],
  ]) {
    const badgeHeight = shortcutFontSize(width, height, 3) * 1.8;
    const gap = Math.min((12 * width) / 1280, height * 0.03);
    const caption = layoutCaption(
      "Long caption line\n".repeat(120),
      width,
      height,
      measure,
      badgeHeight + gap,
    );
    const badgeTop = caption.top - gap - badgeHeight;
    assert.ok(badgeTop >= caption.bottom - 0.001);
    assert.ok(badgeTop + badgeHeight <= caption.top - gap + 0.001);
    assert.ok(badgeHeight <= height * 0.25 + 0.001);
  }
});

test("rendered captions stay stable as an overlapping shortcut ends", async () => {
  const { createCanvas } = await import("@napi-rs/canvas");
  const { drawFrame } = await import("./compositor");
  const p = createProject({
    file: "fixture",
    width: 1280,
    height: 720,
    duration: 1000,
    hasAudio: false,
  });
  p.captions = [
    {
      id: "caption",
      start: 0,
      end: 1000,
      text: "A long caption line\n".repeat(24),
    },
  ];
  p.shortcuts = [
    { id: "badge", start: 0, end: 500, key: "K", modifiers: ["command"] },
  ];
  p.appearance.showShortcuts = true;
  const source = createCanvas(1280, 720);
  const frame = createCanvas(1280, 360);
  const context = frame.getContext("2d");
  const lowerHalf = () =>
    Buffer.from(context.getImageData(0, 180, 1280, 180).data);
  drawFrame(context as any, source as any, p, 0, 1280, 360);
  const withBadge = lowerHalf();
  drawFrame(context as any, source as any, p, 750, 1280, 360);
  assert.deepEqual(
    lowerHalf(),
    withBadge,
    "caption pixels must not jump when the badge expires",
  );
  p.appearance.showShortcuts = false;
  drawFrame(context as any, source as any, p, 750, 1280, 360);
  assert.notDeepEqual(
    lowerHalf(),
    withBadge,
    "disabling shortcuts must invalidate the reserved layout",
  );
});
