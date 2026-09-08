import * as sx from "@stylexjs/stylex";
import type { ReactNode } from "react";
const s = sx.create({
  button: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 0,
    borderRadius: 5,
    backgroundColor: { default: "transparent", ":hover": "#ffffff12" },
    color: "#c8c6d1",
    height: 32,
    paddingInline: 8,
    whiteSpace: "nowrap",
  },
  active: { backgroundColor: "#ffffff24", color: "#ffffff" },
  primary: {
    backgroundColor: { default: "#4d2ff5", ":hover": "#6044ff" },
    color: "white",
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
  label: { color: "#cbc9d3", fontSize: 12 },
  value: { color: "#a6a2b2", fontVariantNumeric: "tabular-nums", fontSize: 11 },
  divider: { height: 1, backgroundColor: "#ffffff0d", marginBlock: 18 },
  note: { fontSize: 11, color: "#8a8797", lineHeight: 1.6 },
  heading: {
    fontWeight: 600,
    fontSize: 13,
    color: "#eceaf1",
    marginBlock: "0 16px",
  },
});
export function Button({
  children,
  onClick,
  title,
  active = false,
  primary = false,
  disabled = false,
  icon = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  title?: string;
  active?: boolean;
  primary?: boolean;
  disabled?: boolean;
  icon?: boolean;
}) {
  return (
    <button
      {...sx.props(
        s.button,
        active && s.active,
        primary && s.primary,
        icon && s.icon,
      )}
      onClick={onClick}
      aria-label={title}
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
                color: "#ffffff66",
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
  return (
    <label {...sx.props(s.row)} style={{ marginBottom: 16 }}>
      <span>{label}</span>
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
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
