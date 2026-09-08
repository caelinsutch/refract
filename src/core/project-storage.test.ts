import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createProject } from "./project.js";
import {
  readProjectManifest,
  writeProjectManifest,
} from "./project-storage.js";

test("serialized saves preserve the previous valid version and recover damaged data", async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "refract-recovery-"),
  );
  try {
    const first = createProject(
      {
        file: "media/source.mp4",
        duration: 1000,
        width: 1280,
        height: 720,
        hasAudio: false,
      },
      "First",
    );
    const second = { ...first, title: "Second" };
    const third = { ...first, title: "Third" };
    await Promise.all([
      writeProjectManifest(directory, first),
      writeProjectManifest(directory, second),
      writeProjectManifest(directory, third),
    ]);
    assert.equal((await readProjectManifest(directory)).project.title, "Third");
    assert.equal((await readProjectManifest(directory)).recovered, false);
    const manifest = path.join(directory, "project.json");
    const backup = path.join(directory, "project.backup.json");
    assert.equal(JSON.parse(await fs.readFile(backup, "utf8")).title, "Second");
    await fs.writeFile(manifest, '{"version":');
    const restored = await readProjectManifest(directory);
    assert.equal(restored.recovered, true);
    assert.equal(restored.project.title, "Second");
    await writeProjectManifest(directory, {
      ...restored.project,
      title: "Recovered",
    });
    assert.equal(
      (await readProjectManifest(directory)).project.title,
      "Recovered",
    );
    assert.equal(JSON.parse(await fs.readFile(backup, "utf8")).title, "Second");
    await fs.rm(manifest);
    assert.equal((await readProjectManifest(directory)).recovered, true);
    await fs.writeFile(backup, "{}");
    await assert.rejects(readProjectManifest(directory));
    assert.deepEqual(
      (await fs.readdir(directory)).filter((name) => name.endsWith(".tmp")),
      [],
    );
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("invalid saves leave the current project and backup untouched", async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "refract-invalid-save-"),
  );
  try {
    const project = createProject({
      file: "media/source.mp4",
      duration: 1000,
      width: 1280,
      height: 720,
      hasAudio: false,
    });
    await writeProjectManifest(directory, project);
    const before = await fs.readFile(
      path.join(directory, "project.json"),
      "utf8",
    );
    assert.throws(() =>
      writeProjectManifest(directory, {
        ...project,
        version: 99,
      } as unknown as typeof project),
    );
    assert.equal(
      await fs.readFile(path.join(directory, "project.json"), "utf8"),
      before,
    );
    assert.deepEqual(await fs.readdir(directory), ["project.json"]);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
