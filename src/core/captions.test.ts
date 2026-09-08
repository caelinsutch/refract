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
