import type {
  CaptureChoice,
  CaptureSources,
  RecorderState,
} from "./core/recorder";
import type { Project } from "./core/project";
declare global {
  interface Window {
    refract?: {
      editText: (action: "undo" | "redo") => Promise<void>;
      cropOpen: (data: {
        width: number;
        height: number;
        initial?: import("./core/crop").CropRect;
        image: string;
      }) => Promise<import("./core/crop").CropRect | null>;
      cropState: () => Promise<{
        width: number;
        height: number;
        initial?: import("./core/crop").CropRect;
        image: string;
      }>;
      cropFinish: (
        crop: import("./core/crop").CropRect | null,
      ) => Promise<void>;
      generateCaptions(
        project: Project,
        locale: string,
      ): Promise<{ captions: Project["captions"]; locale: string }>;
      cancelCaptions(): Promise<void>;
      showRecorder(): Promise<void>;
      recorderState(): Promise<RecorderState>;
      recorderSources(): Promise<CaptureSources>;
      recorderExpand(expanded: boolean): Promise<void>;
      recorderStart(choice: CaptureChoice): Promise<void>;
      recorderPause(): Promise<void>;
      recorderStop(): Promise<void>;
      recorderClose(): Promise<void>;
      recorderImport(): Promise<void>;
      recorderPermissions(): Promise<void>;
      recorderArea(id: number): Promise<void>;
      recorderAreaSelected(area: CaptureChoice["area"] | null): Promise<void>;
      onRecorderState(cb: (state: RecorderState) => void): () => void;
      onRecordingFinished(
        cb: (data: {
          project: Project;
          source: Project["source"];
          url: string;
          title: string;
          cursor: Project["cursor"];
          cameraUrl?: string;
        }) => void,
      ): () => void;
      onAreaSelected(
        cb: (data: { area: CaptureChoice["area"]; displayId: number }) => void,
      ): () => void;

      importVideo(): Promise<{
        source: Project["source"];
        url: string;
        title: string;
      } | null>;
      openProject(): Promise<{
        project: Project;
        url: string;
        cameraUrl?: string;
      } | null>;
      saveProject(p: Project, saveAs?: boolean): Promise<string | null>;
      exportStart(options: {
        project: Project;
        width: number;
        height: number;
        fps: number;
        format: "mp4" | "gif";
      }): Promise<string | null>;
      exportFrame(id: string, data: ArrayBuffer): Promise<void>;
      exportFinish(id: string): Promise<string>;
      exportCancel(): Promise<void>;
      onMenu(callback: (action: string) => void): () => void;
    };
  }
}
