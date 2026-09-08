import * as sx from "@stylexjs/stylex";
import { useId, type ReactNode } from "react";
const s = sx.create({
  button: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 0,
    borderRadius: "var(--radius-control)",
    backgroundColor: { default: "transparent", ":hover": "var(--white-a12)" },
    color: "var(--text-secondary)",
    height: 32,
    paddingInline: 8,
    whiteSpace: "nowrap",
  },
  active: { backgroundColor: "var(--white-a24)", color: "var(--white)" },
  primary: {
    backgroundColor: {
      default: "var(--primary)",
      ":hover": "var(--primary-hover)",
    },
    color: "var(--primary-text)",
    paddingInline: 14,
  },
  icon: { width: 28, padding: 0 },
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  field: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 19 },
  label: { color: "var(--text-secondary)", fontSize: 12 },
  value: {
    color: "var(--text-muted)",
    fontVariantNumeric: "tabular-nums",
    fontSize: 11,
  },
  divider: { height: 1, backgroundColor: "var(--white-a0d)", marginBlock: 18 },
  note: { fontSize: 11, color: "var(--text-subtle)", lineHeight: 1.6 },
  heading: {
    fontWeight: 600,
    fontSize: 13,
    color: "var(--text-primary)",
    marginBlock: "0 16px",
  },
  toggle: {
    position: "relative",
    flexShrink: 0,
    width: "2.734375em",
    height: "1.5625em",
    padding: 0,
    borderWidth: 0,
    borderRadius: 999,
    backgroundColor: {
      default: "var(--white-a1a)",
      ":hover": "var(--white-a26)",
    },
    boxShadow: "inset 0 0 0 1px var(--white-a12)",
    transitionProperty: "background-color",
    transitionDuration: {
      default: "150ms",
      "@media (prefers-reduced-motion: reduce)": "0ms",
    },
  },
  toggleOn: {
    backgroundColor: {
      default: "var(--primary)",
      ":hover": "var(--primary-hover)",
    },
  },
  thumb: {
    position: "absolute",
    top: "0.1953125em",
    left: "0.1953125em",
    width: "1.171875em",
    height: "1.171875em",
    borderRadius: "50%",
    backgroundColor: "var(--white)",
    boxShadow: "0 2px 2px var(--black-a44)",
    transform: "translateX(0)",
    transitionProperty: "transform",
    transitionTimingFunction: "cubic-bezier(0.2, 0.8, 0.2, 1)",
    transitionDuration: {
      default: "150ms",
      "@media (prefers-reduced-motion: reduce)": "0ms",
    },
    pointerEvents: "none",
  },
  thumbOn: { transform: "translateX(1.171875em)" },
});
export function Button({
  children,
  onClick,
  title,
  active = false,
  primary = false,
  defaultAction = false,
  disabled = false,
  icon = false,
  "aria-expanded": expanded,
  "aria-pressed": pressed,
}: {
  children: ReactNode;
  onClick?: () => void;
  title?: string;
  active?: boolean;
  primary?: boolean;
  defaultAction?: boolean;
  disabled?: boolean;
  icon?: boolean;
  "aria-expanded"?: boolean;
  "aria-pressed"?: boolean;
}) {
  return (
    <button
      type="button"
      data-dialog-default={defaultAction || undefined}
      {...sx.props(
        s.button,
        active && s.active,
        primary && s.primary,
        icon && s.icon,
      )}
      onClick={onClick}
      aria-label={title}
      aria-expanded={expanded}
      aria-pressed={pressed}
      data-active={active || undefined}
      title={title}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
export function Range({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  unit = "",
  resetValue,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  resetValue?: number;
}) {
  return (
    <div {...sx.props(s.field)}>
      <span {...sx.props(s.row)}>
        <span {...sx.props(s.label)}>{label}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {resetValue !== undefined && (
            <button
              type="button"
              aria-label={`Reset ${label}`}
              title={`Reset to ${resetValue}${unit}`}
              onClick={() => onChange(resetValue)}
              style={{
                alignSelf: "flex-end",
                border: 0,
                background: "transparent",
                color: "var(--white-a66)",
                padding: 0,
                fontSize: 10,
              }}
            >
              Reset
            </button>
          )}
          <span {...sx.props(s.value)}>
            {Number(value.toFixed(2))}
            {unit}
          </span>
        </span>
      </span>
      <input
        aria-label={label}
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
export function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const id = useId();
  return (
    <div {...sx.props(s.row)} style={{ marginBottom: 16 }}>
      <label htmlFor={id}>{label}</label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-label={label}
        aria-checked={value}
        {...sx.props(s.toggle, value && s.toggleOn)}
        onClick={() => onChange(!value)}
      >
        <span {...sx.props(s.thumb, value && s.thumbOn)} />
      </button>
    </div>
  );
}
export function Row({ children }: { children: ReactNode }) {
  return <div {...sx.props(s.row)}>{children}</div>;
}
export function Divider() {
  return <div {...sx.props(s.divider)} />;
}
export function Note({ children }: { children: ReactNode }) {
  return <p {...sx.props(s.note)}>{children}</p>;
}
export function Heading({ children }: { children: ReactNode }) {
  return <h3 {...sx.props(s.heading)}>{children}</h3>;
}
