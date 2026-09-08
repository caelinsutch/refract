import fs from "node:fs/promises";
import path from "node:path";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";

export async function serveMediaFile(
  file: string,
  request: Request,
  origin: string,
) {
  const { size } = await fs.stat(file);
  const range = request.headers.get("Range");
  const { mediaRange } = await import("../src/core/media-range.js");
  const selected = range ? mediaRange(range, size) : null;
  const types: Record<string, string> = {
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".webm": "video/webm",
    ".m4a": "audio/mp4",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
  };
  const headers = new Headers({
    "Accept-Ranges": "bytes",
    "Content-Type":
      types[path.extname(file).toLowerCase()] ?? "application/octet-stream",
  });
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Vary", "Origin");
  if (range && !selected) {
    headers.set("Content-Range", `bytes */${size}`);
    return new Response(null, { status: 416, headers });
  }
  if (selected)
    headers.set(
      "Content-Range",
      `bytes ${selected.start}-${selected.end}/${size}`,
    );
  headers.set(
    "Content-Length",
    String(selected ? selected.end - selected.start + 1 : size),
  );
  const body =
    request.method === "HEAD" || size === 0
      ? null
      : (Readable.toWeb(
          createReadStream(file, selected ?? undefined),
        ) as unknown as BodyInit);
  return new Response(body, { status: selected ? 206 : 200, headers });
}
