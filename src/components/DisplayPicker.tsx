import { recordingCompletion } from "../core/recording-completion";
import { useEffect, useRef, useState } from "react";
import { CircleDot, ChevronDown } from "lucide-react";
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
  actions: {
    display: "flex",
    alignItems: "stretch",
    marginTop: 16,
    borderRadius: 6,
    backgroundColor: "var(--primary)",
  },
  menu: {
    paddingInline: 10,
    borderLeftWidth: 1,
    borderLeftStyle: "solid",
    borderLeftColor: "#ffffff20",
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  main: { borderTopRightRadius: 0, borderBottomRightRadius: 0 },
  start: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    height: 40,
    paddingInline: 16,
    borderWidth: 0,
    borderRadius: 6,
    backgroundColor: "var(--primary)",
    color: "var(--primary-text)",
    fontSize: 13,
  },
});
export function DisplayPicker() {
  const query = new URLSearchParams(location.search);
  const button = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuError, setMenuError] = useState("");
  const menuBusy = useRef(false);
  async function showOptions(element: HTMLButtonElement) {
    if (menuBusy.current || !window.refract?.displayPickerOptions) return;
    menuBusy.current = true;
    setMenuOpen(true);
    setMenuError("");
    try {
      const completion = recordingCompletion(
        JSON.parse(
          localStorage.getItem("refract.recorder.completion") ?? "null",
        ),
      );
      const rect = element.getBoundingClientRect();
      const result = await window.refract.displayPickerOptions({
        automaticZooms:
          localStorage.getItem("refract.recorder.automaticZooms") !== "false",
        completionAction: completion.action,
        x: rect.left,
        y: rect.bottom + 4,
      });
      if (result?.completionAction)
        localStorage.setItem(
          "refract.recorder.completion",
          JSON.stringify({ ...completion, action: result.completionAction }),
        );
      if (typeof result?.automaticZooms === "boolean")
        localStorage.setItem(
          "refract.recorder.automaticZooms",
          String(result.automaticZooms),
        );
    } catch {
      setMenuError("Recording options could not be opened. Please try again.");
    } finally {
      menuBusy.current = false;
      setMenuOpen(false);
      element.focus();
    }
  }
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
        <div {...sx.props(styles.actions)}>
          <button
            ref={button}
            {...sx.props(styles.start, styles.main)}
            onClick={() => void window.refract?.displayPickerFinish(true)}
          >
            <CircleDot size={16} />
            Start recording
          </button>
          <button
            {...sx.props(styles.start, styles.menu)}
            aria-label="Recording options"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={(event) => void showOptions(event.currentTarget)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                void showOptions(event.currentTarget);
              }
            }}
          >
            <ChevronDown size={13} />
          </button>
        </div>
        {menuError && <p role="alert">{menuError}</p>}
      </div>
    </main>
  );
}
