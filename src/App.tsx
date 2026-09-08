import {
  useState,
  useReducer,
  useRef,
  useEffect,
  useCallback,
  type ChangeEvent,
} from "react";
import * as sx from "@stylexjs/stylex";
import {
  FolderOpen,
  Save,
  Undo2,
  Redo2,
  Upload,
  ChevronDown,
  Image as ImageIcon,
  MousePointer2,
  Video,
  AudioLines,
  Keyboard,
  Clapperboard,
  Captions,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat2,
  Volume2,
  VolumeX,
  Crop,
  Scan,
  Plus,
  Monitor,
  Settings2,
  X,
  Check,
  SlidersHorizontal,
  ArrowUpRight,
  Film,
  Trash2,
  Download,
  Scissors,
  Copy,
} from "lucide-react";
import {
  createProject,
  type Project,
  type Appearance,
  type Zoom,
  type Mask,
  type Caption,
  defaults,
  duration,
  sourceAt,
  splitAt,
  formatTime,
  uid,
  validateProject,
} from "./core/project";
import { dimensions, drawFrame, wallpapers } from "./core/compositor";
import { emptyHistory, reduceHistory } from "./core/history";
import CropEditor from "./components/CropEditor";
import Timeline, { type Selection } from "./components/Timeline";
import {
  Button,
  Range,
  Toggle,
  Row,
  Divider,
  Note,
  Heading,
} from "./components/ui";
const s = sx.create({
  app: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#08090d",
  },
  header: {
    height: 51,
    display: "flex",
    alignItems: "center",
    gap: 5,
    paddingInline: 16,
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: "#ffffff0a",
    backgroundColor: "#08090d",
    flexShrink: 0,
  },
  traffic: { width: 66, display: "flex", gap: 7 },
  dot: (color: string) => ({
    width: 11,
    height: 11,
    borderRadius: "50%",
    backgroundColor: color,
  }),
  title: {
    fontSize: 12,
    fontWeight: 500,
    color: "#ccc9d2",
    display: "flex",
    alignItems: "center",
    gap: 7,
    marginLeft: 12,
  },
  muted: { color: "#797582" },
  spacer: { flex: 1 },
  body: {
    display: "flex",
    flex: 1,
    minHeight: 0,
    padding: "16px 14px 0",
    gap: 2,
  },
  workspace: { display: "flex", flexDirection: "column", flex: 1, minWidth: 0 },
  stage: {
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    position: "relative",
    backgroundColor: "#08090d",
  },
  stageTools: {
    height: 34,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    flexShrink: 0,
    alignSelf: "center",
    marginTop: 0,
    marginBottom: 6,
    paddingInline: 7,
  },
  canvasHolder: {
    flex: 1,
    minHeight: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 14px 12px",
  },
  canvas: {
    display: "block",
    maxWidth: "100%",
    maxHeight: "100%",
    objectFit: "contain",
    boxShadow: "0 6px 25px #0003",
  },
  transport: {
    height: 45,
    display: "flex",
    alignItems: "center",
    paddingInline: 17,
    gap: 7,
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: "#ffffff06",
    flexShrink: 0,
  },
  time: {
    fontSize: 11,
    fontVariantNumeric: "tabular-nums",
    color: "#c3bfcc",
    width: 119,
  },
  sidebar: {
    width: 320,
    flexShrink: 0,
    backgroundColor: "#13151b",
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 6,
    display: "flex",
    flexDirection: "column",
  },
  tabs: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-around",
    height: 47,
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: "#ffffff0d",
    paddingInline: 9,
  },
  panel: { padding: "16px 14px", overflowY: "auto", flex: 1 },
  segmented: {
    display: "flex",
    padding: 3,
    borderRadius: 6,
    backgroundColor: "#ffffff0a",
    gap: 1,
    marginBottom: 20,
  },
  segment: {
    flex: 1,
    height: 25,
    borderWidth: 0,
    borderRadius: 4,
    backgroundColor: { default: "transparent", ":hover": "#ffffff0b" },
    color: "#aaa5b5",
    fontSize: 11,
  },
  segmentActive: {
    color: "#f0ebf9",
    backgroundColor: "#ffffff24",
    boxShadow: "0 1px 4px #0004",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(4,1fr)",
    gap: 7,
    marginTop: 13,
    marginBottom: 22,
  },
  swatch: (a: string, b: string, c: string) => ({
    height: 45,
    borderRadius: 5,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#ffffff14",
    backgroundImage: `linear-gradient(125deg, ${a}, ${b} 56%, ${c})`,
    cursor: "pointer",
  }),
  chosen: { outline: "2px solid #b18be8", outlineOffset: 2 },
  empty: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    gap: 17,
    color: "#96909e",
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#26232f",
    color: "#ad8ae8",
    boxShadow: "0 5px 25px #0004",
  },
  emptyTitle: { fontSize: 18, fontWeight: 500, color: "#ded9e7", margin: 0 },
  emptyText: {
    fontSize: 12,
    color: "#8d8796",
    textAlign: "center",
    lineHeight: 1.7,
    maxWidth: 300,
    margin: 0,
  },
  overlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "#0008",
    backdropFilter: "blur(6px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 30,
  },
  modal: {
    width: 470,
    backgroundColor: "#28262de8",
    backdropFilter: "blur(32px) saturate(1.3)",
    backgroundImage: "linear-gradient(145deg,#ffffff09,#ffffff00)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#ffffff1c",
    borderRadius: 12,
    boxShadow: "0 25px 100px #0008",
    padding: 25,
  },
  modalTitle: { fontSize: 17, fontWeight: 600, margin: "0 0 23px" },
  status: {
    position: "fixed",
    bottom: 20,
    left: 20,
    padding: "11px 16px",
    backgroundColor: "#36313e",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#ffffff16",
    borderRadius: 8,
    boxShadow: "0 5px 20px #0005",
    zIndex: 50,
    maxWidth: 520,
    color: "#ede4f7",
    fontSize: 12,
  },
  progress: {
    height: 5,
    backgroundColor: "#151319",
    borderRadius: 5,
    overflow: "hidden",
    marginBlock: 20,
  },
  bar: (progress: number) => ({
    height: "100%",
    width: `${progress}%`,
    backgroundColor: "#a376e5",
  }),
  box: {
    padding: 11,
    borderRadius: 6,
    backgroundColor: "#1d1b22",
    marginBottom: 10,
  },
  inputTitle: {
    backgroundColor: "transparent",
    borderWidth: 0,
    color: "#ded9e7",
    width: 240,
    padding: 5,
  },
  badge: {
    fontSize: 9,
    color: "#a488cb",
    backgroundColor: "#463253",
    padding: "3px 5px",
    borderRadius: 4,
    letterSpacing: 0.5,
  },
});
const tabs = [
  { id: "background", title: "Background & screen", icon: ImageIcon },
  { id: "cursor", title: "Cursor", icon: MousePointer2 },
  { id: "camera", title: "Camera", icon: Video },
  { id: "captions", title: "Captions", icon: Captions },
  { id: "audio", title: "Audio", icon: AudioLines },
  { id: "shortcuts", title: "Shortcuts", icon: Keyboard },
  { id: "animations", title: "Animations", icon: Clapperboard },
];
export default function App() {
  const [cropping, setCropping] = useState(false);
  const [history, dispatchHistory] = useReducer(reduceHistory, emptyHistory);
  const { present: project, past, future } = history;
  const [url, setUrl] = useState(""),
    [cameraUrl, setCameraUrl] = useState(""),
    [time, setTime] = useState(0),
    [playing, setPlaying] = useState(false),
    [loop, setLoop] = useState(false),
    [tab, setTab] = useState("background"),
    [selection, setSelection] = useState<Selection>(null),
    [timelineZoom, setTimelineZoom] = useState(1),
    [modal, setModal] = useState<"export" | "presets" | null>(null),
    [status, setStatus] = useState(""),
    [dirty, setDirty] = useState(false),
    [exporting, setExporting] = useState(false),
    [progress, setProgress] = useState(0),
    [fps, setFps] = useState(30),
    [resolution, setResolution] = useState(1920),
    [format, setFormat] = useState<"mp4" | "gif">("mp4"),
    [previewSpeed, setPreviewSpeed] = useState(1),
    [presetName, setPresetName] = useState(""),
    [presets, setPresets] = useState<
      { name: string; appearance: Appearance }[]
    >(() => {
      try {
        return JSON.parse(localStorage.getItem("refract-presets") || "[]");
      } catch {
        return [];
      }
    });
  const video = useRef<HTMLVideoElement>(null),
    cameraVideo = useRef<HTMLVideoElement>(null),
    canvas = useRef<HTMLCanvasElement>(null),
    input = useRef<HTMLInputElement>(null),
    bgInput = useRef<HTMLInputElement>(null),
    captionInput = useRef<HTMLInputElement>(null),
    cancelExport = useRef(false),
    projectRef = useRef(project),
    timeRef = useRef(time),
    playingRef = useRef(playing),
    bgImage = useRef<HTMLImageElement | null>(null);
  projectRef.current = project;
  timeRef.current = time;
  playingRef.current = playing;
  const tell = (message: string) => {
    setStatus(message);
  };
  useEffect(() => {
    if (!status) return;
    const timer = setTimeout(() => setStatus(""), 6500);
    return () => clearTimeout(timer);
  }, [status]);
  const edit = useCallback((next: Project, group?: string) => {
    dispatchHistory({ type: "edit", project: next, group, now: Date.now() });
    setDirty(true);
  }, []);
  const undo = () => {
    if (!past.length) return;
    dispatchHistory({ type: "undo" });
    setDirty(true);
  };
  const redo = () => {
    if (!future.length) return;
    dispatchHistory({ type: "redo" });
    setDirty(true);
  };
  function load(p: Project, u: string, cam?: string) {
    setCameraUrl(cam ?? "");
    setPlaying(false);
    dispatchHistory({ type: "load", project: p });
    setUrl(u);
    setTime(0);
    setSelection(null);
    setDirty(false);
    setTab("background");
  }
  async function importVideo() {
    try {
      if (window.refract) {
        const result = await window.refract.importVideo();
        if (result)
          load(createProject(result.source, result.title), result.url);
      } else input.current?.click();
    } catch (e) {
      tell(String(e));
    }
  }
  async function importBrowser(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const u = URL.createObjectURL(file),
      v = document.createElement("video");
    v.preload = "metadata";
    v.src = u;
    v.onloadedmetadata = () => {
      load(
        createProject(
          {
            file: file.name,
            duration: v.duration * 1000,
            width: v.videoWidth,
            height: v.videoHeight,
            hasAudio: true,
          },
          file.name.replace(/\.[^.]+$/, ""),
        ),
        u,
      );
      v.remove();
    };
    v.onerror = () => tell("This video could not be opened. Try an MP4 file.");
    e.target.value = "";
  }
  async function open() {
    try {
      if (!window.refract) {
        tell("Open saved projects in the Refract desktop application.");
        return;
      }
      const r = await window.refract.openProject();
      if (r) load(validateProject(r.project), r.url, r.cameraUrl);
    } catch (e) {
      tell(String(e));
    }
  }
  async function save(saveAs = false) {
    if (!project) return;
    try {
      if (window.refract) {
        const dest = await window.refract.saveProject(project, saveAs);
        if (dest) {
          setDirty(false);
          tell("Project saved.");
        }
      } else {
        const blob = new Blob([JSON.stringify(project, null, 2)], {
          type: "application/json",
        });
        download(blob, project.title + ".json");
        tell(
          "Edit settings downloaded. The desktop app saves projects with their video.",
        );
      }
    } catch (e) {
      tell(String(e));
    }
  }
  function download(blob: Blob, name: string) {
    const u = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = u;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(u), 1000);
  }
  const appearance = (values: Partial<Appearance>) => {
    if (project)
      edit(
        { ...project, appearance: { ...project.appearance, ...values } },
        "appearance:" + Object.keys(values).sort().join(","),
      );
  };
  const seek = (t: number) => {
    setTime(Math.max(0, Math.min(project ? duration(project) : 0, t)));
    setPlaying(false);
  };
  const cut = () => {
    if (project) {
      const next = splitAt(project, time);
      if (next !== project) {
        edit(next);
        setSelection({
          type: "clip",
          id: sourceAt(next, time)?.segment.id ?? next.segments[0].id,
        });
      }
    }
  };
  function removeSelection() {
    if (!project || !selection) return;
    if (selection.type === "clip") {
      if (project.segments.length === 1) {
        tell("Keep at least one clip in the project.");
        return;
      }
      edit({
        ...project,
        segments: project.segments.filter((c) => c.id !== selection.id),
      });
      setTime(0);
    } else if (selection.type === "zoom")
      edit({
        ...project,
        zooms: project.zooms.filter((z) => z.id !== selection.id),
      });
    else
      edit({
        ...project,
        masks: project.masks.filter((m) => m.id !== selection.id),
      });
    setSelection(null);
  }
  function addZoom() {
    if (!project) return;
    const start = sourceAt(project, time)?.time ?? 0,
      z: Zoom = {
        id: uid(),
        start,
        end: Math.min(project.source.duration, start + 2500),
        scale: 2,
        x: 0.5,
        y: 0.5,
        mode: "manual",
        disabled: false,
      };
    if (z.end <= z.start) return;
    edit({ ...project, zooms: [...project.zooms, z] });
    setSelection({ type: "zoom", id: z.id });
  }
  function addMask() {
    if (!project) return;
    const start = sourceAt(project, time)?.time ?? 0,
      m: Mask = {
        id: uid(),
        start,
        end: Math.min(project.source.duration, start + 3000),
        x: 0.3,
        y: 0.3,
        width: 0.3,
        height: 0.2,
        type: "blur",
        strength: 20,
      };
    edit({ ...project, masks: [...project.masks, m] });
    setSelection({ type: "mask", id: m.id });
  }
  useEffect(() => {
    const img = project?.appearance.image;
    if (!img) {
      bgImage.current = null;
      return;
    }
    const im = new Image();
    im.onload = () => {
      bgImage.current = im;
      setTime((t) => t + 0.00001);
    };
    im.src = img;
  }, [project?.appearance.image]);
  useEffect(() => {
    const v = video.current;
    if (!v || !project) return;
    v.volume = Math.min(1, project.appearance.volume);
    v.muted = project.appearance.muted;
    const source = sourceAt(project, time);
    if (!source) return;
    const desired = Math.min(
      Math.max(0, v.duration - 0.02),
      source.time / 1000,
    );
    if (Number.isFinite(desired) && Math.abs(v.currentTime - desired) > 0.04)
      v.currentTime = desired;
    if (playing) {
      v.playbackRate = source.segment.speed * previewSpeed;
      void v.play().catch(() => setPlaying(false));
    } else v.pause();
  }, [project, time, playing, previewSpeed, url]);
  useEffect(() => {
    const v = cameraVideo.current;
    if (!v || !project) return;
    const source = sourceAt(project, time);
    if (!source) return;
    const desired = Math.min(
      Math.max(0, v.duration - 0.02),
      source.time / 1000,
    );
    if (Number.isFinite(desired) && Math.abs(v.currentTime - desired) > 0.05)
      v.currentTime = desired;
    v.muted = true;
    if (playing) {
      v.playbackRate = source.segment.speed * previewSpeed;
      void v.play().catch(() => {});
    } else v.pause();
  }, [project, time, playing, previewSpeed, cameraUrl]);
  useEffect(() => {
    let id: number,
      last = performance.now(),
      lastState = last;
    const tick = (now: number) => {
      const p = projectRef.current,
        c = canvas.current,
        v = video.current;
      if (p && c && v && v.readyState >= 2) {
        const d = dimensions(p, 1280);
        if (c.width !== d.width || c.height !== d.height) {
          c.width = d.width;
          c.height = d.height;
        }
        const ctx = c.getContext("2d");
        if (ctx)
          drawFrame(
            ctx,
            v,
            p,
            timeRef.current,
            d.width,
            d.height,
            bgImage.current ?? undefined,
            cameraVideo.current && cameraVideo.current.readyState >= 2
              ? cameraVideo.current
              : undefined,
          );
      }
      if (playingRef.current && p) {
        let next = timeRef.current + (now - last) * previewSpeed;
        if (next >= duration(p)) {
          next = loop ? 0 : duration(p);
          if (!loop) setPlaying(false);
        }
        timeRef.current = next;
        if (now - lastState > 30) {
          setTime(next);
          lastState = now;
        }
      }
      last = now;
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [previewSpeed, loop]);
  useEffect(() => {
    const action = (a: string) => {
      if (cropping) return;
      if (a === "import") void importVideo();
      if (a === "open") void open();
      if (a === "save") void save();
      if (a === "saveAs") void save(true);
      if (a === "export" && project) {
        setPlaying(false);
        setModal("export");
      }
      if (a === "undo") undo();
      if (a === "redo") redo();
    };
    const off = window.refract?.onMenu(action);
    const key = (e: KeyboardEvent) => {
      if (cropping || e.defaultPrevented) return;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      )
        return;
      if (e.code === "Space") {
        e.preventDefault();
        if (project) setPlaying((p) => !p);
      }
      if (e.key.toLowerCase() === "c" && !e.metaKey && !e.ctrlKey) cut();
      if (e.key === "Backspace" || e.key === "Delete") removeSelection();
      if (e.key === "Escape") {
        setModal(null);
        setSelection(null);
      }
      if ((e.metaKey || e.ctrlKey) && !window.refract) {
        if (e.key === "s") {
          e.preventDefault();
          void save();
        }
        if (e.key === "z") {
          e.preventDefault();
          e.shiftKey ? redo() : undo();
        }
      }
      if (e.key === "ArrowRight") seek(time + 1000 / fps);
      if (e.key === "ArrowLeft") seek(time - 1000 / fps);
    };
    window.addEventListener("keydown", key);
    return () => {
      off?.();
      window.removeEventListener("keydown", key);
    };
  });
  async function exportVideo() {
    if (!project || !window.refract) {
      tell("Video export is available in the desktop app.");
      return;
    }
    const api = window.refract,
      p = structuredClone(project),
      size = dimensions(p, resolution);
    setPlaying(false);
    cancelExport.current = false;
    try {
      const id = await api.exportStart({ project: p, ...size, fps, format });
      if (!id) return;
      setExporting(true);
      setProgress(0);
      const v = document.createElement("video");
      v.muted = true;
      v.preload = "auto";
      v.src = url;
      await new Promise<void>((resolve, reject) => {
        v.onloadeddata = () => resolve();
        v.onerror = () => reject(Error("Cannot decode source video."));
      });
      let cam: HTMLVideoElement | undefined;
      if (cameraUrl) {
        cam = document.createElement("video");
        cam.muted = true;
        cam.src = cameraUrl;
        await new Promise<void>((resolve, reject) => {
          cam!.onloadeddata = () => resolve();
          cam!.onerror = () => reject(Error("Cannot decode camera video."));
        });
      }
      const out = document.createElement("canvas");
      out.width = size.width;
      out.height = size.height;
      const ctx = out.getContext("2d")!;
      const frames = Math.ceil((duration(p) / 1000) * fps);
      for (let i = 0; i < frames; i++) {
        if (cancelExport.current) throw Error("Export cancelled.");
        const t = (i / fps) * 1000,
          source = sourceAt(p, t)!.time / 1000;
        const target = Math.min(source, v.duration - 0.001);
        if (Math.abs(v.currentTime - target) > 0.0001)
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(
              () => reject(Error("Video seek timed out.")),
              10000,
            );
            v.onseeked = () => {
              clearTimeout(timeout);
              resolve();
            };
            v.currentTime = target;
          });
        if (cam) {
          const targetCamera = Math.min(target, cam.duration - 0.001);
          if (Math.abs(cam.currentTime - targetCamera) > 0.001)
            await new Promise<void>((resolve, reject) => {
              const timeout = setTimeout(
                () => reject(Error("Camera seek timed out.")),
                10000,
              );
              cam!.onseeked = () => {
                clearTimeout(timeout);
                resolve();
              };
              cam!.currentTime = targetCamera;
            });
        }
        drawFrame(
          ctx,
          v,
          p,
          t,
          size.width,
          size.height,
          bgImage.current ?? undefined,
          cam,
        );
        const blob = await new Promise<Blob>((resolve, reject) =>
          out.toBlob(
            (b) => (b ? resolve(b) : reject(Error("Frame rendering failed."))),
            "image/png",
          ),
        );
        await api.exportFrame(id, await blob.arrayBuffer());
        setProgress(((i + 1) / frames) * 95);
      }
      setProgress(97);
      const dest = await api.exportFinish(id);
      setProgress(100);
      tell(`Exported ${dest.split("/").pop()}`);
      setModal(null);
      v.remove();
      cam?.remove();
    } catch (e) {
      await api.exportCancel();
      tell(String(e));
    } finally {
      setExporting(false);
    }
  }
  async function copyFrame() {
    if (!canvas.current) return;
    try {
      const blob = await new Promise<Blob | null>((r) =>
        canvas.current!.toBlob(r),
      );
      if (blob) {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        tell("Frame copied to clipboard.");
      }
    } catch {
      tell("Clipboard unavailable. Use the download frame button.");
    }
  }
  useEffect(
    () =>
      window.refract?.onRecordingFinished((result) => {
        load(validateProject(result.project), result.url, result.cameraUrl);
      }),
    [],
  );
  const z =
      selection?.type === "zoom"
        ? project?.zooms.find((z) => z.id === selection.id)
        : null,
    clip =
      selection?.type === "clip"
        ? project?.segments.find((c) => c.id === selection.id)
        : null,
    mask =
      selection?.type === "mask"
        ? project?.masks.find((m) => m.id === selection.id)
        : null;
  const zoomEdit = (values: Partial<Zoom>) => {
    if (project && z)
      edit({
        ...project,
        zooms: project.zooms.map((v) =>
          v.id === z.id ? { ...v, ...values } : v,
        ),
      });
  };
  const maskEdit = (values: Partial<Mask>) => {
    if (project && mask)
      edit({
        ...project,
        masks: project.masks.map((v) =>
          v.id === mask.id ? { ...v, ...values } : v,
        ),
      });
  };
  async function captionFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !project) return;
    const text = await file.text();
    const blocks = text.replace(/\r/g, "").split(/\n\n+/);
    const parsed: Caption[] = [];
    const ts = (s: string) => {
      const [h, m, v] = s.replace(",", ".").split(":").map(Number);
      return (h * 3600 + m * 60 + v) * 1000;
    };
    for (const block of blocks) {
      const lines = block.split("\n"),
        at = lines.findIndex((l) => l.includes("-->"));
      if (at >= 0) {
        const [a, b] = lines[at].split("-->").map((v) => v.trim());
        const start = ts(a),
          end = ts(b.split(" ")[0]);
        if (Number.isFinite(start) && Number.isFinite(end) && end > start)
          parsed.push({
            id: uid(),
            start,
            end,
            text: lines.slice(at + 1).join(" "),
          });
      }
    }
    if (!parsed.length) {
      tell("No timed captions were found. Import an SRT file.");
      return;
    }
    edit({ ...project, captions: parsed });
    tell(`Imported ${parsed.length} captions.`);
  }
  return (
    <div {...sx.props(s.app)}>
      {cropping && project && (
        <CropEditor
          width={project.source.width}
          height={project.source.height}
          initial={project.crop}
          video={video.current}
          onCancel={() => setCropping(false)}
          onConfirm={(crop) => {
            edit({ ...project, crop });
            setCropping(false);
          }}
        />
      )}
      <header className="titlebar" {...sx.props(s.header)}>
        {window.refract ? (
          <div style={{ width: 69 }} />
        ) : (
          <div {...sx.props(s.traffic)}>
            {["#ef6663", "#e8b84e", "#5ebe77"].map((c) => (
              <span key={c} {...sx.props(s.dot(c))} />
            ))}
          </div>
        )}
        <Button icon title="Open project" onClick={open}>
          <FolderOpen size={16} />
        </Button>
        <Button
          icon
          title="Save project"
          disabled={!project}
          onClick={() => save()}
        >
          <Save size={15} />
        </Button>
        <div {...sx.props(s.title)}>
          {project ? (
            <>
              <input
                aria-label="Project name"
                {...sx.props(s.inputTitle)}
                value={project.title}
                onChange={(e) => edit({ ...project, title: e.target.value })}
              />
              <span {...sx.props(s.muted)}>{dirty ? "•" : ".refract"}</span>
            </>
          ) : (
            <>
              Refract <span {...sx.props(s.badge)}>PREVIEW</span>
            </>
          )}
        </div>
        <div {...sx.props(s.spacer)} />
        <Button
          title="New recording"
          onClick={() => window.refract?.showRecorder()}
        >
          <Monitor size={15} />
        </Button>
        <Button
          icon
          title="Copy current frame"
          disabled={!project}
          onClick={copyFrame}
        >
          <Copy size={15} />
        </Button>
        <Button title="Import video" onClick={importVideo}>
          <Plus size={15} />
        </Button>
        <Button onClick={() => setModal("presets")} disabled={!project}>
          <SlidersHorizontal size={13} />
          Presets
          <ChevronDown size={11} />
        </Button>
        <Button icon title="Undo" disabled={!past.length} onClick={undo}>
          <Undo2 size={15} />
        </Button>
        <Button icon title="Redo" disabled={!future.length} onClick={redo}>
          <Redo2 size={15} />
        </Button>
        <Button
          primary
          disabled={!project}
          onClick={() => {
            setPlaying(false);
            setModal("export");
          }}
        >
          <Upload size={13} />
          Export
        </Button>
      </header>
      <main {...sx.props(s.body)}>
        <div {...sx.props(s.workspace)}>
          <section {...sx.props(s.stage)}>
            <div
              {...sx.props(s.stageTools)}
              style={!project ? { visibility: "hidden" } : undefined}
            >
              {project ? (
                <>
                  <select
                    aria-label="Aspect ratio"
                    value={project.appearance.ratio}
                    onChange={(e) => appearance({ ratio: e.target.value })}
                  >
                    {["Auto", "16:9", "9:16", "1:1", "4:3", "4:5", "21:9"].map(
                      (x) => (
                        <option key={x}>{x}</option>
                      ),
                    )}
                  </select>
                  <Button
                    onClick={() => {
                      setPlaying(false);
                      setCropping(true);
                    }}
                    title="Crop recording"
                  >
                    <Crop size={13} />
                    Crop
                  </Button>
                  <Button onClick={addMask}>
                    <Scan size={13} />
                    Mask
                  </Button>
                </>
              ) : null}
            </div>
            <div {...sx.props(s.canvasHolder)}>
              {project ? (
                <canvas
                  ref={canvas}
                  {...sx.props(s.canvas)}
                  aria-label="Video composition preview"
                  onClick={(e) => {
                    if (z) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      zoomEdit({
                        x: Math.max(
                          0,
                          Math.min(1, (e.clientX - rect.left) / rect.width),
                        ),
                        y: Math.max(
                          0,
                          Math.min(1, (e.clientY - rect.top) / rect.height),
                        ),
                        mode: "manual",
                      });
                    }
                  }}
                />
              ) : (
                <div {...sx.props(s.empty)}>
                  <div {...sx.props(s.emptyIcon)}>
                    <Film size={31} strokeWidth={1.3} />
                  </div>
                  <h1 {...sx.props(s.emptyTitle)}>Make your next recording.</h1>
                  <p {...sx.props(s.emptyText)}>
                    Record your screen, or open a video to shape its framing,
                    timing, and focus.
                  </p>
                  <Button
                    primary
                    onClick={() =>
                      window.refract
                        ? window.refract.showRecorder()
                        : importVideo()
                    }
                  >
                    <Plus size={14} />
                    {window.refract ? "New recording" : "Open a video"}
                  </Button>
                  <Button onClick={open}>
                    <FolderOpen size={13} />
                    Open project
                  </Button>
                </div>
              )}
            </div>
          </section>
          <div {...sx.props(s.transport)}>
            <span {...sx.props(s.time)}>
              {formatTime(time, true)}{" "}
              <span {...sx.props(s.muted)}>
                / {formatTime(project ? duration(project) : 0, true)}
              </span>
            </span>
            <div {...sx.props(s.spacer)} />
            <Button
              icon
              title="Start"
              disabled={!project}
              onClick={() => seek(0)}
            >
              <SkipBack size={14} />
            </Button>
            <Button
              icon
              title={playing ? "Pause" : "Play"}
              disabled={!project}
              onClick={() => {
                if (project && time >= duration(project)) setTime(0);
                setPlaying((p) => !p);
              }}
            >
              {playing ? <Pause size={17} /> : <Play size={17} />}
            </Button>
            <Button
              icon
              title="End"
              disabled={!project}
              onClick={() => seek(project ? duration(project) : 0)}
            >
              <SkipForward size={14} />
            </Button>
            <div {...sx.props(s.spacer)} />
            <Button
              active={loop}
              icon
              title="Loop playback"
              onClick={() => setLoop((v) => !v)}
            >
              <Repeat2 size={14} />
            </Button>
            <Button
              icon
              title="Mute preview and export"
              disabled={!project}
              onClick={() => appearance({ muted: !project?.appearance.muted })}
            >
              {project?.appearance.muted ? (
                <VolumeX size={14} />
              ) : (
                <Volume2 size={14} />
              )}
            </Button>
            <select
              aria-label="Preview speed"
              value={previewSpeed}
              onChange={(e) => setPreviewSpeed(Number(e.target.value))}
            >
              {[0.5, 1, 1.5, 2].map((v) => (
                <option key={v} value={v}>
                  {v}×
                </option>
              ))}
            </select>
          </div>
        </div>
        <aside {...sx.props(s.sidebar)}>
          <nav {...sx.props(s.tabs)}>
            {tabs.map((t) => (
              <Button
                key={t.id}
                icon
                title={t.title}
                active={tab === t.id && !selection}
                onClick={() => {
                  setTab(t.id);
                  setSelection(null);
                }}
              >
                <t.icon size={16} strokeWidth={1.5} />
              </Button>
            ))}
          </nav>
          <div {...sx.props(s.panel)}>
            {!project ? (
              <>
                <Heading>Background</Heading>
                <Note>Your recording settings will appear here.</Note>
              </>
            ) : z ? (
              <>
                <Row>
                  <Heading>Zoom</Heading>
                  <Button
                    icon
                    title="Deselect zoom"
                    onClick={() => setSelection(null)}
                  >
                    <X size={13} />
                  </Button>
                </Row>
                <div {...sx.props(s.segmented)}>
                  {(["manual", "auto"] as const).map((mode) => (
                    <button
                      key={mode}
                      {...sx.props(
                        s.segment,
                        z.mode === mode && s.segmentActive,
                      )}
                      onClick={() => zoomEdit({ mode })}
                    >
                      {mode === "auto" ? "Auto" : "Manual"}
                    </button>
                  ))}
                </div>
                <Range
                  label="Zoom level"
                  value={z.scale}
                  min={1}
                  max={5}
                  step={0.1}
                  unit="×"
                  onChange={(scale) => zoomEdit({ scale })}
                />
                <Range
                  label="Horizontal target"
                  value={z.x * 100}
                  onChange={(x) => zoomEdit({ x: x / 100 })}
                  unit="%"
                />
                <Range
                  label="Vertical target"
                  value={z.y * 100}
                  onChange={(y) => zoomEdit({ y: y / 100 })}
                  unit="%"
                />
                <Note>
                  {z.mode === "manual"
                    ? "Click the preview to choose a focus point."
                    : "Auto zoom uses recorded click events. Imported video does not include click metadata."}
                </Note>
                <Toggle
                  label="Enabled"
                  value={!z.disabled}
                  onChange={(v) => zoomEdit({ disabled: !v })}
                />
                <Divider />
                <Button onClick={removeSelection}>
                  <Trash2 size={13} />
                  Remove zoom
                </Button>
              </>
            ) : clip ? (
              <>
                <Row>
                  <Heading>Clip</Heading>
                  <Button
                    icon
                    title="Deselect clip"
                    onClick={() => setSelection(null)}
                  >
                    <X size={13} />
                  </Button>
                </Row>
                <Range
                  label="Playback speed"
                  value={clip.speed}
                  min={0.25}
                  max={8}
                  step={0.25}
                  unit="×"
                  onChange={(speed) =>
                    edit({
                      ...project,
                      segments: project.segments.map((c) =>
                        c.id === clip.id ? { ...c, speed } : c,
                      ),
                    })
                  }
                />
                <Range
                  label="Trim start"
                  value={clip.start / 1000}
                  max={(clip.end - 100) / 1000}
                  step={0.1}
                  unit="s"
                  onChange={(start) => {
                    setPlaying(false);
                    edit({
                      ...project,
                      segments: project.segments.map((c) =>
                        c.id === clip.id ? { ...c, start: start * 1000 } : c,
                      ),
                    });
                  }}
                />
                <Range
                  label="Trim end"
                  value={clip.end / 1000}
                  min={(clip.start + 100) / 1000}
                  max={project.source.duration / 1000}
                  step={0.1}
                  unit="s"
                  onChange={(end) =>
                    edit({
                      ...project,
                      segments: project.segments.map((c) =>
                        c.id === clip.id ? { ...c, end: end * 1000 } : c,
                      ),
                    })
                  }
                />
                <Button onClick={cut}>
                  <Scissors size={13} />
                  Split at playhead
                </Button>
                <Divider />
                <Button onClick={removeSelection}>
                  <Trash2 size={13} />
                  Remove clip
                </Button>
              </>
            ) : mask ? (
              <>
                <Row>
                  <Heading>Mask & highlight</Heading>
                  <Button
                    icon
                    title="Deselect mask"
                    onClick={() => setSelection(null)}
                  >
                    <X size={13} />
                  </Button>
                </Row>
                <select
                  aria-label="Mask type"
                  value={mask.type}
                  onChange={(e) =>
                    maskEdit({ type: e.target.value as Mask["type"] })
                  }
                >
                  <option value="blur">Blur</option>
                  <option value="highlight">Highlight</option>
                </select>
                <Divider />
                {(["x", "y", "width", "height"] as const).map((k) => (
                  <Range
                    key={k}
                    label={k[0].toUpperCase() + k.slice(1)}
                    value={mask[k] * 100}
                    min={0}
                    max={100}
                    unit="%"
                    onChange={(v) => maskEdit({ [k]: v / 100 })}
                  />
                ))}
                <Range
                  label="Strength"
                  value={mask.strength}
                  min={1}
                  max={100}
                  onChange={(strength) => maskEdit({ strength })}
                />
                <Range
                  label="Start"
                  value={mask.start / 1000}
                  min={0}
                  max={mask.end / 1000 - 0.1}
                  step={0.1}
                  unit="s"
                  onChange={(v) => maskEdit({ start: v * 1000 })}
                />
                <Range
                  label="End"
                  value={mask.end / 1000}
                  min={mask.start / 1000 + 0.1}
                  max={project.source.duration / 1000}
                  step={0.1}
                  unit="s"
                  onChange={(v) => maskEdit({ end: v * 1000 })}
                />
                <Button onClick={removeSelection}>
                  <Trash2 size={13} />
                  Remove mask
                </Button>
              </>
            ) : tab === "background" ? (
              <>
                <Heading>Background</Heading>
                <div {...sx.props(s.segmented)}>
                  {(["wallpaper", "gradient", "color", "image"] as const).map(
                    (v) => (
                      <button
                        key={v}
                        {...sx.props(
                          s.segment,
                          project.appearance.background === v &&
                            s.segmentActive,
                        )}
                        onClick={() => appearance({ background: v })}
                      >
                        {v[0].toUpperCase() + v.slice(1)}
                      </button>
                    ),
                  )}
                </div>
                {project.appearance.background === "wallpaper" ? (
                  <>
                    <Row>
                      <span>Wallpaper</span>
                      <span {...sx.props(s.muted)}>Refract collection</span>
                    </Row>
                    <div {...sx.props(s.grid)}>
                      {wallpapers.map((colors, i) => (
                        <button
                          key={i}
                          title={`Wallpaper ${i + 1}`}
                          aria-label={`Wallpaper ${i + 1}`}
                          {...sx.props(
                            s.swatch(colors[0], colors[1], colors[2]),
                            project.appearance.wallpaper === i && s.chosen,
                          )}
                          onClick={() => appearance({ wallpaper: i })}
                        />
                      ))}
                    </div>
                    <Button
                      onClick={() =>
                        appearance({
                          wallpaper: Math.floor(
                            Math.random() * wallpapers.length,
                          ),
                        })
                      }
                    >
                      Pick random wallpaper
                    </Button>
                    <Divider />
                  </>
                ) : project.appearance.background === "image" ? (
                  <>
                    <Button onClick={() => bgInput.current?.click()}>
                      <ImageIcon size={13} />
                      Choose background image
                    </Button>
                    <Divider />
                  </>
                ) : (
                  <>
                    <Row>
                      <span>
                        {project.appearance.background === "color"
                          ? "Color"
                          : "Gradient colors"}
                      </span>
                      <input
                        aria-label="Background color"
                        type="color"
                        value={project.appearance.color}
                        onChange={(e) => appearance({ color: e.target.value })}
                      />
                      {project.appearance.background === "gradient" ? (
                        <input
                          aria-label="Gradient second color"
                          type="color"
                          value={project.appearance.color2}
                          onChange={(e) =>
                            appearance({ color2: e.target.value })
                          }
                        />
                      ) : null}
                    </Row>
                    <Divider />
                  </>
                )}
                {(project.appearance.background === "wallpaper" ||
                  project.appearance.background === "image") && (
                  <Range
                    label="Background blur"
                    value={project.appearance.blur}
                    max={100}
                    onChange={(blur) => appearance({ blur })}
                  />
                )}
                <Range
                  label="Padding"
                  resetValue={defaults.padding}
                  value={project.appearance.padding}
                  max={35}
                  unit="%"
                  onChange={(padding) => appearance({ padding })}
                />
                <Range
                  label="Rounded corners"
                  resetValue={defaults.radius}
                  value={project.appearance.radius}
                  max={200}
                  onChange={(radius) => appearance({ radius })}
                />
                <Range
                  label="Inset"
                  resetValue={defaults.inset}
                  value={project.appearance.inset}
                  max={30}
                  onChange={(inset) => appearance({ inset })}
                />
                {project.appearance.inset ? (
                  <Row>
                    <span>Inset color</span>
                    <input
                      type="color"
                      aria-label="Inset color"
                      value={project.appearance.insetColor}
                      onChange={(e) =>
                        appearance({ insetColor: e.target.value })
                      }
                    />
                  </Row>
                ) : null}
                <Range
                  label="Shadow"
                  resetValue={defaults.shadow * 100}
                  value={project.appearance.shadow * 100}
                  max={100}
                  unit="%"
                  onChange={(shadow) => appearance({ shadow: shadow / 100 })}
                />
                <details>
                  <summary
                    style={{
                      cursor: "pointer",
                      color: "#ffffff99",
                      paddingBlock: 10,
                    }}
                  >
                    Advanced shadow settings
                  </summary>
                  <Toggle
                    label="Directional shadow"
                    value={project.appearance.shadowDirectional}
                    onChange={(shadowDirectional) =>
                      appearance({
                        shadowDirectional,
                        shadow: shadowDirectional ? 0.4 : defaults.shadow,
                      })
                    }
                  />
                  <Range
                    label="Shadow Distance"
                    value={project.appearance.shadowDistance}
                    max={100}
                    resetValue={defaults.shadowDistance}
                    onChange={(shadowDistance) =>
                      appearance({ shadowDistance })
                    }
                  />
                  <Range
                    label="Shadow Angle"
                    value={project.appearance.shadowAngle}
                    max={180}
                    unit="°"
                    resetValue={defaults.shadowAngle}
                    onChange={(shadowAngle) => appearance({ shadowAngle })}
                  />
                  <Range
                    label="Shadow Blur"
                    value={project.appearance.shadowBlur}
                    min={5}
                    max={30}
                    resetValue={defaults.shadowBlur}
                    onChange={(shadowBlur) => appearance({ shadowBlur })}
                  />
                </details>
              </>
            ) : tab === "cursor" ? (
              <>
                <Heading>Cursor</Heading>
                {!project.cursor.length ? (
                  <Note>
                    This imported video has no separate cursor track. Cursor
                    controls become available for recordings that include input
                    metadata.
                  </Note>
                ) : (
                  <>
                    <Toggle
                      label="Hide cursor"
                      value={project.appearance.hideCursor}
                      onChange={(hideCursor) => appearance({ hideCursor })}
                    />
                    <Range
                      label="Cursor size"
                      value={project.appearance.cursorSize}
                      min={0.5}
                      max={4}
                      step={0.1}
                      unit="×"
                      onChange={(cursorSize) => appearance({ cursorSize })}
                    />
                    <Toggle
                      label="Smooth movement"
                      value={project.appearance.cursorSmooth}
                      onChange={(cursorSmooth) => appearance({ cursorSmooth })}
                    />
                    <Toggle
                      label="Click ripple"
                      value={project.appearance.clickEffect}
                      onChange={(clickEffect) => appearance({ clickEffect })}
                    />
                  </>
                )}
              </>
            ) : tab === "audio" ? (
              <>
                <Heading>Audio</Heading>
                <Toggle
                  label="Mute source audio"
                  value={project.appearance.muted}
                  onChange={(muted) => appearance({ muted })}
                />
                <Range
                  label="Volume"
                  value={project.appearance.volume * 100}
                  max={100}
                  unit="%"
                  onChange={(v) => appearance({ volume: v / 100 })}
                />
                <Note>
                  Audio follows clip cuts and speed changes in the exported
                  video.
                </Note>
              </>
            ) : tab === "animations" ? (
              <>
                <Heading>Animations</Heading>
                <span>Screen animation</span>
                <div {...sx.props(s.segmented)} style={{ marginTop: 12 }}>
                  {(["smooth", "focused", "instant"] as const).map((v) => (
                    <button
                      key={v}
                      {...sx.props(
                        s.segment,
                        project.appearance.animation === v && s.segmentActive,
                      )}
                      onClick={() => appearance({ animation: v })}
                    >
                      {v[0].toUpperCase() + v.slice(1)}
                    </button>
                  ))}
                </div>
                <Note>
                  Choose a transition style for your zooms. The preview and
                  exporter use the same animation curve.
                </Note>
              </>
            ) : tab === "captions" ? (
              <>
                <Heading>Captions</Heading>
                <Button onClick={() => captionInput.current?.click()}>
                  <Upload size={13} />
                  Import SRT captions
                </Button>
                <Divider />
                {project.captions.map((c, i) => (
                  <div key={c.id} {...sx.props(s.box)}>
                    <Row>
                      <span {...sx.props(s.muted)}>
                        {formatTime(c.start, true)} → {formatTime(c.end, true)}
                      </span>
                      <Button
                        icon
                        title="Delete caption"
                        onClick={() =>
                          edit({
                            ...project,
                            captions: project.captions.filter(
                              (v) => v.id !== c.id,
                            ),
                          })
                        }
                      >
                        <X size={12} />
                      </Button>
                    </Row>
                    <textarea
                      aria-label={`Caption ${i + 1}`}
                      value={c.text}
                      onChange={(e) =>
                        edit({
                          ...project,
                          captions: project.captions.map((v) =>
                            v.id === c.id ? { ...v, text: e.target.value } : v,
                          ),
                        })
                      }
                    />
                  </div>
                ))}
                <Note>
                  Captions stay aligned to the original recording through cuts
                  and speed changes. Local speech transcription is not
                  implemented yet.
                </Note>
              </>
            ) : tab === "camera" ? (
              <>
                <Heading>Camera</Heading>
                {!project.source.camera ? (
                  <Note>
                    No camera track is attached. Choose a camera in the
                    recording bar for your next recording.
                  </Note>
                ) : (
                  <>
                    <Toggle
                      label="Hide camera"
                      value={project.appearance.cameraHidden}
                      onChange={(cameraHidden) => appearance({ cameraHidden })}
                    />
                    <Toggle
                      label="Mirror camera"
                      value={project.appearance.cameraMirror}
                      onChange={(cameraMirror) => appearance({ cameraMirror })}
                    />
                    <Range
                      label="Camera size"
                      value={project.appearance.cameraSize * 100}
                      min={10}
                      max={80}
                      unit="%"
                      onChange={(v) => appearance({ cameraSize: v / 100 })}
                    />
                    <Range
                      label="Roundness"
                      value={project.appearance.cameraRoundness * 100}
                      min={0}
                      max={50}
                      unit="%"
                      onChange={(v) => appearance({ cameraRoundness: v / 100 })}
                    />
                    <Range
                      label="Horizontal position"
                      value={project.appearance.cameraX * 100}
                      unit="%"
                      onChange={(v) => appearance({ cameraX: v / 100 })}
                    />
                    <Range
                      label="Vertical position"
                      value={project.appearance.cameraY * 100}
                      unit="%"
                      onChange={(v) => appearance({ cameraY: v / 100 })}
                    />
                    <Range
                      label="Size during zoom"
                      value={project.appearance.cameraZoomScale * 100}
                      min={30}
                      max={100}
                      unit="%"
                      onChange={(v) => appearance({ cameraZoomScale: v / 100 })}
                    />
                  </>
                )}
              </>
            ) : (
              <>
                <Heading>Shortcuts</Heading>
                <Note>
                  This video has no captured keyboard events. Keyboard event
                  capture is still in development.
                </Note>
                <Divider />
                <Row>
                  <span>Play / pause</span>
                  <kbd>Space</kbd>
                </Row>
                <Divider />
                <Row>
                  <span>Cut at playhead</span>
                  <kbd>C</kbd>
                </Row>
              </>
            )}
          </div>
        </aside>
      </main>
      {project ? (
        <Timeline
          project={project}
          time={time}
          seek={seek}
          edit={edit}
          selection={selection}
          select={setSelection}
          zoom={timelineZoom}
          setZoom={setTimelineZoom}
          cut={cut}
        />
      ) : (
        <div
          style={{
            height: 192,
            borderTopWidth: 1,
            borderTopStyle: "solid",
            borderTopColor: "#ffffff0a",
            background: "#08090d",
          }}
        />
      )}
      <video
        ref={cameraVideo}
        src={cameraUrl || undefined}
        style={{ display: "none" }}
        muted
        playsInline
      />
      <video
        ref={video}
        src={url || undefined}
        style={{ display: "none" }}
        playsInline
        onLoadedMetadata={() => setTime(0)}
        onError={() => tell("The video could not be decoded.")}
      />
      <input
        ref={input}
        type="file"
        accept="video/*"
        hidden
        onChange={importBrowser}
      />
      <input
        ref={captionInput}
        type="file"
        accept=".srt,.vtt"
        hidden
        onChange={captionFile}
      />
      <input
        ref={bgInput}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = () =>
              appearance({ image: String(reader.result), background: "image" });
            reader.readAsDataURL(file);
          }
        }}
      />
      {modal ? (
        <div
          {...sx.props(s.overlay)}
          onClick={() => {
            if (!exporting) setModal(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label={modal === "export" ? "Export video" : "Presets"}
            {...sx.props(s.modal)}
            onClick={(e) => e.stopPropagation()}
          >
            <Row>
              <h2 {...sx.props(s.modalTitle)}>
                {modal === "export" ? "Export video" : "Presets"}
              </h2>
              <Button
                icon
                title="Close dialog"
                disabled={exporting}
                onClick={() => setModal(null)}
              >
                <X size={16} />
              </Button>
            </Row>
            {modal === "export" ? (
              <>
                {!exporting ? (
                  <>
                    <Row>
                      <span>Export as</span>
                      <select
                        aria-label="Export format"
                        value={format}
                        onChange={(e) =>
                          setFormat(e.target.value as "mp4" | "gif")
                        }
                      >
                        <option value="mp4">MP4 video</option>
                        <option value="gif">Animated GIF</option>
                      </select>
                    </Row>
                    <Divider />
                    <Row>
                      <span>Output size</span>
                      <select
                        aria-label="Output size"
                        value={resolution}
                        onChange={(e) => setResolution(Number(e.target.value))}
                      >
                        <option value={1280}>HD · 1280</option>
                        <option value={1920}>Full HD · 1920</option>
                        <option value={3840}>4K · 3840</option>
                      </select>
                    </Row>
                    <Divider />
                    <Row>
                      <span>Frame rate</span>
                      <select
                        aria-label="Frame rate"
                        value={fps}
                        onChange={(e) => setFps(Number(e.target.value))}
                      >
                        {[24, 30, 60].map((n) => (
                          <option key={n} value={n}>
                            {n} fps
                          </option>
                        ))}
                      </select>
                    </Row>
                    <Divider />
                    <Note>
                      {project
                        ? `${dimensions(project, resolution).width} × ${dimensions(project, resolution).height} · ${formatTime(duration(project), true)}`
                        : ""}
                      <br />
                      Your framing, zooms, masks, captions, cuts, and audio
                      settings are included.
                    </Note>
                    <Row>
                      <Button onClick={() => setModal(null)}>Cancel</Button>
                      <Button primary onClick={exportVideo}>
                        <Upload size={14} />
                        Export to file
                      </Button>
                    </Row>
                  </>
                ) : (
                  <>
                    <p>
                      {progress < 96
                        ? "Rendering your video…"
                        : "Finishing export…"}
                    </p>
                    <div {...sx.props(s.progress)}>
                      <div {...sx.props(s.bar(progress))} />
                    </div>
                    <Row>
                      <span>{Math.round(progress)}%</span>
                      <Button
                        onClick={() => {
                          cancelExport.current = true;
                          void window.refract
                            ?.exportCancel()
                            .catch((error) => tell(String(error)));
                        }}
                      >
                        Cancel export
                      </Button>
                    </Row>
                  </>
                )}
              </>
            ) : (
              <>
                <Note>
                  Save appearance settings and reuse them across recordings.
                </Note>
                {presets.map((p, i) => (
                  <div key={p.name + i} {...sx.props(s.box)}>
                    <Row>
                      <Button
                        onClick={() => {
                          appearance(p.appearance);
                          setModal(null);
                        }}
                      >
                        {p.name}
                      </Button>
                      <Button
                        title="Remove preset"
                        icon
                        onClick={() => {
                          const next = presets.filter((_, j) => i !== j);
                          setPresets(next);
                          localStorage.setItem(
                            "refract-presets",
                            JSON.stringify(next),
                          );
                        }}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </Row>
                  </div>
                ))}
                <Divider />
                <Row>
                  <input
                    aria-label="Preset name"
                    type="text"
                    placeholder="Preset name"
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                  />
                  <Button
                    primary
                    disabled={!presetName.trim()}
                    onClick={() => {
                      if (project) {
                        const next = [
                          ...presets,
                          {
                            name: presetName.trim(),
                            appearance: project.appearance,
                          },
                        ];
                        setPresets(next);
                        localStorage.setItem(
                          "refract-presets",
                          JSON.stringify(next),
                        );
                        setPresetName("");
                        tell("Preset saved.");
                      }
                    }}
                  >
                    Save
                  </Button>
                </Row>
              </>
            )}
          </section>
        </div>
      ) : null}
      {status ? (
        <div role="status" {...sx.props(s.status)}>
          {status}
        </div>
      ) : null}
    </div>
  );
}
