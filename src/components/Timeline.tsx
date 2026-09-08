import { ShortcutTimeline } from "./ShortcutTimeline";
import { ClipContextMenu } from "./ClipContextMenu";
import { CameraTimeline } from "./CameraTimeline";
import * as sx from "@stylexjs/stylex";
import { useEffect, useRef, useState } from "react";
import { Scissors, Plus, ZoomIn, EyeOff, VolumeX } from "lucide-react";
import {
  type Project,
  type Zoom,
  type Mask,
  duration,
  formatTime,
  sourceAt,
  uid,
} from "../core/project";
import type { TimelineTracks } from "./TimelineVisibility";
import { Button } from "./ui";
import {
  visibleRange,
  dragZoomRange,
  trimClip,
  createTimelineRange,
} from "../core/timeline";
export type Selection = {
  type: "clip" | "zoom" | "mask" | "camera";
  id: string;
} | null;
const s = sx.create({
  root: {
    backgroundColor: "var(--surface-app)",
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: "var(--white-a0d)",
    minHeight: 149,
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
    borderBottomColor: "var(--white-a08)",
    color: "var(--text-subtle)",
  },
  scroll: {
    overflowX: "auto",
    overflowY: "auto",
    paddingInline: 24,
    flexGrow: 1,
  },
  inner: (width: number) => ({
    width,
    minWidth: "100%",
    position: "relative",
    height: "100%",
  }),
  ruler: {
    height: 31,
    position: "relative",
    cursor: "pointer",
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: "var(--white-a0c)",
  },
  tick: (left: number) => ({
    position: "absolute",
    left,
    top: 9,
    fontSize: 10,
    color: "var(--text-subtle)",
    fontVariantNumeric: "tabular-nums",
    borderLeftWidth: 1,
    borderLeftStyle: "solid",
    borderLeftColor: "var(--border-strong)",
    paddingLeft: 5,
    height: 22,
  }),
  clip: (left: number, width: number) => ({
    position: "absolute",
    left,
    width,
    height: 48,
    top: 40,
    borderRadius: "var(--radius-item)",
    backgroundColor: "var(--track-clip)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--track-clip-border)",
    color: "var(--white)",
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
    height: 48,
    top: 100,
    borderRadius: "var(--radius-item)",
    backgroundColor: "var(--primary-subtle)",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "var(--primary-border)",
    cursor: "crosshair",
  },
  zoom: (left: number, width: number) => ({
    position: "absolute",
    left,
    width,
    top: 0,
    height: 46,
    backgroundColor: "var(--primary)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--primary-edge)",
    borderRadius: "var(--radius-item)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    color: "var(--primary-tint)",
    cursor: "pointer",
    overflow: "hidden",
  }),
  selected: { outline: "2px solid var(--text-primary)", outlineOffset: 2 },
  mask: {
    backgroundColor: "var(--track-mask)",
    borderColor: "var(--track-mask-border)",
  },
  draft: { pointerEvents: "none", opacity: 0.5 },
  handle: {
    position: "absolute",
    width: 9,
    top: 0,
    bottom: 0,
    cursor: "ew-resize",
    backgroundColor: "var(--white-a15)",
  },
  head: (left: number) => ({
    position: "absolute",
    top: 0,
    bottom: 0,
    left,
    width: 1,
    backgroundColor: "var(--text-primary)",
    pointerEvents: "none",
    zIndex: 4,
  }),
  cap: {
    position: "absolute",
    top: 0,
    left: -4,
    width: 9,
    height: 11,
    backgroundColor: "var(--text-primary)",
    borderRadius: 2,
  },
  hint: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    fontSize: 11,
    color: "var(--text-subtle)",
    gap: 7,
  },
  footer: {
    position: "absolute",
    top: 126,
    left: 0,
    fontSize: 10,
    color: "var(--text-subtle)",
  },
});
export default function Timeline({
  project,
  tracks,
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
  tracks: TimelineTracks;
  time: number;
  seek: (t: number) => void;
  edit: (p: Project, group?: string) => void;
  selection: Selection;
  select: (s: Selection) => void;
  zoom: number;
  setZoom: (n: number) => void;
  cut: () => void;
}) {
  const [clipMenu, setClipMenu] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);
  const contextClip = project.segments.find((c) => c.id === clipMenu?.id);
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
  function dragRange(
    e: React.PointerEvent,
    z: Zoom | Mask,
    side: "start" | "end" | "move",
    kind: "zoom" | "mask",
  ) {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const target = e.currentTarget as HTMLElement;
    target.focus({ preventScroll: true });
    target.setPointerCapture(e.pointerId);
    select({ type: kind, id: z.id });
    seek(time);
    const original = structuredClone(project);
    const gesture = `${kind}:${z.id}:${e.pointerId}:${e.timeStamp}`;
    const move = (ev: PointerEvent) => {
      const delta = (ev.clientX - startX) / px;
      const next = dragZoomRange(original, z, side, delta);
      edit(
        {
          ...original,
          ...(kind === "zoom"
            ? {
                zooms: original.zooms.map((v) =>
                  v.id === z.id ? (next as Zoom) : v,
                ),
              }
            : {
                masks: original.masks.map((v) =>
                  v.id === z.id ? (next as Mask) : v,
                ),
              }),
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
  const [draft, setDraft] = useState<{
    kind: "zoom" | "mask";
    start: number;
    end: number;
  } | null>(null);
  function addRange(e: React.PointerEvent, kind: "zoom" | "mask") {
    if (e.button !== 0) return;
    e.preventDefault();
    const target = e.currentTarget as HTMLElement,
      anchor = toTime(e.clientX);
    let latest = anchor;
    target.setPointerCapture(e.pointerId);
    seek(anchor);
    const move = (ev: PointerEvent) => {
      latest = toTime(ev.clientX);
      setDraft({
        kind,
        start: Math.min(anchor, latest),
        end: Math.max(anchor, latest),
      });
    };
    const cleanup = () => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", end);
      target.removeEventListener("pointercancel", cancel);
      target.removeEventListener("lostpointercapture", cancel);
      setDraft(null);
    };
    const cancel = () => cleanup();
    const end = () => {
      cleanup();
      const clicked = Math.abs(latest - anchor) * px < 4;
      const range = createTimelineRange(
        project,
        anchor,
        clicked ? Math.min(total, anchor + 2500) : latest,
      );
      if (!range) return;
      const id = uid();
      if (kind === "zoom") {
        const z: Zoom = {
          id,
          ...range,
          scale: 2,
          x: 0.5,
          y: 0.5,
          mode: project.cursor.length ? "auto" : "manual",
          disabled: false,
        };
        edit({ ...project, zooms: [...project.zooms, z] });
      } else {
        const mask: Mask = {
          id,
          ...range,
          x: 0.3,
          y: 0.3,
          width: 0.3,
          height: 0.2,
          type: "blur",
          strength: 20,
        };
        edit({ ...project, masks: [...project.masks, mask] });
      }
      select({ type: kind, id });
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", end);
    target.addEventListener("pointercancel", cancel);
    target.addEventListener("lostpointercapture", cancel);
  }
  let offset = 0;
  const ticks = [];
  const step = total / zoom > 20000 ? 5000 : 1000;
  for (let i = 0; i <= total; i += step) ticks.push(i);
  return (
    <div
      {...sx.props(s.root)}
      data-timeline
      style={{
        height:
          145 +
          60 *
            (Number(tracks.zoom) +
              Number(tracks.mask) +
              Number(tracks.camera) +
              Number(tracks.shortcuts)),
      }}
    >
      {clipMenu && contextClip && (
        <ClipContextMenu
          clip={contextClip}
          x={clipMenu.x}
          y={clipMenu.y}
          onClose={() => setClipMenu(null)}
          hasAudio={project.source.hasAudio}
          onVolume={(volume) =>
            edit({
              ...project,
              segments: project.segments.map((c) =>
                c.id === contextClip.id
                  ? {
                      ...c,
                      ...(volume === 0
                        ? { muted: true }
                        : { volume, muted: false }),
                    }
                  : c,
              ),
            })
          }
          onToggleCursor={() =>
            edit({
              ...project,
              segments: project.segments.map((c) =>
                c.id === contextClip.id
                  ? { ...c, hideCursor: !c.hideCursor }
                  : c,
              ),
            })
          }
        />
      )}
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
        <span>Timeline</span>
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
                aria-label={`Clip ${formatTime(clip.end - clip.start)} at ${clip.speed} times speed${clip.hideCursor ? ", cursor hidden" : ""}`}
                {...sx.props(
                  s.clip(
                    left * px,
                    ((clip.end - clip.start) / clip.speed) * px - 3,
                  ),
                  selection?.id === clip.id && s.selected,
                )}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.currentTarget.focus({ preventScroll: true });
                  select({ type: "clip", id: clip.id });
                  const bounds = e.currentTarget.getBoundingClientRect();
                  setClipMenu({
                    id: clip.id,
                    x: e.clientX || bounds.left + 10,
                    y: e.clientY || bounds.top + 10,
                  });
                }}
                onClick={(e) => {
                  select({ type: "clip", id: clip.id });
                  seek(toTime(e.clientX));
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") select({ type: "clip", id: clip.id });
                  if (
                    e.key === "ContextMenu" ||
                    (e.shiftKey && e.key === "F10")
                  ) {
                    e.preventDefault();
                    e.stopPropagation();
                    select({ type: "clip", id: clip.id });
                    const bounds = e.currentTarget.getBoundingClientRect();
                    setClipMenu({
                      id: clip.id,
                      x: bounds.left + 10,
                      y: bounds.top + 10,
                    });
                  }
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
                {clip.hideCursor && (
                  <EyeOff
                    size={13}
                    aria-label="Cursor hidden in this clip"
                    style={{ marginRight: 6 }}
                  />
                )}
                {(clip.muted || clip.volume === 0) && (
                  <VolumeX
                    size={13}
                    aria-label="Clip audio muted"
                    style={{ marginRight: 6 }}
                  />
                )}
                Clip {((clip.end - clip.start) / clip.speed / 1000).toFixed(1)}s{" "}
                <span style={{ marginLeft: "auto" }}>{clip.speed} ×</span>
              </div>
            );
          })}
          {tracks.zoom && (
            <div
              {...sx.props(s.zoomTrack)}
              aria-label="Zoom timeline"
              onPointerDown={(e) => addRange(e, "zoom")}
            >
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
                    onPointerDown={(e) => dragRange(e, z, "move", "zoom")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") select({ type: "zoom", id: z.id });
                    }}
                  >
                    {(["start", "end"] as const).map((side) => (
                      <button
                        key={side}
                        aria-label={`Trim zoom ${side}`}
                        {...sx.props(s.handle)}
                        style={{
                          [side === "start" ? "left" : "right"]: 0,
                          border: 0,
                          padding: 0,
                          touchAction: "none",
                        }}
                        onPointerDown={(e) => dragRange(e, z, side, "zoom")}
                        onKeyDown={(e) => {
                          if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                            e.preventDefault();
                            e.stopPropagation();
                            const next = dragZoomRange(
                              project,
                              z,
                              side,
                              (e.key === "ArrowLeft" ? -1 : 1) *
                                (e.shiftKey ? 100 : 10),
                            );
                            edit({
                              ...project,
                              zooms: project.zooms.map((item) =>
                                item.id === z.id ? next : item,
                              ),
                            });
                          }
                        }}
                      />
                    ))}
                    {z.disabled
                      ? "Disabled"
                      : `${z.scale}× ${z.mode === "auto" ? "Auto" : "Manual"}`}
                  </div>
                );
              })}
              {draft?.kind === "zoom" && (
                <div
                  {...sx.props(
                    s.zoom(
                      draft.start * px,
                      Math.max(2, (draft.end - draft.start) * px),
                    ),
                    s.draft,
                  )}
                />
              )}
            </div>
          )}
          {tracks.camera && (
            <CameraTimeline
              project={project}
              px={px}
              top={100 + 60 * Number(tracks.zoom)}
              selection={selection}
              select={select}
              edit={edit}
              seek={seek}
            />
          )}
          {tracks.shortcuts && (
            <ShortcutTimeline
              project={project}
              px={px}
              top={100 + 60 * (Number(tracks.zoom) + Number(tracks.camera))}
              edit={edit}
              seek={seek}
            />
          )}
          {tracks.mask && (
            <div
              {...sx.props(s.zoomTrack)}
              aria-label="Mask timeline"
              style={{
                top:
                  100 +
                  60 *
                    (Number(tracks.zoom) +
                      Number(tracks.camera) +
                      Number(tracks.shortcuts)),
                backgroundColor: "var(--track-mask-subtle)",
                borderColor: "var(--track-mask-outline)",
              }}
              onPointerDown={(e) => addRange(e, "mask")}
            >
              {!project.masks.length && (
                <span {...sx.props(s.hint)}>Click or drag to add a mask</span>
              )}
              {project.masks.map((mask) => {
                const range = visibleRange(project, mask);
                if (!range) return null;
                return (
                  <div
                    key={mask.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`${mask.type === "blur" ? "Blur" : "Highlight"} mask ${formatTime(range.start)} to ${formatTime(range.end)}`}
                    {...sx.props(
                      s.zoom(
                        range.start * px,
                        Math.max(12, (range.end - range.start) * px - 2),
                      ),
                      s.mask,
                      selection?.id === mask.id && s.selected,
                    )}
                    onPointerDown={(e) => dragRange(e, mask, "move", "mask")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.stopPropagation();
                        select({ type: "mask", id: mask.id });
                      }
                    }}
                  >
                    {(["start", "end"] as const).map((side) => (
                      <button
                        key={side}
                        aria-label={`Trim mask ${side}`}
                        {...sx.props(s.handle)}
                        style={{
                          [side === "start" ? "left" : "right"]: 0,
                          border: 0,
                          padding: 0,
                          touchAction: "none",
                        }}
                        onPointerDown={(e) => dragRange(e, mask, side, "mask")}
                        onKeyDown={(e) => {
                          if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                            e.preventDefault();
                            e.stopPropagation();
                            const next = dragZoomRange(
                              project,
                              mask,
                              side,
                              (e.key === "ArrowLeft" ? -1 : 1) *
                                (e.shiftKey ? 100 : 10),
                            );
                            edit({
                              ...project,
                              masks: project.masks.map((m) =>
                                m.id === mask.id ? next : m,
                              ),
                            });
                          }
                        }}
                      />
                    ))}
                    {mask.type === "blur" ? "Blur" : "Highlight"}
                  </div>
                );
              })}
              {draft?.kind === "mask" && (
                <div
                  {...sx.props(
                    s.zoom(
                      draft.start * px,
                      Math.max(2, (draft.end - draft.start) * px),
                    ),
                    s.draft,
                  )}
                />
              )}
            </div>
          )}
          <div {...sx.props(s.head(time * px))}>
            <div {...sx.props(s.cap)} />
          </div>
        </div>
      </div>
    </div>
  );
}
