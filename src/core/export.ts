import { clipAudioGain } from "./audio.js";
import { type Project, validateProject, duration } from "./project.js";
export function exportArgs(
  project: Project,
  sourceFile: string,
  destination: string,
  fps: number,
  format: "mp4" | "gif",
  backgroundFile?: string,
  microphoneFile?: string,
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
  const music =
    format === "mp4" &&
    project.backgroundAudio &&
    !project.backgroundAudio.muted
      ? project.backgroundAudio
      : undefined;
  const microphone =
    format === "mp4" &&
    project.microphoneAudio &&
    !project.microphoneAudio.muted
      ? project.microphoneAudio
      : undefined;
  const filters: string[] = [];
  if (audio) {
    args.push("-i", sourceFile);
    filters.push(
      ...project.segments.map((s, i) => {
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
      }),
    );
    filters.push(
      project.segments.map((_, i) => `[a${i}]`).join("") +
        `concat=n=${project.segments.length}:v=0:a=1[asource]`,
    );
  }
  if (microphone) {
    if (!microphoneFile) throw Error("Microphone audio file is unavailable.");
    const input = audio ? 2 : 1;
    args.push("-i", microphoneFile);
    filters.push(
      ...project.segments.map((segment, index) => {
        let speed = segment.speed;
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
        const gain = segment.muted
          ? 0
          : microphone.volume * (segment.volume ?? 1);
        return `[${input}:a]atrim=start=${segment.start / 1000}:end=${segment.end / 1000},asetpts=PTS-STARTPTS,${tempo.join(",")},volume=${gain}[mic${index}]`;
      }),
    );
    filters.push(
      project.segments.map((_, index) => `[mic${index}]`).join("") +
        `concat=n=${project.segments.length}:v=0:a=1[amicrophone]`,
    );
  }
  if (music) {
    if (!backgroundFile) throw Error("Background audio file is unavailable.");
    args.push("-stream_loop", "-1", "-i", backgroundFile);
    filters.push(
      `[${1 + Number(audio) + Number(Boolean(microphone))}:a]atrim=duration=${duration(project) / 1000},asetpts=PTS-STARTPTS,volume=${music.volume}[music]`,
    );
  }
  const tracks = [
    audio ? "[asource]" : "",
    microphone ? "[amicrophone]" : "",
    music ? "[music]" : "",
  ].filter(Boolean);
  if (tracks.length > 1)
    filters.push(
      `${tracks.join("")}amix=inputs=${tracks.length}:duration=longest:normalize=0[aout]`,
    );
  if (filters.length)
    args.push(
      "-filter_complex",
      filters.join(";"),
      "-map",
      "0:v",
      "-map",
      tracks.length > 1 ? "[aout]" : tracks[0],
    );
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
      ...(tracks.length ? ["-c:a", "aac", "-b:a", "192k"] : []),
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
