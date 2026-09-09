/** Preserve the native capture clock as actual silence for every audio consumer. */
export function alignMicrophoneArgs(
  source: string,
  destination: string,
): string[] {
  return [
    "-v",
    "error",
    "-y",
    "-copyts",
    "-i",
    source,
    "-map",
    "0:a:0",
    "-af",
    "aresample=async=1:first_pts=0",
    "-c:a",
    "pcm_s24le",
    destination,
  ];
}
