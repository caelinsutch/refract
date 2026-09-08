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

export async function writeEncoderFrame(child: ChildProcess, data: Buffer) {
  if (
    child.exitCode !== null ||
    child.signalCode !== null ||
    child.killed ||
    !child.stdin ||
    child.stdin.destroyed
  )
    throw Error("Encoder stopped.");
  await new Promise<void>((resolve, reject) => {
    const finish = (error?: Error | null) => {
      child.removeListener("close", onClose);
      child.stdin!.removeListener("error", onError);
      error ? reject(error) : resolve();
    };
    const onClose = () => finish(Error("Encoder stopped."));
    const onError = (error: Error) => finish(error);
    child.once("close", onClose);
    child.stdin!.once("error", onError);
    child.stdin!.write(data, finish);
  });
}
