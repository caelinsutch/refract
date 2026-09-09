import { useId, useState, type ReactNode } from "react";
import * as sx from "@stylexjs/stylex";
import { ChevronDown } from "lucide-react";
const s = sx.create({
  root: { display: "flex", flexDirection: "column", gap: 1 },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 2,
    width: "100%",
    minHeight: 32,
    padding: 0,
    borderWidth: 0,
    backgroundColor: "transparent",
    color: "var(--text-primary)",
    fontSize: 13,
    fontWeight: 449,
    textAlign: "left",
  },
  label: { flex: 1 },
  toggle: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 32,
    flexShrink: 0,
    borderRadius: "var(--radius-control)",
  },
  chevron: {
    display: "flex",
    transitionProperty: "transform",
    transitionDuration: {
      default: "200ms",
      "@media (prefers-reduced-motion: reduce)": "0ms",
    },
    transform: "rotate(0deg)",
  },
  expanded: { transform: "rotate(180deg)" },
});
export function Disclosure({
  label,
  children,
  defaultOpen = false,
}: {
  label: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen),
    id = useId();
  return (
    <div {...sx.props(s.root)}>
      <button
        type="button"
        data-disclosure-header
        aria-expanded={open}
        aria-controls={id}
        {...sx.props(s.header)}
        onClick={() => setOpen((value) => !value)}
      >
        <span {...sx.props(s.label)}>{label}</span>
        <span aria-hidden="true" data-disclosure-toggle {...sx.props(s.toggle)}>
          <span {...sx.props(s.chevron, open && s.expanded)}>
            <ChevronDown size={13} />
          </span>
        </span>
      </button>
      <div id={id} hidden={!open}>
        {open ? children : null}
      </div>
    </div>
  );
}
