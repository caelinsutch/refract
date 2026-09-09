import { useEffect, useMemo, useRef, type RefObject } from "react";
import type { Project } from "../core/project";
import { clickSoundCues } from "../core/click-sounds";
import { clickSoundBank, type ClickSoundProfile } from "../core/click-audio";
import { ClickAudition } from "../core/click-audition";
import { ClickSchedule } from "../core/click-schedule";
export function useClickAudio(
  project: Project | null,
  clock: RefObject<number>,
  seekRevision: RefObject<number>,
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
    volume: project?.appearance.clickSoundVolume ?? 0.25,
    report,
  });
  latest.current = {
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
    const nodes = new Set<AudioBufferSourceNode>();
    const stopNodes = () => {
      for (const node of nodes) {
        try {
          node.stop();
        } catch {}
      }
      nodes.clear();
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
      const schedule = new ClickSchedule(
        cues,
        clock.current,
        seekRevision.current,
      );
      const lengths = {
        click: buffers.click.duration,
        down: buffers.down.duration,
        up: buffers.up.duration,
      };
      const tick = () => {
        const plan = schedule.update(
          clock.current,
          seekRevision.current,
          speed,
          lengths,
        );
        if (plan.reset) stopNodes();
        gain.gain.value = latest.current.volume;
        for (const start of plan.starts) {
          const node = ctx.createBufferSource();
          node.buffer = buffers[start.kind];
          node.connect(gain);
          nodes.add(node);
          node.onended = () => {
            nodes.delete(node);
            node.disconnect();
          };
          node.start(ctx.currentTime + start.delay, start.offset);
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
  }, [playing, profile, speed, cues, project?.id, clock, seekRevision]);
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
