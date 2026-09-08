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
