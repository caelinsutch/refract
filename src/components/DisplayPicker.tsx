import { PickerRecordingActions } from "./PickerRecordingActions";
import { useEffect, useRef } from "react";
import * as sx from "@stylexjs/stylex";
const styles = sx.create({
  cover: {
    width: "100vw",
    height: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0006",
    backgroundImage: {
      default: "linear-gradient(#0006,#0006)",
      ":hover":
        "linear-gradient(var(--display-picker-cover),var(--display-picker-cover))",
    },
    color: "white",
  },
  selected: {
    backgroundImage:
      "linear-gradient(var(--display-picker-cover),var(--display-picker-cover))",
  },
  info: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    maxWidth: 320,
    textAlign: "center",
    textShadow: "1px 1px 2px #000b",
  },
  title: { fontSize: 32, fontWeight: 500, lineHeight: 1.2, margin: 0 },
  meta: { fontSize: 13, lineHeight: 1.4, marginTop: 4 },
});
export function DisplayPicker() {
  const query = new URLSearchParams(location.search);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (query.get("selected") === "true")
      button.current?.focus({ preventScroll: true });
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        void window.refract?.displayPickerFinish(false);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  return (
    <main
      {...sx.props(
        styles.cover,
        query.get("selected") === "true" && styles.selected,
      )}
      aria-label="Choose a display to record"
      onClick={(event) => {
        if (event.target === event.currentTarget)
          button.current?.focus({ preventScroll: true });
      }}
    >
      <div {...sx.props(styles.info)}>
        <h1 {...sx.props(styles.title)}>{query.get("name") || "Display"}</h1>
        <div {...sx.props(styles.meta)}>
          {query.get("width")} × {query.get("height")} • {query.get("fps")} FPS
        </div>
        <PickerRecordingActions
          buttonRef={button}
          kind="display"
          onRecord={() => void window.refract?.displayPickerFinish(true)}
        />
      </div>
    </main>
  );
}
