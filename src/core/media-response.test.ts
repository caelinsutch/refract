import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { serveMediaFile } from "../../desktop/media.cjs";

test("media responses stream exact byte ranges with seekable headers and origin", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "refract-media-test-"));
  try {
    const file = path.join(dir, "fixture.mp4");
    await writeFile(file, "0123456789");
    const request = (range?: string, method = "GET") =>
      new Request("https://media/fixture", {
        method,
        headers: range ? { Range: range } : undefined,
      });
    const full = await serveMediaFile(file, request(), "null");
    assert.equal(full.status, 200);
    assert.equal(full.headers.get("accept-ranges"), "bytes");
    assert.equal(full.headers.get("content-type"), "video/mp4");
    assert.equal(full.headers.get("access-control-allow-origin"), "null");
    assert.equal(await full.text(), "0123456789");
    const partial = await serveMediaFile(file, request("bytes=3-6"), "null");
    assert.equal(partial.status, 206);
    assert.equal(partial.headers.get("content-range"), "bytes 3-6/10");
    assert.equal(partial.headers.get("content-length"), "4");
    assert.equal(await partial.text(), "3456");
    const head = await serveMediaFile(
      file,
      request("bytes=3-", "HEAD"),
      "null",
    );
    assert.equal(head.headers.get("content-length"), "7");
    assert.equal(await head.text(), "");
    const invalid = await serveMediaFile(file, request("bytes=10-"), "null");
    assert.equal(invalid.status, 416);
    assert.equal(invalid.headers.get("content-range"), "bytes */10");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
