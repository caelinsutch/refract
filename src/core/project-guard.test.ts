import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { setupProjectGuard } from "../../desktop/project-guard.cjs";

test("project approvals belong to one action and stale replies cannot approve a later action", async () => {
  let reply!: (...args: any[]) => unknown;
  const sent: string[] = [];
  const contents = Object.assign(new EventEmitter(), {
    isLoading: () => false,
    send: (_: string, id: string) => sent.push(id),
  });
  const editor = Object.assign(new EventEmitter(), {
    webContents: contents,
    isDestroyed: () => false,
  });
  const request = setupProjectGuard(
    editor as unknown as Parameters<typeof setupProjectGuard>[0],
    {
      handle: (_channel, handler) => {
        reply = handler;
      },
    },
  );
  const first = request();
  assert.equal(
    await request(),
    false,
    "Competing quit/start must not inherit this approval",
  );
  assert.equal(sent.length, 1);
  assert.throws(() => reply({ sender: {} }, sent[0], true), /Unknown sender/);
  contents.emit("did-start-loading");
  assert.equal(await first, false);
  const second = request();
  reply({ sender: contents }, sent[0], true);
  assert.equal(
    await request(),
    false,
    "A stale reply must leave the new request pending",
  );
  reply({ sender: contents }, sent[1], true);
  assert.equal(await second, true);
  const third = request();
  contents.emit("render-process-gone");
  assert.equal(await third, false);
  const fourth = request();
  editor.emit("closed");
  assert.equal(await fourth, false);
});
