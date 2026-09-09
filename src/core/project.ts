import { normalizeMotionBlur } from "./motion-blur-settings.js";
import type { Shortcut } from "./shortcuts.js";
import type { CameraLayout } from "./camera-layout.js";
import type { SpringConfig } from "./spring.js";
import { screenMotionAt } from "./motion.js";
import type { CropRect } from "./crop.js";
export type Segment = {
  id: string;
  start: number;
  end: number;
  speed: number;
  hideCursor?: boolean;
  volume?: number;
  muted?: boolean;
};
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
  visible?: boolean;
};
export type Caption = { id: string; start: number; end: number; text: string };
export type Appearance = {
  showShortcuts: boolean;
  showSingleKeyShortcuts: boolean;
  shortcutSize: number;
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
  motionBlurAmount?: number;
  cursorMotionBlur?: number;
  screenMoveBlur?: number;
  screenZoomBlur?: number;
  hideCursor: boolean;
  cursorIdleMs: number | null;
  cursorLoopMs: number | null;
  cursorSmooth: boolean;
  cursorSpring?: SpringConfig;
  screenSpring?: SpringConfig;
  cursorAnimation: "smooth" | "medium" | "rapid" | "none";
  clickEffect: "none" | "circle" | "ripple";
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
  microphoneAudio?: { file: string; volume: number; muted: boolean };
  backgroundAudio?: {
    file: string;
    name: string;
    duration: number;
    volume: number;
    muted: boolean;
  };
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
  cameraLayouts?: CameraLayout[];
  captions: Caption[];
  shortcuts?: Shortcut[];
  cursor: CursorEvent[];
  appearance: Appearance;
};
export const defaults: Appearance = {
  showShortcuts: false,
  showSingleKeyShortcuts: false,
  shortcutSize: 1,
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
  motionBlurAmount: 0,
  cursorMotionBlur: 1,
  screenMoveBlur: 1,
  screenZoomBlur: 1,
  hideCursor: false,
  cursorIdleMs: null,
  cursorLoopMs: null,
  cursorSmooth: true,
  cursorAnimation: "smooth",
  clickEffect: "none",
  animation: "focused",
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
    cameraLayouts: [],
    captions: [],
    shortcuts: [],
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
  if (p.microphoneAudio !== undefined) {
    const audio = p.microphoneAudio;
    if (
      !audio ||
      typeof audio.file !== "string" ||
      !audio.file ||
      !valid(audio.volume) ||
      audio.volume < 0 ||
      audio.volume > 1 ||
      typeof audio.muted !== "boolean"
    )
      throw Error("The project has invalid microphone audio.");
  }
  if (p.backgroundAudio !== undefined) {
    const audio = p.backgroundAudio;
    if (
      !audio ||
      typeof audio !== "object" ||
      typeof audio.file !== "string" ||
      !audio.file ||
      typeof audio.name !== "string" ||
      !valid(audio.duration) ||
      audio.duration <= 0 ||
      !valid(audio.volume) ||
      audio.volume < 0 ||
      audio.volume > 1 ||
      typeof audio.muted !== "boolean"
    )
      throw new Error("The project has invalid background audio.");
  }
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
      s.speed > 16 ||
      (s.hideCursor !== undefined && typeof s.hideCursor !== "boolean") ||
      (s.muted !== undefined && typeof s.muted !== "boolean") ||
      (s.volume !== undefined &&
        (!valid(s.volume) || s.volume < 0 || s.volume > 1))
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
      event.y > 1 ||
      (event.visible !== undefined && typeof event.visible !== "boolean")
    )
      throw new Error("The project has invalid cursor data.");
  p.cursor = [...p.cursor].sort((a, b) => a.time - b.time);
  p.shortcuts ??= [];
  if (!Array.isArray(p.shortcuts)) throw new Error("Invalid shortcut track.");
  const shortcutIds = new Set<string>();
  for (const shortcut of p.shortcuts) {
    if (
      !shortcut ||
      typeof shortcut.id !== "string" ||
      !shortcut.id ||
      shortcutIds.has(shortcut.id) ||
      ![shortcut.start, shortcut.end].every(valid) ||
      shortcut.start < 0 ||
      shortcut.end <= shortcut.start ||
      shortcut.end > p.source.duration ||
      typeof shortcut.key !== "string" ||
      !shortcut.key.trim() ||
      shortcut.key.length > 32 ||
      !Array.isArray(shortcut.modifiers) ||
      new Set(shortcut.modifiers).size !== shortcut.modifiers.length ||
      shortcut.modifiers.some(
        (m) => !["control", "option", "shift", "command"].includes(m),
      ) ||
      (shortcut.disabled !== undefined &&
        typeof shortcut.disabled !== "boolean")
    )
      throw new Error("The project has invalid shortcut data.");
    shortcutIds.add(shortcut.id);
  }
  p.shortcuts = [...p.shortcuts].sort((a, b) => a.start - b.start);
  p.cameraLayouts ??= [];
  if (!Array.isArray(p.cameraLayouts))
    throw new Error("Invalid camera layouts.");
  p.cameraLayouts = [...p.cameraLayouts].sort((a, b) => a.start - b.start);
  const layoutIds = new Set<string>();
  let layoutEnd = 0;
  for (const layout of p.cameraLayouts) {
    if (
      !layout ||
      ![layout.start, layout.end, layout.x, layout.y].every(valid) ||
      layout.start < layoutEnd ||
      layout.end <= layout.start ||
      layout.end > p.source.duration ||
      !["default", "fullscreen", "hidden"].includes(layout.type) ||
      layout.x < 0 ||
      layout.x > 1 ||
      layout.y < 0 ||
      layout.y > 1 ||
      typeof layout.id !== "string" ||
      !layout.id ||
      layoutIds.has(layout.id)
    )
      throw new Error(
        "The project has an invalid or overlapping camera layout.",
      );
    layoutIds.add(layout.id);
    layoutEnd = layout.end;
  }

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
  p.appearance = {
    ...defaults,
    ...p.appearance,
    ...normalizeMotionBlur(p.appearance),
  };
  if (
    p.appearance.cursorMotionBlur !== undefined &&
    (!valid(p.appearance.cursorMotionBlur) ||
      p.appearance.cursorMotionBlur < 0 ||
      p.appearance.cursorMotionBlur > 1)
  )
    throw new Error("Invalid cursor motion blur strength.");
  for (const value of [
    p.appearance.motionBlurAmount,
    p.appearance.screenMoveBlur,
    p.appearance.screenZoomBlur,
  ])
    if (value !== undefined && (!valid(value) || value < 0 || value > 1))
      throw new Error("Invalid screen motion blur strength.");
  // Earlier projects stored a boolean ripple toggle.
  const legacyClickEffect: unknown = p.appearance.clickEffect;
  if (typeof legacyClickEffect === "boolean")
    p.appearance.clickEffect = legacyClickEffect ? "ripple" : "none";
  if (!["none", "circle", "ripple"].includes(p.appearance.clickEffect))
    throw new Error("The project has an invalid click effect.");
  if (
    !["smooth", "medium", "rapid", "none"].includes(
      p.appearance.cursorAnimation,
    )
  )
    throw new Error("The project has an invalid cursor animation style.");
  if (
    typeof p.appearance.showShortcuts !== "boolean" ||
    typeof p.appearance.showSingleKeyShortcuts !== "boolean" ||
    !valid(p.appearance.shortcutSize) ||
    p.appearance.shortcutSize < 0.5 ||
    p.appearance.shortcutSize > 2
  )
    throw new Error("The project has invalid shortcut settings.");
  for (const key of ["cursorSpring", "screenSpring"] as const) {
    const config = p.appearance[key];
    if (!config) continue;
    const { stiffness, damping, mass } = config;
    if (
      ![stiffness, damping, mass].every(valid) ||
      stiffness < 5 ||
      stiffness > 600 ||
      damping < 5 ||
      damping > 200 ||
      mass < 0.1 ||
      mass > 15
    )
      throw new Error(
        `The project has an invalid ${key === "cursorSpring" ? "cursor" : "screen"} spring.`,
      );
  }
  if (
    p.appearance.cursorIdleMs !== null &&
    (!valid(p.appearance.cursorIdleMs) ||
      p.appearance.cursorIdleMs < 500 ||
      p.appearance.cursorIdleMs > 5000)
  )
    throw new Error("The project has an invalid cursor idle delay.");
  if (
    p.appearance.cursorLoopMs !== null &&
    (!valid(p.appearance.cursorLoopMs) ||
      p.appearance.cursorLoopMs < 1000 ||
      p.appearance.cursorLoopMs > 4000)
  )
    throw new Error("The project has an invalid cursor loop duration.");
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
  return screenMotionAt(p, t);
}
