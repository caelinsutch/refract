import fs from "node:fs/promises";
import type { ChildProcess } from "node:child_process";

/** Close blocked input and bound cooperative shutdown of our encoder. */
export async function stopEncoder(child: ChildProcess, graceMs = 1000) {
  if (!child.pid || child.exitCode !== null || child.signalCode !== null)
    return;
  const closed = new Promise<void>((resolve) => child.once("close", resolve));
  child.stdin?.destroy();
  child.kill("SIGTERM");
  const force = setTimeout(() => child.kill("SIGKILL"), graceMs);
  try {
    await closed;
  } finally {
    clearTimeout(force);
  }
}

export async function writeEncoderFrame(
  child: ChildProcess,
  data: Buffer,
  timeoutMs = 60000,
) {
  if (
    child.exitCode !== null ||
    child.signalCode !== null ||
    child.killed ||
    !child.stdin ||
    child.stdin.destroyed
  )
    throw Error("Encoder stopped.");
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const timeout = setTimeout(
      () =>
        finish(
          Error(
            "The video encoder stopped accepting frames. Export was stopped; try again with a lower output size.",
          ),
        ),
      timeoutMs,
    );
    const finish = (error?: Error | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      child.removeListener("close", onClose);
      child.stdin!.removeListener("error", onError);
      error ? reject(error) : resolve();
    };
    const onClose = () => finish(Error("Encoder stopped."));
    const onError = (error: Error) => finish(error);
    child.once("close", onClose);
    child.stdin!.once("error", onError);
    try {
      child.stdin!.write(data, finish);
    } catch (error) {
      finish(error instanceof Error ? error : Error(String(error)));
    }
  });
}

/** Allow long muxes while the output changes, but release a stalled finalizer. */
export async function waitForEncoderFinalization(
  child: ChildProcess,
  done: Promise<void>,
  outputFile: string,
  idleMs = 120000,
  pollMs = 1000,
) {
  let timedOut = false;
  try {
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      let polling = false;
      let lastActivity = performance.now();
      let signature = "";
      const finish = (error?: unknown) => {
        if (settled) return;
        settled = true;
        clearInterval(timer);
        error ? reject(error) : resolve();
      };
      const timer = setInterval(async () => {
        if (settled || polling) return;
        polling = true;
        try {
          const stat = await fs.stat(outputFile).catch((error) => {
            if (error.code === "ENOENT") return null;
            throw error;
          });
          if (settled) return;
          const next = stat
            ? `${stat.size}:${stat.mtimeMs}:${stat.ctimeMs}`
            : "";
          if (next !== signature) {
            signature = next;
            lastActivity = performance.now();
          }
          if (performance.now() - lastActivity >= idleMs) {
            timedOut = true;
            finish(
              Error(
                "The video encoder stopped making progress while finishing the export. Please try exporting again.",
              ),
            );
          }
        } catch (error) {
          timedOut = true;
          finish(error);
        } finally {
          polling = false;
        }
      }, pollMs);
      void done.then(() => finish(), finish);
    });
  } catch (error) {
    // Wait for process shutdown before its incomplete output is removed.
    if (timedOut) await stopEncoder(child);
    throw error;
  }
}
