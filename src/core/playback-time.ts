/** Frame-based preview readout. Clip editing continues to use milliseconds. */
export function playbackTime(
  milliseconds: number,
  frameRate: number,
  duration: number,
  showFrames = true,
): string {
  const seconds =
    Math.max(0, Number.isFinite(milliseconds) ? milliseconds : 0) / 1000;
  const rate = Number.isFinite(frameRate) && frameRate > 0 ? frameRate : 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  const minutes = Math.floor(seconds / 60) % 60;
  const second = pad(Math.floor(seconds) % 60);
  const frame = pad(Math.floor((seconds * rate) % rate));
  if (duration > 3_600_000) {
    return `${pad(Math.floor(seconds / 3600))}:${pad(minutes)}:${second}.${frame}`;
  }
  const minute = duration >= 600_000 ? pad(minutes) : String(minutes);
  return `${minute}:${second}${showFrames ? `.${frame}` : ""}`;
}
