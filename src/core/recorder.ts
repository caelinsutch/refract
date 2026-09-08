export type CaptureSource = {
  id: number;
  name: string;
  width: number;
  height: number;
  app?: string;
};
export type CaptureSources = {
  permission: "granted" | "required";
  displays: CaptureSource[];
  windows: CaptureSource[];
  cameras: { id: string; name: string }[];
  microphones: { id: string; name: string }[];
};
export type CaptureChoice = {
  mode: "display" | "window" | "area";
  displayId?: number;
  windowId?: number;
  area?: { x: number; y: number; width: number; height: number };
  systemAudio: boolean;
  microphoneId?: string;
  cameraId?: string;
};
export type RecorderState = {
  phase:
    | "idle"
    | "countdown"
    | "starting"
    | "recording"
    | "paused"
    | "stopping"
    | "error";
  countdown: number;
  elapsed: number;
  error?: string;
};
