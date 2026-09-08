import { smootherstep, followClicks } from "./motion.js";
import type { CropRect } from "./crop.js";
export type Segment = { id: string; start: number; end: number; speed: number };
export type Zoom = {
  id: string;
  start: number;
  end: number;
  scale: number;
  x: number;
  y: number;
  mode: "manual" | "auto";
  disabled: boolean;
};
export type Mask = {
  id: string;
  start: number;
  end: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: "blur" | "highlight";
  strength: number;
};
export type CursorEvent = {
  time: number;
  x: number;
  y: number;
  click?: boolean;
};
export type Caption = { id: string; start: number; end: number; text: string };
export type Appearance = {
  background: "wallpaper" | "gradient" | "color" | "image";
  color: string;
  color2: string;
  wallpaper: number;
  image?: string;
  padding: number;
  radius: number;
  inset: number;
  insetColor: string;
  shadow: number;
  shadowDirectional: boolean;
  shadowDistance: number;
  shadowAngle: number;
  shadowBlur: number;
  blur: number;
  ratio: string;
  cursorSize: number;
  hideCursor: boolean;
  cursorSmooth: boolean;
  clickEffect: boolean;
  animation: "smooth" | "focused" | "instant";
  volume: number;
  muted: boolean;
  cameraHidden: boolean;
  cameraMirror: boolean;
  cameraSize: number;
  cameraRoundness: number;
  cameraX: number;
  cameraY: number;
  cameraZoomScale: number;
};
export type Project = {
  version: 1;
  crop?: CropRect;
  id: string;
  title: string;
  source: {
    file: string;
    duration: number;
    width: number;
    height: number;
    hasAudio: boolean;
    camera?: { file: string; width: number; height: number };
  };
  segments: Segment[];
  zooms: Zoom[];
  masks: Mask[];
  captions: Caption[];
  cursor: CursorEvent[];
  appearance: Appearance;
};
export const defaults: Appearance = {
  background: "wallpaper",
  color: "#6d76e8",
  color2: "#e0b2ed",
  wallpaper: 0,
  padding: 10,
  radius: 12,
  inset: 0,
  insetColor: "#ffffff",
  shadow: 0.75,
  shadowDirectional: false,
  shadowDistance: 25,
  shadowAngle: 90,
  shadowBlur: 20,
  blur: 0,
  ratio: "Auto",
  cursorSize: 1.5,
  hideCursor: false,
  cursorSmooth: true,
  clickEffect: false,
  animation: "smooth",
  volume: 1,
  muted: false,
  cameraHidden: false,
  cameraMirror: true,
  cameraSize: 0.35,
  cameraRoundness: 0.25,
  cameraX: 1,
  cameraY: 1,
  cameraZoomScale: 0.7,
};
export const uid = () => crypto.randomUUID();
export function createProject(
  source: Project["source"],
  title = "Untitled recording",
): Project {
  return {
    version: 1,
    id: uid(),
    title,
    source,
    segments: [{ id: uid(), start: 0, end: source.duration, speed: 1 }],
    zooms: [],
    masks: [],
    captions: [],
    cursor: [],
    appearance: { ...defaults },
  };
}
export function duration(p: Project) {
  return p.segments.reduce((sum, s) => sum + (s.end - s.start) / s.speed, 0);
}
export function sourceAt(p: Project, t: number) {
  let offset = 0;
  for (let i = 0; i < p.segments.length; i++) {
    const s = p.segments[i],
      length = (s.end - s.start) / s.speed;
    if (t < offset + length || i === p.segments.length - 1)
      return {
        time: Math.min(
          s.end,
          Math.max(s.start, s.start + (t - offset) * s.speed),
        ),
        segment: s,
        index: i,
        offset,
      };
    offset += length;
  }
  return null;
}
export function outputAt(p: Project, t: number) {
  let offset = 0;
  for (const s of p.segments) {
    if (t >= s.start && t <= s.end) return offset + (t - s.start) / s.speed;
    offset += (s.end - s.start) / s.speed;
  }
  return null;
}
export function splitAt(p: Project, t: number): Project {
  const at = sourceAt(p, t);
  if (!at || at.time - at.segment.start < 40 || at.segment.end - at.time < 40)
    return p;
  return {
    ...p,
    segments: p.segments.flatMap((s) =>
      s.id === at.segment.id
        ? [
            { ...s, end: at.time },
            { ...s, id: uid(), start: at.time },
          ]
        : [s],
    ),
  };
}
export function validateProject(value: unknown): Project {
  const p = value as Project;
  if (
    !p ||
    p.version !== 1 ||
    !p.source ||
    !Array.isArray(p.segments) ||
    !p.segments.length
  )
    throw new Error("This is not a supported Refract project.");
  const valid = (v: number) => Number.isFinite(v);
  if (
    !valid(p.source.duration) ||
    p.source.duration <= 0 ||
    !valid(p.source.width) ||
    p.source.width <= 0 ||
    !valid(p.source.height) ||
    p.source.height <= 0
  )
    throw new Error("The project has invalid source dimensions or duration.");
  for (const s of p.segments)
    if (
      !valid(s.start) ||
      !valid(s.end) ||
      !valid(s.speed) ||
      s.start < 0 ||
      s.end > p.source.duration + 1 ||
      s.end <= s.start ||
      s.speed < 0.1 ||
      s.speed > 16
    )
      throw new Error("The project has an invalid clip range.");
  if (
    !Array.isArray(p.zooms) ||
    !Array.isArray(p.masks) ||
    !Array.isArray(p.captions) ||
    !Array.isArray(p.cursor)
  )
    throw new Error("The project is missing its editing tracks.");
  for (const event of p.cursor)
    if (
      ![event.time, event.x, event.y].every(valid) ||
      event.time < 0 ||
      event.x < 0 ||
      event.x > 1 ||
      event.y < 0 ||
      event.y > 1
    )
      throw new Error("The project has invalid cursor data.");
  p.cursor = [...p.cursor].sort((a, b) => a.time - b.time);
  for (const z of p.zooms)
    if (
      ![z.start, z.end, z.scale, z.x, z.y].every(valid) ||
      z.end <= z.start ||
      z.scale < 1 ||
      z.scale > 8 ||
      z.x < 0 ||
      z.x > 1 ||
      z.y < 0 ||
      z.y > 1
    )
      throw new Error("The project has an invalid zoom.");
  if (p.crop) {
    const { x, y, width, height } = p.crop;
    if (
      ![x, y, width, height].every(valid) ||
      x < 0 ||
      y < 0 ||
      width < 1 ||
      height < 1 ||
      x + width > p.source.width ||
      y + height > p.source.height
    )
      throw new Error("The project has an invalid crop.");
  }
  p.appearance = { ...defaults, ...p.appearance };
  for (const k of [
    "padding",
    "radius",
    "inset",
    "shadow",
    "shadowDistance",
    "shadowAngle",
    "shadowBlur",
    "blur",
    "volume",
    "cursorSize",
  ] as const)
    if (!valid(p.appearance[k]))
      throw new Error("The project has invalid appearance settings.");
  return p;
}
export function formatTime(ms: number, precise = false) {
  const s = Math.max(0, ms) / 1000;
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}${precise ? "." + String(Math.floor((ms % 1000) / 10)).padStart(2, "0") : ""}`;
}
export function zoomAt(p: Project, t: number) {
  const z = p.zooms.find((z) => !z.disabled && t >= z.start && t <= z.end);
  if (!z) return { scale: 1, x: 0.5, y: 0.5 };
  let target = { x: z.x, y: z.y };
  if (z.mode === "auto") {
    const clicks = p.cursor.filter(
      (c) => c.click && c.time >= z.start && c.time <= z.end,
    );
    if (!clicks.length) return { scale: 1, x: 0.5, y: 0.5 };
    target = followClicks(
      clicks,
      t,
      p.appearance.animation === "instant"
        ? 0
        : p.appearance.animation === "focused"
          ? 180
          : 350,
    );
  }
  const transition =
    p.appearance.animation === "instant"
      ? 0
      : p.appearance.animation === "focused"
        ? 220
        : 500;
  const edge = transition
    ? Math.min(1, (t - z.start) / transition, (z.end - t) / transition)
    : 1;
  const ease = smootherstep(edge);
  const scale = 1 + (z.scale - 1) * ease;
  const limit = 0.5 / scale;
  return {
    scale,
    x: Math.max(limit, Math.min(1 - limit, target.x)),
    y: Math.max(limit, Math.min(1 - limit, target.y)),
  };
}
