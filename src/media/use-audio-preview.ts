import { useEffect, useRef, useState } from "react";
import type { Project } from "../core/project";

/** Audition the original music track without moving the video playhead. */
export function useAudioPreview(
  project: Project | null,
  suspended: boolean,
  report: (message: string) => void,
) {
  const media = useRef<HTMLAudioElement | null>(null);
  const reportRef = useRef(report);
  reportRef.current = report;
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const stop = () => {
    const audio = media.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setPlaying(false);
  };
  useEffect(() => {
    setReady(false);
    setPlaying(false);
    const file = project?.backgroundAudio?.file;
    if (!file || !window.refract) return;
    let cancelled = false;
    const audio = new Audio();
    media.current = audio;
    audio.preload = "auto";
    audio.volume = project.backgroundAudio!.volume;
    audio.onloadedmetadata = () => {
      if (!cancelled) setReady(true);
    };
    audio.onplay = () => {
      if (!cancelled) setPlaying(true);
    };
    audio.onended = stop;
    audio.onerror = () => {
      if (!cancelled) {
        stop();
        setReady(false);
        reportRef.current("The audio preview could not be decoded.");
      }
    };
    void window.refract
      .projectAudioUrl(file)
      .then((url) => {
        if (!cancelled) audio.src = url;
      })
      .catch((error) => {
        if (!cancelled) reportRef.current(String(error));
      });
    return () => {
      cancelled = true;
      audio.pause();
      audio.onplay = null;
      audio.onended = null;
      audio.onerror = null;
      audio.onloadedmetadata = null;
      audio.removeAttribute("src");
      audio.load();
      if (media.current === audio) media.current = null;
    };
  }, [project?.id, project?.backgroundAudio?.file]);
  useEffect(() => {
    if (media.current && project?.backgroundAudio)
      media.current.volume = project.backgroundAudio.volume;
  }, [project?.backgroundAudio?.volume]);
  useEffect(() => {
    if (suspended) stop();
  }, [suspended]);
  const toggle = () => {
    const audio = media.current;
    if (!audio || !ready) return;
    if (!audio.paused) {
      stop();
      return;
    }
    audio.currentTime = 0;
    void audio.play().catch(() => {
      if (media.current === audio) {
        stop();
        reportRef.current("The audio preview could not play.");
      }
    });
  };
  return { playing, ready, toggle };
}
