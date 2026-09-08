import * as sx from "@stylexjs/stylex";
import { useEffect, useRef, useState } from "react";
import { Scissors, Plus, ZoomIn } from "lucide-react";
import {
  type Project,
  type Zoom,
  duration,
  formatTime,
  sourceAt,
  uid,
} from "../core/project";
import { Button } from "./ui";
import { visibleRange, dragZoomRange, trimClip } from "../core/timeline";
export type Selection = { type: "clip" | "zoom" | "mask"; id: string } | null;
const s = sx.create({
  root: {
    backgroundColor: "#08090d",
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: "#ffffff0d",
    height: 192,
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
  },
  tools: {
    display: "flex",
    height: 35,
    alignItems: "center",
    gap: 6,
    paddingInline: 14,
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: "#ffffff08",
    color: "#8d899a",
  },
  scroll: {
    overflowX: "auto",
    overflowY: "hidden",
    paddingInline: 24,
    flexGrow: 1,
  },
  inner: (width: number) => ({
    width,
    minWidth: "100%",
    position: "relative",
    height: 146,
  }),
  ruler: {
    height: 31,
    position: "relative",
    cursor: "pointer",
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: "#ffffff0c",
  },
  tick: (left: number) => ({
    position: "absolute",
    left,
    top: 9,
    fontSize: 10,
    color: "#787482",
    fontVariantNumeric: "tabular-nums",
    borderLeftWidth: 1,
    borderLeftStyle: "solid",
    borderLeftColor: "#55525d",
    paddingLeft: 5,
    height: 22,
  }),
  clip: (left: number, width: number) => ({
    position: "absolute",
    left,
    width,
    height: 34,
    top: 40,
    borderRadius: 6,
    backgroundColor: "#b99a47",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#d4b765",
    color: "#262218",
    fontWeight: 500,
    fontSize: 11,
    display: "flex",
    alignItems: "center",
    paddingInline: 12,
    cursor: "pointer",
    overflow: "hidden",
    whiteSpace: "nowrap",
  }),
  zoomTrack: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 34,
    top: 83,
    borderRadius: 6,
    backgroundColor: "#29252f",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#5b476c",
    cursor: "crosshair",
  },
  zoom: (left: number, width: number) => ({
    position: "absolute",
    left,
    width,
    top: 0,
    height: 32,
    backgroundColor: "#754ab1",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#9b70c9",
    borderRadius: 5,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    color: "#e8d9ff",
    cursor: "pointer",
    overflow: "hidden",
  }),
  selected: { outline: "2px solid #efedf5", outlineOffset: 2 },
  handle: {
    position: "absolute",
    width: 9,
    top: 0,
    bottom: 0,
    cursor: "ew-resize",
    backgroundColor: "#ffffff15",
  },
  head: (left: number) => ({
    position: "absolute",
    top: 0,
    bottom: 0,
    left,
    width: 1,
    backgroundColor: "#f2eff7",
    pointerEvents: "none",
    zIndex: 4,
  }),
  cap: {
    position: "absolute",
    top: 0,
    left: -4,
    width: 9,
    height: 11,
    backgroundColor: "#efedf6",
    borderRadius: 2,
  },
  hint: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    fontSize: 11,
    color: "#74667e",
    gap: 7,
  },
  footer: {
    position: "absolute",
    top: 126,
    left: 0,
    fontSize: 10,
    color: "#666270",
  },
});
export default function Timeline({
  project,
  time,
  seek,
  edit,
  selection,
  select,
  zoom,
  setZoom,
  cut,
}: {
  project: Project;
  time: number;
  seek: (t: number) => void;
  edit: (p: Project, group?: string) => void;
  selection: Selection;
  select: (s: Selection) => void;
  zoom: number;
  setZoom: (n: number) => void;
  cut: () => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  const [dragScale, setDragScale] = useState<number | null>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(900);
  useEffect(() => {
    const node = viewport.current;
    if (!node) return;
    const measure = () => setViewportWidth(Math.max(1, node.clientWidth - 48));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const total = duration(project),
    base = viewportWidth / Math.max(total, 1000),
    px = dragScale ?? base * zoom;
  const toTime = (clientX: number) =>
    Math.max(
      0,
      Math.min(
        total,
        (clientX - (el.current?.getBoundingClientRect().left ?? 0)) / px,
      ),
    );
  function dragZoom(
    e: React.PointerEvent,
    z: Zoom,
    side: "start" | "end" | "move",
  ) {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    select({ type: "zoom", id: z.id });
    const original = structuredClone(project);
    const gesture = `zoom:${z.id}:${e.pointerId}:${e.timeStamp}`;
    const move = (ev: PointerEvent) => {
      const delta = (ev.clientX - startX) / px;
      const next = dragZoomRange(original, z, side, delta);
      edit(
        {
          ...original,
          zooms: original.zooms.map((v) => (v.id === z.id ? next : v)),
        },
        gesture,
      );
    };
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
  function dragClip(e: React.PointerEvent, id: string, side: "start" | "end") {
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement,
      original = project,
      x = e.clientX;
    const gesture = `trim:${id}:${e.pointerId}:${e.timeStamp}`;
    target.setPointerCapture(e.pointerId);
    setDragScale(px);
    select({ type: "clip", id });
    seek(time);
    const move = (ev: PointerEvent) =>
      edit(trimClip(original, id, side, (ev.clientX - x) / px), gesture);
    const end = () => {
      setDragScale(null);
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
  function add(e: React.MouseEvent) {
    const source = sourceAt(project, toTime(e.clientX))?.time ?? 0;
    const z: Zoom = {
      id: uid(),
      start: source,
      end: Math.min(project.source.duration, source + 2500),
      scale: 2,
      x: 0.5,
      y: 0.5,
      mode: project.cursor.length ? "auto" : "manual",
      disabled: false,
    };
    if (z.end - z.start < 200) return;
    edit({ ...project, zooms: [...project.zooms, z] });
    select({ type: "zoom", id: z.id });
  }
  let offset = 0;
  const ticks = [];
  const step = total / zoom > 20000 ? 5000 : 1000;
  for (let i = 0; i <= total; i += step) ticks.push(i);
  return (
    <div {...sx.props(s.root)}>
      <div {...sx.props(s.tools)}>
        <Button title="Cut at playhead (C)" onClick={cut} icon>
          <Scissors size={14} />
        </Button>
        <input
          aria-label="Timeline zoom"
          type="range"
          min={1}
          max={8}
          step={0.1}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          style={{ width: 100 }}
        />
        <ZoomIn size={12} />
        <span style={{ flex: 1 }} />
        <span>Clip & zooms</span>
        <span style={{ width: 12 }} />
        <span>{formatTime(total, true)}</span>
      </div>
      <div ref={viewport} {...sx.props(s.scroll)}>
        <div
          ref={el}
          {...sx.props(s.inner(Math.max(viewportWidth, total * px)))}
        >
          <div
            {...sx.props(s.ruler)}
            onPointerDown={(e) => {
              seek(toTime(e.clientX));
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (e.buttons === 1) seek(toTime(e.clientX));
            }}
          >
            {ticks.map((t) => (
              <span key={t} {...sx.props(s.tick(t * px))}>
                {formatTime(t)}
              </span>
            ))}
          </div>
          {project.segments.map((clip) => {
            const left = offset;
            offset += (clip.end - clip.start) / clip.speed;
            return (
              <div
                key={clip.id}
                role="button"
                tabIndex={0}
                aria-label={`Clip ${formatTime(clip.end - clip.start)} at ${clip.speed} times speed`}
                {...sx.props(
                  s.clip(
                    left * px,
                    ((clip.end - clip.start) / clip.speed) * px - 3,
                  ),
                  selection?.id === clip.id && s.selected,
                )}
                onClick={(e) => {
                  select({ type: "clip", id: clip.id });
                  seek(toTime(e.clientX));
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") select({ type: "clip", id: clip.id });
                }}
              >
                {(["start", "end"] as const).map((side) => (
                  <button
                    key={side}
                    {...sx.props(s.handle)}
                    style={{
                      [side === "start" ? "left" : "right"]: 0,
                      border: 0,
                      padding: 0,
                      touchAction: "none",
                    }}
                    aria-label={`Trim clip ${side}`}
                    title={`Drag to trim ${side}`}
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => dragClip(e, clip.id, side)}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                        e.preventDefault();
                        e.stopPropagation();
                        edit(
                          trimClip(
                            project,
                            clip.id,
                            side,
                            (e.key === "ArrowLeft" ? -1 : 1) *
                              (e.shiftKey ? 100 : 10),
                          ),
                        );
                      }
                    }}
                  />
                ))}
                Clip {((clip.end - clip.start) / clip.speed / 1000).toFixed(1)}s{" "}
                <span style={{ marginLeft: "auto" }}>{clip.speed} ×</span>
              </div>
            );
          })}
          <div {...sx.props(s.zoomTrack)} onClick={add}>
            {project.zooms.length === 0 ? (
              <span {...sx.props(s.hint)}>
                <Plus size={12} /> Click or drag to add zoom
              </span>
            ) : null}
            {project.zooms.map((z) => {
              const range = visibleRange(project, z);
              if (!range) return null;
              const { start, end } = range;
              return (
                <div
                  key={z.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Zoom ${z.scale} times`}
                  {...sx.props(
                    s.zoom(start * px, Math.max(12, (end - start) * px - 2)),
                    selection?.id === z.id && s.selected,
                  )}
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => dragZoom(e, z, "move")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") select({ type: "zoom", id: z.id });
                  }}
                >
                  <div
                    {...sx.props(s.handle)}
                    style={{ left: 0 }}
                    onPointerDown={(e) => dragZoom(e, z, "start")}
                  />
                  {z.disabled
                    ? "Disabled"
                    : `${z.scale}× ${z.mode === "auto" ? "Auto" : "Manual"}`}
                  <div
                    {...sx.props(s.handle)}
                    style={{ right: 0 }}
                    onPointerDown={(e) => dragZoom(e, z, "end")}
                  />
                </div>
              );
            })}
          </div>
          <div {...sx.props(s.head(time * px))}>
            <div {...sx.props(s.cap)} />
          </div>
          <div {...sx.props(s.footer)}>Zooms</div>
        </div>
      </div>
    </div>
  );
}
