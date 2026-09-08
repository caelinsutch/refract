import fs from "node:fs/promises";

export type ExportOutput = {
  temp: string;
  dest: string;
  done: Promise<void>;
  cancelled: boolean;
};

/** Publish only a completed output; preserve any existing destination on failure. */
export async function finishExport(output: ExportOutput): Promise<string> {
  try {
    await output.done;
    if (output.cancelled) throw Error("Export cancelled.");
    const info = await fs.stat(output.temp);
    if (info.size === 0) throw Error("Encoder created an empty file.");
    if (output.cancelled) throw Error("Export cancelled.");
    await fs.rename(output.temp, output.dest);
    return output.dest;
  } catch (error) {
    await fs.rm(output.temp, { force: true });
    throw error;
  }
}
