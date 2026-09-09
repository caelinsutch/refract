import { exportHeight, isExportFrameRate } from "./export-settings.js";
export type RecordingCompletion = {
  action: "create-project" | "export-file" | "export-clipboard";
  resolution: number;
  fps: number;
};
export function recordingCompletion(value: unknown): RecordingCompletion {
  const v = value as Partial<RecordingCompletion> | null;
  return {
    action:
      v?.action === "export-file" || v?.action === "export-clipboard"
        ? v.action
        : "create-project",
    resolution: exportHeight(
      "mp4",
      typeof v?.resolution === "number" &&
        Number.isFinite(v.resolution) &&
        v.resolution <= 3840
        ? v.resolution
        : 720,
    ),
    fps: isExportFrameRate("mp4", v?.fps) ? v!.fps! : 60,
  };
}
/** Completion events may be redelivered; project reopen never enters this path. */
export class RecordingCompletions {
  private received = new Set<string>();
  accept(id: string): boolean {
    if (this.received.has(id)) return false;
    this.received.add(id);
    return true;
  }
}
