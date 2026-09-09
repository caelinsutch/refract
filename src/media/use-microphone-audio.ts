import { useEffect, useRef } from "react";
import { microphoneAudioAt } from "../core/audio";
import type { Project } from "../core/project";

export function useMicrophoneAudio(
  project: Project | null,
  time: number,
  playing: boolean,
  speed: number,
  report: (message: string) => void,
) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const failed = useRef(false);
  const latest = useRef({ project, time, playing, speed, report });
  latest.current = { project, time, playing, speed, report };
  const synchronize = () => {
    const media = audio.current,
      state = latest.current;
    if (!media || !state.project || media.readyState < 1) return;
    const at = microphoneAudioAt(state.project, state.time);
    if (!at) {
      media.pause();
      return;
    }
    media.volume = at.volume;
    media.playbackRate = at.speed * state.speed;
    const target = at.time / 1000;
    if (target >= media.duration) {
      media.pause();
      return;
    }
    if (Math.abs(media.currentTime - target) > 0.05) media.currentTime = target;
    if (!state.playing) failed.current = false;
    if (state.playing && at.volume > 0 && !failed.current) {
      if (media.paused)
        void media.play().catch(() => {
          if (audio.current !== media || failed.current) return;
          failed.current = true;
          latest.current.report("Microphone audio could not play.");
        });
    } else media.pause();
  };
  useEffect(() => {
    const file = project?.microphoneAudio?.file;
    if (!file || !window.refract) return;
    let cancelled = false;
    const media = new Audio();
    failed.current = false;
    media.preload = "auto";
    media.loop = false;
    media.onloadedmetadata = () => synchronize();
    media.onerror = () =>
      latest.current.report("Microphone audio could not be decoded.");
    audio.current = media;
    void window.refract
      .projectAudioUrl(file)
      .then((url) => {
        if (!cancelled) media.src = url;
      })
      .catch((error) => {
        if (!cancelled) latest.current.report(String(error));
      });
    return () => {
      cancelled = true;
      media.pause();
      media.onloadedmetadata = null;
      media.onerror = null;
      media.removeAttribute("src");
      media.load();
      if (audio.current === media) audio.current = null;
    };
  }, [project?.id, project?.microphoneAudio?.file]);
  useEffect(() => {
    synchronize();
  }, [project, time, playing, speed]);
}
