import type { Project } from "./project.js";
export type ClickSoundCue = {
  time: number;
  sourceTime: number;
  kind: "click" | "down" | "up";
  button: number;
};
/** Each retained clip owns its cues; click samples themselves play at normal speed. */
export function clickSoundCues(project: Project): ClickSoundCue[] {
  const events = project.cursor
    .filter(
      (event) =>
        event.visible !== false && (event.pressed !== undefined || event.click),
    )
    .sort((a, b) => a.time - b.time);
  const cues: ClickSoundCue[] = [];
  let offset = 0;
  for (const segment of project.segments) {
    if (segment.speed <= 2) {
      const retained = events.filter(
        (event) => event.time >= segment.start && event.time < segment.end,
      );
      const pending = new Map<number, number>();
      for (const event of retained) {
        const button = event.button ?? 0;
        const time = offset + (event.time - segment.start) / segment.speed;
        const cue: ClickSoundCue = {
          time,
          sourceTime: event.time,
          button,
          kind:
            event.pressed === undefined
              ? "click"
              : event.pressed
                ? "down"
                : "up",
        };
        if (event.pressed === true) {
          pending.set(button, cues.length);
          cues.push(cue);
        } else if (event.pressed === false) {
          const index = pending.get(button);
          const down = index === undefined ? undefined : cues[index];
          if (down && event.time - down.sourceTime < 250) {
            down.kind = "click";
          } else cues.push(cue);
          pending.delete(button);
        } else cues.push(cue);
      }
    }
    offset += (segment.end - segment.start) / segment.speed;
  }
  return cues.filter((cue) => cue.time > 0).sort((a, b) => a.time - b.time);
}
