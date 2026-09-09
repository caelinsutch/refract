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

export type ExportPreferences = {
  format: "mp4" | "gif";
  mp4: { height: number; fps: number };
  gif: { height: number; fps: number };
};
export function exportPreferences(value: unknown): ExportPreferences {
  const saved =
    value && typeof value === "object"
      ? (value as Partial<ExportPreferences>)
      : {};
  const read = (format: "mp4" | "gif", height: number, fps: number) => {
    const item = saved[format];
    return {
      height:
        typeof item?.height === "number" &&
        exportHeights[format].includes(item.height)
          ? item.height
          : height,
      fps: isExportFrameRate(format, item?.fps) ? item!.fps : fps,
    };
  };
  return {
    format: saved.format === "gif" ? "gif" : "mp4",
    mp4: read("mp4", 720, 60),
    gif: read("gif", 480, 15),
  };
}
