import assert from "node:assert/strict";
import { createServer } from "node:http";
import { Readable } from "node:stream";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import { serveMediaFile } from "../desktop/media.cjs";

const exec = promisify(execFile);
const ffmpeg = process.env.REFRACT_FFMPEG ?? "/opt/homebrew/bin/ffmpeg";
const dir = path.resolve("work/media-seeking");
await fs.mkdir(dir, { recursive: true });
const file = path.join(dir, "seek-fixture.mp4");
await exec(ffmpeg, [
  "-v",
  "error",
  "-y",
  "-f",
  "lavfi",
  "-i",
  "testsrc2=size=640x360:rate=30:duration=6",
  "-c:v",
  "libx264",
  "-g",
  "30",
  "-keyint_min",
  "30",
  "-sc_threshold",
  "0",
  "-movflags",
  "+faststart",
  file,
]);
const requests: string[] = [];
const server = createServer(async (incoming, outgoing) => {
  try {
    const range = incoming.headers.range;
    if (range) requests.push(range);
    const response = await serveMediaFile(
      file,
      new Request("http://127.0.0.1/video.mp4", {
        method: incoming.method,
        headers: range ? { Range: range } : undefined,
      }),
      "null",
    );
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    if (!response.body) return outgoing.end();
    const stream = Readable.fromWeb(response.body as never);
    stream.on("error", () => outgoing.destroy());
    outgoing.on("close", () => stream.destroy());
    stream.pipe(outgoing);
  } catch (error) {
    outgoing.destroy(error as Error);
  }
});
await new Promise<void>((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});
try {
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const url = `http://127.0.0.1:${address.port}/video.mp4`;
  const results = [];
  for (const time of [0, 4, 1, 5]) {
    const hash = async (input: string) => {
      const { stdout } = await exec(
        ffmpeg,
        [
          "-v",
          "error",
          ...(input.startsWith("http:")
            ? [
                "-seekable",
                "1",
                "-initial_request_size",
                "4096",
                "-request_size",
                "32768",
              ]
            : []),
          "-ss",
          String(time),
          "-i",
          input,
          "-frames:v",
          "1",
          "-f",
          "framemd5",
          "-",
        ],
        { timeout: 30000 },
      );
      return stdout
        .split("\n")
        .find((line) => line && !line.startsWith("#"))
        ?.split(",")
        .at(-1)
        ?.trim();
    };
    const [direct, served] = await Promise.all([hash(file), hash(url)]);
    assert.ok(direct);
    assert.equal(served, direct, `Decoded source pixels differ at ${time}s`);
    results.push({ time, hash: served });
  }
  assert.ok(
    requests.some((range) => /^bytes=[1-9]\d*-/.test(range)),
    "Decoder must exercise a nonzero byte seek",
  );
  await fs.writeFile(
    path.join(dir, "results.json"),
    JSON.stringify({ results, requests }, null, 2),
  );
  console.log(
    JSON.stringify({
      matchedFrames: results.length,
      rangeRequests: requests.length,
    }),
  );
} finally {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
}
