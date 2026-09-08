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
      ? [p.source.width, p.source.height]
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
  const padding = (Math.min(width, height) * a.padding) / 100;
  const fit = Math.min((width - padding * 2) / sw, (height - padding * 2) / sh);
  const w = sw * fit,
    h = sh * fit,
    x = (width - w) / 2,
    y = (height - h) / 2,
    r = a.radius * scale;
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
  const source = sourceAt(p, t)?.time ?? 0;
  const z = zoomAt(p, source);
  const cw = sw / z.scale,
    ch = sh / z.scale,
    sx = z.x * sw - cw / 2,
    sy = z.y * sh - ch / 2;
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
    const idx = p.cursor.findIndex((e) => e.time > source),
      prev = p.cursor[Math.max(0, (idx < 0 ? p.cursor.length : idx) - 1)],
      next = idx < 0 ? prev : p.cursor[idx];
    let f =
      a.cursorSmooth && next.time !== prev.time
        ? (source - prev.time) / (next.time - prev.time)
        : 0;
    f = f * f * (3 - 2 * f);
    const px = prev.x + (next.x - prev.x) * f,
      py = prev.y + (next.y - prev.y) * f;
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
      for (const click of p.cursor.filter(
        (e) => e.click && source - e.time >= 0 && source - e.time < 500,
      )) {
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
    const measure = c.measureText(caption.text);
    c.fillStyle = "#000b";
    rounded(
      c,
      (width - measure.width) / 2 - 18 * scale,
      height - 85 * scale,
      measure.width + 36 * scale,
      52 * scale,
      10 * scale,
    );
    c.fill();
    c.fillStyle = "white";
    c.fillText(caption.text, width / 2, height - 59 * scale);
  }
  c.restore();
}
