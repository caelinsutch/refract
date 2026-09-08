import { sourceAt, type Project } from "./project.js";
export type Shortcut = {
  id: string;
  start: number;
  end: number;
  key: string;
  modifiers: Array<"control" | "option" | "shift" | "command">;
  disabled?: boolean;
};
const symbols = { control: "⌃", option: "⌥", shift: "⇧", command: "⌘" };
const order = ["control", "option", "shift", "command"] as const;
export function shortcutLabel(s: Shortcut) {
  return (
    order
      .filter((m) => s.modifiers.includes(m))
      .map((m) => symbols[m])
      .join("") + s.key
  );
}
export function shortcutAt(p: Project, time: number) {
  if (!p.appearance.showShortcuts) return null;
  const at = sourceAt(p, time);
  if (!at) return null;
  const matches = (p.shortcuts ?? []).filter(
    (s) =>
      !s.disabled &&
      (p.appearance.showSingleKeyShortcuts ||
        s.modifiers.some((m) => m !== "shift")) &&
      at.time >= s.start &&
      at.time < s.end,
  );
  return matches.at(-1) ?? null;
}
/** A composition overlay, shared by preview and every rendered export frame. */
export function drawShortcut(
  c: CanvasRenderingContext2D,
  p: Project,
  time: number,
  width: number,
  height: number,
  bottom: number,
) {
  const shortcut = shortcutAt(p, time);
  if (!shortcut) return;
  const scale = width / 1280;
  const size = 28 * scale * p.appearance.shortcutSize;
  c.save();
  c.font = `500 ${size}px -apple-system, sans-serif`;
  c.textAlign = "center";
  c.textBaseline = "middle";
  const label = shortcutLabel(shortcut);
  const boxWidth = Math.min(
    width * 0.9,
    c.measureText(label).width + size * 1.1,
  );
  const boxHeight = size * 1.8;
  const top = Math.max(0, height - bottom - boxHeight);
  c.fillStyle = "#202126ee";
  c.strokeStyle = "#ffffff30";
  c.lineWidth = scale;
  c.beginPath();
  c.roundRect((width - boxWidth) / 2, top, boxWidth, boxHeight, size * 0.35);
  c.fill();
  c.stroke();
  c.fillStyle = "#fff";
  c.fillText(label, width / 2, top + boxHeight / 2, boxWidth - size * 0.7);
  c.restore();
}
