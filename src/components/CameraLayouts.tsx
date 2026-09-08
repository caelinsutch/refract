import { useEffect, useState } from "react";
import { type Project, duration, uid } from "../core/project";
import { type CameraLayout } from "../core/camera-layout";
import {
  createTimelineRange,
  visibleRange,
  dragZoomRange,
} from "../core/timeline";
import { Button, Divider, Heading, Note, Range, Row } from "./ui";
export function CameraLayouts({
  project,
  time,
  edit,
  seek,
  onReveal,
  selectedId,
}: {
  project: Project;
  onReveal?: () => void;
  selectedId?: string;
  time: number;
  edit: (project: Project, group?: string) => void;
  seek: (time: number) => void;
}) {
  const [error, setError] = useState("");
  const layouts = project.cameraLayouts ?? [];
  useEffect(() => {
    if (selectedId)
      document
        .getElementById(`camera-layout-${selectedId}`)
        ?.scrollIntoView({ block: "nearest", behavior: "instant" });
  }, [selectedId]);
  const change = (next: CameraLayout, group?: string) => {
    if (
      layouts.some(
        (l) => l.id !== next.id && l.start < next.end && next.start < l.end,
      )
    ) {
      setError(
        "Camera layouts cannot overlap. Shorten or move the adjacent layout first.",
      );
      return;
    }
    setError("");
    edit(
      {
        ...project,
        cameraLayouts: [...layouts.filter((l) => l.id !== next.id), next].sort(
          (a, b) => a.start - b.start,
        ),
      },
      group,
    );
  };
  const add = () => {
    onReveal?.();
    const range = createTimelineRange(
      project,
      time,
      Math.min(duration(project), time + 2500),
    );
    if (!range) return;
    const containing = layouts.find(
      (l) => l.start <= range.start && l.end > range.start,
    );
    if (containing) {
      setError("There is already a camera layout at the playhead.");
      return;
    }
    const nextStart = layouts
      .filter((l) => l.start >= range.start)
      .sort((a, b) => a.start - b.start)[0]?.start;
    change({
      id: uid(),
      ...range,
      end: Math.min(range.end, nextStart ?? range.end),
      type: "fullscreen",
      x: project.appearance.cameraX,
      y: project.appearance.cameraY,
    });
  };
  return (
    <>
      <Divider />
      <Heading>Camera layouts</Heading>
      <Button onClick={add} disabled={time >= duration(project) - 100}>
        Add layout at playhead
      </Button>
      {!layouts.length && (
        <Note>
          Switch between fullscreen, the camera overlay, and hidden for parts of
          your video.
        </Note>
      )}
      {error && (
        <p role="alert" style={{ color: "var(--text-primary)", fontSize: 12 }}>
          {error}
        </p>
      )}
      {layouts.map((layout, index) => {
        const range = visibleRange(project, layout);
        return (
          <section
            key={layout.id}
            id={`camera-layout-${layout.id}`}
            aria-label={`Camera layout ${index + 1}`}
            style={{
              marginTop: 16,
              padding: 12,
              borderRadius: "var(--radius-panel)",
              background: "var(--surface-raised)",
            }}
          >
            <Row>
              <Button
                title={`Go to camera layout ${index + 1}`}
                disabled={!range}
                onClick={() => range && seek(range.start)}
              >
                Layout {index + 1}
              </Button>
              <Button
                title={`Delete camera layout ${index + 1}`}
                onClick={() => {
                  setError("");
                  edit({
                    ...project,
                    cameraLayouts: layouts.filter((l) => l.id !== layout.id),
                  });
                }}
              >
                Remove
              </Button>
            </Row>
            <label style={{ display: "block", marginBlock: 10 }}>
              Layout mode
              <select
                aria-label={`Layout ${index + 1} mode`}
                value={layout.type}
                style={{ width: "100%", marginTop: 6 }}
                onChange={(e) =>
                  change({
                    ...layout,
                    type: e.target.value as CameraLayout["type"],
                  })
                }
              >
                <option value="fullscreen">Fullscreen</option>
                <option value="default">Default</option>
                <option value="hidden">Hidden</option>
              </select>
            </label>
            {range ? (
              <>
                {(["start", "end"] as const).map((side) => (
                  <Range
                    key={side}
                    label={`Layout ${index + 1} ${side}`}
                    value={range[side] / 1000}
                    min={0}
                    max={duration(project) / 1000}
                    step={0.01}
                    unit="s"
                    onChange={(v) =>
                      change(
                        dragZoomRange(
                          project,
                          layout,
                          side,
                          v * 1000 - range[side],
                        ),
                        `layout:${layout.id}:${side}`,
                      )
                    }
                  />
                ))}
              </>
            ) : (
              <Note>This layout is outside the retained clips.</Note>
            )}
            {layout.type === "default" && (
              <>
                <Range
                  label={`Layout ${index + 1} horizontal position`}
                  value={layout.x * 100}
                  unit="%"
                  onChange={(v) =>
                    change({ ...layout, x: v / 100 }, `layout:${layout.id}:x`)
                  }
                />
                <Range
                  label={`Layout ${index + 1} vertical position`}
                  value={layout.y * 100}
                  unit="%"
                  onChange={(v) =>
                    change({ ...layout, y: v / 100 }, `layout:${layout.id}:y`)
                  }
                />
              </>
            )}
          </section>
        );
      })}
    </>
  );
}
