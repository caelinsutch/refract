import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { waitForEncoderFinalization } from "./export-process";
import { finishExport } from "./export-job";

for (const stalled of [false, true]) {
  test(
    stalled
      ? "stalled finalization kills the encoder and preserves the destination"
      : "active finalization can outlast its idle deadline and publish",
    { timeout: 5000 },
    async () => {
      const directory = await fs.mkdtemp(
        path.join(os.tmpdir(), "refract-finalization-"),
      );
      const temp = path.join(directory, "pending.mp4");
      const dest = path.join(directory, "video.mp4");
      await fs.writeFile(dest, "existing video");
      const child = spawn(process.execPath, [
        "-e",
        stalled
          ? `
      require('fs').writeFileSync(process.argv[1], 'incomplete');
      process.on('SIGTERM', () => {});
      setInterval(() => {}, 1000);
      process.stdout.write('ready');
    `
          : `
      const fs = require('fs');
      fs.writeFileSync(process.argv[1], 'complete');
      let count = 0;
      const timer = setInterval(() => {
        fs.appendFileSync(process.argv[1], '.');
        if (++count === 12) clearInterval(timer);
      }, 30);
      process.stdout.write('ready');
    `,
        temp,
      ]);
      const done = new Promise<void>((resolve, reject) => {
        child.once("error", reject);
        child.once("close", (code) =>
          code === 0 ? resolve() : reject(Error("encoder stopped")),
        );
      });
      void done.catch(() => {});
      try {
        await once(child.stdout!, "data");
        const result = finishExport(
          { temp, dest, done, cancelled: false },
          waitForEncoderFinalization(child, done, temp, 150, 20),
        );
        if (stalled) {
          await assert.rejects(result, /stopped making progress/);
          assert.equal(child.signalCode, "SIGKILL");
          assert.equal(await fs.readFile(dest, "utf8"), "existing video");
        } else {
          assert.equal(await result, dest);
          assert.equal(await fs.readFile(dest, "utf8"), "complete............");
        }
        await assert.rejects(fs.stat(temp), { code: "ENOENT" });
      } finally {
        child.kill("SIGKILL");
        await fs.rm(directory, { recursive: true, force: true });
      }
    },
  );
}
