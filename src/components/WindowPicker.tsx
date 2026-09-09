import { useEffect, useRef, useState } from "react";
import type { WindowPickerState } from "../core/recorder";
import { windowAtPoint } from "../core/window-picker";
export function WindowPicker() {
  const [state, setState] = useState<WindowPickerState | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const start = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const off = window.refract?.onWindowPickerState(setState);
    void window.refract?.windowPickerState().then(setState);
    return () => off?.();
  }, []);
  useEffect(() => {
    if (state?.selected !== null) start.current?.focus({ preventScroll: true });
  }, [state?.selected]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        void window.refract?.windowPickerFinish("cancel");
      }
      if (event.key === "Tab" && state?.windows.length) {
        event.preventDefault();
        const index = state.windows.findIndex(
          (source) => source.id === state.selected,
        );
        const next =
          (index + (event.shiftKey ? -1 : 1) + state.windows.length) %
          state.windows.length;
        void window.refract?.windowPickerSelect(state.windows[next].id);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [state]);
  if (!state) return null;
  const target = state.windows.find(
    (source) => source.id === (state.selected ?? hover),
  );
  const r = target?.bounds;
  return (
    <main
      className="window-picker"
      aria-label="Choose a window to record"
      onPointerMove={(event) =>
        setHover(
          windowAtPoint(
            state.windows,
            event.clientX + state.bounds.x,
            event.clientY + state.bounds.y,
          )?.id ?? null,
        )
      }
      onPointerLeave={() => setHover(null)}
      onClick={(event) => {
        const source = windowAtPoint(
          state.windows,
          event.clientX + state.bounds.x,
          event.clientY + state.bounds.y,
        );
        void window.refract?.windowPickerSelect(source?.id ?? null);
      }}
    >
      {target && r ? (
        <section
          className={`window-picker-highlight ${state.selected === target.id ? "selected" : ""}`}
          style={{
            left: r.x - state.bounds.x,
            top: r.y - state.bounds.y,
            width: r.width,
            height: r.height,
          }}
          aria-label={target.name}
        >
          <div className="window-picker-info">
            <h1>{target.app || target.name}</h1>
            <p>
              {Math.round(r.width)} × {Math.round(r.height)}
              {target.app && target.name !== target.app
                ? ` · ${target.name}`
                : ""}
            </p>
            {state.selected === target.id && (
              <button
                ref={start}
                onClick={(event) => {
                  event.stopPropagation();
                  void window.refract?.windowPickerFinish("record");
                }}
              >
                Start recording
              </button>
            )}
          </div>
        </section>
      ) : null}
      {state.windows.length === 0 && (
        <div className="window-picker-empty">
          <h1>No windows to select</h1>
          <button
            onClick={(event) => {
              event.stopPropagation();
              void window.refract?.windowPickerFinish("display");
            }}
          >
            Record entire display
          </button>
        </div>
      )}
    </main>
  );
}
