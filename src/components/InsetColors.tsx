import { useEffect, useState, type RefObject } from "react";
import * as sx from "@stylexjs/stylex";
import { insetColors } from "../core/inset-colors";
import type { CropRect } from "../core/crop";
const styles = sx.create({
  field: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 19 },
  row: { display: "flex", gap: 8, minWidth: 0 },
  suggestions: {
    display: "flex",
    gap: 4,
    overflowX: "auto",
    minWidth: 0,
    scrollbarWidth: "none",
  },
  swatch: {
    width: 28,
    height: 28,
    flexShrink: 0,
    padding: 0,
    borderRadius: "var(--radius-control)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--white-a20)",
  },
});
export function InsetColors({
  video,
  crop,
  source,
  playing,
  value,
  onChange,
}: {
  video: RefObject<HTMLVideoElement | null>;
  crop: CropRect;
  source: string;
  playing: boolean;
  value: string;
  onChange: (color: string) => void;
}) {
  const [colors, setColors] = useState<string[]>([]);
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;
    const schedule = () => {
      clearTimeout(timer);
      if (playing) return;
      timer = setTimeout(() => {
        if (disposed || element.seeking || element.readyState < 2) return;
        try {
          const width = Math.max(1, Math.round(crop.width)),
            height = Math.max(1, Math.round(crop.height));
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const context = canvas.getContext("2d", { willReadFrequently: true });
          if (!context) return;
          context.drawImage(
            element,
            crop.x,
            crop.y,
            crop.width,
            crop.height,
            0,
            0,
            width,
            height,
          );
          const edges: Uint8ClampedArray[] = [];
          for (
            let ring = 0;
            ring < Math.min(2, Math.ceil(Math.min(width, height) / 2));
            ring++
          ) {
            const w = width - ring * 2,
              h = height - ring * 2;
            edges.push(
              context.getImageData(ring, ring, w, 1).data,
              context.getImageData(ring, height - ring - 1, w, 1).data,
              context.getImageData(ring, ring, 1, h).data,
              context.getImageData(width - ring - 1, ring, 1, h).data,
            );
          }
          setColors(insetColors(edges));
        } catch {
          setColors([]);
        }
      }, 250);
    };
    setColors([]);
    element.addEventListener("seeked", schedule);
    element.addEventListener("loadeddata", schedule);
    element.addEventListener("pause", schedule);
    schedule();
    return () => {
      disposed = true;
      clearTimeout(timer);
      element.removeEventListener("seeked", schedule);
      element.removeEventListener("loadeddata", schedule);
      element.removeEventListener("pause", schedule);
    };
  }, [video, crop.x, crop.y, crop.width, crop.height, source, playing]);
  return (
    <div {...sx.props(styles.field)}>
      <span>Inset color</span>
      <div {...sx.props(styles.row)}>
        <input
          type="color"
          aria-label="Inset color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          {...sx.props(styles.swatch)}
        />
        <div
          role="group"
          aria-label="Suggested inset colors"
          {...sx.props(styles.suggestions)}
        >
          {colors.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={`Use inset color ${color}`}
              title={color}
              aria-pressed={value.toLowerCase() === color}
              onClick={() => onChange(color)}
              {...sx.props(styles.swatch)}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
