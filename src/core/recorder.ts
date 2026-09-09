export type CaptureSource = {
  id: number;
  name: string;
  width: number;
  height: number;
  app?: string;
};
export type RecorderInputMenu = {
  kind: "camera" | "microphone" | "audio" | "settings";
  selected: string | null;
  cameraResolution?: 720 | 1080 | 2160;
  countdownSeconds?: 0 | 3 | 5 | 10;
  automaticZooms?: boolean;
  hideDesktopIcons?: boolean;
  completionAction?: "create-project" | "export-file";
  x: number;
  y: number;
};
export type RecorderInputSelection =
  | { value: string | null; label: string }
  | { cameraResolution: 720 | 1080 | 2160 }
  | { countdownSeconds: 0 | 3 | 5 | 10 }
  | { automaticZooms: boolean }
  | { hideDesktopIcons: boolean }
  | { completionAction: "create-project" | "export-file" }
  | { settings: "advanced" };
export type CaptureSources = {
  keyboardPermission?: "granted" | "required";
  permission: "granted" | "required";
  displays: CaptureSource[];
  windows: CaptureSource[];
  cameras: { id: string; name: string }[];
  microphones: { id: string; name: string }[];
};
export type CaptureChoice = {
  hideDesktopIcons?: boolean;
  countdownSeconds?: 0 | 3 | 5 | 10;
  mode: "display" | "window" | "area";
  displayId?: number;
  windowId?: number;
  area?: { x: number; y: number; width: number; height: number };
  systemAudio: boolean;
  automaticZooms?: boolean;
  completion?: import("./recording-completion.js").RecordingCompletion;
  microphoneId?: string;
  cameraId?: string;
  cameraResolution?: 720 | 1080 | 2160;
};
export type RecorderState = {
  keyboardStatus?: "available" | "permission-required" | "unavailable";
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
