import { useEffect, useMemo, useRef } from "react";
import type { Project } from "../core/project";
import { clickSoundCues } from "../core/click-sounds";
import { clickSoundBank, type ClickSoundProfile } from "../core/click-audio";
import { ClickAudition } from "../core/click-audition";
export function useClickAudio(
  project: Project | null,
  time: number,
  playing: boolean,
  speed: number,
  report: (message: string) => void,
) {
  const context = useRef<AudioContext | null>(null);
  const audition = useRef(new ClickAudition());
  useEffect(() => () => audition.current.stop(), [project?.id]);
  useEffect(() => {
    if (project?.appearance.clickSound === "none") audition.current.stop();
  }, [project?.appearance.clickSound]);
  const latest = useRef({
    time,
    volume: project?.appearance.clickSoundVolume ?? 0.25,
    report,
  });
  latest.current = {
    time,
    volume: project?.appearance.clickSoundVolume ?? 0.25,
    report,
  };
  const cues = useMemo(
    () => (project ? clickSoundCues(project) : []),
    [project?.cursor, project?.segments],
  );
  const profile = project?.appearance.clickSound ?? "none";
  const getContext = () =>
    context.current ??
    (context.current = new AudioContext({ sampleRate: 48000 }));
  useEffect(
    () => () => {
      void context.current?.close().catch(() => {});
      context.current = null;
    },
    [],
  );
  useEffect(() => {
    if (!playing || profile === "none") return;
    let cancelled = false,
      timer: ReturnType<typeof setInterval> | undefined;
    const nodes = new Set<AudioBufferSourceNode>(),
      scheduled = new Set<number>();
    const stopNodes = () => {
      for (const node of nodes) {
        try {
          node.stop();
        } catch {}
      }
      nodes.clear();
      scheduled.clear();
    };
    let cleanupGain = () => {};
    void (async () => {
      const ctx = getContext();
      await ctx.resume();
      if (cancelled) return;
      const bank = clickSoundBank(profile, ctx.sampleRate);
      const buffers = Object.fromEntries(
        Object.entries(bank).map(([kind, samples]) => {
          const buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
          buffer.getChannelData(0).set(samples);
          return [kind, buffer];
        }),
      ) as Record<"click" | "down" | "up", AudioBuffer>;
      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      cleanupGain = () => gain.disconnect();
      let observed = latest.current.time,
        lowerBound = observed,
        wall = performance.now();
      const tick = () => {
        const now = performance.now(),
          value = latest.current;
        if (value.time !== observed) {
          const expected = observed + (now - wall) * speed;
          if (value.time < observed || Math.abs(value.time - expected) > 100) {
            stopNodes();
            lowerBound = value.time;
          }
          observed = value.time;
          wall = now;
        }
        const position = observed + (now - wall) * speed;
        gain.gain.value = value.volume;
        for (let i = 0; i < cues.length; i++) {
          const cue = cues[i];
          if (cue.time > position + 150 * speed) break;
          if (cue.time < lowerBound || scheduled.has(i)) continue;
          const delay = (cue.time - position) / 1000 / speed;
          const offset = Math.max(0, -delay);
          if (offset >= buffers[cue.kind].duration) continue;
          scheduled.add(i);
          const node = ctx.createBufferSource();
          node.buffer = buffers[cue.kind];
          node.connect(gain);
          nodes.add(node);
          node.onended = () => {
            nodes.delete(node);
            node.disconnect();
          };
          node.start(ctx.currentTime + Math.max(0, delay), offset);
        }
      };
      tick();
      timer = setInterval(tick, 25);
    })().catch((error) => {
      if (!cancelled)
        latest.current.report(`Click audio could not play: ${String(error)}`);
    });
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      stopNodes();
      cleanupGain();
    };
  }, [playing, profile, speed, cues, project?.id]);
  return async (choice: ClickSoundProfile, volume = latest.current.volume) => {
    try {
      await audition.current.play(getContext(), choice, volume);
    } catch (error) {
      latest.current.report(
        `Click sound preview could not play: ${String(error)}`,
      );
    }
  };
}
