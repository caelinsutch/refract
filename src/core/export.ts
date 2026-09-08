import { clipAudioGain } from "./audio.js";
import { type Project, validateProject } from "./project.js";
export function exportArgs(
  project: Project,
  sourceFile: string,
  destination: string,
  fps: number,
  format: "mp4" | "gif",
): string[] {
  validateProject(project);
  if (!(format === "gif" ? [24, 30, 50] : [24, 30, 60]).includes(fps))
    throw Error("Unsupported output frame rate.");
  const args = [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-f",
    "image2pipe",
    "-framerate",
    String(fps),
    "-vcodec",
    "png",
    "-i",
    "pipe:0",
  ];
  const audio =
    project.source.hasAudio && !project.appearance.muted && format === "mp4";
  if (audio) {
    args.push("-i", sourceFile);
    const filters = project.segments.map((s, i) => {
      let speed = s.speed;
      const tempo: string[] = [];
      while (speed > 2) {
        tempo.push("atempo=2");
        speed /= 2;
      }
      while (speed < 0.5) {
        tempo.push("atempo=0.5");
        speed /= 0.5;
      }
      tempo.push("atempo=" + speed);
      return `[1:a]atrim=start=${s.start / 1000}:end=${s.end / 1000},asetpts=PTS-STARTPTS,${tempo.join(",")},volume=${clipAudioGain(project, s)}[a${i}]`;
    });
    filters.push(
      project.segments.map((_, i) => `[a${i}]`).join("") +
        `concat=n=${project.segments.length}:v=0:a=1[aout]`,
    );
    args.push(
      "-filter_complex",
      filters.join(";"),
      "-map",
      "0:v",
      "-map",
      "[aout]",
    );
  }
  if (format === "mp4")
    args.push(
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "18",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      ...(audio ? ["-c:a", "aac", "-b:a", "192k"] : []),
    );
  else
    args.push(
      "-vf",
      "split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse",
      "-loop",
      "0",
    );
  args.push(destination);
  return args;
}
