import { wrapCaption } from "./captions";
import { animatedCursorAt, recentClicks } from "./cursor";
import { type Project, sourceAt, zoomAt } from "./project";
export const wallpapers = [
  ["#bacdf4", "#527acf", "#ded6fb"],
  ["#313261", "#7c67ce", "#d295de"],
  ["#edb6a4", "#ad577e", "#594d93"],
  ["#9ccfc2", "#568d9d", "#182d50"],
  ["#efb8d5", "#9c82da", "#5045a9"],
  ["#15233f", "#275d80", "#60a9a4"],
  ["#eeb768", "#d67070", "#9e658e"],
  ["#c9e5ed", "#689aa8", "#b3c3dd"],
];
export function dimensions(p: Project, max = 1280) {
  const [w, h] =
    p.appearance.ratio === "Auto"
      ? [p.crop?.width ?? p.source.width, p.crop?.height ?? p.source.height]
      : p.appearance.ratio.split(":").map(Number);
  const ratio = w / h;
  return ratio >= 1
    ? { width: max, height: Math.round(max / ratio / 2) * 2 }
    : { width: Math.round((max * ratio) / 2) * 2, height: max };
}
const rounded = (
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) => {
  c.beginPath();
  c.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2));
};
/** The source sampling rectangle and its destination in the composition. */
export function videoGeometry(
  p: Project,
  t: number,
  width: number,
  height: number,
) {
  const a = p.appearance,
    sw = p.source.width,
    sh = p.source.height;
  const padding = (Math.min(width, height) * a.padding) / 100;
  const crop = p.crop ?? { x: 0, y: 0, width: sw, height: sh };
  const fit = Math.min(
    (width - padding * 2) / crop.width,
    (height - padding * 2) / crop.height,
  );
  const w = crop.width * fit,
    h = crop.height * fit,
    x = (width - w) / 2,
    y = (height - h) / 2;
  const source = sourceAt(p, t)?.time ?? 0;
  const z = zoomAt(p, source);
  const cw = crop.width / z.scale,
    ch = crop.height / z.scale,
    sx = Math.max(
      crop.x,
      Math.min(crop.x + crop.width - cw, z.x * sw - cw / 2),
    ),
    sy = Math.max(
      crop.y,
      Math.min(crop.y + crop.height - ch, z.y * sh - ch / 2),
    );
  return { x, y, w, h, sx, sy, cw, ch, z, source };
}

/** Resolve a composition pixel to the visible source pixel; ignore background clicks. */
export function sourcePointAt(
  p: Project,
  t: number,
  width: number,
  height: number,
  px: number,
  py: number,
) {
  const g = videoGeometry(p, t, width, height);
  if (px < g.x || py < g.y || px > g.x + g.w || py > g.y + g.h) return null;
  return {
    x: (g.sx + ((px - g.x) / g.w) * g.cw) / p.source.width,
    y: (g.sy + ((py - g.y) / g.h) * g.ch) / p.source.height,
  };
}

