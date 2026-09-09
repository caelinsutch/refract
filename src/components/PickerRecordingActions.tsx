import { recordingCompletion } from "../core/recording-completion";
import { useRef, useState, type Ref } from "react";
import { CircleDot, ChevronDown } from "lucide-react";
import * as sx from "@stylexjs/stylex";
const styles = sx.create({
  actions: {
    display: "flex",
    alignItems: "stretch",
    width: "max-content",
    marginInline: "auto",
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
export function PickerRecordingActions({
  buttonRef,
  onRecord,
  kind,
}: {
  buttonRef: Ref<HTMLButtonElement>;
  onRecord: () => void;
  kind: "display" | "window";
}) {
  const api =
    kind === "window"
      ? window.refract?.windowPickerOptions
      : window.refract?.displayPickerOptions;
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuError, setMenuError] = useState("");
  const menuBusy = useRef(false);
  async function showOptions(element: HTMLButtonElement) {
    if (menuBusy.current || !api) return;
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
      const result = await api({
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
  return (
    <>
      <div
        data-picker-actions
        {...sx.props(styles.actions)}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={buttonRef}
          {...sx.props(styles.start, styles.main)}
          onClick={onRecord}
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
    </>
  );
}
