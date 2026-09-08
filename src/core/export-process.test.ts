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

test(
  "a live encoder that stops reading cannot hold a frame write indefinitely",
  { timeout: 5000 },
  async () => {
    const child = spawn(process.execPath, [
      "-e",
      "setInterval(()=>{},1000);process.stdout.write('ready');",
    ]);
    child.stdin.on("error", () => {});
    try {
      await once(child.stdout, "data");
      const closeListeners = child.listenerCount("close");
      const errorListeners = child.stdin.listenerCount("error");
      await assert.rejects(
        writeEncoderFrame(child, Buffer.alloc(8 * 1024 * 1024), 100),
        /stopped accepting frames/,
      );
      assert.equal(
        child.exitCode,
        null,
        "The test exercises a live stalled process, not a crashed encoder",
      );
      assert.equal(child.listenerCount("close"), closeListeners);
      assert.equal(child.stdin.listenerCount("error"), errorListeners);
      await stopEncoder(child, 100);
    } finally {
      child.kill("SIGKILL");
    }
  },
);

test(
  "a draining encoder accepts frames and clears its watchdog",
  { timeout: 5000 },
  async () => {
    const child = spawn(process.execPath, [
      "-e",
      "process.stdin.on('data',()=>{});process.stdout.write('ready');",
    ]);
    child.stdin.on("error", () => {});
    try {
      await once(child.stdout, "data");
      await writeEncoderFrame(child, Buffer.alloc(1024 * 1024), 1000);
      child.stdin.end();
      await once(child, "close");
      assert.equal(child.exitCode, 0);
    } finally {
      child.kill("SIGKILL");
    }
  },
);
