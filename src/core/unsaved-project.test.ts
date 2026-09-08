import test from "node:test";
import assert from "node:assert/strict";
import { confirmProjectReplacement } from "./unsaved-project.js";

test("replacement preserves edits on cancel, failed save, and edits during the prompt/save", async () => {
  for (const decision of ["save", "discard", "cancel"] as const) {
    const snapshot = {};
    let current = snapshot;
    let saves = 0;
    const options = {
      snapshot,
      current: () => current,
      choose: async () => decision,
      save: async () => {
        saves++;
        return "/project";
      },
    };
    assert.deepEqual(await confirmProjectReplacement(options), {
      proceed: decision !== "cancel",
      saved: decision === "save",
    });
    assert.equal(saves, decision === "save" ? 1 : 0);
    current = {};
    assert.equal((await confirmProjectReplacement(options)).proceed, false);
    assert.equal(saves, decision === "save" ? 1 : 0);
  }
  const snapshot = {};
  let current = snapshot;
  const options = {
    snapshot,
    current: () => current,
    choose: async () => "save" as const,
    save: async (): Promise<string | null> => null,
  };
  assert.equal((await confirmProjectReplacement(options)).proceed, false);
  await assert.rejects(
    confirmProjectReplacement({
      ...options,
      save: async () => {
        throw Error("disk full");
      },
    }),
    /disk full/,
  );
  assert.deepEqual(
    await confirmProjectReplacement({
      ...options,
      save: async () => {
        current = {};
        return "/project";
      },
    }),
    { proceed: false, saved: false },
  );
});
