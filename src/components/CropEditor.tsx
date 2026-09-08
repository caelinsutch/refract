import {
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type KeyboardEvent,
} from "react";
import * as sx from "@stylexjs/stylex";
import { clampCrop, resizeCrop, type CropRect } from "../core/crop";
import { Button } from "./ui";
const s = sx.create({
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 100,
    backgroundColor: "#0008",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  dialog: {
    width: 960,
    maxWidth: "96vw",
    height: 720,
    maxHeight: "94vh",
    borderRadius: 16,
    backgroundColor: "#30322f",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#ffffff25",
    boxShadow: "0 20px 80px #0008",
    display: "flex",
    flexDirection: "column",
    padding: 20,
    gap: 20,
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    height: 38,
    flexShrink: 0,
  },
  field: {
    width: 62,
    textAlign: "center",
    borderWidth: 0,
    backgroundColor: "#ffffff05",
    height: 38,
    color: "#eee",
  },
  label: { color: "#ffffff55", marginInline: 6 },
  stage: {
    flex: 1,
    minHeight: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  preview: {
    position: "relative",
    maxWidth: "100%",
    maxHeight: "100%",
    lineHeight: 0,
    overflow: "hidden",
  },
  image: { display: "block", width: "100%", height: "100%" },
  selection: {
    position: "absolute",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#ffffffa0",
    boxShadow: "0 0 0 2000px #0008",
    cursor: "move",
    touchAction: "none",
  },
  handle: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: "50%",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#fff",
    backgroundColor: "#30322f",
    padding: 0,
    transform: "translate(-50%,-50%)",
    touchAction: "none",
  },
  footer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    height: 38,
    flexShrink: 0,
  },
});
const handles = [
  ["nw", 0, 0],
  ["n", 50, 0],
  ["ne", 100, 0],
  ["e", 100, 50],
  ["se", 100, 100],
  ["s", 50, 100],
  ["sw", 0, 100],
  ["w", 0, 50],
] as const;
export default function CropEditor({
  width,
  height,
  initial,
  video,
  onConfirm,
  onCancel,
}: {
  width: number;
  height: number;
  initial?: CropRect;
  video: HTMLVideoElement | null;
  onConfirm: (crop: CropRect) => void;
  onCancel: () => void;
}) {
  const [rect, setRect] = useState<CropRect>(
    initial ?? { x: 0, y: 0, width, height },
  );
  const [size, setSize] = useState({ width: 900, height: 506 });
  const canvas = useRef<HTMLCanvasElement>(null),
    stage = useRef<HTMLDivElement>(null),
    dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.focus();
    return () => previous?.focus();
  }, []);
  useEffect(() => {
    const node = stage.current;
    if (!node) return;
    const measure = () => {
      const scale = Math.min(
        node.clientWidth / width,
        node.clientHeight / height,
      );
      setSize({ width: width * scale, height: height * scale });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [width, height]);
  useEffect(() => {
    const c = canvas.current?.getContext("2d");
    if (c && video && video.readyState >= 2)
      c.drawImage(video, 0, 0, width, height);
  }, [video, width, height]);
  const update = (key: keyof CropRect, value: number) => {
    if (Number.isFinite(value))
      setRect((r) => clampCrop({ ...r, [key]: value }, width, height));
  };
  function drag(e: PointerEvent, edge: string) {
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    const start = rect,
      x = e.clientX,
      y = e.clientY;
    const move = (ev: globalThis.PointerEvent) =>
      setRect(
        resizeCrop(
          start,
          edge,
          ((ev.clientX - x) * width) / size.width,
          ((ev.clientY - y) * height) / size.height,
          width,
          height,
        ),
      );
    const end = () => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", end);
      target.removeEventListener("pointercancel", end);
      target.removeEventListener("lostpointercapture", end);
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", end);
    target.addEventListener("pointercancel", end);
    target.addEventListener("lostpointercapture", end);
  }
  function key(e: KeyboardEvent, edge: string) {
    const delta = e.shiftKey ? 10 : 1;
    const dx =
      e.key === "ArrowLeft" ? -delta : e.key === "ArrowRight" ? delta : 0;
    const dy = e.key === "ArrowUp" ? -delta : e.key === "ArrowDown" ? delta : 0;
    if (dx || dy) {
      e.preventDefault();
      e.stopPropagation();
      setRect((r) => resizeCrop(r, edge, dx, dy, width, height));
    }
  }
  return (
    <div {...sx.props(s.overlay)}>
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Crop recording"
        tabIndex={-1}
        {...sx.props(s.dialog)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
          if (e.key === "Enter" && e.target === dialog.current) onConfirm(rect);
          if (e.key === "Tab") {
            const nodes = dialog.current?.querySelectorAll<HTMLElement>(
              'button,input,select,[tabindex="0"]',
            );
            if (!nodes?.length) return;
            const first = nodes[0],
              last = nodes[nodes.length - 1];
            if (
              e.shiftKey &&
              (document.activeElement === first ||
                document.activeElement === dialog.current)
            ) {
              e.preventDefault();
              last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
        }}
      >
        <div {...sx.props(s.toolbar)}>
          <span {...sx.props(s.label)}>Size</span>
          {(["width", "height"] as const).map((key, i) => (
            <span
              key={key}
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              {i === 1 && <span>×</span>}
              <input
                {...sx.props(s.field)}
                type="number"
                aria-label={`Crop ${key}`}
                min={1}
                max={key === "width" ? width : height}
                value={rect[key]}
                onChange={(e) => update(key, Number(e.target.value))}
              />
            </span>
          ))}
          <select
            aria-label="Crop aspect ratio"
            defaultValue=""
            onChange={(e) => {
              if (!e.target.value) return;
              const ratio = Number(e.target.value);
              let w = rect.width,
                h = w / ratio;
              if (h > height) {
                h = height;
                w = h * ratio;
              }
              setRect(
                clampCrop(
                  {
                    x: rect.x + (rect.width - w) / 2,
                    y: rect.y + (rect.height - h) / 2,
                    width: w,
                    height: h,
                  },
                  width,
                  height,
                ),
              );
            }}
          >
            <option value="">Select…</option>
            <option value={16 / 9}>16:9</option>
            <option value={9 / 16}>9:16</option>
            <option value={1}>1:1</option>
            <option value={4 / 3}>4:3</option>
          </select>
          <span {...sx.props(s.label)}>Position</span>
          {(["x", "y"] as const).map((key) => (
            <input
              key={key}
              {...sx.props(s.field)}
              aria-label={`Crop ${key}`}
              type="number"
              min={0}
              value={rect[key]}
              onChange={(e) => update(key, Number(e.target.value))}
            />
          ))}
          <Button onClick={() => setRect({ x: 0, y: 0, width, height })}>
            Reset
          </Button>
        </div>
        <div ref={stage} {...sx.props(s.stage)}>
          <div {...sx.props(s.preview)} style={size}>
            <canvas
              ref={canvas}
              width={width}
              height={height}
              {...sx.props(s.image)}
              aria-label="Uncropped recording"
            />
            <div
              {...sx.props(s.selection)}
              tabIndex={0}
              role="group"
              aria-label="Crop selection. Use arrow keys to move."
              style={{
                left: `${(rect.x / width) * 100}%`,
                top: `${(rect.y / height) * 100}%`,
                width: `${(rect.width / width) * 100}%`,
                height: `${(rect.height / height) * 100}%`,
              }}
              onPointerDown={(e) => drag(e, "move")}
              onKeyDown={(e) => key(e, "move")}
            >
              {handles.map(([edge, x, y]) => (
                <button
                  key={edge}
                  {...sx.props(s.handle)}
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    cursor: `${edge}-resize`,
                  }}
                  aria-label={`Resize crop ${edge}. Use arrow keys.`}
                  onPointerDown={(e) => drag(e, edge)}
                  onKeyDown={(e) => key(e, edge)}
                />
              ))}
            </div>
          </div>
        </div>
        <div {...sx.props(s.footer)}>
          <Button primary onClick={() => onConfirm(rect)}>
            Confirm changes ↵
          </Button>
          <Button onClick={onCancel}>Discard changes</Button>
        </div>
      </div>
    </div>
  );
}
