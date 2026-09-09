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
    resolution: [720, 1080, 1920, 2560, 3840].includes(v?.resolution ?? 0)
      ? v!.resolution!
      : 1920,
    fps: [24, 30, 60].includes(v?.fps ?? 0) ? v!.fps! : 30,
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
