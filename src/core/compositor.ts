import { drawOrdinaryShadow } from "./shadow-layer";
import { drawBackgroundLayer } from "./background-layer";
import { gradientColors } from "./gradient-presets";
import { insetEdges } from "./inset-balance";
import { screenCorners } from "./screen-corners";
import { screenExposure, drawScreenExposure } from "./screen-blur";
import { cursorExposure, drawCursorExposure } from "./cursor-render";
import { drawShortcut, shortcutEnabled, shortcutFontSize } from "./shortcuts";
import { cameraFrameAt } from "./camera-layout";
import { layoutCaption } from "./captions";
import {
  animatedCursorAt,
  loopedCursorAt,
  recentClicks,
  cursorVisibleAt,
  cursorPresentAt,
  cursorLoopStart,
} from "./cursor";
import { type Project, sourceAt, zoomAt } from "./project";
const captionLayoutCache = new WeakMap<
  CanvasRenderingContext2D,
  {
    text: string;
    width: number;
    height: number;
    reservation: number;
    layout: ReturnType<typeof layoutCaption>;
  }
>();
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
/** Fit the preview in CSS pixels, then rasterize vectors at display resolution. */
export function previewDimensions(
  p: Project,
  availableWidth: number,
  availableHeight: number,
  pixelRatio: number,
) {
  const natural = dimensions(p);
  const fit = Math.min(
    Math.max(1, availableWidth) / natural.width,
    Math.max(1, availableHeight) / natural.height,
  );
  const cssWidth = natural.width * fit;
  const cssHeight = natural.height * fit;
  const density = Math.max(1, pixelRatio || 1);
  return {
    cssWidth,
    cssHeight,
    width: Math.max(1, Math.round(cssWidth * density)),
    height: Math.max(1, Math.round(cssHeight * density)),
  };
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
  transform?: ReturnType<typeof zoomAt>,
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
  const source = sourceAt(p, t)?.time ?? 0;
  const z = transform ?? zoomAt(p, source);
  const w = crop.width * fit * z.scale,
    h = crop.height * fit * z.scale;
  const innerWidth = width - padding * 2,
    innerHeight = height - padding * 2;
  const targetX = Math.max(0, Math.min(1, (z.x * sw - crop.x) / crop.width)),
    targetY = Math.max(0, Math.min(1, (z.y * sh - crop.y) / crop.height));
  // Move the scaled body between its legal edges inside the content frame.
  // Keep the source crop intact so screen edges, masks, and pointers transform together.
  const x =
      padding +
      Math.max(0, innerWidth - w) / 2 -
      Math.max(0, w - innerWidth) * targetX,
    y =
      padding +
      Math.max(0, innerHeight - h) / 2 -
      Math.max(0, h - innerHeight) * targetY;
  const sx = crop.x,
    sy = crop.y,
    cw = crop.width,
    ch = crop.height;
  const edges = insetEdges(a),
    insetScale = (width / 1280) * z.scale;
  return {
    x: x + ((edges.left - edges.right) / 2) * insetScale,
    y: y + ((edges.top - edges.bottom) / 2) * insetScale,
    w,
    h,
    sx,
    sy,
    cw,
    ch,
    z,
    source,
  };
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
  if (
    px < 0 ||
    py < 0 ||
    px > width ||
    py > height ||
    px < g.x ||
    py < g.y ||
    px > g.x + g.w ||
    py > g.y + g.h
  )
    return null;
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
  previewQuality: "quality" | "performance" = "quality",
) {
  const a = p.appearance,
    scale = width / 1280;
  const sw = p.source.width,
    sh = p.source.height;
  c.save();
  c.clearRect(0, 0, width, height);
  drawBackgroundLayer(
    c,
    width,
    height,
    a.background === "image" || a.background === "wallpaper" ? a.blur : 0,
    JSON.stringify([
      a.background,
      a.wallpaper,
      a.color,
      a.color2,
      a.gradientStops,
    ]),
    bgImage,
    (c) => {
      c.save();
      if (a.background === "color") {
        c.fillStyle = a.color;
        c.fillRect(0, 0, width, height);
      } else if (a.background === "image" && bgImage) {
        // Use intrinsic dimensions: an image's DOM layout size is unrelated to
        // its pixels. Center-cover keeps photographs undistorted at every ratio.
        const dimensions = bgImage as {
          naturalWidth?: number;
          naturalHeight?: number;
          videoWidth?: number;
          videoHeight?: number;
          displayWidth?: number;
          displayHeight?: number;
          width?: number;
          height?: number;
        };
        const imageWidth =
          dimensions.naturalWidth ??
          dimensions.videoWidth ??
          dimensions.displayWidth ??
          dimensions.width ??
          width;
        const imageHeight =
          dimensions.naturalHeight ??
          dimensions.videoHeight ??
          dimensions.displayHeight ??
          dimensions.height ??
          height;
        if (imageWidth > 0 && imageHeight > 0) {
          const fit = Math.max(width / imageWidth, height / imageHeight);
          const fittedWidth = imageWidth * fit;
          const fittedHeight = imageHeight * fit;
          c.drawImage(
            bgImage,
            (width - fittedWidth) / 2,
            (height - fittedHeight) / 2,
            fittedWidth,
            fittedHeight,
          );
        }
      } else {
        const colors = wallpapers[a.wallpaper % wallpapers.length];
        const grad =
          a.background === "gradient"
            ? c.createLinearGradient(0, 0, width, height)
            : c.createLinearGradient(0, height, width, 0);
        if (a.background === "gradient") {
          const stops = gradientColors(a);
          stops.forEach((color, index) =>
            grad.addColorStop(index / (stops.length - 1), color),
          );
        } else {
          grad.addColorStop(0, colors[0]);
          grad.addColorStop(0.6, colors[1]);
          grad.addColorStop(1, colors[2]);
        }
        c.fillStyle = grad;
        c.fillRect(0, 0, width, height);
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
    },
  );
  const { x, y, w, h, sx, sy, cw, ch, z, source } = videoGeometry(
    p,
    t,
    width,
    height,
  );
  drawScreenExposure(
    c,
    width,
    height,
    previewQuality === "performance" ? [z] : screenExposure(p, t),
    (c, transform) => {
      const { x, y, w, h, sx, sy, cw, ch } = videoGeometry(
        p,
        t,
        width,
        height,
        transform,
      );
      const corners = screenCorners(a);
      const r = corners.inner * scale * transform.scale;
      const outerRadius = corners.outer * scale * transform.scale;
      const edges = insetEdges(a);
      const edgeScale = scale * transform.scale;
      c.save();
      c.shadowColor = a.shadowDirectional
        ? `rgba(0,0,0,${a.shadow * 0.6})`
        : "transparent";
      c.shadowBlur = a.shadowBlur * 2 * scale * transform.scale;
      // Distance and angle apply to ordinary shadows too. Directional mode
      // controls the shadow shape in the reference, not whether it has an offset.
      const distance = a.shadowDistance * scale * transform.scale;
      const angle = (a.shadowAngle * Math.PI) / 180;
      c.shadowOffsetX = Math.cos(angle) * distance;
      c.shadowOffsetY = Math.sin(angle) * distance;
      const frameX = x - edges.left * edgeScale,
        frameY = y - edges.top * edgeScale,
        frameWidth = w + (edges.left + edges.right) * edgeScale,
        frameHeight = h + (edges.top + edges.bottom) * edgeScale;
      const opacity = a.insetOpacity ?? 1;
      if (!a.shadowDirectional) {
        c.save();
        // Keep translucent inset interiors independent of the outside shadow.
        c.beginPath();
        c.rect(0, 0, width, height);
        c.roundRect(
          frameX,
          frameY,
          frameWidth,
          frameHeight,
          Math.max(0, Math.min(outerRadius, frameWidth / 2, frameHeight / 2)),
        );
        c.clip("evenodd");
        c.shadowBlur = 0;
        c.shadowOffsetX = c.shadowOffsetY = 0;
        drawOrdinaryShadow(
          c,
          a,
          frameX,
          frameY,
          frameWidth,
          frameHeight,
          outerRadius,
          edgeScale,
        );
        c.restore();
      }
      c.fillStyle = a.insetColor;
      if (opacity < 1) {
        // Draw the outside shadow at full strength before blending the inset color.
        c.save();
        c.beginPath();
        c.rect(0, 0, width, height);
        c.roundRect(
          frameX,
          frameY,
          frameWidth,
          frameHeight,
          Math.max(0, Math.min(outerRadius, frameWidth / 2, frameHeight / 2)),
        );
        c.clip("evenodd");
        rounded(c, frameX, frameY, frameWidth, frameHeight, outerRadius);
        c.fill();
        c.restore();
        c.shadowColor = "transparent";
      }
      rounded(c, frameX, frameY, frameWidth, frameHeight, outerRadius);
      c.save();
      c.globalAlpha *= opacity;
      c.fill();
      c.restore();
      c.shadowColor = "transparent";
      c.shadowBlur = 0;
      c.shadowOffsetX = c.shadowOffsetY = 0;
      rounded(c, x, y, w, h, r);
      c.clip();
      c.drawImage(video, sx, sy, cw, ch, x, y, w, h);
      for (const m of p.masks.filter(
        (m) => source >= m.start && source < m.end,
      )) {
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
      c.restore();
    },
  );
  c.save();
  rounded(c, x, y, w, h, screenCorners(a).inner * scale * z.scale);
  c.clip();
  const cursorStyle = a.cursorSmooth ? a.cursorAnimation : "none";
  const firstSource = p.segments[0].start;
  const lastSource = p.segments[p.segments.length - 1].end;
  let loopMoving = false;
  if (
    a.cursorLoopMs != null &&
    source > Math.max(firstSource, lastSource - a.cursorLoopMs) &&
    source <= lastSource
  ) {
    const from = animatedCursorAt(
      p.cursor,
      Math.max(firstSource, lastSource - a.cursorLoopMs),
      cursorStyle,
      a.cursorSpring,
    );
    const to = animatedCursorAt(
      p.cursor,
      cursorLoopStart(
        p.cursor,
        firstSource,
        Math.max(firstSource, lastSource - a.cursorLoopMs),
      ) ?? firstSource,
      cursorStyle,
      a.cursorSpring,
    );
    loopMoving = !!from && !!to && (from.x !== to.x || from.y !== to.y);
  }
  if (
    !a.hideCursor &&
    !sourceAt(p, t)?.segment.hideCursor &&
    cursorPresentAt(p.cursor, source) &&
    (loopMoving || cursorVisibleAt(p.cursor, source, a.cursorIdleMs))
  ) {
    const { x: px, y: py } = loopedCursorAt(
      p.cursor,
      source,
      firstSource,
      lastSource,
      a.cursorLoopMs,
      cursorStyle,
      a.cursorSpring,
    )!;
    const cx = x + ((px * sw - sx) / cw) * w,
      cy = y + ((py * sh - sy) / ch) * h;
    // Render click feedback beneath the pointer, using the same source clock
    // as the cursor so seeking, clip speed, and export agree.
    if (a.clickEffect !== "none") {
      for (const click of recentClicks(p.cursor, source, 500)) {
        const progress = (source - click.time) / 500;
        const clickX = x + ((click.x * sw - sx) / cw) * w;
        const clickY = y + ((click.y * sh - sy) / ch) * h;
        c.beginPath();
        if (a.clickEffect === "circle") {
          c.arc(clickX, clickY, 22 * scale, 0, Math.PI * 2);
          c.fillStyle = `rgba(255,255,255,${0.3 * (1 - progress)})`;
          c.fill();
        } else {
          c.arc(clickX, clickY, (8 + progress * 30) * scale, 0, Math.PI * 2);
          c.strokeStyle = `rgba(255,255,255,${1 - progress})`;
          c.lineWidth = 3 * scale;
          c.stroke();
        }
      }
    }
    const points = (
      previewQuality === "performance" ? [source] : cursorExposure(p, t)
    ).flatMap((sample) => {
      if (!cursorPresentAt(p.cursor, sample)) return [];
      const point = loopedCursorAt(
        p.cursor,
        sample,
        firstSource,
        lastSource,
        a.cursorLoopMs,
        cursorStyle,
        a.cursorSpring,
      );
      return point
        ? [
            {
              x: x + ((point.x * sw - sx) / cw) * w,
              y: y + ((point.y * sh - sy) / ch) * h,
            },
          ]
        : [];
    });
    drawCursorExposure(
      c,
      points.length ? points : [{ x: cx, y: cy }],
      a.cursorSize * scale,
    );
  }
  c.restore();
  if (camera && p.source.camera && !a.cameraHidden) {
    const frame = cameraFrameAt(p, source, width, height, z.scale);
    const {
      x: cx,
      y: cy,
      width: cameraWidth,
      height: cameraHeight,
      radius,
      opacity,
    } = frame;
    const fit = Math.max(
      cameraWidth / p.source.camera.width,
      cameraHeight / p.source.camera.height,
    );
    const inputWidth = cameraWidth / fit,
      inputHeight = cameraHeight / fit;
    c.save();
    c.globalAlpha = opacity;
    c.shadowColor = "#0007";
    c.shadowBlur = 20 * scale;
    c.shadowOffsetY = 6 * scale;
    rounded(c, cx, cy, cameraWidth, cameraHeight, radius);
    c.fillStyle = "#222";
    c.fill();
    c.shadowColor = "transparent";
    c.clip();
    if (a.cameraMirror) {
      c.translate(cx + cameraWidth, cy);
      c.scale(-1, 1);
    } else c.translate(cx, cy);
    c.drawImage(
      camera,
      (p.source.camera.width - inputWidth) / 2,
      (p.source.camera.height - inputHeight) / 2,
      inputWidth,
      inputHeight,
      0,
      0,
      cameraWidth,
      cameraHeight,
    );
    c.restore();
  }
  const caption = p.captions.find((s) => source >= s.start && source < s.end);
  let shortcutBottom = 33 * scale;
  if (caption) {
    // Reserve throughout the caption to avoid font-size jumps as a badge appears.
    const gap = Math.min(12 * scale, height * 0.03);
    const reservation = (p.shortcuts ?? []).some(
      (shortcut) =>
        shortcutEnabled(p, shortcut) &&
        shortcut.start < caption.end &&
        shortcut.end > caption.start,
    )
      ? shortcutFontSize(width, height, p.appearance.shortcutSize) * 1.8 + gap
      : 0;
    const cached = captionLayoutCache.get(c);
    const layout =
      cached?.text === caption.text &&
      cached.width === width &&
      cached.height === height &&
      cached.reservation === reservation
        ? cached.layout
        : layoutCaption(
            caption.text,
            width,
            height,
            (text, fontSize) => {
              c.font = `600 ${fontSize}px -apple-system, sans-serif`;
              return c.measureText(text).width;
            },
            reservation,
          );
    if (layout !== cached?.layout)
      captionLayoutCache.set(c, {
        text: caption.text,
        width,
        height,
        reservation,
        layout,
      });
    const { lines, textWidth, lineHeight, boxHeight, top } = layout;
    const captionScale = layout.scale;
    c.font = `600 ${layout.fontSize}px -apple-system, sans-serif`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    shortcutBottom = layout.bottom + boxHeight + gap;
    c.fillStyle = "#000b";
    rounded(
      c,
      (width - textWidth) / 2 - 18 * captionScale,
      top,
      textWidth + 36 * captionScale,
      boxHeight,
      10 * captionScale,
    );
    c.fill();
    c.fillStyle = "white";
    lines.forEach((line, index) =>
      c.fillText(
        line,
        width / 2,
        top + 7 * captionScale + lineHeight * (index + 0.5),
      ),
    );
  }
  drawShortcut(c, p, t, width, height, shortcutBottom);
  c.restore();
}
