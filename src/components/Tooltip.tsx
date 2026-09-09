import { useCallback, useEffect, useId, useRef, type ReactNode } from "react";
import * as sx from "@stylexjs/stylex";

const s = sx.create({
  anchor: { display: "inline-flex", flexShrink: 0 },
  bubble: {
    position: "fixed",
    inset: "auto",
    margin: 0,
    padding: "6px 9px",
    maxWidth: "min(260px, calc(100vw - 16px))",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--white-a20)",
    borderRadius: "var(--radius-control)",
    backgroundColor: "var(--surface-popover)",
    color: "var(--text-primary)",
    boxShadow: "0 3px 12px var(--black-a33)",
    fontSize: 12,
    lineHeight: 1.4,
    pointerEvents: "none",
  },
});

/** A descriptive overlay: never takes focus or intercepts the underlying control. */
export function Tooltip({
  label,
  children,
}: {
  label: string;
  children: (descriptionId: string) => ReactNode;
}) {
  const id = useId();
  const anchor = useRef<HTMLSpanElement>(null);
  const bubble = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const close = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = undefined;
    bubble.current?.hidePopover();
  }, []);
  const show = () => {
    clearTimeout(timer.current);
    const target = anchor.current,
      tooltip = bubble.current;
    if (!target || !tooltip || !target.isConnected) return;
    tooltip.showPopover();
    const bounds = target.getBoundingClientRect();
    const size = tooltip.getBoundingClientRect();
    const left = bounds.left - size.width - 8;
    tooltip.style.left = `${Math.max(8, Math.min(innerWidth - size.width - 8, left >= 8 ? left : bounds.right + 8))}px`;
    tooltip.style.top = `${Math.max(8, Math.min(innerHeight - size.height - 8, bounds.top + (bounds.height - size.height) / 2))}px`;
  };
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && bubble.current?.matches(":popover-open")) {
        event.preventDefault();
        event.stopPropagation();
        close();
      }
    };
    window.addEventListener("blur", close);
    window.addEventListener("resize", close);
    document.addEventListener("scroll", close, true);
    document.addEventListener("keydown", escape, true);
    return () => {
      close();
      window.removeEventListener("blur", close);
      window.removeEventListener("resize", close);
      document.removeEventListener("scroll", close, true);
      document.removeEventListener("keydown", escape, true);
    };
  }, [close]);
  return (
    <span
      ref={anchor}
      data-tooltip-anchor
      {...sx.props(s.anchor)}
      onPointerEnter={(event) => {
        if (event.pointerType !== "touch") {
          clearTimeout(timer.current);
          timer.current = setTimeout(show, 400);
        }
      }}
      onPointerLeave={close}
      onPointerDown={close}
      onFocus={(event) => {
        if (event.target.matches(":focus-visible")) show();
      }}
      onBlur={close}
    >
      {children(id)}
      <span
        ref={bubble}
        id={id}
        role="tooltip"
        popover="manual"
        {...sx.props(s.bubble)}
      >
        {label}
      </span>
    </span>
  );
}
