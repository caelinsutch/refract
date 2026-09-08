import { useRef, useState } from "react";
import * as sx from "@stylexjs/stylex";
import { Layers, ChevronDown, ZoomIn, Scan } from "lucide-react";
import { Button } from "./ui";
export type TimelineTracks = { zoom: boolean; mask: boolean };
const s = sx.create({
  root: { position: "relative", flexShrink: 0 },
  menu: {
    position: "fixed",
    inset: "auto",
    margin: 0,
    width: 220,
    padding: 6,
    borderRadius: 9,
    backgroundColor: "#25272e",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#ffffff20",
    boxShadow: "0 8px 30px #0008",
    zIndex: 20,
  },
  item: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "9px 8px",
    borderRadius: 5,
    color: "#e1e1e8",
    fontSize: 12,
    backgroundColor: { default: "transparent", ":hover": "#ffffff12" },
    cursor: "pointer",
  },
});
export function TimelineVisibility({
  tracks,
  onChange,
}: {
  tracks: TimelineTracks;
  onChange: (tracks: TimelineTracks) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const toggle = () => {
    const node = menu.current,
      anchor = root.current;
    if (!node || !anchor) return;
    if (open) {
      node.hidePopover();
      return;
    }
    const rect = anchor.getBoundingClientRect();
    node.style.left = `${Math.min(rect.left, window.innerWidth - 232)}px`;
    node.style.bottom = `${window.innerHeight - rect.top + 6}px`;
    node.showPopover();
  };
  const count = Number(tracks.zoom) + Number(tracks.mask);
  return (
    <div ref={root} {...sx.props(s.root)}>
      <Button onClick={toggle} aria-expanded={open} title="Visible timelines">
        <Layers size={14} />
        {count} visible {count === 1 ? "timeline" : "timelines"}
        <ChevronDown size={12} />
      </Button>
      <div
        ref={menu}
        popover="auto"
        onToggle={(e) => setOpen(e.newState === "open")}
        {...sx.props(s.menu)}
        role="group"
        aria-label="Timeline visibility"
      >
        {(
          [
            { id: "zoom", label: "Zooms", key: "1", Icon: ZoomIn },
            { id: "mask", label: "Masks", key: "4", Icon: Scan },
          ] as const
        ).map(({ id, label, key, Icon }) => (
          <label key={id} {...sx.props(s.item)}>
            <Icon size={15} />
            <span style={{ flex: 1 }}>{label}</span>
            <kbd>{key}</kbd>
            <input
              type="checkbox"
              checked={tracks[id]}
              onChange={(e) => onChange({ ...tracks, [id]: e.target.checked })}
            />
          </label>
        ))}
      </div>
    </div>
  );
}
