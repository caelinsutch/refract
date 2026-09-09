import { Toggle } from "./ui";
import { isVerticalRatio } from "../core/system-zooms";
import { useId, useRef, useState } from "react";
import * as sx from "@stylexjs/stylex";
import { Check, ChevronDown, Proportions } from "lucide-react";
const options = [
  { name: "Auto", ratio: "Auto" },
  { name: "Wide", ratio: "16:9" },
  { name: "Square", ratio: "1:1" },
  { name: "Classic", ratio: "4:3" },
  { name: "Vertical", ratio: "9:16" },
  { name: "Tall", ratio: "3:4" },
  { name: "Portrait", ratio: "4:5" },
];
const s = sx.create({
  trigger: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    height: 32,
    paddingInline: 12,
    borderWidth: 0,
    borderRadius: 6,
    backgroundColor: { default: "transparent", ":hover": "var(--white-a12)" },
    color: "var(--text-secondary)",
  },
  menu: {
    position: "fixed",
    inset: "auto",
    margin: 0,
    width: 240,
    padding: 6,
    borderRadius: 9,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--white-a20)",
    backgroundColor: "var(--surface-popover)",
    boxShadow: "0 8px 30px var(--black-a88)",
  },
  item: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 9,
    height: 32,
    padding: "0 8px",
    borderWidth: 0,
    borderRadius: 5,
    backgroundColor: {
      default: "transparent",
      ":hover": "var(--white-a12)",
      ":focus": "var(--white-a12)",
    },
    color: "var(--text-primary)",
    outline: "none",
  },
  shapeHolder: {
    width: 20,
    height: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  shape: {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--text-secondary)",
    borderRadius: 1.5,
    backgroundColor: "var(--white-a0a)",
  },
  name: { flex: 1, textAlign: "left" },
  ratio: { color: "var(--text-subtle)", fontSize: 12 },
  check: { width: 14, height: 14 },
});
export function AspectRatioPicker({
  value,
  onChange,
  alwaysKeepZoomedIn,
  onKeepZoomedIn,
}: {
  value: string;
  alwaysKeepZoomedIn: boolean;
  onKeepZoomedIn: (enabled: boolean) => void;
  onChange: (ratio: string) => void;
}) {
  const trigger = useRef<HTMLButtonElement>(null),
    menu = useRef<HTMLDivElement>(null),
    id = useId();
  const [open, setOpen] = useState(false);
  const choices = options.some((option) => option.ratio === value)
    ? options
    : [...options, { name: "Custom", ratio: value }];
  const name = choices.find((option) => option.ratio === value)!.name;
  const buttons = () =>
    Array.from(
      menu.current?.querySelectorAll<HTMLButtonElement>(
        '[role="menuitemradio"], [role="switch"]',
      ) ?? [],
    );
  const close = () => {
    menu.current?.hidePopover();
    trigger.current?.focus();
  };
  const show = () => {
    const node = menu.current,
      rect = trigger.current?.getBoundingClientRect();
    if (!node || !rect) return;
    node.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - 256))}px`;
    node.style.top = `${rect.bottom + 6}px`;
    node.showPopover();
    buttons()[choices.findIndex((option) => option.ratio === value)]?.focus();
  };
  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-label="Aspect ratio"
        title="Output aspect ratio"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        {...sx.props(s.trigger)}
        onClick={() => (open ? close() : show())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            show();
          }
        }}
      >
        <Proportions size={14} />
        {name}
        <ChevronDown size={12} />
      </button>
      <div
        ref={menu}
        id={id}
        role="menu"
        aria-label="Output aspect ratio"
        popover="auto"
        data-motion-popover
        {...sx.props(s.menu)}
        onToggle={(event) => setOpen(event.newState === "open")}
        onKeyDown={(event) => {
          const items = buttons(),
            current = items.indexOf(
              document.activeElement as HTMLButtonElement,
            );
          let next: number | undefined;
          if (event.key === "ArrowDown") next = (current + 1) % items.length;
          if (event.key === "ArrowUp")
            next = (current - 1 + items.length) % items.length;
          if (event.key === "Home") next = 0;
          if (event.key === "End") next = items.length - 1;
          if (next !== undefined) {
            event.preventDefault();
            event.stopPropagation();
            items[next]?.focus();
          }
          if ((event.key === "Enter" || event.key === " ") && current >= 0) {
            event.preventDefault();
            event.stopPropagation();
            if (!event.repeat) items[current]?.click();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            close();
          }
          if (event.key === "Tab") menu.current?.hidePopover();
        }}
      >
        {choices.map((option) => {
          const [w, h] = option.ratio.split(":").map(Number);
          const ratio = w / h;
          return (
            <button
              type="button"
              role="menuitemradio"
              aria-label={option.name}
              aria-checked={value === option.ratio}
              tabIndex={-1}
              key={option.ratio}
              {...sx.props(s.item)}
              onClick={() => {
                if (value !== option.ratio) onChange(option.ratio);
              }}
            >
              <span aria-hidden="true" {...sx.props(s.shapeHolder)}>
                {Number.isFinite(ratio) && ratio > 0 ? (
                  <span
                    {...sx.props(s.shape)}
                    style={{
                      width: 18 * Math.min(1, ratio),
                      height: 18 * Math.min(1, 1 / ratio),
                    }}
                  />
                ) : (
                  <Proportions size={16} />
                )}
              </span>
              <span {...sx.props(s.name)}>{option.name}</span>
              <span {...sx.props(s.ratio)}>
                {option.ratio === "Auto" ? "" : option.ratio}
              </span>
              <span aria-hidden="true" {...sx.props(s.check)}>
                {value === option.ratio && <Check size={14} />}
              </span>
            </button>
          );
        })}
        {isVerticalRatio(value) && (
          <div
            style={{
              padding: "12px 8px 0",
              borderTop: "1px solid var(--white-a0a)",
            }}
          >
            <Toggle
              label="Always keep zoomed in"
              value={alwaysKeepZoomedIn}
              onChange={onKeepZoomedIn}
            />
          </div>
        )}
      </div>
    </>
  );
}
