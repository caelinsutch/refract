import test from "node:test";
import assert from "node:assert/strict";
import { ClickSchedule } from "./click-schedule";
const lengths = { click: 0.05, down: 0.04, up: 0.03 };
const cues = [100, 200, 300].map((time) => ({
  time,
  sourceTime: time,
  kind: "click" as const,
  button: 0,
}));

test("a stalled editor clock cannot schedule clicks further down the timeline", () => {
  const schedule = new ClickSchedule(cues, 0, 0);
  for (let i = 0; i < 100; i++)
    assert.deepEqual(schedule.update(0, 0, 1, lengths).starts, []);
  const approaching = schedule.update(75, 0, 1, lengths);
  assert.deepEqual(approaching.starts, [
    { kind: "click", delay: 0.025, offset: 0 },
  ]);
  for (let i = 0; i < 100; i++)
    assert.deepEqual(schedule.update(75, 0, 1, lengths).starts, []);
  assert.equal(schedule.update(180, 0, 1, lengths).starts.length, 1);
});

test("small seeks discard queued audio and loops can replay retained cues", () => {
  const schedule = new ClickSchedule(cues, 0, 0);
  schedule.update(75, 0, 1, lengths);
  assert.deepEqual(schedule.update(80, 1, 1, lengths), {
    reset: true,
    starts: [{ kind: "click", delay: 0.02, offset: 0 }],
  });
  assert.deepEqual(
    schedule.update(105, 2, 1, lengths),
    { reset: true, starts: [] },
    "A seek past a click does not replay it",
  );
  schedule.update(300, 2, 1, lengths);
  assert.equal(schedule.update(0, 2, 1, lengths).reset, true);
  assert.equal(schedule.update(75, 2, 1, lengths).starts.length, 1);
});

test("late samples start at elapsed real time and expired transients are skipped", () => {
  const schedule = new ClickSchedule(cues, 0, 0);
  assert.deepEqual(schedule.update(120, 0, 2, lengths).starts, [
    { kind: "click", delay: 0, offset: 0.01 },
    { kind: "click", delay: 0.04, offset: 0 },
  ]);
  assert.deepEqual(schedule.update(500, 0, 2, lengths).starts, []);
});
