import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { stopEncoder, writeEncoderFrame } from "./export-process";

test(
  "cancellation terminates an unresponsive encoder and releases a blocked frame write",
  { timeout: 5000 },
  async () => {
    const child = spawn(process.execPath, [
      "-e",
      `process.on('SIGTERM',()=>{});setInterval(()=>{},1000);process.stdout.write('ready');`,
    ]);
    child.stdin.on("error", () => {});
    try {
      await once(child.stdout, "data");
      const write = writeEncoderFrame(child, Buffer.alloc(8 * 1024 * 1024));
      await Promise.all([
        assert.rejects(write, /closed|destroyed|stopped|EPIPE|ECANCELED/i),
        stopEncoder(child, 100),
      ]);
      assert.equal(child.signalCode, "SIGKILL");
      await assert.rejects(
        writeEncoderFrame(child, Buffer.from("late")),
        /stopped/,
      );
    } finally {
      child.kill("SIGKILL");
    }
  },
);
