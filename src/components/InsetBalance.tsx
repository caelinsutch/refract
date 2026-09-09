import { useRef, useState } from "react";
import * as sx from "@stylexjs/stylex";
import { normalizeInsetBalance } from "../core/inset-balance";
import { Button } from "./ui";
const styles = sx.create({
  holder: { padding: 4, borderRadius: 10, backgroundColor: "var(--white-a12)" },
  pad: {
    position: "relative",
    aspectRatio: "16 / 9",
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--white-a20)",
    touchAction: "none",
    backgroundSize: "10% 10%",
    backgroundImage:
      "linear-gradient(to right,var(--white-a12) 1px,transparent 1px),linear-gradient(to bottom,var(--white-a12) 1px,transparent 1px)",
  },
  handle: {
    position: "absolute",
    width: 24,
    height: 24,
    borderRadius: 8,
    transform: "translate(-50%,-50%)",
    backgroundColor: "var(--surface-popover)",
    outline: "1px solid var(--text-primary)",
    boxShadow: "0 0 12px 2px var(--surface-sidebar)",
    pointerEvents: "none",
  },
  guide: {
    fontSize: 11,
    color: "var(--text-muted)",
    textAlign: "center",
    position: "absolute",
    bottom: "100%",
    left: "50%",
    transform: "translateX(-50%)",
    whiteSpace: "nowrap",
    pointerEvents: "none",
    marginBottom: 4,
  },
});
export function InsetBalance({
  value = { x: 0.5, y: 0.5 },
  onChange,
}: {
  value?: { x: number; y: number };
  onChange: (value: { x: number; y: number }) => void;
}) {
  const drag = useRef<{ id: number; initial: typeof value } | null>(null);
  const [active, setActive] = useState(false);
  const update = (element: HTMLDivElement, x: number, y: number) => {
    const r = element.getBoundingClientRect();
    onChange(
      normalizeInsetBalance((x - r.left) / r.width, (y - r.top) / r.height),
    );
  };
  const reset = () => onChange({ x: 0.5, y: 0.5 });
  return (
    <div style={{ position: "relative" }}>
      <div {...sx.props(styles.holder)}>
        <div
          {...sx.props(styles.pad)}
          data-inset-balance
          role="group"
          tabIndex={0}
          aria-label="Inset balance"
          aria-description={`Left ${Math.round(value.x * 100)} percent, top ${Math.round(value.y * 100)} percent. Use arrow keys to adjust; Home resets.`}
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            e.currentTarget.focus();
            e.currentTarget.setPointerCapture(e.pointerId);
            drag.current = { id: e.pointerId, initial: value };
            setActive(true);
            update(e.currentTarget, e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (drag.current?.id === e.pointerId)
              update(e.currentTarget, e.clientX, e.clientY);
          }}
          onPointerUp={(e) => {
            if (drag.current?.id !== e.pointerId) return;
            update(e.currentTarget, e.clientX, e.clientY);
            drag.current = null;
            setActive(false);
            e.currentTarget.releasePointerCapture(e.pointerId);
          }}
          onLostPointerCapture={() => {
            if (drag.current) {
              onChange(drag.current.initial);
              drag.current = null;
              setActive(false);
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            reset();
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape" && drag.current) {
              e.preventDefault();
              e.stopPropagation();
              onChange(drag.current.initial);
              drag.current = null;
              setActive(false);
              return;
            }
            if (e.key === "Home") {
              e.preventDefault();
              reset();
              return;
            }
            if (
              !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
                e.key,
              )
            )
              return;
            e.preventDefault();
            e.stopPropagation();
            const step = e.shiftKey ? 0.1 : 0.01;
            onChange(
              normalizeInsetBalance(
                value.x +
                  (e.key === "ArrowLeft"
                    ? -step
                    : e.key === "ArrowRight"
                      ? step
                      : 0),
                value.y +
                  (e.key === "ArrowUp"
                    ? -step
                    : e.key === "ArrowDown"
                      ? step
                      : 0),
              ),
            );
          }}
        >
          <span
            {...sx.props(styles.handle)}
            style={{ left: `${value.x * 100}%`, top: `${value.y * 100}%` }}
          />
        </div>
      </div>
      {active && (
        <div {...sx.props(styles.guide)}>
          Left: {Math.round(value.x * 100)}% — Top: {Math.round(value.y * 100)}%
        </div>
      )}
      <Button title="Reset inset balance" onClick={reset}>
        Reset
      </Button>
    </div>
  );
}
