import { useEffect, useRef } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { Segment } from "../core/project";
export function ClipContextMenu({
  clip,
  x,
  y,
  onToggleCursor,
  onClose,
}: {
  clip: Segment;
  x: number;
  y: number;
  onToggleCursor: () => void;
  onClose: () => void;
}) {
  const menu = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = menu.current!;
    const previous = document.activeElement;
    node.showPopover();
    node.querySelector("button")?.focus();
    const outside = (event: PointerEvent) => {
      if (!node.contains(event.target as Node)) onClose();
    };
    document.addEventListener("pointerdown", outside, true);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      node.hidePopover();
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus({ preventScroll: true });
    };
  }, []);
  return (
    <div
      ref={menu}
      popover="manual"
      role="menu"
      aria-label="Clip actions"
      data-clip-menu
      style={{
        left: Math.max(8, Math.min(x, window.innerWidth - 228)),
        top: Math.max(8, Math.min(y, window.innerHeight - 60)),
      }}
      onToggle={(e) => {
        if (e.newState === "closed") onClose();
      }}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape" || e.key === "Tab") {
          onClose();
          return;
        }
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          menu.current?.querySelector("button")?.focus();
        }
      }}
    >
      <button
        role="menuitem"
        onClick={() => {
          onToggleCursor();
          onClose();
        }}
      >
        {clip.hideCursor ? <Eye size={15} /> : <EyeOff size={15} />}
        {clip.hideCursor ? "Show mouse cursor" : "Hide mouse cursor"}
      </button>
    </div>
  );
}
