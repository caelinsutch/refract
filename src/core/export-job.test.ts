import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { finishExport } from "./export-job";

test("failed or cancelled finalization preserves the destination and removes temporary output", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "refract-finalize-"));
  try {
    const dest = path.join(dir, "video.mp4"),
      temp = path.join(dir, "pending.mp4");
    await fs.writeFile(dest, "existing video");
    for (const kind of ["failure", "cancel", "empty"] as const) {
      await fs.writeFile(temp, kind === "empty" ? "" : "partial video");
      let complete!: () => void;
      let fail!: (reason: Error) => void;
      const done = new Promise<void>((resolve, reject) => {
        complete = resolve;
        fail = reject;
      });
      const output = { dest, temp, done, cancelled: false };
      const finishing = finishExport(output);
      const rejected = assert.rejects(
        finishing,
        kind === "failure"
          ? /encoder failed/
          : kind === "cancel"
            ? /cancelled/
            : /empty file/,
      );
      if (kind === "failure") fail(Error("encoder failed"));
      else {
        output.cancelled = kind === "cancel";
        complete();
      }
      await rejected;
      assert.equal(await fs.readFile(dest, "utf8"), "existing video");
      await assert.rejects(fs.stat(temp), { code: "ENOENT" });
    }
    await fs.writeFile(temp, "complete video");
    assert.equal(
      await finishExport({
        dest,
        temp,
        done: Promise.resolve(),
        cancelled: false,
      }),
      dest,
    );
    assert.equal(await fs.readFile(dest, "utf8"), "complete video");
    await assert.rejects(fs.stat(temp), { code: "ENOENT" });
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
