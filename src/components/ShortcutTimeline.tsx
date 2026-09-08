import { useEffect, useRef, useState } from "react";
import { type Project, formatTime } from "../core/project";
import {
  shortcutLabel,
  shortcutRanges,
  type Shortcut,
} from "../core/shortcuts";
export function ShortcutTimeline({
  project,
  px,
  top,
  edit,
  seek,
}: {
  project: Project;
  px: number;
  top: number;
  edit: (p: Project) => void;
  seek: (time: number) => void;
}) {
  const [context, setContext] = useState<{
    shortcut: Shortcut;
    x: number;
    y: number;
  } | null>(null);
  const menu = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!context || !menu.current) return;
    const node = menu.current;
    const previous = document.activeElement;
    node.showPopover();
    node.querySelector("button")?.focus({ preventScroll: true });
    const outside = (e: PointerEvent) => {
      if (!node.contains(e.target as Node)) setContext(null);
    };
    document.addEventListener("pointerdown", outside, true);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      node.hidePopover();
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus({ preventScroll: true });
    };
  }, [context]);
  const shortcuts = project.shortcuts ?? [];
  return (
    <div data-shortcut-track aria-label="Shortcut timeline" style={{ top }}>
      {shortcuts.flatMap((shortcut) =>
        shortcutRanges(project, shortcut).map((range, i) => {
          const label = shortcutLabel(shortcut);
          return (
            <button
              key={`${shortcut.id}:${range.segmentId}:${i}`}
              type="button"
              data-shortcut-block
              data-disabled={!!shortcut.disabled}
              aria-label={`${label} at ${formatTime(range.start, true)}`}
              aria-pressed={!shortcut.disabled}
              title={`${shortcut.disabled ? "Show" : "Hide"} ${label}`}
              style={{
                left: range.start * px,
                width: Math.max(2, (range.end - range.start) * px),
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => {
                seek(range.start);
                edit({
                  ...project,
                  shortcuts: shortcuts.map((s) =>
                    s.id === shortcut.id ? { ...s, disabled: !s.disabled } : s,
                  ),
                });
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setContext({ shortcut, x: e.clientX, y: e.clientY });
              }}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (
                  e.key === "ContextMenu" ||
                  (e.shiftKey && e.key === "F10")
                ) {
                  e.preventDefault();
                  const rect = e.currentTarget.getBoundingClientRect();
                  setContext({ shortcut, x: rect.left, y: rect.top });
                }
              }}
            >
              <span>{label}</span>
            </button>
          );
        }),
      )}
      {context && (
        <div
          ref={menu}
          popover="manual"
          role="menu"
          aria-label="Shortcut actions"
          data-clip-menu
          data-motion-popover
          style={{
            left: Math.max(8, Math.min(context.x, window.innerWidth - 228)),
            top: Math.max(8, Math.min(context.y, window.innerHeight - 60)),
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Escape" || e.key === "Tab") {
              e.preventDefault();
              setContext(null);
            }
          }}
        >
          <button
            role="menuitem"
            onClick={() => {
              const label = shortcutLabel(context.shortcut);
              edit({
                ...project,
                shortcuts: shortcuts.map((s) =>
                  shortcutLabel(s) === label ? { ...s, disabled: true } : s,
                ),
              });
              setContext(null);
            }}
          >
            Hide all {shortcutLabel(context.shortcut)}
          </button>
        </div>
      )}
    </div>
  );
}
