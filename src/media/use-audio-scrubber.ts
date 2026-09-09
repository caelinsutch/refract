import { useEffect, useRef } from "react";
import { clipAudioGain, microphoneAudioAt } from "../core/audio";
import { duration, sourceAt, type Project } from "../core/project";

/** Separate players audition paused seeks without advancing the video clock. */
export function useAudioScrubber(
  project: Project | null,
  sourceUrl: string,
  enabled: boolean,
  suspended: boolean,
) {
  const players = useRef<{
    source?: HTMLAudioElement;
    microphone?: HTMLAudioElement;
  }>({});
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latest = useRef({ project, enabled, suspended });
  latest.current = { project, enabled, suspended };
  const stop = () => {
    clearTimeout(timer.current);
    timer.current = undefined;
    for (const audio of Object.values(players.current)) audio.pause();
  };
  useEffect(() => {
    stop();
    if (!enabled || !project) return;
    let cancelled = false;
    const owned: HTMLAudioElement[] = [];
    const add = (kind: "source" | "microphone", url: string) => {
      if (cancelled) return;
      const audio = new Audio();
      audio.preload = "auto";
      audio.src = url;
      players.current[kind] = audio;
      owned.push(audio);
    };
    if (project.source.hasAudio && sourceUrl) add("source", sourceUrl);
    if (project.microphoneAudio?.file && window.refract) {
      void window.refract
        .projectAudioUrl(project.microphoneAudio.file)
        .then((url) => add("microphone", url))
        .catch(() => {});
    }
    return () => {
      cancelled = true;
      stop();
      players.current = {};
      for (const audio of owned) {
        audio.removeAttribute("src");
        audio.load();
      }
    };
  }, [
    enabled,
    project?.id,
    project?.source.hasAudio,
    sourceUrl,
    project?.microphoneAudio?.file,
  ]);
  useEffect(() => {
    if (!enabled || suspended) stop();
  }, [enabled, suspended]);
  return (position: number) => {
    stop();
    const state = latest.current;
    if (
      !state.enabled ||
      state.suspended ||
      !state.project ||
      position < 0 ||
      position >= duration(state.project)
    )
      return;
    const at = sourceAt(state.project, position);
    if (!at) return;
    const microphone = microphoneAudioAt(state.project, position);
    const samples = [
      {
        audio: players.current.source,
        time: at.time,
        volume: clipAudioGain(state.project, at.segment),
      },
      {
        audio: players.current.microphone,
        time: microphone?.time ?? 0,
        volume: microphone?.volume ?? 0,
      },
    ];
    for (const { audio, time, volume } of samples) {
      if (
        !audio ||
        audio.readyState < 3 ||
        volume <= 0 ||
        time / 1000 >= audio.duration
      )
        continue;
      audio.volume = Math.min(1, volume) * 0.75;
      audio.currentTime = time / 1000;
      void audio.play().catch(() => {});
    }
    timer.current = setTimeout(stop, Math.min(150, at.segment.end - at.time));
  };
}
