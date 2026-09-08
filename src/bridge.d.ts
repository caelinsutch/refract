import type { Project } from "./core/project";
declare global {
  interface Window {
    refract?: {
      importVideo(): Promise<{
        source: Project["source"];
        url: string;
        title: string;
      } | null>;
      openProject(): Promise<{ project: Project; url: string } | null>;
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
