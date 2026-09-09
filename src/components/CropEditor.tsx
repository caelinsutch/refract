import { Modal } from "./Modal";
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type KeyboardEvent,
} from "react";
import * as sx from "@stylexjs/stylex";
import {
  clampCrop,
  resizeCrop,
  editCropField,
  type CropRect,
} from "../core/crop";
import { Button } from "./ui";
const s = sx.create({
  dialog: {
    width: 960,
    maxWidth: "96vw",
    height: 720,
    maxHeight: "94vh",
    borderRadius: 16,
    backgroundColor: "var(--surface-crop)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--white-a25)",
    boxShadow: "0 20px 80px var(--black-a88)",
    display: "flex",
    flexDirection: "column",
    padding: "10px 28px 20px",
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
    backgroundColor: "var(--white-a05)",
    height: 38,
    color: "var(--text-primary)",
  },
  label: { color: "var(--text-muted)", marginInline: 6 },
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
    overflow: "visible",
  },
  image: { display: "block", width: "100%", height: "100%" },
  selection: {
    position: "absolute",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--white-aa0)",
    cursor: "move",
    touchAction: "none",
  },
  mask: { position: "absolute", inset: 0, pointerEvents: "none" },
  grid: {
    position: "absolute",
    pointerEvents: "none",
    borderColor: "var(--white-a26)",
    borderStyle: "dashed",
    borderWidth: 0,
  },
  horizontalGrid: { left: 0, width: "100%", borderTopWidth: 1 },
  verticalGrid: { top: 0, height: "100%", borderLeftWidth: 1 },
  handle: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: "50%",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--white)",
    backgroundColor: "var(--surface-crop-toolbar)",
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
const minimumCropSize = 200;
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
  nativeWindow = false,
}: {
  width: number;
  height: number;
  initial?: CropRect;
  nativeWindow?: boolean;
  video: HTMLVideoElement | HTMLImageElement | null;
  onConfirm: (crop: CropRect) => void;
  onCancel: () => void;
}) {
  const [rect, setRect] = useState<CropRect>(
    initial ?? { x: 0, y: 0, width, height },
  );
  const activeDrag = useRef<{ cancel: () => void; cleanup: () => void } | null>(
    null,
  );
  useEffect(() => () => activeDrag.current?.cleanup(), []);
  const [ratio, setRatio] = useState<number | null>(null);
  const [fieldDraft, setFieldDraft] = useState<{
    key: keyof CropRect;
    value: string;
  } | null>(null);
  const [size, setSize] = useState({ width: 900, height: 506 });
  const canvas = useRef<HTMLCanvasElement>(null),
    stage = useRef<HTMLDivElement>(null);
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
    if (
      c &&
      video &&
      (!(video instanceof HTMLVideoElement) || video.readyState >= 2)
    )
      c.drawImage(video, 0, 0, width, height);
  }, [video, width, height]);
  const update = (key: keyof CropRect, value: string) => {
    setRect((r) => editCropField(r, key, value, width, height, ratio));
  };
  function drag(e: PointerEvent, edge: string) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    activeDrag.current?.cancel();
    setFieldDraft(null);
    const target = e.currentTarget as HTMLElement;
    target.focus({ preventScroll: true });
    target.setPointerCapture(e.pointerId);
    const start = rect,
      x = e.clientX,
      y = e.clientY;
    const at = (ev: globalThis.PointerEvent) =>
      resizeCrop(
        start,
        edge,
        ((ev.clientX - x) * width) / size.width,
        ((ev.clientY - y) * height) / size.height,
        width,
        height,
        ratio,
      );
    const move = (ev: globalThis.PointerEvent) => setRect(at(ev));
    const cleanup = () => {
      activeDrag.current = null;
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", end);
      target.removeEventListener("pointercancel", cancel);
      target.removeEventListener("lostpointercapture", cancel);
      window.removeEventListener("keydown", key, true);
      if (target.hasPointerCapture(e.pointerId))
        target.releasePointerCapture(e.pointerId);
    };
    const cancel = () => {
      cleanup();
      setRect(start);
    };
    const end = (ev: globalThis.PointerEvent) => {
      cleanup();
      setRect(at(ev));
    };
    const key = (ev: globalThis.KeyboardEvent) => {
      if (ev.key !== "Escape") return;
      ev.preventDefault();
      ev.stopPropagation();
      cancel();
    };
    activeDrag.current = { cancel, cleanup };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", end);
    target.addEventListener("pointercancel", cancel);
    target.addEventListener("lostpointercapture", cancel);
    window.addEventListener("keydown", key, true);
  }

  function key(e: KeyboardEvent, edge: string) {
    const delta = e.shiftKey ? 10 : 1;
    const dx =
      e.key === "ArrowLeft" ? -delta : e.key === "ArrowRight" ? delta : 0;
    const dy = e.key === "ArrowUp" ? -delta : e.key === "ArrowDown" ? delta : 0;
    if (dx || dy) {
      e.preventDefault();
      e.stopPropagation();
      setRect((r) => resizeCrop(r, edge, dx, dy, width, height, ratio));
    }
  }
  return (
    <Modal
      nativeWindow={nativeWindow}
      aria-label="Crop recording"
      onDismiss={onCancel}
      {...sx.props(s.dialog)}
    >
      <div data-window-toolbar {...sx.props(s.toolbar)}>
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
              min={minimumCropSize}
              max={key === "width" ? width : height}
              value={fieldDraft?.key === key ? fieldDraft.value : rect[key]}
              onBlur={() => setFieldDraft(null)}
              onChange={(e) => {
                setFieldDraft({ key, value: e.target.value });
                update(key, e.target.value);
              }}
            />
          </span>
        ))}
        <select
          aria-label="Crop aspect ratio"
          value={ratio ?? ""}
          onChange={(e) => {
            const value = e.target.value ? Number(e.target.value) : null;
            setRatio(value);
            setFieldDraft(null);
            if (value)
              setRect(
                editCropField(
                  rect,
                  "width",
                  String(width),
                  width,
                  height,
                  value,
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
            value={fieldDraft?.key === key ? fieldDraft.value : rect[key]}
            onBlur={() => setFieldDraft(null)}
            onChange={(e) => {
              setFieldDraft({ key, value: e.target.value });
              update(key, e.target.value);
            }}
          />
        ))}
        <Button
          onClick={() => {
            const original = initial ?? { x: 0, y: 0, width, height };
            const changed = (["x", "y", "width", "height"] as const).some(
              (key) => rect[key] !== original[key],
            );
            setRatio(null);
            setFieldDraft(null);
            setRect(changed ? original : { x: 0, y: 0, width, height });
          }}
        >
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
          <svg
            {...sx.props(s.mask)}
            width="100%"
            height="100%"
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              fill="var(--black-a88)"
              fillRule="evenodd"
              d={`M0 0H${width}V${height}H0Z M${rect.x} ${rect.y}h${rect.width}v${rect.height}h${-rect.width}Z`}
            />
          </svg>
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
            {[25, 50, 75].map((position) => (
              <span key={position} aria-hidden="true">
                <span
                  {...sx.props(s.grid, s.horizontalGrid)}
                  style={{ top: `${position}%` }}
                />
                <span
                  {...sx.props(s.grid, s.verticalGrid)}
                  style={{ left: `${position}%` }}
                />
              </span>
            ))}
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
      {(rect.width < minimumCropSize || rect.height < minimumCropSize) && (
        <p
          role="status"
          style={{
            margin: 0,
            textAlign: "center",
            color: "var(--text-secondary)",
          }}
        >
          Minimum size is {minimumCropSize} × {minimumCropSize} pixels.
        </p>
      )}
      <div {...sx.props(s.footer)}>
        <Button
          primary
          defaultAction
          disabled={
            rect.width < minimumCropSize || rect.height < minimumCropSize
          }
          onClick={() => onConfirm(rect)}
        >
          Confirm changes ↵
        </Button>
        <Button onClick={onCancel}>Discard changes</Button>
      </div>
    </Modal>
  );
}
