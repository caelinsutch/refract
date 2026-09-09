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
        assert.rejects(write, /close|destroyed|stopped|EPIPE|ECANCELED/i),
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

for (const cancel of [false, true]) {
  test(
    cancel
      ? "cancelling releases a blocked auxiliary audio pipe before output cleanup"
      : "audio generation failure terminates the encoder before output cleanup",
    { timeout: 5000 },
    async () => {
      const { Readable } = await import("node:stream");
      const { pipeline } = await import("node:stream/promises");
      const fs = await import("node:fs/promises");
      const os = await import("node:os");
      const path = await import("node:path");
      const { completeEncoderInputs } = await import("./export-process");
      const { finishExport } = await import("./export-job");
      const directory = await fs.mkdtemp(
        path.join(os.tmpdir(), "refract-input-"),
      );
      const temp = path.join(directory, "pending.mp4");
      const dest = path.join(directory, "video.mp4");
      await fs.writeFile(dest, "existing video");
      const child = spawn(
        process.execPath,
        [
          "-e",
          `
        require('fs').writeFileSync(process.argv[1], 'partial');
        process.on('SIGTERM', () => {});
        setInterval(() => {}, 1000);
        process.stdout.write('ready');
      `,
          temp,
        ],
        { stdio: ["pipe", "pipe", "pipe", "pipe"] },
      );
      const encoderDone = new Promise<void>((resolve, reject) => {
        child.once("error", reject);
        child.once("close", (code) =>
          code === 0 ? resolve() : reject(Error("encoder stopped")),
        );
      });
      void encoderDone.catch(() => {});
      try {
        await once(child.stdout!, "data");
        const source = Readable.from(
          (function* () {
            if (!cancel) throw Error("click synthesis failed");
            while (true) yield Buffer.alloc(1024 * 1024);
          })(),
        );
        const pipe = child.stdio[3] as import("node:stream").Writable;
        const audioDone = pipeline(source, pipe);
        const done = completeEncoderInputs(child, encoderDone, [audioDone]);
        const output = { temp, dest, done, cancelled: cancel };
        const rejected = assert.rejects(
          finishExport(output),
          cancel
            ? /close|destroyed|stopped|EPIPE|ECANCELED/i
            : /click synthesis failed/,
        );
        if (cancel) await stopEncoder(child, 100);
        await rejected;
        assert.equal(child.signalCode, "SIGKILL");
        assert.equal(source.destroyed, true);
        assert.equal(pipe.destroyed, true);
        assert.equal(await fs.readFile(dest, "utf8"), "existing video");
        await assert.rejects(fs.stat(temp), { code: "ENOENT" });
      } finally {
        child.kill("SIGKILL");
        await fs.rm(directory, { recursive: true, force: true });
      }
    },
  );
}
