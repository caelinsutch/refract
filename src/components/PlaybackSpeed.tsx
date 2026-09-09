import { useId, useRef, useState } from "react";
import * as sx from "@stylexjs/stylex";
import { Check } from "lucide-react";

const speeds = [0.25, 0.5, 1, 2, 4, 8] as const;
const cycle = [1, 2, 4, 8];
const styles = sx.create({
  trigger: {
    width: 46,
    height: 38,
    flexShrink: 0,
    padding: 0,
    borderWidth: 0,
    borderRadius: "var(--radius-control)",
    backgroundColor: { default: "transparent", ":hover": "var(--white-a12)" },
    color: "var(--text-secondary)",
    fontWeight: 500,
  },
  menu: {
    position: "fixed",
    inset: "auto",
    margin: 0,
    width: 160,
    padding: 5,
    borderRadius: 9,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--white-a20)",
    backgroundColor: "var(--surface-popover)",
    color: "var(--text-primary)",
    boxShadow: "0 8px 30px var(--black-a88)",
  },
  group: { margin: "5px 8px 3px", fontSize: 11, color: "var(--text-subtle)" },
  item: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    height: 28,
    padding: "0 8px",
    borderWidth: 0,
    borderRadius: 5,
    backgroundColor: {
      default: "transparent",
      ":hover": "var(--white-a12)",
      ":focus": "var(--white-a12)",
    },
    color: "var(--text-primary)",
    textAlign: "left",
    outline: "none",
  },
  mark: { width: 14, height: 14, display: "inline-flex" },
});

export function PlaybackSpeed({
  value,
  onChange,
}: {
  value: number;
  onChange: (speed: number) => void;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const items = () =>
    Array.from(
      menu.current?.querySelectorAll<HTMLButtonElement>(
        '[role="menuitemradio"]',
      ) ?? [],
    );
  const show = () => {
    const node = menu.current,
      anchor = trigger.current;
    if (!node || !anchor) return;
    const rect = anchor.getBoundingClientRect();
    node.style.left = `${Math.max(8, Math.min(rect.right - 160, window.innerWidth - 168))}px`;
    node.style.bottom = `${window.innerHeight - rect.top + 6}px`;
    node.showPopover();
    items()[
      Math.max(0, speeds.indexOf(value as (typeof speeds)[number]))
    ]?.focus();
  };
  const close = () => {
    menu.current?.hidePopover();
    trigger.current?.focus();
  };
  return (
    <>
      <button
        ref={trigger}
        type="button"
        title="Playback speed"
        aria-label="Playback speed"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        {...sx.props(styles.trigger)}
        onClick={() =>
          onChange(cycle[(cycle.indexOf(value) + 1) % cycle.length])
        }
        onContextMenu={(event) => {
          event.preventDefault();
          show();
        }}
        onKeyDown={(event) => {
          if (
            ["ArrowDown", "ArrowUp", "ContextMenu"].includes(event.key) ||
            (event.shiftKey && event.key === "F10")
          ) {
            event.preventDefault();
            event.stopPropagation();
            show();
          }
        }}
      >
        {value}×
      </button>
      <div
        ref={menu}
        id={id}
        role="menu"
        aria-label="Playback speed options"
        popover="auto"
        data-motion-popover
        {...sx.props(styles.menu)}
        onToggle={(event) => setOpen(event.newState === "open")}
        onKeyDown={(event) => {
          const buttons = items(),
            current = buttons.indexOf(
              document.activeElement as HTMLButtonElement,
            );
          let next: number | undefined;
          if (event.key === "ArrowDown") next = (current + 1) % buttons.length;
          if (event.key === "ArrowUp")
            next = (current - 1 + buttons.length) % buttons.length;
          if (event.key === "Home") next = 0;
          if (event.key === "End") next = buttons.length - 1;
          if (next !== undefined) {
            event.preventDefault();
            event.stopPropagation();
            buttons[next]?.focus();
          }
          if ((event.key === "Enter" || event.key === " ") && current >= 0) {
            event.preventDefault();
            event.stopPropagation();
            if (!event.repeat) buttons[current]?.click();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            close();
          }
          if (event.key === "Tab") menu.current?.hidePopover();
        }}
      >
        {[
          { label: "Slower", values: speeds.slice(0, 2) },
          { label: "Normal", values: speeds.slice(2, 3) },
          { label: "Faster", values: speeds.slice(3) },
        ].map((group) => (
          <div role="group" aria-label={group.label} key={group.label}>
            <div aria-hidden="true" {...sx.props(styles.group)}>
              {group.label}
            </div>
            {group.values.map((speed) => (
              <button
                key={speed}
                type="button"
                role="menuitemradio"
                aria-checked={value === speed}
                tabIndex={-1}
                {...sx.props(styles.item)}
                onClick={() => {
                  onChange(speed);
                  close();
                }}
              >
                <span aria-hidden="true" {...sx.props(styles.mark)}>
                  {value === speed && <Check size={14} />}
                </span>
                {speed}×
              </button>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