export function drawFrame(
  c: CanvasRenderingContext2D,
  video: CanvasImageSource,
  p: Project,
  t: number,
  width: number,
  height: number,
  bgImage?: CanvasImageSource,
  camera?: CanvasImageSource,
) {
  const a = p.appearance,
    scale = width / 1280;
  const sw = p.source.width,
    sh = p.source.height;
  c.save();
  c.clearRect(0, 0, width, height);
  c.save();
  const backgroundBlur =
    a.background === "image" || a.background === "wallpaper"
      ? a.blur * scale
      : 0;
  const overscan = backgroundBlur * 3;
  if (backgroundBlur > 0) c.filter = `blur(${backgroundBlur}px)`;
  if (a.background === "color") {
    c.fillStyle = a.color;
    c.fillRect(
      -overscan,
      -overscan,
      width + overscan * 2,
      height + overscan * 2,
    );
  } else if (a.background === "image" && bgImage) {
    c.drawImage(
      bgImage,
      -overscan,
      -overscan,
      width + overscan * 2,
      height + overscan * 2,
    );
  } else {
    const colors =
      a.background === "gradient"
        ? [a.color, a.color2, a.color]
        : wallpapers[a.wallpaper % wallpapers.length];
    const grad = c.createLinearGradient(0, height, width, 0);
    grad.addColorStop(0, colors[0]);
    grad.addColorStop(0.6, colors[1]);
    grad.addColorStop(1, colors[2]);
    c.fillStyle = grad;
    c.fillRect(
      -overscan,
      -overscan,
      width + overscan * 2,
      height + overscan * 2,
    );
    if (a.background === "wallpaper") {
      c.globalAlpha = 0.23;
      for (let i = 0; i < 4; i++) {
        c.beginPath();
        c.ellipse(
          width * (0.1 + i * 0.32),
          height * 0.1,
          width * 0.55,
          height * 1.3,
          -0.55,
          0,
          Math.PI * 2,
        );
        c.fillStyle = colors[i % 3];
        c.fill();
      }
      c.globalAlpha = 1;
    }
  }
  c.restore();
  const { x, y, w, h, sx, sy, cw, ch, z, source } = videoGeometry(
    p,
    t,
    width,
    height,
  );
  const r = a.radius * scale;
  const inset = a.inset * scale;
  c.shadowColor = `rgba(0,0,0,${a.shadow * 0.6})`;
  c.shadowBlur = a.shadowBlur * 2 * scale;
  const shadowDistance = a.shadowDirectional ? a.shadowDistance * scale : 0;
  const shadowAngle = (a.shadowAngle * Math.PI) / 180;
  c.shadowOffsetX = Math.cos(shadowAngle) * shadowDistance;
  c.shadowOffsetY = Math.sin(shadowAngle) * shadowDistance;
  rounded(c, x - inset, y - inset, w + inset * 2, h + inset * 2, r + inset);
  c.fillStyle = a.insetColor;
  c.fill();
  c.shadowColor = "transparent";
  c.shadowBlur = 0;
  c.shadowOffsetX = 0;
  c.shadowOffsetY = 0;
  c.save();
  rounded(c, x, y, w, h, r);
  c.clip();
  c.drawImage(video, sx, sy, cw, ch, x, y, w, h);
  for (const m of p.masks.filter((m) => source >= m.start && source <= m.end)) {
    const mx = x + ((m.x * sw - sx) / cw) * w,
      my = y + ((m.y * sh - sy) / ch) * h,
      mw = ((m.width * sw) / cw) * w,
      mh = ((m.height * sh) / ch) * h;
    if (m.type === "blur") {
      c.save();
      c.beginPath();
      c.rect(mx, my, mw, mh);
      c.clip();
      c.filter = `blur(${m.strength * scale}px)`;
      c.drawImage(video, sx, sy, cw, ch, x, y, w, h);
      c.restore();
    } else {
      c.fillStyle = `rgba(255,213,80,${m.strength / 100})`;
      c.fillRect(mx, my, mw, mh);
    }
  }
  if (!a.hideCursor && p.cursor.length) {
    const { x: px, y: py } = animatedCursorAt(
      p.cursor,
      source,
      a.cursorSmooth ? a.cursorAnimation : "none",
      a.cursorSpring,
    )!;
    const cx = x + ((px * sw - sx) / cw) * w,
      cy = y + ((py * sh - sy) / ch) * h;
    c.save();
    c.translate(cx, cy);
    c.scale(a.cursorSize * scale, a.cursorSize * scale);
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(0, 23);
    c.lineTo(6, 17);
    c.lineTo(11, 27);
    c.lineTo(15, 25);
    c.lineTo(10, 15);
    c.lineTo(19, 15);
    c.closePath();
    c.fillStyle = "#101010";
    c.strokeStyle = "white";
    c.lineWidth = 1.5;
    c.fill();
    c.stroke();
    c.restore();
    if (a.clickEffect) {
      for (const click of recentClicks(p.cursor, source, 500)) {
        const progress = (source - click.time) / 500;
        c.beginPath();
        c.arc(
          x + ((click.x * sw - sx) / cw) * w,
          y + ((click.y * sh - sy) / ch) * h,
          8 + progress * 30 * scale,
          0,
          Math.PI * 2,
        );
        c.strokeStyle = `rgba(255,255,255,${1 - progress})`;
        c.lineWidth = 3 * scale;
        c.stroke();
      }
    }
  }
  c.restore();
  if (camera && p.source.camera && !a.cameraHidden) {
    const cameraScale = 1 - (1 - a.cameraZoomScale) * Math.min(1, z.scale - 1);
    const size = Math.min(width, height) * a.cameraSize * cameraScale;
    const margin = 25 * scale,
      cx = margin + (width - size - margin * 2) * a.cameraX,
      cy = margin + (height - size - margin * 2) * a.cameraY;
    const inputSize = Math.min(p.source.camera.width, p.source.camera.height);
    c.save();
    c.shadowColor = "#0007";
    c.shadowBlur = 20 * scale;
    c.shadowOffsetY = 6 * scale;
    rounded(c, cx, cy, size, size, size * a.cameraRoundness);
    c.fillStyle = "#222";
    c.fill();
    c.shadowColor = "transparent";
    c.clip();
    if (a.cameraMirror) {
      c.translate(cx + size, cy);
      c.scale(-1, 1);
    } else c.translate(cx, cy);
    c.drawImage(
      camera,
      (p.source.camera.width - inputSize) / 2,
      (p.source.camera.height - inputSize) / 2,
      inputSize,
      inputSize,
      0,
      0,
      size,
      size,
    );
    c.restore();
  }
  const caption = p.captions.find((s) => source >= s.start && source < s.end);
  if (caption) {
    c.font = `600 ${30 * scale}px -apple-system, sans-serif`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    const lines = wrapCaption(
      caption.text,
      width * 0.84 - 36 * scale,
      (text) => c.measureText(text).width,
    );
    const textWidth = Math.max(
      ...lines.map((line) => c.measureText(line).width),
    );
    const lineHeight = 38 * scale;
    const boxHeight = lines.length * lineHeight + 14 * scale;
    const bottom = 33 * scale;
    const top = height - bottom - boxHeight;
    c.fillStyle = "#000b";
    rounded(
      c,
      (width - textWidth) / 2 - 18 * scale,
      top,
      textWidth + 36 * scale,
      boxHeight,
      10 * scale,
    );
    c.fill();
    c.fillStyle = "white";
    lines.forEach((line, index) =>
      c.fillText(line, width / 2, top + 7 * scale + lineHeight * (index + 0.5)),
    );
  }
  c.restore();
}
