export const exportFrameRates: Record<"mp4" | "gif", readonly number[]> = {
  mp4: [60, 50, 30, 25, 24, 20, 10],
  gif: [50, 30, 25, 20, 15, 10],
};

export function isExportFrameRate(format: unknown, fps: unknown): boolean {
  return (
    (format === "mp4" || format === "gif") &&
    typeof fps === "number" &&
    exportFrameRates[format].includes(fps)
  );
}

/** Select the nearest supported rate at or below the requested rate. */
export function exportFrameRate(
  format: "mp4" | "gif",
  requested: number,
): number {
  const rates = exportFrameRates[format];
  return rates.find((rate) => rate <= requested) ?? rates[rates.length - 1];
}

export const exportHeights: Record<"mp4" | "gif", readonly number[]> = {
  mp4: [720, 1080, 2160],
  gif: [480, 720, 1080],
};
export function exportHeight(format: "mp4" | "gif", requested: number): number {
  const heights = exportHeights[format];
  return (
    [...heights].reverse().find((height) => height <= requested) ?? heights[0]
  );
}
