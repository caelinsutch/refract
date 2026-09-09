import { useId, useRef, useState } from "react";
import * as sx from "@stylexjs/stylex";
import { Gauge } from "lucide-react";
import { Toggle } from "./ui";
const s = sx.create({
  trigger: {
    position: "relative",
    width: 46,
    height: 38,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0,
    borderRadius: 6,
    backgroundColor: "transparent",
    color: "var(--text-secondary)",
  },
  dot: {
    position: "absolute",
    width: 4,
    height: 4,
    top: 5,
    right: 12,
    borderRadius: "50%",
    backgroundColor: "var(--warning)",
  },
  panel: {
    position: "fixed",
    inset: "auto",
    margin: 0,
    width: 352,
    maxWidth: "calc(100vw - 16px)",
    padding: 16,
    boxSizing: "border-box",
    borderRadius: 9,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--white-a20)",
    backgroundColor: "var(--surface-popover)",
    color: "var(--text-primary)",
    boxShadow: "0 8px 30px var(--black-a88)",
  },
  label: { fontSize: 12, marginBottom: 8, color: "var(--text-secondary)" },
  choices: {
    display: "flex",
    gap: 2,
    padding: 3,
    borderRadius: 6,
    backgroundColor: "var(--white-a0a)",
    marginBottom: 10,
  },
  choice: {
    flex: 1,
    height: 30,
    borderWidth: 0,
    borderRadius: 4,
    color: "var(--text-secondary)",
    backgroundColor: "transparent",
  },
  selected: {
    backgroundColor: "var(--white-a24)",
    color: "var(--text-primary)",
  },
  description: {
    fontSize: 12,
    lineHeight: 1.5,
    color: "var(--text-secondary)",
    margin: "0 0 20px",
  },
  note: {
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: "var(--white-a05)",
    paddingTop: 16,
    margin: 0,
    fontSize: 12,
    lineHeight: 1.5,
    color: "var(--text-subtle)",
  },
});
export function PreviewSettings({
  quality,
  powerSaving,
  onQuality,
  onPowerSaving,
}: {
  quality: "quality" | "performance";
  powerSaving: boolean;
  onQuality: (value: "quality" | "performance") => void;
  onPowerSaving: (value: boolean) => void;
}) {
  const id = useId(),
    trigger = useRef<HTMLButtonElement>(null),
    panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const close = () => {
    panel.current?.hidePopover();
    trigger.current?.focus();
  };
  return (
    <>
      <button
        ref={trigger}
        type="button"
        title="Video preview performance settings"
        aria-label="Video preview performance settings"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={id}
        {...sx.props(s.trigger)}
        onClick={() => {
          if (open) {
            close();
            return;
          }
          const node = panel.current,
            rect = trigger.current?.getBoundingClientRect();
          if (!node || !rect) return;
          node.style.left = `${Math.max(8, Math.min(rect.right - 352, window.innerWidth - 360))}px`;
          node.style.bottom = `${window.innerHeight - rect.top + 6}px`;
          node.showPopover();
          node
            .querySelector<HTMLButtonElement>('[aria-pressed="true"]')
            ?.focus();
        }}
      >
        <Gauge size={16} />
        {(powerSaving || quality === "performance") && (
          <span aria-hidden="true" data-preview-reduced {...sx.props(s.dot)} />
        )}
      </button>
      <div
        ref={panel}
        id={id}
        popover="auto"
        role="dialog"
        aria-label="Video preview performance settings"
        data-motion-popover
        {...sx.props(s.panel)}
        onToggle={(event) => setOpen(event.newState === "open")}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            close();
          }
        }}
      >
        <div {...sx.props(s.label)}>Preview mode</div>
        <div role="group" aria-label="Preview mode" {...sx.props(s.choices)}>
          {(["quality", "performance"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={quality === value}
              {...sx.props(s.choice, quality === value && s.selected)}
              onClick={() => onQuality(value)}
            >
              {value === "quality" ? "Quality" : "Performance"}
            </button>
          ))}
        </div>
        <p {...sx.props(s.description)}>
          {quality === "quality"
            ? "Preview all enabled effects, including motion blur."
            : "Skip motion blur in the preview to reduce rendering work."}
        </p>
        <Toggle
          label="Power saving mode"
          value={powerSaving}
          onChange={onPowerSaving}
        />
        <p {...sx.props(s.description)}>
          Limit preview redraws to 30 fps to reduce rendering work during
          playback.
        </p>
        <p {...sx.props(s.note)}>
          These settings affect the preview only. Exports keep all enabled
          effects and your selected frame rate.
        </p>
      </div>
    </>
  );
}
