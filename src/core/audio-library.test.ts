import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  listAudioLibrary,
  resolveLibraryTrack,
} from "../../desktop/audio-library.cts";

test("audio library refresh detects added and removed regular audio files", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "refract-library-"));
  const library = path.join(root, "library");
  try {
    assert.deepEqual(await listAudioLibrary(library), []);
    for (const name of [
      "Track 10.MP3",
      "Track 2.wav",
      ".hidden.mp3",
      "notes.txt",
    ])
      await fs.writeFile(path.join(library, name), "fixture");
    await fs.mkdir(path.join(library, "folder.mp3"));
    await fs.symlink(
      path.join(library, "Track 2.wav"),
      path.join(library, "linked.wav"),
    );
    assert.deepEqual(await listAudioLibrary(library), [
      "Track 2.wav",
      "Track 10.MP3",
    ]);
    assert.equal(
      await resolveLibraryTrack(library, "Track 2.wav"),
      path.join(library, "Track 2.wav"),
    );
    for (const name of [
      "../Track 2.wav",
      "/tmp/track.mp3",
      "folder.mp3",
      "linked.wav",
      ".hidden.mp3",
      "notes.txt",
      null,
    ])
      await assert.rejects(resolveLibraryTrack(library, name));
    await fs.unlink(path.join(library, "Track 2.wav"));
    assert.deepEqual(await listAudioLibrary(library), ["Track 10.MP3"]);
    await assert.rejects(resolveLibraryTrack(library, "Track 2.wav"));
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
