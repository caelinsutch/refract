import fs from "node:fs/promises";
import { readFileSync, constants } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export function readRecordingDestination(
  settingsFile: string,
  fallback: string,
): string {
  try {
    const { directory } = JSON.parse(readFileSync(settingsFile, "utf8"));
    if (typeof directory === "string" && path.isAbsolute(directory))
      return directory;
  } catch {
    /* Existing installations keep their original recording directory. */
  }
  return fallback;
}

export async function saveRecordingDestination(
  settingsFile: string,
  directory: string,
): Promise<void> {
  if (!path.isAbsolute(directory) || !(await fs.stat(directory)).isDirectory())
    throw Error("Choose a folder for new recordings.");
  await fs.access(directory, constants.W_OK);
  const temporary = settingsFile + "." + crypto.randomUUID() + ".tmp";
  try {
    await fs.writeFile(temporary, JSON.stringify({ directory }), {
      flag: "wx",
    });
    await fs.rename(temporary, settingsFile);
  } finally {
    await fs.rm(temporary, { force: true });
  }
}
