import { RecorderSymbol, RecorderSymbols } from "./components/RecorderSymbol";
import { recordingCompletion } from "./core/recording-completion";
import { captureAreaBetween } from "./core/capture-area";
import { StateIcon } from "./components/StateIcon";
import {
  useEffect,
  useState,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import * as sx from "@stylexjs/stylex";
import {
  Monitor,
  AppWindow,
  Scan,
  Smartphone,
  VideoOff,
  Video,
  MicOff,
  Mic,
  Volume2,
  VolumeX,
  ChevronDown,
  X,
  Settings2,
  FolderOpen,
  Pause,
  Play,
  Square,
  LoaderCircle,
  ArrowUpRight,
  Check,
  RefreshCw,
  Keyboard,
  KeyboardOff,
} from "lucide-react";
import type {
  CaptureSources,
  CaptureChoice,
  RecorderState,
  RecorderInputMenu,
  RecorderSourceSelection,
} from "./core/recorder";
import { formatTime } from "./core/project";
const s = sx.create({
  root: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
    alignItems: "center",
    padding: 0,
    color: "var(--text-primary)",
  },
  bar: {
    height: 64,
    width: "100%",
    display: "flex",
    alignItems: "center",
    paddingInline: 10,
    gap: 8,
    borderRadius: 19,
    backgroundColor: "var(--surface-recorder)",
    backgroundImage:
      "linear-gradient(140deg,var(--white-a13),var(--white-a00) 65%)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--white-a2d)",
    boxShadow: "inset 0 1px 0 var(--white-a16),0 8px 22px var(--black-a44)",
    backdropFilter: "blur(26px) saturate(1.4)",
    flexShrink: 0,
  },
  mode: {
    height: 50,
    width: 56,
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 6.7,
    padding: 0,
    borderWidth: 0,
    borderRadius: "var(--radius-item)",
    backgroundColor: { default: "transparent", ":hover": "var(--white-a13)" },
    color: "var(--text-secondary)",
    fontSize: 10,
  },
  active: { backgroundColor: "var(--white-a17)" },
  modes: { display: "flex", alignItems: "center", gap: 4, flexShrink: 0 },
  inputs: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    flex: 1,
    minWidth: 0,
  },
  modeLabel: { lineHeight: 1, marginBottom: -2 },
  cameraChoice: { width: 126 },
  microphoneChoice: { width: 146 },
  inputLabel: { minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" },
  inputInactive: {
    color: {
      default: "color-mix(in srgb, var(--text-primary) 50%, transparent)",
      ":hover": "var(--text-primary)",
    },
  },
  choice: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 40,
    paddingInline: 14,
    flexShrink: 0,
    borderWidth: 0,
    borderRadius: "var(--radius-item)",
    backgroundColor: { default: "transparent", ":hover": "var(--white-a13)" },
    color: "var(--text-primary)",
    fontSize: 13,
    whiteSpace: "nowrap",
  },
  close: {
    width: 24,
    height: 24,
    marginInline: 7,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0,
    borderRadius: "50%",
    backgroundColor: {
      default: "var(--close-control)",
      ":hover": "var(--close-control-hover)",
    },
    color: "var(--text-inverse)",
  },
  recorderClose: {
    marginInline: 8,
    backgroundColor: { default: "transparent", ":hover": "transparent" },
    color: "var(--text-muted)",
  },
  line: {
    width: 1,
    flexShrink: 0,
    alignSelf: "stretch",
    backgroundColor: "var(--white-a0b)",
    marginBlock: 10,
  },
  panel: {
    width: 460,
    maxHeight: 320,
    overflowY: "auto",
    marginBottom: 11,
    padding: 15,
    borderRadius: 17,
    backgroundColor: "var(--surface-recorder-panel)",
    backgroundImage:
      "linear-gradient(135deg,var(--white-a09),var(--white-a00))",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--white-a25)",
    boxShadow: "0 8px 25px var(--black-a55)",
    backdropFilter: "blur(25px)",
  },
  heading: {
    fontSize: 13,
    fontWeight: 600,
    margin: "0 0 12px",
    color: "var(--text-primary)",
  },
  item: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 13,
    textAlign: "left",
    padding: 11,
    borderWidth: 0,
    borderRadius: "var(--radius-item)",
    color: "var(--text-secondary)",
    backgroundColor: { default: "transparent", ":hover": "var(--white-a0d)" },
  },
  itemTitle: {
    fontSize: 12,
    fontWeight: 500,
    display: "block",
    marginBottom: 3,
  },
  itemDetail: { fontSize: 10, color: "var(--text-subtle)", display: "block" },
  text: {
    color: "var(--text-muted)",
    lineHeight: 1.6,
    fontSize: 12,
    marginBlock: 10,
  },
  primary: {
    padding: "9px 13px",
    backgroundColor: {
      default: "var(--primary)",
      ":hover": "var(--primary-hover)",
    },
    borderWidth: 0,
    borderRadius: 9,
    color: "var(--primary-text)",
    fontWeight: 500,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    backgroundColor: "var(--recording)",
    borderRadius: "50%",
    boxShadow: "0 0 13px var(--recording-glow)",
  },
  elapsed: {
    fontVariantNumeric: "tabular-nums",
    fontSize: 15,
    fontWeight: 500,
    marginInline: 12,
    minWidth: 75,
  },
  stop: {
    width: 39,
    height: 39,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: { default: "var(--stop)", ":hover": "var(--stop-hover)" },
    borderWidth: 0,
    borderRadius: "var(--radius-dialog)",
    color: "var(--white)",
  },
  status: {
    display: "flex",
    gap: 13,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  count: {
    fontSize: 22,
    color: "var(--text-primary)",
    fontVariantNumeric: "tabular-nums",
    width: 40,
    textAlign: "center",
  },
  hint: { fontSize: 11, color: "var(--text-muted)" },
  area: {
    position: "fixed",
    inset: 0,
    cursor: "crosshair",
    backgroundColor: "var(--black-a22)",
  },
  rect: (x: number, y: number, width: number, height: number) => ({
    position: "absolute",
    left: x,
    top: y,
    width,
    height,
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: "var(--white)",
    boxShadow: "0 0 0 9999px var(--black-a66)",
    backgroundColor: "var(--white-a03)",
    borderRadius: "var(--radius-control)",
  }),
  areaHint: {
    position: "absolute",
    top: 30,
    left: "50%",
    transform: "translateX(-50%)",
    padding: "12px 19px",
    backgroundColor: "var(--surface-area-hint)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--white-a27)",
    borderRadius: "var(--radius-dialog)",
    color: "var(--text-primary)",
    fontSize: 13,
  },
  size: {
    position: "absolute",
    bottom: -31,
    left: "50%",
    transform: "translateX(-50%)",
    fontVariantNumeric: "tabular-nums",
    fontSize: 12,
    whiteSpace: "nowrap",
    padding: "4px 8px",
    backgroundColor: "var(--surface-area-label)",
    borderRadius: "var(--radius-control)",
  },
});
export function AreaPicker() {
  const [rect, setRect] = useState({ x: 0, y: 0, width: 0, height: 0 }),
    origin = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") void window.refract?.recorderAreaSelected(null);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  return (
    <div
      {...sx.props(s.area)}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        origin.current = { x: e.clientX, y: e.clientY };
        setRect({ x: e.clientX, y: e.clientY, width: 0, height: 0 });
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        const start = origin.current;
        if (start)
          setRect(
            captureAreaBetween(
              start,
              { x: e.clientX, y: e.clientY },
              window.innerWidth,
              window.innerHeight,
            ),
          );
      }}
      onPointerUp={(e) => {
        const start = origin.current;
        origin.current = null;
        if (!start) return;
        const selected = captureAreaBetween(
          start,
          { x: e.clientX, y: e.clientY },
          window.innerWidth,
          window.innerHeight,
        );
        setRect(selected);
        if (selected.width >= 32 && selected.height >= 32)
          void window.refract?.recorderAreaSelected(selected);
      }}
      onPointerCancel={() => {
        origin.current = null;
        setRect({ x: 0, y: 0, width: 0, height: 0 });
      }}
    >
      <div {...sx.props(s.areaHint)}>
        Drag to select an area · Esc to cancel
      </div>
      {rect.width > 0 ? (
        <div {...sx.props(s.rect(rect.x, rect.y, rect.width, rect.height))}>
          <span {...sx.props(s.size)}>
            {Math.round(rect.width)} × {Math.round(rect.height)}
          </span>
        </div>
      ) : null}
    </div>
  );
}
export default function Recorder() {
  const api = window.refract;
  const [symbols, setSymbols] = useState<Record<string, string>>({});
  useEffect(() => {
    let mounted = true;
    void api
      ?.recorderSymbols?.()
      .then((value) => {
        if (mounted) setSymbols(value);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);
  const [completion, setCompletion] = useState(() => {
    try {
      return recordingCompletion(
        JSON.parse(
          localStorage.getItem("refract.recorder.completion") ?? "null",
        ),
      );
    } catch {
      return recordingCompletion(null);
    }
  });
  const updateCompletion = (next: typeof completion) => {
    setCompletion(next);
    try {
      localStorage.setItem("refract.recorder.completion", JSON.stringify(next));
    } catch {
      /* Keep session settings. */
    }
  };
  const [state, setState] = useState<RecorderState>({
      phase: "idle",
      countdown: 3,
      elapsed: 0,
    }),
    [panel, setPanel] = useState<string | null>(null),
    [sources, setSources] = useState<CaptureSources | null>(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [recordingDirectory, setRecordingDirectory] = useState(""),
    [choosingDirectory, setChoosingDirectory] = useState(false),
    [systemAudio, setSystemAudio] = useState(false),
    [automaticZooms, setAutomaticZooms] = useState(() => {
      try {
        return (
          localStorage.getItem("refract.recorder.automaticZooms") !== "false"
        );
      } catch {
        return true;
      }
    }),
    [cameraResolution, setCameraResolution] = useState<720 | 1080 | 2160>(
      () => {
        try {
          const saved = Number(
            localStorage.getItem("refract.recorder.cameraResolution"),
          );
          return saved === 1080 || saved === 2160 ? saved : 720;
        } catch {
          return 720;
        }
      },
    ),
    [microphone, setMicrophone] = useState<string | undefined>(),
    [camera, setCamera] = useState<string | undefined>(),
    [area, setArea] = useState<{
      area: CaptureChoice["area"];
      displayId: number;
    } | null>(null);
  // Display-picker windows share the recorder's persistent preferences.
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === "refract.recorder.automaticZooms")
        setAutomaticZooms(event.newValue !== "false");
      if (event.key === "refract.recorder.completion") {
        try {
          setCompletion(
            recordingCompletion(JSON.parse(event.newValue ?? "null")),
          );
        } catch {
          /* Ignore malformed external preferences. */
        }
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  const areaStartButton = useRef<HTMLButtonElement>(null);
  const [hideDesktopIcons, setHideDesktopIcons] = useState(() => {
    try {
      return (
        localStorage.getItem("refract.recorder.hideDesktopIcons") === "true"
      );
    } catch {
      return false;
    }
  });
  const [countdownSeconds, setCountdownSeconds] = useState<0 | 3 | 5 | 10>(
    () => {
      try {
        const saved = localStorage.getItem("refract.recorder.countdownSeconds");
        const value = saved === null ? 3 : Number(saved);
        return value === 0 || value === 5 || value === 10 ? value : 3;
      } catch {
        return 3;
      }
    },
  );
  const sourceRequest = useRef<Promise<CaptureSources | null> | null>(null);
  const pickerRequest = useRef(0);
  const inputMenuBusy = useRef(false);
  const [sourceMenu, setSourceMenu] = useState<"display" | "window" | null>(
    null,
  );
  const [selectedSource, setSelectedSource] =
    useState<RecorderSourceSelection | null>(null);
  const sourceStartButton = useRef<HTMLButtonElement>(null);
  const panelElement = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = panelElement.current;
    if (!element || !api?.recorderPanelGlass) return;
    let disposed = false;
    const update = () => {
      const { x, y, width, height } = element.getBoundingClientRect();
      void api
        .recorderPanelGlass?.({ x, y, width, height })
        .then((installed) => {
          if (!disposed) element.dataset.nativePanelGlass = String(installed);
        });
    };
    const observer = new ResizeObserver(update);
    observer.observe(element);
    window.addEventListener("resize", update);
    update();
    return () => {
      disposed = true;
      observer.disconnect();
      window.removeEventListener("resize", update);
      void api.recorderPanelGlass?.(null);
    };
  }, [panel, state.phase]);
  useEffect(() => {
    if (panel === "source-ready")
      sourceStartButton.current?.focus({ preventScroll: true });
  }, [panel, selectedSource]);
  const [inputNames, setInputNames] = useState({ camera: "", microphone: "" });
  const [inputMenu, setInputMenu] = useState<RecorderInputMenu["kind"] | null>(
    null,
  );
  useEffect(() => {
    if (panel === "area-ready")
      areaStartButton.current?.focus({ preventScroll: true });
  }, [panel, area]);
  const options = useRef({
    hideDesktopIcons,
    countdownSeconds,
    systemAudio,
    microphone,
    camera,
    automaticZooms,
    completion,
    cameraResolution,
  });
  options.current = {
    hideDesktopIcons,
    countdownSeconds,
    systemAudio,
    microphone,
    camera,
    automaticZooms,
    completion,
    cameraResolution,
  };
  const expand = (next: string | null) => {
    if (
      ["display-picker", "window-picker"].includes(panel ?? "") &&
      next !== panel
    ) {
      pickerRequest.current++;
      void api?.recorderDisplayPickerCancel?.();
      void api?.recorderWindowPickerCancel?.();
    }
    setPanel(next);
    void api?.recorderExpand(Boolean(next));
  };
  const chooseArea = async (displayId: number) => {
    try {
      await api?.recorderArea(displayId);
    } catch (error) {
      setError(String(error));
      expand("error");
    }
  };
  const start = async (
    choice: Omit<CaptureChoice, "systemAudio" | "microphoneId">,
  ) => {
    setError("");
    expand(null);
    try {
      await api?.recorderStart({
        ...choice,
        hideDesktopIcons: options.current.hideDesktopIcons,
        countdownSeconds: options.current.countdownSeconds,
        systemAudio: options.current.systemAudio,
        automaticZooms: options.current.automaticZooms,
        completion: options.current.completion,
        microphoneId: options.current.microphone,
        cameraId: options.current.camera,
        cameraResolution: options.current.cameraResolution,
      });
    } catch (e) {
      setError(String(e));
      expand("error");
    }
  };
  useEffect(() => {
    void api?.recorderState().then((next) => {
      setState(next);
      if (next.phase === "error") {
        setError(next.error ?? "");
        setPanel("error");
      }
    });
    void api
      ?.recorderDirectory()
      .then(setRecordingDirectory)
      .catch(() => {});
    const off = api?.onRecorderState((state) => {
      setState(state);
      if (state.phase === "error") {
        setError(state.error ?? "Recording stopped.");
        setPanel("error");
      }
    });
    const offArea = api?.onAreaSelected((data) => {
      setArea(data);
      setPanel("area-ready");
      void api.recorderExpand(true);
    });
    return () => {
      off?.();
      offArea?.();
    };
  }, []);
  const recoveryAttempt = useRef(0);
  const [recovering, setRecovering] = useState(false);
  useEffect(() => {
    recoveryAttempt.current++;
    setRecovering(false);
  }, [panel]);
  async function recover() {
    if (recovering) return;
    const attempt = ++recoveryAttempt.current;
    setRecovering(true);
    const next = await refresh();
    if (attempt !== recoveryAttempt.current) return;
    setRecovering(false);
    if (!next) return;
    setError("");
    expand(next.permission === "required" ? "permission" : null);
  }
  function refresh(): Promise<CaptureSources | null> {
    if (sourceRequest.current) return sourceRequest.current;
    if (!api) return Promise.resolve(null);
    // Keep the existing controls visible while checking for device changes.
    setLoading(!sources);
    setError("");
    const request = (async () => {
      try {
        const next = await api.recorderSources();
        setSources(next);
        return next;
      } catch (e) {
        setError(String(e));
        return null;
      } finally {
        setLoading(false);
        sourceRequest.current = null;
      }
    })();
    sourceRequest.current = request;
    return request;
  }
  useEffect(() => {
    const onFocus = () => {
      if (!loading && sources?.permission === "required" && panel)
        void refresh();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [panel, sources?.permission, loading]);
  useEffect(() => {
    if (panel === "permission" && sources?.permission === "granted" && !loading)
      expand(null);
  }, [panel, sources?.permission, loading]);
  const pickWindow = async () => {
    if (panel === "window-picker") {
      expand(null);
      return;
    }
    const generation = ++pickerRequest.current;
    setPanel("window-picker");
    try {
      const result = await api?.recorderWindowPicker?.();
      if (generation !== pickerRequest.current) return;
      setPanel(null);
      if (result && "windowId" in result)
        await start({ mode: "window", windowId: result.windowId });
      else if (result && "settings" in result) setPanel("quick-export");
      else if (result)
        await start({ mode: "display", displayId: result.displayId });
    } catch (error) {
      if (generation !== pickerRequest.current) return;
      setError(String(error));
      expand("error");
    }
  };
  const pick = async (mode: string) => {
    if (mode === "window" && api?.recorderWindowPicker) {
      await pickWindow();
      return;
    }
    if (mode === "display" && api?.recorderDisplayPicker) {
      await pickDisplay();
      return;
    }
    if (panel === mode) {
      expand(null);
      return;
    }
    expand(mode);
    if (
      [
        "display",
        "window",
        "area",
        "microphone",
        "camera",
        "settings",
      ].includes(mode)
    )
      await refresh();
  };
  const pickDisplay = async (selectedId?: number) => {
    if (panel === "display-picker" && selectedId === undefined) {
      expand(null);
      return;
    }
    const generation = ++pickerRequest.current;
    setPanel("display-picker");
    try {
      const id = await api?.recorderDisplayPicker?.(selectedId);
      if (generation !== pickerRequest.current) return;
      setPanel(null);
      if (typeof id === "object" && id?.settings === "quick-export") {
        setPanel("quick-export");
        void api?.recorderExpand(true);
      } else if (typeof id === "number")
        await start({ mode: "display", displayId: id });
    } catch (error) {
      if (generation !== pickerRequest.current) return;
      setError(String(error));
      expand("error");
    }
  };
  const pickInput = async (
    kind: RecorderInputMenu["kind"],
    button: HTMLButtonElement,
  ) => {
    if (!api?.recorderInputMenu) {
      await pick(kind);
      return;
    }
    if (inputMenuBusy.current) return;
    inputMenuBusy.current = true;
    setInputMenu(kind);
    try {
      if (panel) {
        if (["display-picker", "window-picker"].includes(panel ?? "")) {
          pickerRequest.current++;
          await api?.recorderDisplayPickerCancel?.();
          await api?.recorderWindowPickerCancel?.();
        }
        setPanel(null);
        await api.recorderExpand(false);
        // Read the anchor after the native window and bottom bar have settled.
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        );
      }
      const rect = button.getBoundingClientRect();
      const selected =
        kind === "audio"
          ? systemAudio
            ? "all"
            : null
          : ((kind === "camera" ? camera : microphone) ?? null);
      const result = await api.recorderInputMenu({
        kind,
        selected,
        cameraResolution,
        countdownSeconds,
        automaticZooms,
        completionAction: completion.action,
        hideDesktopIcons,
        x: rect.left,
        y: rect.top,
      });
      if (!result) return;
      if ("hideDesktopIcons" in result) {
        setHideDesktopIcons(result.hideDesktopIcons);
        try {
          localStorage.setItem(
            "refract.recorder.hideDesktopIcons",
            String(result.hideDesktopIcons),
          );
        } catch {
          /* Keep the session preference. */
        }
        return;
      }
      if ("settings" in result) {
        expand("settings");
        void refresh();
        return;
      }
      if ("countdownSeconds" in result) {
        setCountdownSeconds(result.countdownSeconds);
        try {
          localStorage.setItem(
            "refract.recorder.countdownSeconds",
            String(result.countdownSeconds),
          );
        } catch {
          /* Keep the session preference. */
        }
        return;
      }
      if ("automaticZooms" in result) {
        setAutomaticZooms(result.automaticZooms);
        try {
          localStorage.setItem(
            "refract.recorder.automaticZooms",
            String(result.automaticZooms),
          );
        } catch {
          /* Keep the session preference. */
        }
        return;
      }
      if ("completionAction" in result) {
        updateCompletion({ ...completion, action: result.completionAction });
        return;
      }
      if ("cameraResolution" in result) {
        setCameraResolution(result.cameraResolution);
        try {
          localStorage.setItem(
            "refract.recorder.cameraResolution",
            String(result.cameraResolution),
          );
        } catch {
          /* Retain the current session setting. */
        }
        return;
      }
      if (kind === "audio") setSystemAudio(result.value === "all");
      else {
        setInputNames((names) => ({
          ...names,
          [kind]: result.value ? result.label : "",
        }));
        if (kind === "camera") setCamera(result.value ?? undefined);
        else setMicrophone(result.value ?? undefined);
      }
    } catch (error) {
      setError(String(error));
      expand("error");
    } finally {
      inputMenuBusy.current = false;
      setInputMenu(null);
      button.focus({ preventScroll: true });
    }
  };
  const pickSourceMenu = async (
    kind: "display" | "window",
    button: HTMLButtonElement,
  ) => {
    if (!api?.recorderSourceMenu) {
      await pick(kind);
      return;
    }
    if (inputMenuBusy.current) return;
    inputMenuBusy.current = true;
    setSourceMenu(kind);
    try {
      const rect = button.getBoundingClientRect();
      const selection = await api.recorderSourceMenu({
        kind,
        selected:
          selectedSource?.kind === kind ? selectedSource.source.id : undefined,
        x: rect.left,
        y: rect.bottom,
      });
      if (selection) {
        setSelectedSource(selection);
        if (selection.kind === "display" && api?.recorderDisplayPicker)
          void pickDisplay(selection.source.id);
        else expand("source-ready");
      }
    } catch (error) {
      setError(String(error));
      expand("error");
    } finally {
      inputMenuBusy.current = false;
      setSourceMenu(null);
      button.focus({ preventScroll: true });
    }
  };
  const inputMenuKey = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    kind: RecorderInputMenu["kind"],
  ) => {
    if (
      event.nativeEvent.isComposing ||
      event.repeat ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey
    )
      return;
    if (
      event.key === "ArrowDown" ||
      event.key === "ContextMenu" ||
      (event.key === "F10" && event.shiftKey)
    ) {
      event.preventDefault();
      void pickInput(kind, event.currentTarget);
    }
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (state.phase === "countdown") void api?.recorderStop();
        else if (panel) expand(null);
        else void api?.recorderClose();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [panel, state.phase]);
  const busy = [
    "countdown",
    "starting",
    "recording",
    "paused",
    "stopping",
  ].includes(state.phase);
  const micName =
    sources?.microphones.find((m) => m.id === microphone)?.name ?? "Microphone";
  const quickExportControls = (
    <>
      <label {...sx.props(s.item)}>
        <span>MP4 resolution</span>
        <select
          aria-label="Quick export resolution"
          value={completion.resolution}
          onChange={(e) =>
            updateCompletion({
              ...completion,
              resolution: Number(e.target.value),
            })
          }
        >
          {[720, 1080, 1920, 2560, 3840].map((n) => (
            <option key={n} value={n}>
              {n}px
            </option>
          ))}
        </select>
      </label>
      <label {...sx.props(s.item)}>
        <span>Frame rate</span>
        <select
          aria-label="Quick export frame rate"
          value={completion.fps}
          onChange={(e) =>
            updateCompletion({
              ...completion,
              fps: Number(e.target.value),
            })
          }
        >
          {[24, 30, 60].map((n) => (
            <option key={n} value={n}>
              {n} fps
            </option>
          ))}
        </select>
      </label>
    </>
  );
  return (
    <RecorderSymbols.Provider value={symbols}>
      <div {...sx.props(s.root)}>
        {panel &&
        !["display-picker", "window-picker"].includes(panel) &&
        !busy ? (
          <section
            ref={panelElement}
            {...sx.props(s.panel)}
            data-floating-surface="recorder"
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h2 {...sx.props(s.heading)}>
                {
                  (
                    {
                      display: "Record a display",
                      window: "Record a window",
                      area: "Record an area",
                      "area-ready": "Your recording area",
                      "source-ready": "Ready to record",
                      microphone: "Microphone",
                      audio: "System audio",
                      camera: "Camera",
                      device: "Connected device",
                      settings: "Recording",
                      "quick-export": "Quick export settings",
                      error: "Recording needs attention",
                      permission: "Screen recording access",
                    } as Record<string, string>
                  )[panel]
                }
              </h2>
              <button
                aria-label="Close options"
                {...sx.props(s.close)}
                onClick={() => expand(null)}
              >
                <X size={14} />
              </button>
            </div>
            {panel === "source-ready" && selectedSource ? (
              <>
                <p {...sx.props(s.itemTitle)}>{selectedSource.source.name}</p>
                <p {...sx.props(s.text)}>
                  {selectedSource.source.app
                    ? `${selectedSource.source.app} · `
                    : ""}
                  {selectedSource.source.width} × {selectedSource.source.height}
                </p>
                <button
                  ref={sourceStartButton}
                  {...sx.props(s.primary)}
                  onClick={() =>
                    void start(
                      selectedSource.kind === "display"
                        ? {
                            mode: "display",
                            displayId: selectedSource.source.id,
                          }
                        : {
                            mode: "window",
                            windowId: selectedSource.source.id,
                          },
                    )
                  }
                >
                  <span {...sx.props(s.indicator)} /> Record{" "}
                  {selectedSource.kind}
                </button>
              </>
            ) : loading ? (
              <p {...sx.props(s.text)}>Finding available sources…</p>
            ) : error || panel === "error" ? (
              <>
                <p {...sx.props(s.text)} role="alert">
                  {error ||
                    state.error ||
                    "Recording could not start. Close this message and select a recording source to try again."}
                </p>
                <button
                  {...sx.props(s.primary)}
                  autoFocus
                  disabled={recovering}
                  onClick={() => void recover()}
                >
                  <RefreshCw size={13} />
                  {recovering ? "Checking…" : "Check again"}
                </button>
              </>
            ) : [
                "display",
                "window",
                "area",
                "microphone",
                "camera",
                "permission",
              ].includes(panel) && sources?.permission === "required" ? (
              <>
                <p {...sx.props(s.text)}>
                  Allow Refract to record your screen in macOS Settings, then
                  refresh the available sources.
                </p>
                <button
                  {...sx.props(s.primary)}
                  disabled={loading}
                  onClick={async () => {
                    setLoading(true);
                    setError("");
                    try {
                      await api?.recorderPermissions();
                      await refresh();
                    } catch (error) {
                      setError(String(error));
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  Allow screen recording
                  <ArrowUpRight size={13} />
                </button>
                <button {...sx.props(s.item)} onClick={refresh}>
                  <RefreshCw size={14} />
                  Refresh sources
                </button>
              </>
            ) : panel === "display" || panel === "area" ? (
              <>
                {sources?.displays.map((d) => (
                  <button
                    key={d.id}
                    {...sx.props(s.item)}
                    onClick={() =>
                      panel === "area"
                        ? chooseArea(d.id)
                        : start({ mode: "display", displayId: d.id })
                    }
                  >
                    <Monitor size={29} strokeWidth={1.2} />
                    <span>
                      <span {...sx.props(s.itemTitle)}>{d.name}</span>
                      <span {...sx.props(s.itemDetail)}>
                        {d.width} × {d.height} ·{" "}
                        {panel === "area"
                          ? "Choose area"
                          : countdownSeconds === 0
                            ? "Click to start recording"
                            : `Click to start a ${countdownSeconds}-second countdown`}
                      </span>
                    </span>
                  </button>
                ))}
              </>
            ) : panel === "window" ? (
              <>
                {sources?.windows.length === 0 ? (
                  <>
                    <p {...sx.props(s.text)}>
                      No app windows are available. Open the window you want to
                      record, then refresh.
                    </p>
                    <button {...sx.props(s.item)} onClick={refresh}>
                      <RefreshCw size={14} /> Refresh windows
                    </button>
                  </>
                ) : null}
                {sources?.windows.map((w) => (
                  <button
                    key={w.id}
                    {...sx.props(s.item)}
                    onClick={() => start({ mode: "window", windowId: w.id })}
                  >
                    <AppWindow size={25} strokeWidth={1.3} />
                    <span style={{ overflow: "hidden" }}>
                      <span
                        {...sx.props(s.itemTitle)}
                        style={{
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {w.name || w.app}
                      </span>
                      <span {...sx.props(s.itemDetail)}>
                        {w.app} · {Math.round(w.width)} × {Math.round(w.height)}
                      </span>
                    </span>
                  </button>
                ))}
              </>
            ) : panel === "area-ready" && area ? (
              <>
                <p {...sx.props(s.text)}>
                  {Math.round(area.area!.width)} ×{" "}
                  {Math.round(area.area!.height)} pixels selected
                </p>
                <button
                  ref={areaStartButton}
                  {...sx.props(s.primary)}
                  onClick={() =>
                    start({
                      mode: "area",
                      displayId: area.displayId,
                      area: area.area,
                    })
                  }
                >
                  Start recording
                </button>
                <button
                  {...sx.props(s.item)}
                  onClick={() => chooseArea(area.displayId)}
                >
                  <Scan size={15} />
                  Choose another area
                </button>
              </>
            ) : panel === "microphone" ? (
              <>
                <button
                  {...sx.props(s.item)}
                  onClick={() => {
                    setMicrophone(undefined);
                    expand(null);
                  }}
                >
                  <MicOff size={17} />
                  No microphone{!microphone ? <Check size={13} /> : null}
                </button>
                {sources?.microphones.map((m) => (
                  <button
                    key={m.id}
                    {...sx.props(s.item)}
                    onClick={() => {
                      setMicrophone(m.id);
                      expand(null);
                    }}
                  >
                    <Mic size={17} />
                    {m.name}
                    {microphone === m.id ? <Check size={13} /> : null}
                  </button>
                ))}
              </>
            ) : panel === "audio" ? (
              <>
                {[false, true].map((v) => (
                  <button
                    key={String(v)}
                    {...sx.props(s.item)}
                    onClick={() => {
                      setSystemAudio(v);
                      expand(null);
                    }}
                  >
                    {v ? <Volume2 size={17} /> : <VolumeX size={17} />}{" "}
                    {v ? "Record all system audio" : "No system audio"}
                    {systemAudio === v ? <Check size={13} /> : null}
                  </button>
                ))}
              </>
            ) : panel === "camera" ? (
              <>
                <button
                  {...sx.props(s.item)}
                  onClick={() => {
                    setCamera(undefined);
                    expand(null);
                  }}
                >
                  <VideoOff size={17} />
                  No camera{!camera ? <Check size={13} /> : null}
                </button>
                {sources?.cameras?.map((c) => (
                  <button
                    key={c.id}
                    {...sx.props(s.item)}
                    onClick={() => {
                      setCamera(c.id);
                      expand(null);
                    }}
                  >
                    <Video size={17} />
                    {c.name}
                    {camera === c.id ? <Check size={13} /> : null}
                  </button>
                ))}
              </>
            ) : panel === "device" ? (
              <p {...sx.props(s.text)}>
                Direct iPhone and iPad capture is not connected yet. To record
                an iPhone Mirroring window, choose Window.
              </p>
            ) : panel === "quick-export" ? (
              <>
                {quickExportControls}
                <p {...sx.props(s.text)}>
                  These settings apply when exporting after recording.
                </p>
                <button
                  {...sx.props(s.primary)}
                  autoFocus
                  onClick={() => expand(null)}
                >
                  Done
                </button>
              </>
            ) : panel === "settings" ? (
              <>
                <label {...sx.props(s.item)}>
                  <span>Recording countdown</span>
                  <select
                    aria-label="Recording countdown"
                    value={countdownSeconds}
                    onChange={(event) => {
                      const value = Number(event.target.value) as
                        0 | 3 | 5 | 10;
                      setCountdownSeconds(value);
                      try {
                        localStorage.setItem(
                          "refract.recorder.countdownSeconds",
                          String(value),
                        );
                      } catch {
                        /* Keep the session preference. */
                      }
                    }}
                  >
                    <option value={0}>No countdown</option>
                    <option value={3}>3s</option>
                    <option value={5}>5s</option>
                    <option value={10}>10s</option>
                  </select>
                </label>
                <label {...sx.props(s.item)}>
                  <span>After recording</span>
                  <select
                    aria-label="After recording"
                    value={completion.action}
                    onChange={(e) =>
                      updateCompletion({
                        ...completion,
                        action: e.target.value as typeof completion.action,
                      })
                    }
                  >
                    <option value="create-project">Create project</option>
                    <option value="export-file">Export and save to file</option>
                  </select>
                </label>
                {completion.action === "export-file" && quickExportControls}
                <button
                  {...sx.props(s.item)}
                  disabled={choosingDirectory}
                  title={recordingDirectory || "Change recording directory"}
                  onClick={async () => {
                    setChoosingDirectory(true);
                    try {
                      const directory = await api?.recorderChooseDirectory();
                      if (directory) setRecordingDirectory(directory);
                    } catch (error) {
                      setError(String(error));
                    } finally {
                      setChoosingDirectory(false);
                    }
                  }}
                >
                  <FolderOpen size={17} style={{ flexShrink: 0 }} />
                  <span style={{ minWidth: 0 }}>
                    <span {...sx.props(s.itemTitle)}>
                      Save new recordings to
                    </span>
                    <span
                      {...sx.props(s.itemDetail)}
                      style={{
                        display: "block",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {recordingDirectory || "Loading folder…"}
                    </span>
                    <span {...sx.props(s.itemDetail)}>Change directory…</span>
                  </span>
                </button>
                <button
                  {...sx.props(s.item)}
                  aria-pressed={automaticZooms}
                  onClick={() => {
                    const next = !automaticZooms;
                    setAutomaticZooms(next);
                    try {
                      localStorage.setItem(
                        "refract.recorder.automaticZooms",
                        String(next),
                      );
                    } catch {
                      /* The current recording still uses the selection. */
                    }
                  }}
                >
                  <span style={{ width: 17, display: "flex" }}>
                    {automaticZooms ? <Check size={17} /> : null}
                  </span>
                  Automatically create zooms
                </button>
                <button
                  {...sx.props(s.item)}
                  onClick={async () => {
                    try {
                      await api?.recorderKeyboardPermissions();
                      await refresh();
                    } catch (error) {
                      setError(String(error));
                    }
                  }}
                >
                  <Keyboard size={17} />{" "}
                  {sources?.keyboardPermission === "granted"
                    ? "Keyboard shortcuts enabled"
                    : "Enable keyboard shortcut capture…"}
                </button>
                <button
                  {...sx.props(s.item)}
                  onClick={() => api?.recorderImport()}
                >
                  <FolderOpen size={17} />
                  Create project from video…
                </button>
                <button
                  {...sx.props(s.item)}
                  onClick={() => api?.recorderClose()}
                >
                  <Settings2 size={17} />
                  Open editor
                </button>
                <div {...sx.props(s.text)}>
                  <Keyboard size={12} /> Show recorder / stop: ⌘⇧2
                  <br />
                  Pause / resume: ⌘⇧P
                </div>
              </>
            ) : null}
          </section>
        ) : null}
        <div {...sx.props(s.bar)} data-recorder-bar>
          {busy ? (
            <>
              <div {...sx.props(s.status)}>
                {state.phase === "countdown" ? (
                  <>
                    <span {...sx.props(s.count)}>{state.countdown}</span>
                    <span {...sx.props(s.hint)}>
                      Get ready… recording starts in a moment
                    </span>
                    <button
                      {...sx.props(s.choice)}
                      onClick={() => api?.recorderStop()}
                    >
                      Cancel
                    </button>
                  </>
                ) : state.phase === "starting" || state.phase === "stopping" ? (
                  <>
                    <LoaderCircle size={19} />
                    <span>
                      {state.phase === "starting"
                        ? "Starting recording…"
                        : "Saving your recording…"}
                    </span>
                  </>
                ) : (
                  <>
                    <span
                      {...sx.props(s.indicator)}
                      style={{ opacity: state.phase === "paused" ? 0.35 : 1 }}
                    />
                    <span {...sx.props(s.elapsed)}>
                      {formatTime(state.elapsed, true)}
                    </span>
                    <span {...sx.props(s.hint)}>
                      {state.phase === "paused" ? "Paused" : "Recording"}
                    </span>
                    <span
                      role="img"
                      aria-label={
                        state.keyboardStatus === "available"
                          ? state.phase === "paused"
                            ? "Keyboard capture paused"
                            : "Keyboard capture active"
                          : "Keyboard capture unavailable"
                      }
                      title={
                        state.keyboardStatus === "available"
                          ? state.phase === "paused"
                            ? "Keyboard capture paused"
                            : "Keyboard capture active"
                          : state.keyboardStatus === "permission-required"
                            ? "Keyboard capture needs Input Monitoring permission. Enable it in Recording options before your next recording."
                            : "Keyboard capture unavailable for this recording"
                      }
                      style={{ display: "flex", color: "var(--text-muted)" }}
                    >
                      {state.keyboardStatus === "available" ? (
                        <Keyboard size={15} />
                      ) : (
                        <KeyboardOff size={15} />
                      )}
                    </span>
                    <div style={{ width: 25 }} />
                    <button
                      aria-label={
                        state.phase === "paused"
                          ? "Resume recording"
                          : "Pause recording"
                      }
                      {...sx.props(s.choice)}
                      onClick={() => api?.recorderPause()}
                    >
                      <StateIcon
                        active={state.phase === "paused"}
                        size={18}
                        on={<Play size={18} />}
                        off={<Pause size={18} />}
                      />
                    </button>
                    <button
                      aria-label="Stop recording"
                      title="Stop recording (⌘⇧2)"
                      {...sx.props(s.stop)}
                      onClick={() => api?.recorderStop()}
                    >
                      <Square size={15} fill="currentColor" />
                    </button>
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <button
                aria-label="Close recorder"
                {...sx.props(s.close, s.recorderClose)}
                onClick={() => api?.recorderClose()}
              >
                <RecorderSymbol
                  name="close"
                  size={22}
                  fallback={<X size={18} />}
                />
              </button>
              <div {...sx.props(s.line)} />
              <div {...sx.props(s.modes)}>
                {[
                  { id: "display", label: "Display", icon: Monitor },
                  { id: "window", label: "Window", icon: AppWindow },
                  { id: "area", label: "Area", icon: Scan },
                  { id: "device", label: "Device", icon: Smartphone },
                ].map((m) => (
                  <button
                    key={m.id}
                    aria-pressed={
                      panel === m.id ||
                      (m.id === "display" && panel === "display-picker") ||
                      (m.id === "window" && panel === "window-picker") ||
                      (panel === "source-ready" &&
                        selectedSource?.kind === m.id)
                    }
                    aria-haspopup={
                      m.id === "display" || m.id === "window"
                        ? "menu"
                        : undefined
                    }
                    aria-expanded={sourceMenu === m.id}
                    data-motion="static"
                    {...sx.props(
                      s.mode,
                      (panel === m.id ||
                        (m.id === "display" && panel === "display-picker") ||
                        (m.id === "window" && panel === "window-picker")) &&
                        s.active,
                    )}
                    onClick={() => pick(m.id)}
                    onContextMenu={(event) => {
                      if (m.id !== "display" && m.id !== "window") return;
                      event.preventDefault();
                      void pickSourceMenu(m.id, event.currentTarget);
                    }}
                    onKeyDown={(event) => {
                      if (
                        (m.id !== "display" && m.id !== "window") ||
                        event.nativeEvent.isComposing ||
                        event.repeat ||
                        event.metaKey ||
                        event.ctrlKey ||
                        event.altKey
                      )
                        return;
                      if (
                        event.key === "ArrowDown" ||
                        event.key === "ContextMenu" ||
                        (event.key === "F10" && event.shiftKey)
                      ) {
                        event.preventDefault();
                        void pickSourceMenu(m.id, event.currentTarget);
                      }
                    }}
                  >
                    <RecorderSymbol
                      name={m.id}
                      size={22}
                      fallback={<m.icon size={22} strokeWidth={1.5} />}
                    />
                    <span {...sx.props(s.modeLabel)}>{m.label}</span>
                  </button>
                ))}
              </div>
              <div {...sx.props(s.line)} />
              <div {...sx.props(s.inputs)}>
                <button
                  aria-haspopup="menu"
                  aria-expanded={inputMenu === "camera"}
                  data-motion="static"
                  {...sx.props(
                    s.choice,
                    s.cameraChoice,
                    !camera && s.inputInactive,
                  )}
                  onClick={(event) =>
                    void pickInput("camera", event.currentTarget)
                  }
                  onContextMenu={(event) => {
                    event.preventDefault();
                    void pickInput("camera", event.currentTarget);
                  }}
                  onKeyDown={(event) => inputMenuKey(event, "camera")}
                >
                  {camera ? (
                    <RecorderSymbol
                      name="camera"
                      size={16}
                      fallback={<Video size={16} style={{ flexShrink: 0 }} />}
                    />
                  ) : (
                    <RecorderSymbol
                      name="cameraOff"
                      size={16}
                      fallback={
                        <VideoOff size={16} style={{ flexShrink: 0 }} />
                      }
                    />
                  )}
                  <span {...sx.props(s.inputLabel)}>
                    {camera
                      ? inputNames.camera ||
                        sources?.cameras?.find((c) => c.id === camera)?.name ||
                        "Camera"
                      : "No camera"}
                  </span>
                </button>
                <button
                  aria-haspopup="menu"
                  aria-expanded={inputMenu === "microphone"}
                  data-motion="static"
                  {...sx.props(
                    s.choice,
                    s.microphoneChoice,
                    !microphone && s.inputInactive,
                  )}
                  onClick={(event) =>
                    void pickInput("microphone", event.currentTarget)
                  }
                  onContextMenu={(event) => {
                    event.preventDefault();
                    void pickInput("microphone", event.currentTarget);
                  }}
                  onKeyDown={(event) => inputMenuKey(event, "microphone")}
                >
                  {microphone ? (
                    <RecorderSymbol
                      name="microphone"
                      size={16}
                      fallback={<Mic size={16} style={{ flexShrink: 0 }} />}
                    />
                  ) : (
                    <RecorderSymbol
                      name="microphoneOff"
                      size={16}
                      fallback={<MicOff size={16} style={{ flexShrink: 0 }} />}
                    />
                  )}
                  <span {...sx.props(s.inputLabel)}>
                    {microphone
                      ? inputNames.microphone || micName
                      : "No microphone"}
                  </span>
                </button>
                <button
                  aria-haspopup="menu"
                  aria-expanded={inputMenu === "audio"}
                  data-motion="static"
                  {...sx.props(s.choice, !systemAudio && s.inputInactive)}
                  onClick={(event) =>
                    void pickInput("audio", event.currentTarget)
                  }
                  onContextMenu={(event) => {
                    event.preventDefault();
                    void pickInput("audio", event.currentTarget);
                  }}
                  onKeyDown={(event) => inputMenuKey(event, "audio")}
                >
                  <RecorderSymbol
                    name="audio"
                    size={16}
                    fallback={
                      <StateIcon
                        active={systemAudio}
                        size={16}
                        on={<Volume2 size={16} />}
                        off={<VolumeX size={16} />}
                      />
                    }
                  />
                  <span>
                    {systemAudio ? "System audio" : "No system audio"}
                  </span>
                </button>
              </div>
              <div {...sx.props(s.line)} />
              <button
                aria-label="Recording options"
                aria-haspopup="menu"
                aria-expanded={inputMenu === "settings"}
                data-motion="static"
                {...sx.props(s.choice)}
                onClick={(event) =>
                  void pickInput("settings", event.currentTarget)
                }
                onContextMenu={(event) => {
                  event.preventDefault();
                  void pickInput("settings", event.currentTarget);
                }}
                onKeyDown={(event) => inputMenuKey(event, "settings")}
              >
                <RecorderSymbol
                  name="options"
                  size={18}
                  fallback={<Settings2 size={18} />}
                />
                <RecorderSymbol
                  name="chevronDown"
                  size={12}
                  fallback={<ChevronDown size={12} />}
                />
              </button>
            </>
          )}
        </div>
      </div>
    </RecorderSymbols.Provider>
  );
}
