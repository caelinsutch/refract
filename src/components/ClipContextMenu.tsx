import { useEffect, useRef, useState } from "react";
import {
  Eye,
  EyeOff,
  Volume2,
  ChevronRight,
  ChevronLeft,
  Check,
} from "lucide-react";
import type { Segment } from "../core/project";
export function ClipContextMenu({
  clip,
  x,
  y,
  onToggleCursor,
  hasAudio,
  onVolume,
  onClose,
}: {
  clip: Segment;
  x: number;
  y: number;
  onToggleCursor: () => void;
  hasAudio: boolean;
  onVolume: (volume: number) => void;
  onClose: () => void;
}) {
  const menu = useRef<HTMLDivElement>(null);
  const [volumeOpen, setVolumeOpen] = useState(false);
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
  useEffect(() => {
    menu.current?.querySelector("button")?.focus({ preventScroll: true });
  }, [volumeOpen]);
  return (
    <div
      ref={menu}
      popover="manual"
      role="menu"
      aria-label="Clip actions"
      data-clip-menu
      data-motion-popover
      style={{
        left: Math.max(8, Math.min(x, window.innerWidth - 228)),
        top: Math.max(
          8,
          Math.min(
            y,
            window.innerHeight - (volumeOpen ? 270 : hasAudio ? 100 : 60),
          ),
        ),
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
        if (e.key === "ArrowLeft" && volumeOpen) {
          e.preventDefault();
          setVolumeOpen(false);
          return;
        }
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          const buttons = Array.from(
            menu.current?.querySelectorAll("button") ?? [],
          );
          const active = buttons.indexOf(
            document.activeElement as HTMLButtonElement,
          );
          buttons[
            (active + (e.key === "ArrowDown" ? 1 : -1) + buttons.length) %
              buttons.length
          ]?.focus();
        }
      }}
    >
      {volumeOpen ? (
        <>
          <button role="menuitem" onClick={() => setVolumeOpen(false)}>
            <ChevronLeft size={15} />
            Set volume
          </button>
          {[0, 25, 50, 75, 100].map((value) => (
            <button
              key={value}
              role="menuitemradio"
              aria-checked={
                (clip.muted ? 0 : (clip.volume ?? 1) * 100) === value
              }
              onClick={() => {
                onVolume(value / 100);
                onClose();
              }}
            >
              <span style={{ width: 15 }}>
                {(clip.muted ? 0 : (clip.volume ?? 1) * 100) === value && (
                  <Check size={14} />
                )}
              </span>
              {value === 0 ? "Mute" : `${value}%`}
            </button>
          ))}
        </>
      ) : (
        <>
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
          {hasAudio && (
            <button
              role="menuitem"
              aria-haspopup="menu"
              onClick={() => setVolumeOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") {
                  e.preventDefault();
                  setVolumeOpen(true);
                }
              }}
            >
              <Volume2 size={15} />
              Set volume
              <ChevronRight size={14} style={{ marginLeft: "auto" }} />
            </button>
          )}
        </>
      )}
    </div>
  );
}
