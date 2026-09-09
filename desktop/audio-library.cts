import fs from "node:fs/promises";
import path from "node:path";

export const audioExtensions = [
  "mp3",
  "mp4",
  "m4a",
  "wav",
  "aiff",
  "aif",
  "flac",
  "ogg",
];
const supported = (name: string) =>
  audioExtensions.includes(path.extname(name).slice(1).toLowerCase());

/** Only direct, regular audio files are library entries. */
export async function listAudioLibrary(directory: string): Promise<string[]> {
  await fs.mkdir(directory, { recursive: true });
  const entries = await fs.readdir(directory, { withFileTypes: true });
  return entries
    .filter(
      (entry) =>
        entry.isFile() && !entry.name.startsWith(".") && supported(entry.name),
    )
    .map((entry) => entry.name)
    .sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
    );
}

export async function resolveLibraryTrack(
  directory: string,
  name: unknown,
): Promise<string> {
  if (
    typeof name !== "string" ||
    !name ||
    name.startsWith(".") ||
    path.basename(name) !== name ||
    !supported(name)
  )
    throw Error("Choose an audio track from your library.");
  const file = path.join(directory, name);
  if (!(await fs.lstat(file)).isFile())
    throw Error("This library track is no longer available.");
  return file;
}
