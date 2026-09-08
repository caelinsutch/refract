import { test } from "node:test";
import assert from "node:assert/strict";
import { mediaRange } from "./media-range";
test("media ranges support seeks, open ends, suffixes, and reject unsatisfiable requests", () => {
  assert.deepEqual(mediaRange("bytes=500-999", 2000), { start: 500, end: 999 });
  assert.deepEqual(mediaRange("bytes=1000-", 2000), { start: 1000, end: 1999 });
  assert.deepEqual(mediaRange("bytes=-100", 2000), { start: 1900, end: 1999 });
  assert.deepEqual(mediaRange("bytes=0-9999", 2000), { start: 0, end: 1999 });
  assert.deepEqual(mediaRange("bytes=-9999", 2000), { start: 0, end: 1999 });
  for (const header of [
    "bytes=2000-",
    "bytes=10-9",
    "bytes=-0",
    "bytes=-",
    "bytes=0-1,3-4",
    "invalid",
    "bytes=9007199254740992-",
  ])
    assert.equal(mediaRange(header, 2000), null);
  assert.equal(mediaRange("bytes=0-", 0), null);
});
