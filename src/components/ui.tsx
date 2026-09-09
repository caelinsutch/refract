import * as sx from "@stylexjs/stylex";
import {
  useId,
  useRef,
  useState,
  useCallback,
  type ReactNode,
  type CSSProperties,
} from "react";
const s = sx.create({
  button: {
    minWidth: 0,
    maxWidth: "100%",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 0,
    borderRadius: "var(--radius-control)",
    backgroundColor: "transparent",
    color: "var(--text-secondary)",
    height: 32,
    paddingInline: "var(--control-padding)",
    letterSpacing: "var(--tracking-control)",
    lineHeight: "var(--line-control)",
    whiteSpace: "nowrap",
  },
  active: { backgroundColor: "var(--white-a24)", color: "var(--text-primary)" },
  primary: {
    backgroundColor: "var(--primary)",
    color: "var(--primary-text)",
    paddingInline: 14,
  },
  icon: { width: 28, padding: 0 },
  toolbar: { width: 46, height: 38, paddingInline: 12, flexShrink: 0 },
  toolbarWide: { width: 56, height: 38, paddingInline: 12, flexShrink: 0 },
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  field: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 19 },
  sliderRow: { display: "flex", alignItems: "center", gap: 8, minWidth: 0 },
  reset: {
    height: 38,
    flexShrink: 0,
    paddingInline: 12,
    borderWidth: 0,
    borderRadius: "var(--radius-control)",
    color: "var(--text-secondary)",
    backgroundColor: "transparent",
    letterSpacing: "var(--tracking-control)",
    lineHeight: "var(--line-control)",
  },
  label: { color: "var(--text-primary)", fontSize: 13 },
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
    backgroundColor: "var(--white-a1a)",
    boxShadow: "inset 0 0 0 1px var(--white-a12)",
    transitionProperty: "background-color",
    transitionDuration: {
      default: "150ms",
      "@media (prefers-reduced-motion: reduce)": "0ms",
    },
  },
  toggleOn: {
    backgroundColor: "var(--primary)",
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
  size = "small",
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
  size?: "small" | "toolbar" | "toolbarWide";
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
        size === "toolbar" && s.toolbar,
        size === "toolbarWide" && s.toolbarWide,
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
  const [draft, setDraft] = useState<string | null>(null);
  const active = useRef(false);
  const readout = useRef<HTMLButtonElement>(null);
  const focusInput = useCallback((node: HTMLInputElement | null) => {
    if (node) {
      node.focus({ preventScroll: true });
      node.select();
    }
  }, []);
  const finish = (commit: boolean, restoreFocus = false) => {
    if (!active.current) return;
    active.current = false;
    const next = draft?.trim() ? Number(draft) : NaN;
    if (commit && Number.isFinite(next)) {
      const clamped = Math.max(min, Math.min(max, next));
      if (clamped !== value) onChange(clamped);
    }
    setDraft(null);
    if (restoreFocus)
      requestAnimationFrame(() =>
        readout.current?.focus({ preventScroll: true }),
      );
  };
  return (
    <div data-setting-field {...sx.props(s.field)}>
      <span {...sx.props(s.label)}>{label}</span>
      <div data-setting-slider-row {...sx.props(s.sliderRow)}>
        <div
          data-setting-slider-control
          style={
            {
              "--slider-fraction":
                max > min
                  ? Math.max(0, Math.min(1, (value - min) / (max - min)))
                  : 0,
            } as CSSProperties
          }
        >
          <input
            data-setting-slider
            aria-label={label}
            type="range"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(e) => onChange(Number(e.target.value))}
            onKeyDown={(event) => {
              if (
                !["ArrowLeft", "ArrowDown", "ArrowRight", "ArrowUp"].includes(
                  event.key,
                )
              )
                return;
              event.preventDefault();
              event.stopPropagation();
              const direction =
                event.key === "ArrowLeft" || event.key === "ArrowDown" ? -1 : 1;
              const increment = Math.max(step, (max - min) / 100);
              const snapped =
                min +
                Math.round((value + direction * increment - min) / step) * step;
              onChange(
                Number(Math.max(min, Math.min(max, snapped)).toPrecision(12)),
              );
            }}
          />
          <span data-setting-value>
            {draft === null ? (
              <button
                ref={readout}
                type="button"
                aria-label={`Edit ${label}`}
                title={`Enter ${label.toLowerCase()}`}
                {...sx.props(s.value)}
                style={{
                  background: "transparent",
                  border: 0,
                  padding: "2px 4px",
                  fontVariantNumeric: "tabular-nums",
                }}
                onClick={() => {
                  active.current = true;
                  setDraft(String(value));
                }}
              >
                {Number(value.toFixed(2))}
                {unit}
              </button>
            ) : (
              <input
                ref={focusInput}
                aria-label={`${label} value`}
                type="text"
                inputMode="decimal"
                value={draft}
                style={{
                  width: 68,
                  textAlign: "right",
                  padding: "2px 4px",
                  fontVariantNumeric: "tabular-nums",
                }}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => finish(true)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.nativeEvent.isComposing) return;
                  if (e.key === "Enter" || e.key === "Escape") {
                    e.preventDefault();
                    finish(e.key === "Enter", true);
                  }
                }}
              />
            )}
          </span>
        </div>
        {resetValue !== undefined && (
          <button
            type="button"
            aria-label={`Reset ${label}`}
            title={`Reset to ${resetValue}${unit}`}
            disabled={value === resetValue}
            onClick={() => onChange(resetValue)}
            {...sx.props(s.reset)}
          >
            Reset
          </button>
        )}
      </div>
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
