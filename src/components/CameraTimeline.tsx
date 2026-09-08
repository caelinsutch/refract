import { useState } from "react";
import type { CameraLayout } from "../core/camera-layout";
import { type Project, duration, uid } from "../core/project";
import {
  createCameraRange,
  dragCameraRange,
  visibleRange,
} from "../core/timeline";
import type { Selection } from "./Timeline";

export function CameraTimeline({
  project,
  px,
  top,
  selection,
  select,
  edit,
  seek,
}: {
  project: Project;
  px: number;
  top: number;
  selection: Selection;
  select: (s: Selection) => void;
  edit: (p: Project, group?: string) => void;
  seek: (time: number) => void;
}) {
  const [draft, setDraft] = useState<{ start: number; end: number } | null>(
    null,
  );
  const update = (p: Project, layout: CameraLayout, group?: string) =>
    edit(
      {
        ...p,
        cameraLayouts: (p.cameraLayouts ?? [])
          .map((l) => (l.id === layout.id ? layout : l))
          .sort((a, b) => a.start - b.start),
      },
      group,
    );
  const drag = (
    e: React.PointerEvent,
    layout: CameraLayout,
    side: "start" | "end" | "move",
  ) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const node = e.currentTarget as HTMLElement,
      x = e.clientX,
      original = project;
    node.focus({ preventScroll: true });
    node.setPointerCapture(e.pointerId);
    select({ type: "camera", id: layout.id });
    const range = visibleRange(project, layout);
    if (range) seek(range.start);
    const group = `camera:${layout.id}:${e.timeStamp}`;
    const move = (event: PointerEvent) =>
      update(
        original,
        dragCameraRange(original, layout, side, (event.clientX - x) / px),
        group,
      );
    const end = () => {
      node.removeEventListener("pointermove", move);
      for (const name of ["pointerup", "pointercancel", "lostpointercapture"])
        node.removeEventListener(name, end);
    };
    node.addEventListener("pointermove", move);
    for (const name of ["pointerup", "pointercancel", "lostpointercapture"])
      node.addEventListener(name, end);
  };
  const add = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const node = e.currentTarget as HTMLElement,
      rect = node.getBoundingClientRect();
    const at = (x: number) =>
      Math.max(0, Math.min(duration(project), (x - rect.left) / px));
    const anchor = at(e.clientX);
    let latest = anchor;
    seek(anchor);
    node.setPointerCapture(e.pointerId);
    const move = (event: PointerEvent) => {
      latest = at(event.clientX);
      setDraft(createCameraRange(project, anchor, latest));
    };
    const cleanup = () => {
      setDraft(null);
      node.removeEventListener("pointermove", move);
      node.removeEventListener("pointerup", end);
      node.removeEventListener("pointercancel", cleanup);
      node.removeEventListener("lostpointercapture", cleanup);
    };
    const end = () => {
      cleanup();
      const range = createCameraRange(
        project,
        anchor,
        Math.abs(latest - anchor) * px < 4
          ? Math.min(duration(project), anchor + 2500)
          : latest,
      );
      if (!range) return;
      const layout: CameraLayout = {
        id: uid(),
        ...range,
        type: "fullscreen",
        x: project.appearance.cameraX,
        y: project.appearance.cameraY,
      };
      edit({
        ...project,
        cameraLayouts: [...(project.cameraLayouts ?? []), layout].sort(
          (a, b) => a.start - b.start,
        ),
      });
      select({ type: "camera", id: layout.id });
    };
    node.addEventListener("pointermove", move);
    node.addEventListener("pointerup", end);
    node.addEventListener("pointercancel", cleanup);
    node.addEventListener("lostpointercapture", cleanup);
  };
  const keyboard = (
    e: React.KeyboardEvent,
    layout: CameraLayout,
    side: "start" | "end" | "move",
  ) => {
    if (e.key === "Enter") {
      select({ type: "camera", id: layout.id });
      return;
    }
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    e.stopPropagation();
    update(
      project,
      dragCameraRange(
        project,
        layout,
        side,
        (e.key === "ArrowLeft" ? -1 : 1) * (e.shiftKey ? 100 : 10),
      ),
    );
  };
  const draftRange = draft && visibleRange(project, draft);
  return (
    <div
      data-camera-track
      aria-label="Camera layouts timeline"
      style={{ top }}
      onPointerDown={add}
    >
      {!project.cameraLayouts?.length && (
        <span className="camera-track-hint">
          Click or drag to add a camera layout
        </span>
      )}
      {(project.cameraLayouts ?? []).map((layout) => {
        const range = visibleRange(project, layout);
        if (!range) return null;
        return (
          <div
            key={layout.id}
            role="button"
            tabIndex={0}
            data-camera-interval
            data-selected={selection?.id === layout.id}
            aria-label={`${layout.type} camera layout`}
            style={{
              left: range.start * px,
              width: Math.max(12, (range.end - range.start) * px - 2),
            }}
            onPointerDown={(e) => drag(e, layout, "move")}
            onKeyDown={(e) => keyboard(e, layout, "move")}
          >
            {(["start", "end"] as const).map((side) => (
              <button
                key={side}
                aria-label={`Trim camera layout ${side}`}
                className="camera-trim"
                style={{ [side === "start" ? "left" : "right"]: 0 }}
                onPointerDown={(e) => drag(e, layout, side)}
                onKeyDown={(e) => keyboard(e, layout, side)}
              />
            ))}
            {layout.type === "fullscreen"
              ? "Fullscreen"
              : layout.type === "hidden"
                ? "Hidden"
                : "Default"}
          </div>
        );
      })}
      {draftRange && (
        <div
          data-camera-interval
          style={{
            left: draftRange.start * px,
            width: (draftRange.end - draftRange.start) * px,
            opacity: 0.5,
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
}
