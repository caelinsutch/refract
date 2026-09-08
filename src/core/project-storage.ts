import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { validateProject, type Project } from "./project.js";

const pending = new Map<string, Promise<void>>();
const manifestName = "project.json";
const backupName = "project.backup.json";

async function atomicWrite(file: string, contents: string) {
  const temporary = file + "." + randomUUID() + ".tmp";
  try {
    const handle = await fs.open(temporary, "wx");
    try {
      await handle.writeFile(contents, "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }
    await fs.rename(temporary, file);
  } finally {
    await fs.rm(temporary, { force: true });
  }
}

function recoverable(error: unknown) {
  const code = (error as NodeJS.ErrnoException).code;
  // Filesystem permission/device errors must not be mistaken for damaged JSON.
  return !code || code === "ENOENT";
}

export async function readProjectManifest(directory: string): Promise<{
  project: Project;
  recovered: boolean;
}> {
  try {
    return {
      project: validateProject(
        JSON.parse(
          await fs.readFile(path.join(directory, manifestName), "utf8"),
        ),
      ),
      recovered: false,
    };
  } catch (error) {
    if (!recoverable(error)) throw error;
    try {
      const project = validateProject(
        JSON.parse(await fs.readFile(path.join(directory, backupName), "utf8")),
      );
      return { project, recovered: true };
    } catch {
      throw error;
    }
  }
}

/** Preserve the last valid manifest; serialize saves without sharing temp files. */
export function writeProjectManifest(
  directory: string,
  project: Project,
): Promise<void> {
  const contents = JSON.stringify(validateProject(project), null, 2);
  const key = path.resolve(directory);
  const operation = (pending.get(key) ?? Promise.resolve())
    .catch(() => {})
    .then(async () => {
      const manifest = path.join(key, manifestName);
      try {
        const previous = await fs.readFile(manifest, "utf8");
        validateProject(JSON.parse(previous));
        await atomicWrite(path.join(key, backupName), previous);
      } catch (error) {
        if (!recoverable(error)) throw error;
        // Never replace a valid backup with a damaged current manifest.
      }
      await atomicWrite(manifest, contents);
    });
  pending.set(key, operation);
  const cleanup = () => {
    if (pending.get(key) === operation) pending.delete(key);
  };
  operation.then(cleanup, cleanup);
  return operation;
}
