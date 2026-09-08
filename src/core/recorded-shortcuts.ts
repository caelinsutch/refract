import { uid } from "./project.js";
import type { Shortcut } from "./shortcuts.js";
/** Key-down samples on the recording's pause-adjusted source clock. */
export type RecordedKey = {
  time: number;
  key: string;
  modifiers: Shortcut["modifiers"];
  repeat?: boolean;
};
const modifierOrder = ["control", "option", "shift", "command"] as const;
/** Suppress typing bursts; keep modified commands and isolated single-key actions. */
export function recordedShortcuts(
  events: RecordedKey[],
  duration: number,
): Shortcut[] {
  const valid = events
    .filter(
      (e) =>
        e &&
        Number.isFinite(e.time) &&
        e.time >= 0 &&
        e.time < duration &&
        typeof e.key === "string" &&
        !!e.key.trim() &&
        e.key.length <= 32 &&
        Array.isArray(e.modifiers) &&
        e.modifiers.every((m) => modifierOrder.includes(m)),
    )
    .sort((a, b) => a.time - b.time);
  const unmodified = valid.filter(
    (e) => !e.modifiers.some((m) => m !== "shift"),
  );
  const typing = new Set<RecordedKey>();
  for (let i = 1; i < unmodified.length; i++) {
    if (unmodified[i].time - unmodified[i - 1].time < 500) {
      typing.add(unmodified[i - 1]);
      typing.add(unmodified[i]);
    }
  }
  const kept = valid.filter((e) => !e.repeat && !typing.has(e));
  return kept.flatMap((e, i) => {
    const end = Math.min(
      duration,
      e.time + 1200,
      kept[i + 1]?.time ?? duration,
    );
    return end > e.time
      ? [
          {
            id: uid(),
            start: e.time,
            end,
            key: e.key,
            modifiers: modifierOrder.filter((m) => e.modifiers.includes(m)),
          },
        ]
      : [];
  });
}
