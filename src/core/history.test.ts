import test from "node:test";
import assert from "node:assert/strict";
import { createProject } from "./project";
import { emptyHistory, reduceHistory } from "./history";
const project = () =>
  createProject({
    file: "test",
    width: 100,
    height: 100,
    duration: 1000,
    hasAudio: false,
  });
test("history reducer is repeatable without mutating prior state", () => {
  const p = project(),
    state = reduceHistory(emptyHistory, { type: "load", project: p });
  const action = {
    type: "edit" as const,
    project: { ...p, title: "Changed" },
    now: 10,
  };
  assert.deepEqual(reduceHistory(state, action), reduceHistory(state, action));
  assert.equal(state.present, p);
  assert.equal(state.past.length, 0);
});
test("continuous values group but distinct actions within 350ms remain separate", () => {
  const p = project();
  let h = reduceHistory(emptyHistory, { type: "load", project: p });
  const edit = (title: string, now: number, group?: string) =>
    (h = reduceHistory(h, {
      type: "edit",
      project: { ...p, title },
      now,
      group,
    }));
  edit("drag1", 1, "drag");
  edit("drag2", 2, "drag");
  assert.equal(h.past.length, 1);
  edit("crop", 3);
  assert.equal(h.past.length, 2);
  edit("delete", 4);
  assert.equal(h.past.length, 3);
  h = reduceHistory(h, { type: "undo" });
  assert.equal(h.present?.title, "crop");
  h = reduceHistory(h, { type: "undo" });
  assert.equal(h.present?.title, "drag2");
  h = reduceHistory(h, { type: "undo" });
  assert.equal(h.present, p);
  h = reduceHistory(h, { type: "redo" });
  assert.equal(h.present?.title, "drag2");
});
test("editing after undo clears redo and starts a new group", () => {
  const p = project();
  let h = reduceHistory(emptyHistory, { type: "load", project: p });
  h = reduceHistory(h, {
    type: "edit",
    project: { ...p, title: "first" },
    now: 1,
    group: "a",
  });
  h = reduceHistory(h, { type: "undo" });
  h = reduceHistory(h, {
    type: "edit",
    project: { ...p, title: "replacement" },
    now: 2,
    group: "a",
  });
  assert.equal(h.future.length, 0);
  assert.equal(h.past.length, 1);
  assert.equal(reduceHistory(h, { type: "undo" }).present, p);
});
