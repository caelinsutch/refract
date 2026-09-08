import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { setupEditorLifecycle } from "../../desktop/editor-lifecycle.cjs";

test("cancelled close/quit remain usable, duplicate requests coalesce, and capture defers quit", async () => {
  let quits = 0,
    hides = 0,
    checks = 0,
    ready = true;
  let resolve!: (allowed: boolean) => void;
  const app = Object.assign(new EventEmitter(), {
    quit() {
      quits++;
      app.emit("before-quit", {
        preventDefault() {
          throw Error("Approved quit must proceed");
        },
      });
    },
  });
  const editor = Object.assign(new EventEmitter(), {
    hide() {
      hides++;
    },
    isDestroyed() {
      return false;
    },
  });
  setupEditorLifecycle(
    app,
    editor,
    () => ready,
    () => {
      checks++;
      return new Promise<boolean>((done) => {
        resolve = done;
      });
    },
  );
  const event = { preventDefault() {} };
  const tick = () => new Promise((done) => setImmediate(done));
  editor.emit("close", event);
  editor.emit("close", event);
  assert.equal(checks, 1);
  resolve(false);
  await tick();
  assert.equal(hides, 0);
  editor.emit("close", event);
  resolve(true);
  await tick();
  assert.equal(hides, 1);
  ready = false;
  app.emit("before-quit", event);
  assert.equal(checks, 2, "Capture finalization precedes the quit prompt");
  ready = true;
  app.emit("before-quit", event);
  app.emit("before-quit", event);
  assert.equal(checks, 3);
  resolve(false);
  await tick();
  assert.equal(quits, 0);
  app.emit("before-quit", event);
  resolve(true);
  await tick();
  assert.equal(quits, 1);
  editor.emit("close", {
    preventDefault() {
      throw Error("Approved quit must close windows");
    },
  });
});
