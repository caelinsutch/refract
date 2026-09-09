import { duration, sourceAt, type Project, type Segment } from "./project.js";
/** Music follows edited playback time, independent of source cuts, speed, and mute. */
export function backgroundAudioAt(project: Project, playbackMs: number) {
  const audio = project.backgroundAudio;
  if (!audio) return null;
  return {
    time: Math.max(0, playbackMs) % audio.duration,
    volume: audio.muted ? 0 : audio.volume,
  };
}
/** Gain is multiplicative; muting a clip preserves its place in the audio timeline. */
export function clipAudioGain(project: Project, clip: Segment) {
  return project.appearance.muted || clip.muted
    ? 0
    : Math.max(0, Math.min(2, project.appearance.volume)) * (clip.volume ?? 1);
}

/** Recorded microphone audio follows source edits, independently of system mute. */
export function microphoneAudioAt(project: Project, playbackMs: number) {
  if (
    !Number.isFinite(playbackMs) ||
    playbackMs < 0 ||
    playbackMs >= duration(project)
  )
    return null;
  const audio = project.microphoneAudio;
  const at = sourceAt(project, playbackMs);
  if (!audio || !at) return null;
  return {
    time: at.time,
    speed: at.segment.speed,
    volume:
      audio.muted || at.segment.muted
        ? 0
        : audio.volume * (at.segment.volume ?? 1),
  };
}
