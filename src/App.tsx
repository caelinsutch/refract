import { exportFrameRate, exportFrameRates } from "./core/export-settings";
import { supportsDirectionalShadow } from "./core/shadow-layer";
import { WallpaperPicker } from "./components/WallpaperPicker";
import { BackgroundImagePicker } from "./components/BackgroundImagePicker";
import { GradientPresets } from "./components/GradientPresets";
import { InsetBalance } from "./components/InsetBalance";
import { InsetColors } from "./components/InsetColors";
import { insetAppearance, screenCorners } from "./core/screen-corners";
import { Tooltip } from "./components/Tooltip";
import { Disclosure } from "./components/Disclosure";
import { AspectRatioPicker } from "./components/AspectRatioPicker";
import { playbackTime } from "./core/playback-time";
import { PreviewSettings } from "./components/PreviewSettings";
import { PlaybackSpeed } from "./components/PlaybackSpeed";
import {
  RecordingCompletions,
  recordingCompletion,
  type RecordingCompletion,
} from "./core/recording-completion";
import { previewTransport } from "./core/preview-transport";
import { useClickAudio } from "./media/use-click-audio";
import {
  dragMask,
  maskHandleAt,
  drawMaskSelection,
  type MaskHandle,
} from "./core/mask-drag";
import { useMicrophoneAudio } from "./media/use-microphone-audio";
import { AudioLibrary } from "./components/AudioLibrary";
import { confirmProjectReplacement } from "./core/unsaved-project";
import { Modal } from "./components/Modal";
import { ShortcutSettings } from "./components/ShortcutSettings";
import { clipAudioGain } from "./core/audio";
import { useBackgroundAudio } from "./media/use-background-audio";
import { useAudioPreview } from "./media/use-audio-preview";
import { CameraLayouts } from "./components/CameraLayouts";
import { StateIcon } from "./components/StateIcon";
import { SpringControls } from "./components/SpringControls";
import { loadExportVideo, seekExportVideo } from "./media/export-video";
import { screenPresets } from "./core/motion";
import { cursorPresets } from "./core/cursor";
import { clipTrimBounds, trimClip } from "./core/timeline";
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
  ChevronLeft,
  Image as ImageIcon,
  MousePointer2,
  Video,
  AudioLines,
  Keyboard,
  Clapperboard,
  Captions,
  Play,
  Pause,
  CircleStop,
  CirclePlay,
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
import {
  dimensions,
  previewDimensions,
  drawFrame,
  sourcePointAt,
} from "./core/compositor";
import { emptyHistory, reduceHistory } from "./core/history";
import CropEditor from "./components/CropEditor";
import CommandMenu, { type EditorCommand } from "./components/CommandMenu";
import Timeline, { type Selection } from "./components/Timeline";
import {
  TimelineVisibility,
  type TimelineTracks,
} from "./components/TimelineVisibility";
import {
  Button,
  Range,
  Toggle,
  Row,
  Divider,
  Note,
  Heading,
} from "./components/ui";
const previewSizes = [480, 720, 1080, 1440, 2160] as const;
const s = sx.create({
  app: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "var(--surface-app)",
  },
  header: {
    height: 51,
    display: "flex",
    alignItems: "center",
    gap: 5,
    paddingInline: 16,
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: "var(--white-a0a)",
    backgroundColor: "var(--surface-app)",
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
    color: "var(--text-secondary)",
    display: "flex",
    alignItems: "center",
    gap: 7,
    marginLeft: 12,
  },
  muted: { color: "var(--text-subtle)" },
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
    justifyContent: "center",
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    position: "relative",
    backgroundColor: "var(--surface-app)",
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
    width: "100%",
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
    boxShadow: "0 6px 25px var(--black-a33)",
  },
  transport: {
    height: 45,
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    alignItems: "center",
    flexShrink: 0,
  },
  transportLeft: { display: "flex", alignItems: "center", minWidth: 0, gap: 1 },
  transportCenter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 0,
    gap: 2,
    containerType: "inline-size",
    containerName: "playback",
  },
  transportRight: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    minWidth: 0,
    gap: 1,
  },
  playButtons: { display: "flex", alignItems: "center", gap: 1, flexShrink: 0 },
  time: {
    fontSize: 13,
    fontVariantNumeric: "tabular-nums",
    color: {
      default: "var(--text-subtle)",
      ":hover": "var(--text-secondary)",
      ":active": "var(--text-primary)",
    },
    backgroundColor: "transparent",
    borderWidth: 0,
    padding: 0,
    whiteSpace: "nowrap",
    minWidth: 0,
    overflow: "hidden",
  },
  audioTrackName: {
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  sidebar: {
    width: "var(--sidebar-width)",
    flexShrink: 0,
    backgroundColor: "var(--surface-panel)",
    borderRadius: "var(--radius-panel)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  previewRow: { display: "flex", flex: 1, minHeight: 0, gap: 1 },
  tools: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    flexShrink: 0,
    width: 40,
    paddingBottom: 40,
  },
  tool: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 40,
    height: 40,
    padding: 12,
    flexShrink: 0,
    borderWidth: 0,
    borderRadius: "var(--radius-control)",
    backgroundColor: "transparent",
    color: "var(--text-primary)",
  },
  toolActive: { color: "var(--accent)" },
  toolUnavailable: {
    opacity: 0.3,
    backgroundColor: "transparent",
  },
  toolIndicator: {
    position: "absolute",
    right: 5,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "var(--accent)",
  },
  panel: {
    padding: "32px 24px",
    overflowY: "auto",
    scrollbarGutter: "stable",
    flex: 1,
  },
  segmented: {
    display: "flex",
    padding: 3,
    borderRadius: 6,
    backgroundColor: "var(--white-a0a)",
    gap: 1,
    marginBottom: 20,
  },
  segment: {
    flex: 1,
    height: 25,
    borderWidth: 0,
    borderRadius: 4,
    backgroundColor: "transparent",
    color: "var(--text-muted)",
    fontSize: 11,
  },
  segmentActive: {
    color: "var(--text-primary)",
    backgroundColor: "var(--white-a24)",
    boxShadow: "0 1px 4px var(--black-a44)",
  },
  backgroundTabs: {
    display: "flex",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--white-a0a)",
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 20,
  },
  backgroundTab: {
    flex: 1,
    height: 34,
    paddingInline: 8,
    borderWidth: 0,
    borderRightWidth: 1,
    borderRightStyle: "solid",
    borderRightColor: "var(--white-a06)",
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: "transparent",
    borderRadius: 0,
    fontSize: 12,
    color: "var(--text-primary)",
    backgroundColor: "transparent",
  },
  backgroundTabSelected: {
    color: "var(--accent)",
    borderBottomColor: "var(--accent)",
  },
  empty: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    gap: 17,
    color: "var(--text-subtle)",
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "var(--surface-popover)",
    color: "var(--accent)",
    boxShadow: "0 5px 25px var(--black-a44)",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 500,
    color: "var(--text-secondary)",
    margin: 0,
  },
  emptyText: {
    fontSize: 12,
    color: "var(--text-subtle)",
    textAlign: "center",
    lineHeight: 1.7,
    maxWidth: 300,
    margin: 0,
  },

  modal: {
    width: 470,
    backgroundColor: "var(--surface-modal)",
    backdropFilter: "blur(32px) saturate(1.3)",
    backgroundImage:
      "linear-gradient(145deg,var(--white-a09),var(--white-a00))",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--white-a1c)",
    borderRadius: "var(--radius-dialog)",
    boxShadow: "0 25px 100px var(--black-a88)",
    padding: 25,
  },
  modalTitle: { fontSize: 17, fontWeight: 600, margin: "0 0 23px" },
  status: {
    pointerEvents: "none",
    position: "absolute",
    bottom: 12,
    left: 12,
    padding: "11px 16px",
    backgroundColor: "var(--surface-control)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--white-a16)",
    borderRadius: "var(--radius-panel)",
    boxShadow: "0 5px 20px var(--black-a55)",
    zIndex: 50,
    maxWidth: "min(520px, calc(100% - 24px))",
    color: "var(--text-primary)",
    fontSize: 12,
  },
  progress: {
    height: 5,
    backgroundColor: "var(--surface-panel)",
    borderRadius: "var(--radius-control)",
    overflow: "hidden",
    marginBlock: 20,
  },
  bar: (progress: number) => ({
    height: "100%",
    width: `${progress}%`,
    backgroundColor: "var(--accent)",
  }),
  box: {
    padding: 11,
    borderRadius: 6,
    backgroundColor: "var(--surface-raised)",
    marginBottom: 10,
  },
  inputTitle: {
    backgroundColor: "transparent",
    borderWidth: 0,
    color: "var(--text-secondary)",
    width: 240,
    padding: 5,
  },
  badge: {
    fontSize: 9,
    color: "var(--accent)",
    backgroundColor: "var(--badge-surface)",
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
function unavailableTool(
  id: string,
  project: Project | null,
): string | undefined {
  if (!project) return "Open a recording to edit its settings";
  if (id === "cursor" && !project.cursor.length)
    return "There is no mouse cursor recorded";
  if (id === "camera" && !project.source.camera) return "No camera recorded";
  if (id === "shortcuts" && !project.shortcuts?.length)
    return "No keyboard shortcuts during recording";
}
export default function App() {
  const [cropping, setCropping] = useState(false);
  const maskDrag = useRef<{
    project: Project;
    mask: Mask;
    time: number;
    x: number;
    y: number;
    width: number;
    height: number;
    draft: Mask;
    handle: MaskHandle;
  } | null>(null);

  const [captionBusy, setCaptionBusy] = useState(false);
  const [musicBusy, setMusicBusy] = useState(false);
  const [previewQuality, setPreviewQuality] = useState<
    "quality" | "performance"
  >("quality");
  const [previewPowerSaving, setPreviewPowerSaving] = useState(false);
  const [previewHeight, setPreviewHeight] = useState(() => {
    try {
      const saved = Number(localStorage.getItem("refract.preview.height"));
      return previewSizes.some((size) => size === saved) ? saved : 1080;
    } catch {
      return 1080;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("refract.preview.height", String(previewHeight));
    } catch {
      /* Preview sizing still works when storage is unavailable. */
    }
  }, [previewHeight]);
  const [captionLocale, setCaptionLocale] = useState("en-US");
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
    [timelineTracks, setTimelineTracks] = useState<TimelineTracks>({
      zoom: true,
      mask: false,
      camera: false,
      shortcuts: false,
    }),
    [modal, setModal] = useState<"export" | "presets" | null>(null),
    [commandOpen, setCommandOpen] = useState(false),
    [status, setStatus] = useState(""),
    [dirty, setDirty] = useState(false),
    [exporting, setExporting] = useState(false),
    [exportError, setExportError] = useState(""),
    [progress, setProgress] = useState(0),
    [fps, setFps] = useState(30),
    [resolution, setResolution] = useState(1920),
    [format, setFormat] = useState<"mp4" | "gif">("mp4"),
    [exportDestination, setExportDestination] = useState<"file" | "clipboard">(
      "file",
    ),
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
  useEffect(() => {
    void window.refract
      ?.setExportAvailability?.(
        !!project && !exporting && !modal && !cropping && !commandOpen,
      )
      .catch(() => {});
  }, [!!project, exporting, modal, cropping, commandOpen]);
  const video = useRef<HTMLVideoElement>(null),
    cameraVideo = useRef<HTMLVideoElement>(null),
    canvas = useRef<HTMLCanvasElement>(null),
    input = useRef<HTMLInputElement>(null),
    captionInput = useRef<HTMLInputElement>(null),
    cancelExport = useRef(false),
    projectRef = useRef(project),
    selectionRef = useRef(selection),
    dirtyRef = useRef(dirty),
    replacingProject = useRef(false),
    timeRef = useRef(time),
    seekRevision = useRef(0),
    playingRef = useRef(playing),
    bgImage = useRef<HTMLImageElement | null>(null),
    requestPreview = useRef<() => void>(() => {});
  const cancelMaskDrag = () => {
    if (!maskDrag.current) return;
    maskDrag.current = null;
    requestPreview.current();
  };

  projectRef.current = project;
  selectionRef.current = selection;
  dirtyRef.current = dirty;
  // During playback the media clock owns this ref; unrelated React renders
  // must not overwrite it with the throttled timeline display value.
  if (!playing) timeRef.current = time;
  playingRef.current = playing;
  useEffect(() => {
    if (project?.cameraLayouts?.length)
      setTimelineTracks((v) => ({ ...v, camera: true }));
    else if (!project?.source.camera)
      setTimelineTracks((v) => ({ ...v, camera: false }));
  }, [project?.id, project?.cameraLayouts?.length, project?.source.camera]);
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
  async function allowProjectReplacement() {
    const current = projectRef.current;
    if (!current || !dirtyRef.current) return true;
    if (!window.refract) return window.confirm("Discard unsaved changes?");
    const result = await confirmProjectReplacement({
      snapshot: current,
      current: () => projectRef.current,
      choose: () => window.refract!.confirmUnsaved(current.title),
      save: () => window.refract!.saveProject(current),
    });
    if (result.saved) {
      dirtyRef.current = false;
      setDirty(false);
    }
    return result.proceed;
  }

  useEffect(() =>
    window.refract?.onProjectGuard(async (id) => {
      if (replacingProject.current || cropping || modal || exporting) {
        await window.refract?.projectGuardResult(id, false);
        return;
      }
      replacingProject.current = true;
      let allowed = false;
      try {
        allowed = await allowProjectReplacement();
      } catch (error) {
        tell(String(error));
      } finally {
        replacingProject.current = false;
        await window.refract?.projectGuardResult(id, allowed);
      }
    }),
  );

  useBackgroundAudio(project, time, playing, previewSpeed, tell);
  useMicrophoneAudio(project, time, playing, previewSpeed, tell);
  const auditionClick = useClickAudio(
    project,
    timeRef,
    seekRevision,
    playing,
    previewSpeed,
    tell,
  );
  const audioPreview = useAudioPreview(
    project,
    playing || exporting || tab !== "audio",
    tell,
  );
  async function importBackgroundAudio(libraryName?: string) {
    if (!project || musicBusy || !window.refract) return;
    const id = project.id;
    setMusicBusy(true);
    try {
      const track = libraryName
        ? await window.refract.audioLibraryImport(libraryName)
        : await window.refract.importBackgroundAudio();
      const current = projectRef.current;
      if (track && current?.id === id)
        edit({ ...current, backgroundAudio: track });
    } catch (error) {
      tell(String(error));
    } finally {
      setMusicBusy(false);
    }
  }

  async function importVideo() {
    if (replacingProject.current) return;
    replacingProject.current = true;
    try {
      if (!(await allowProjectReplacement())) return;
      if (window.refract) {
        const result = await window.refract.importVideo();
        if (result)
          load(createProject(result.source, result.title), result.url);
      } else input.current?.click();
    } catch (e) {
      tell(String(e));
    } finally {
      replacingProject.current = false;
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
    if (replacingProject.current) return;
    replacingProject.current = true;
    try {
      if (!window.refract) {
        tell("Open saved projects in the Refract desktop application.");
        return;
      }
      if (!(await allowProjectReplacement())) return;
      const r = await window.refract.openProject();
      if (r) load(validateProject(r.project), r.url, r.cameraUrl);
    } catch (e) {
      tell(String(e));
    } finally {
      replacingProject.current = false;
    }
  }
  async function save(saveAs = false) {
    if (!project) return;
    try {
      if (window.refract) {
        const dest = await window.refract.saveProject(project, saveAs);
        if (dest) {
          if (projectRef.current === project) setDirty(false);
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
    seekRevision.current++;
    timeRef.current = Math.max(0, Math.min(project ? duration(project) : 0, t));
    setTime(timeRef.current);
    setPlaying(false);
  };
  const pausePreview = () => {
    // Freeze the source before a slow frame or a new UI can publish stale time.
    const media = video.current;
    const current = projectRef.current;
    if (media && current && playingRef.current) {
      media.pause();
      timeRef.current = previewTransport(
        current,
        timeRef.current,
        {
          time: media.currentTime * 1000,
          seeking: media.seeking,
          ready: media.readyState >= 2,
          ended: media.ended,
        },
        false,
      ).position;
      setTime(timeRef.current);
    }
    playingRef.current = false;
    setPlaying(false);
  };
  const togglePlayback = () => {
    if (!project) return;
    if (playing) {
      pausePreview();
      return;
    }
    if (timeRef.current >= duration(project)) {
      seekRevision.current++;
      timeRef.current = 0;
      setTime(0);
    }
    setPlaying(true);
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
    else if (selection.type === "camera")
      edit({
        ...project,
        cameraLayouts: (project.cameraLayouts ?? []).filter(
          (l) => l.id !== selection.id,
        ),
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
    if (m.end <= m.start) return;
    edit({ ...project, masks: [...project.masks, m] });
    setTimelineTracks((t) => ({ ...t, mask: true }));
    setSelection({ type: "mask", id: m.id });
  }
  useEffect(() => {
    const img = project?.appearance.image;
    if (!img) {
      bgImage.current = null;
      return;
    }
    const im = new Image();
    im.crossOrigin = "anonymous";
    let cancelled = false;
    im.onload = () => {
      if (cancelled) return;
      bgImage.current = im;
      requestPreview.current();
    };
    im.src = img;
    return () => {
      cancelled = true;
    };
  }, [project?.appearance.image]);
  useEffect(() => {
    const v = video.current;
    if (!v || !project) return;
    const source = sourceAt(project, time);
    if (!source) return;
    v.volume = Math.min(1, clipAudioGain(project, source.segment));
    v.muted = project.appearance.muted || !!source.segment.muted;
    const desired = Math.min(
      Math.max(0, v.duration - 0.02),
      source.time / 1000,
    );
    if (
      (!playing || v.paused) &&
      Number.isFinite(desired) &&
      Math.abs(v.currentTime - desired) > 0.04
    )
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
    let id: number | undefined,
      lastState = performance.now();
    let lastDraw = -Infinity;
    const tick = (now: number) => {
      id = undefined;
      const p = projectRef.current,
        c = canvas.current,
        v = video.current;
      if (
        p &&
        c &&
        v &&
        v.readyState >= 2 &&
        (!previewPowerSaving ||
          !playingRef.current ||
          now - lastDraw >= 1000 / 30 - 0.5)
      ) {
        lastDraw = now;
        const holder = c.parentElement!;
        const d = previewDimensions(
          p,
          holder.clientWidth - 28,
          holder.clientHeight - 22,
          window.devicePixelRatio,
        );
        const cssWidth = `${d.cssWidth}px`,
          cssHeight = `${d.cssHeight}px`;
        if (c.style.width !== cssWidth) c.style.width = cssWidth;
        if (c.style.height !== cssHeight) c.style.height = cssHeight;
        if (c.width !== d.width || c.height !== d.height) {
          c.width = d.width;
          c.height = d.height;
        }
        const ctx = c.getContext("2d");
        if (ctx) {
          drawFrame(
            ctx,
            v,
            maskDrag.current?.project === p
              ? {
                  ...p,
                  masks: p.masks.map((m) =>
                    m.id === maskDrag.current!.mask.id
                      ? maskDrag.current!.draft
                      : m,
                  ),
                }
              : p,
            timeRef.current,
            d.width,
            d.height,
            bgImage.current ?? undefined,
            cameraVideo.current && cameraVideo.current.readyState >= 2
              ? cameraVideo.current
              : undefined,
            previewQuality,
          );
          const selected = selectionRef.current;
          const selectedMask =
            selected?.type === "mask"
              ? p.masks.find((m) => m.id === selected.id)
              : undefined;
          if (selectedMask)
            drawMaskSelection(
              ctx,
              p,
              maskDrag.current?.project === p
                ? maskDrag.current.draft
                : selectedMask,
              timeRef.current,
              d.width,
              d.height,
              d.width / d.cssWidth,
            );
        }
      }
      if (playingRef.current && p && v) {
        const next = previewTransport(
          p,
          timeRef.current,
          {
            time: v.currentTime * 1000,
            seeking: v.seeking,
            ready: v.readyState >= 2,
            ended: v.ended,
          },
          loop,
        );
        timeRef.current = next.position;
        if (next.seek !== undefined) {
          v.currentTime = next.seek / 1000;
          const source = sourceAt(p, next.position);
          if (source) v.playbackRate = source.segment.speed * previewSpeed;
          void v.play().catch(() => setPlaying(false));
        }
        if (next.ended) {
          playingRef.current = false;
          setPlaying(false);
          v.pause();
        }
        if (next.ended || next.seek !== undefined || now - lastState > 30) {
          setTime(next.position);
          lastState = now;
        }
      }
      if (playingRef.current) id = requestAnimationFrame(tick);
    };
    const invalidate = () => {
      if (id !== undefined) return;
      id = requestAnimationFrame(tick);
    };
    requestPreview.current = invalidate;
    const media = [video.current, cameraVideo.current].filter(
      (v): v is HTMLVideoElement => !!v,
    );
    // loadeddata may precede the decoded texture reaching the compositor.
    // Frame callbacks invalidate once it is actually available, including while paused.
    const frameCallbacks = new Map<HTMLVideoElement, number>();
    let observingFrames = true;
    const observeFrame = (v: HTMLVideoElement) => {
      frameCallbacks.set(
        v,
        v.requestVideoFrameCallback(() => {
          if (!observingFrames) return;
          invalidate();
          observeFrame(v);
        }),
      );
    };
    for (const v of media) observeFrame(v);
    const events = ["loadeddata", "seeked", "resize", "timeupdate"];
    for (const v of media)
      for (const event of events) v.addEventListener(event, invalidate);
    const resize = new ResizeObserver(invalidate);
    if (canvas.current?.parentElement)
      resize.observe(canvas.current.parentElement);
    window.addEventListener("resize", invalidate);
    // Moving between displays can change pixel density without changing CSS size.
    let density: MediaQueryList;
    const watchDensity = () => {
      density?.removeEventListener("change", watchDensity);
      density = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      density.addEventListener("change", watchDensity);
      invalidate();
    };
    watchDensity();
    invalidate();
    return () => {
      if (id !== undefined) cancelAnimationFrame(id);
      requestPreview.current = () => {};
      observingFrames = false;
      for (const [v, callback] of frameCallbacks)
        v.cancelVideoFrameCallback(callback);
      resize.disconnect();
      window.removeEventListener("resize", invalidate);
      density.removeEventListener("change", watchDensity);
      for (const v of media)
        for (const event of events) v.removeEventListener(event, invalidate);
    };
  }, [
    previewSpeed,
    loop,
    url,
    cameraUrl,
    project?.id,
    previewQuality,
    previewPowerSaving,
  ]);
  useEffect(() => {
    requestPreview.current();
  }, [project, time, playing, selection]);
  useEffect(() => {
    const action = (a: string) => {
      cancelMaskDrag();
      const focused = document.activeElement;
      const editingText =
        focused instanceof HTMLTextAreaElement ||
        (focused instanceof HTMLInputElement &&
          ![
            "range",
            "checkbox",
            "radio",
            "button",
            "submit",
            "file",
            "color",
          ].includes(focused.type)) ||
        (focused instanceof HTMLElement && focused.isContentEditable);
      if ((a === "undo" || a === "redo") && editingText) {
        void window.refract?.editText(a).catch((error) => tell(String(error)));
        return;
      }
      if (cropping || modal) return;
      if (a === "commands" && !exporting && !modal) {
        pausePreview();
        setCommandOpen((v) => !v);
      }
      if (a === "import") void importVideo();
      if (a === "open") void open();
      if (a === "save") void save();
      if (a === "saveAs") void save(true);
      if (a === "export" && project) {
        pausePreview();
        setModal("export");
      }
      if (a === "previous-clipboard-exports") {
        void window.refract
          ?.showClipboardExports()
          .catch((error) => tell(String(error)));
      }
      if (project && !exportBusy.current) {
        if (a === "export-file" || a === "export-clipboard") {
          const destination = a === "export-file" ? "file" : "clipboard";
          setExportDestination(destination);
          setModal("export");
          void exportVideo(undefined, destination);
        }
        if (a === "quick-export-file" || a === "quick-export-clipboard") {
          quickExport(a === "quick-export-file" ? "file" : "clipboard");
        }
      }
      if (a === "undo") undo();
      if (a === "redo") redo();
    };
    const off = window.refract?.onMenu(action);
    const key = (e: KeyboardEvent) => {
      if (cropping || e.defaultPrevented || e.isComposing) return;
      if (!["Shift", "Control", "Alt", "Meta"].includes(e.key))
        cancelMaskDrag();
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === "k" &&
        !modal &&
        !exporting
      ) {
        e.preventDefault();
        pausePreview();
        setCommandOpen((v) => !v);
        return;
      }
      if (modal || commandOpen) return;
      if (
        (e.target instanceof HTMLElement && e.target.isContentEditable) ||
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      )
        return;
      if (e.code === "Space") {
        if (
          e.metaKey ||
          e.ctrlKey ||
          e.altKey ||
          (e.target instanceof Element &&
            e.target.closest("button,[role='button'],a[href]"))
        )
          return;
        e.preventDefault();
        if (!e.repeat) togglePlayback();
        return;
      }
      if (
        !modal &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        (e.key === "1" || e.key === "2" || e.key === "3" || e.key === "4")
      ) {
        const track =
          e.key === "1"
            ? "zoom"
            : e.key === "2"
              ? "camera"
              : e.key === "3"
                ? "shortcuts"
                : "mask";
        if (track === "camera" && !project?.source.camera) return;
        if (track === "shortcuts" && !project?.shortcuts?.length) return;
        setTimelineTracks((t) => ({ ...t, [track]: !t[track] }));
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
  async function generateCaptions() {
    if (!project || !window.refract || captionBusy) return;
    const source = project.source;
    setCaptionBusy(true);
    try {
      const result = await window.refract.generateCaptions(
        project,
        captionLocale,
      );
      const current = projectRef.current;
      if (!current || current.source !== source) return;
      if (!result.captions.length) {
        tell("No speech was found in this video.");
        return;
      }
      edit({ ...current, captions: result.captions });
      tell(`Generated ${result.captions.length} captions locally.`);
    } catch (error) {
      tell(String(error));
    } finally {
      setCaptionBusy(false);
    }
  }
  const completedRecordings = useRef(new RecordingCompletions());
  const exportBusy = useRef(false);
  async function exportVideo(
    recording?: {
      project: Project;
      url: string;
      cameraUrl?: string;
      completion: RecordingCompletion;
    },
    destination = exportDestination,
    quickSettings?: RecordingCompletion,
  ) {
    if (exportBusy.current) return;
    const exportProject = recording?.project ?? project;
    const exportUrl = recording?.url ?? url;
    const exportCameraUrl = recording ? recording.cameraUrl : cameraUrl;
    const exportResolution =
      recording?.completion.resolution ??
      quickSettings?.resolution ??
      resolution;
    const exportFps = recording?.completion.fps ?? quickSettings?.fps ?? fps;
    const exportFormat = recording || quickSettings ? "mp4" : format;
    const targetDestination = recording
      ? recording.completion.action === "export-clipboard"
        ? "clipboard"
        : "file"
      : destination;
    if (!exportProject || !window.refract) {
      tell("Video export is available in the desktop app.");
      return;
    }
    const api = window.refract,
      p = structuredClone(exportProject),
      size = dimensions(p, exportResolution);
    exportBusy.current = true;
    pausePreview();
    cancelExport.current = false;
    let v: HTMLVideoElement | undefined;
    let cam: HTMLVideoElement | undefined;
    try {
      const id = await api.exportStart({
        project: p,
        ...size,
        fps: exportFps,
        format: exportFormat,
        destination: targetDestination,
      });
      if (!id) {
        if (recording || quickSettings) setModal(null);
        return;
      }
      setExporting(true);
      setExportError("");
      setProgress(0);
      v = document.createElement("video");
      v.crossOrigin = "anonymous";
      v.muted = true;
      v.preload = "auto";
      await loadExportVideo(v, exportUrl);
      if (exportCameraUrl) {
        cam = document.createElement("video");
        cam.crossOrigin = "anonymous";
        cam.muted = true;
        await loadExportVideo(cam, exportCameraUrl);
      }
      const out = document.createElement("canvas");
      out.width = size.width;
      out.height = size.height;
      const ctx = out.getContext("2d")!;
      const frames = Math.ceil((duration(p) / 1000) * exportFps);
      for (let i = 0; i < frames; i++) {
        if (cancelExport.current) throw Error("Export cancelled.");
        const t = (i / exportFps) * 1000,
          source = sourceAt(p, t)!.time / 1000;
        const target = Math.min(source, v.duration - 0.001);
        await seekExportVideo(v, target);
        if (cam) {
          const targetCamera = Math.min(target, cam.duration - 0.001);
          await seekExportVideo(cam, targetCamera);
        }
        drawFrame(
          ctx,
          v,
          p,
          t,
          size.width,
          size.height,
          recording ? undefined : (bgImage.current ?? undefined),
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
      tell(
        targetDestination === "clipboard"
          ? "Video copied to clipboard."
          : `Exported ${dest.split("/").pop()}`,
      );
      setModal(null);
    } catch (e) {
      await api.exportCancel();
      setExportError(cancelExport.current ? "" : String(e));
      tell(String(e));
    } finally {
      for (const video of [v, cam]) {
        if (!video) continue;
        video.pause();
        video.removeAttribute("src");
        video.load();
        video.remove();
      }
      exportBusy.current = false;
      setExporting(false);
    }
  }
  function quickExport(destination: "file" | "clipboard") {
    if (!project || !window.refract || exportBusy.current) return;
    let settings = recordingCompletion(null);
    try {
      settings = recordingCompletion(
        JSON.parse(
          localStorage.getItem("refract.recorder.completion") ?? "null",
        ),
      );
    } catch {
      /* Use defaults if saved settings are unavailable. */
    }
    setExportDestination(destination);
    setModal("export");
    void exportVideo(undefined, destination, settings);
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
        const next = validateProject(result.project);
        if (!completedRecordings.current.accept(next.id)) return;
        load(next, result.url, result.cameraUrl);
        const completion = recordingCompletion(result.completion);
        if (completion.action !== "create-project") {
          setModal("export");
          setResolution(completion.resolution);
          setFps(completion.fps);
          setFormat("mp4");
          void exportVideo({
            project: next,
            url: result.url,
            cameraUrl: result.cameraUrl,
            completion,
          });
        }
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
  const cursorSpring =
    project?.appearance.cursorSpring ??
    cursorPresets[
      project?.appearance.cursorAnimation === "none"
        ? "smooth"
        : (project?.appearance.cursorAnimation ?? "smooth")
    ];
  const trimBounds = project && clip ? clipTrimBounds(project, clip.id) : null;
  const editClipTrim = (side: "start" | "end", seconds: number) => {
    if (!project || !clip) return;
    pausePreview();
    const next = trimClip(
      project,
      clip.id,
      side,
      (seconds * 1000 - clip[side]) / clip.speed,
    );
    if (next !== project) edit(next, `clip-trim-${clip.id}-${side}`);
  };
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
  const openCrop = async () => {
    if (!project || cropping) return;
    pausePreview();
    if (!window.refract) {
      setCropping(true);
      return;
    }
    if (!video.current || video.current.readyState < 2) {
      tell("Wait for the video frame to load.");
      return;
    }
    const previousFocus = document.activeElement;
    const frame = document.createElement("canvas");
    frame.width = project.source.width;
    frame.height = project.source.height;
    frame
      .getContext("2d")!
      .drawImage(video.current, 0, 0, frame.width, frame.height);
    setCropping(true);
    try {
      const crop = await window.refract.cropOpen({
        width: frame.width,
        height: frame.height,
        initial: project.crop,
        image: frame.toDataURL("image/png"),
      });
      if (crop) edit({ ...project, crop });
    } catch (error) {
      tell(String(error));
    } finally {
      setCropping(false);
      requestAnimationFrame(() => {
        if (previousFocus instanceof HTMLElement && previousFocus.isConnected)
          previousFocus.focus({ preventScroll: true });
      });
    }
  };
  const commands: EditorCommand[] = [
    ...previewSizes.map((height) => ({
      id: `preview-size-${height}`,
      label: `Preview size: ${height}p`,
      group: "Playback",
      keywords: "preview resolution height performance",
      run: () => setPreviewHeight(height),
    })),
    {
      id: "record",
      disabled: !window.refract,
      label: "New recording",
      group: "Recording",
      shortcut: "⌘N",
      run: () => {
        void window.refract?.showRecorder();
      },
    },
    {
      id: "open",
      label: "Open project…",
      group: "Project",
      shortcut: "⌘O",
      run: () => {
        void open();
      },
    },
    {
      id: "import",
      label: "Create project from video…",
      group: "Project",
      shortcut: "⌘I",
      keywords: "import",
      run: () => {
        void importVideo();
      },
    },
    {
      id: "save",
      label: "Save project",
      group: "Project",
      shortcut: "⌘S",
      disabled: !project,
      run: () => {
        void save();
      },
    },
    {
      id: "save-as",
      label: "Save project as…",
      group: "Project",
      shortcut: "⇧⌘S",
      disabled: !project,
      run: () => {
        void save(true);
      },
    },
    {
      id: "export",
      label: "Export video…",
      group: "Export",
      shortcut: "⇧⌘E",
      keywords: "mp4 gif",
      disabled: !project,
      run: () => setModal("export"),
    },
    {
      id: "export-clipboard",
      label: "Export to clipboard",
      group: "Export",
      keywords: "copy video current settings",
      disabled: !project || exporting || !window.refract,
      run: () => {
        setExportDestination("clipboard");
        setModal("export");
        void exportVideo(undefined, "clipboard");
      },
    },
    {
      id: "quick-export-file",
      label: "Quick export to file…",
      group: "Export",
      shortcut: "⌥⌘S",
      disabled: !project || exporting || !window.refract,
      run: () => quickExport("file"),
    },
    {
      id: "quick-export-clipboard",
      label: "Quick export to clipboard",
      group: "Export",
      shortcut: "⌥⌘C",
      disabled: !project || exporting || !window.refract,
      run: () => quickExport("clipboard"),
    },
    {
      id: "previous-clipboard-exports",
      label: "Show previous clipboard exports",
      group: "Export",
      keywords: "folder copies videos",
      disabled: !window.refract,
      run: () => {
        void window.refract
          ?.showClipboardExports()
          .catch((error) => tell(String(error)));
      },
    },
    {
      id: "cut",
      label: "Split clip at playhead",
      group: "Editing",
      shortcut: "C",
      keywords: "cut",
      disabled: !project,
      run: cut,
    },
    {
      id: "zoom",
      label: "Add zoom at playhead",
      group: "Editing",
      disabled: !project,
      run: () => {
        setTimelineTracks((t) => ({ ...t, zoom: true }));
        addZoom();
      },
    },
    {
      id: "mask",
      label: "Add mask at playhead",
      group: "Editing",
      keywords: "blur highlight",
      disabled: !project,
      run: addMask,
    },
    {
      id: "crop",
      label: "Crop recording…",
      group: "Editing",
      disabled: !project,
      run: () => void openCrop(),
    },
    {
      id: "copy-frame",
      label: "Copy current frame",
      group: "Export",
      keywords: "image clipboard",
      disabled: !project,
      run: () => {
        void copyFrame();
      },
    },
    {
      id: "undo",
      label: "Undo",
      group: "Editing",
      shortcut: "⌘Z",
      disabled: !history.past.length,
      run: undo,
    },
    {
      id: "redo",
      label: "Redo",
      group: "Editing",
      shortcut: "⇧⌘Z",
      disabled: !history.future.length,
      run: redo,
    },
    ...tabs.map((item) => ({
      id: `settings-${item.id}`,
      label: `Show ${item.title.toLowerCase()} settings`,
      group: "Settings",
      disabled: !!unavailableTool(item.id, project),
      run: () => {
        setSelection(null);
        setTab(item.id);
      },
    })),
  ];
  return (
    <div {...sx.props(s.app)} inert={cropping && !!window.refract}>
      {commandOpen && (
        <CommandMenu
          commands={commands}
          onClose={() => setCommandOpen(false)}
        />
      )}
      {cropping && project && !window.refract && (
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
      <header
        {...sx.props(s.header)}
        className={`titlebar ${sx.props(s.header).className}`}
      >
        {window.refract ? (
          <div style={{ width: 69 }} />
        ) : (
          <div {...sx.props(s.traffic)}>
            {[
              "var(--window-close)",
              "var(--window-minimize)",
              "var(--window-maximize)",
            ].map((c) => (
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
            pausePreview();
            setModal("export");
          }}
        >
          <Upload size={13} />
          Export
        </Button>
      </header>
      <main {...sx.props(s.body)}>
        <div {...sx.props(s.workspace)}>
          <div {...sx.props(s.previewRow)}>
            <section {...sx.props(s.stage)}>
              <div
                {...sx.props(s.stageTools)}
                style={!project ? { visibility: "hidden" } : undefined}
              >
                {project ? (
                  <>
                    <AspectRatioPicker
                      value={project.appearance.ratio}
                      alwaysKeepZoomedIn={project.appearance.alwaysKeepZoomedIn}
                      onKeepZoomedIn={(alwaysKeepZoomedIn) =>
                        appearance({ alwaysKeepZoomedIn })
                      }
                      onChange={(ratio) => appearance({ ratio })}
                    />
                    <Button
                      onClick={() => {
                        void openCrop();
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
              <div
                {...sx.props(s.canvasHolder)}
                style={{ maxHeight: previewHeight + 22 }}
              >
                {project ? (
                  <canvas
                    ref={canvas}
                    {...sx.props(s.canvas)}
                    aria-label="Video composition preview"
                    tabIndex={mask ? 0 : undefined}
                    style={{
                      cursor: mask ? "move" : z ? "crosshair" : "default",
                    }}
                    onLostPointerCapture={cancelMaskDrag}
                    onPointerDown={(e) => {
                      if (!mask || e.button !== 0) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const point = sourcePointAt(
                        project,
                        time,
                        rect.width,
                        rect.height,
                        e.clientX - rect.left,
                        e.clientY - rect.top,
                      );
                      const source = sourceAt(project, time)?.time ?? 0;
                      const handle = maskHandleAt(
                        project,
                        mask,
                        time,
                        rect.width,
                        rect.height,
                        e.clientX - rect.left,
                        e.clientY - rect.top,
                      );
                      if (
                        source < mask.start ||
                        source >= mask.end ||
                        (!handle &&
                          (!point ||
                            point.x < mask.x ||
                            point.x > mask.x + mask.width ||
                            point.y < mask.y ||
                            point.y > mask.y + mask.height))
                      )
                        return;
                      pausePreview();
                      e.currentTarget.focus({ preventScroll: true });
                      e.currentTarget.setPointerCapture(e.pointerId);
                      maskDrag.current = {
                        project,
                        mask,
                        time,
                        x: e.clientX,
                        y: e.clientY,
                        width: rect.width,
                        height: rect.height,
                        draft: mask,
                        handle: handle ?? "move",
                      };
                    }}
                    onPointerMove={(e) => {
                      const drag = maskDrag.current;
                      if (drag) {
                        drag.draft = dragMask(
                          drag.project,
                          drag.mask,
                          drag.time,
                          drag.width,
                          drag.height,
                          e.clientX - drag.x,
                          e.clientY - drag.y,
                          drag.handle,
                        );
                        requestPreview.current();
                      }
                    }}
                    onPointerUp={(e) => {
                      const drag = maskDrag.current;
                      cancelMaskDrag();
                      if (!drag || project !== drag.project) return;
                      const moved = dragMask(
                        project,
                        drag.mask,
                        drag.time,
                        drag.width,
                        drag.height,
                        e.clientX - drag.x,
                        e.clientY - drag.y,
                        drag.handle,
                      );
                      if (
                        moved.x !== drag.mask.x ||
                        moved.y !== drag.mask.y ||
                        moved.width !== drag.mask.width ||
                        moved.height !== drag.mask.height
                      )
                        edit({
                          ...project,
                          masks: project.masks.map((m) =>
                            m.id === moved.id ? moved : m,
                          ),
                        });
                    }}
                    onPointerCancel={cancelMaskDrag}
                    onKeyDown={(e) => {
                      if (e.key === "Escape" && maskDrag.current) {
                        cancelMaskDrag();
                        e.preventDefault();
                        e.stopPropagation();
                      }
                    }}
                    onClick={(e) => {
                      if (z) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const point = sourcePointAt(
                          project,
                          time,
                          e.currentTarget.width,
                          e.currentTarget.height,
                          ((e.clientX - rect.left) / rect.width) *
                            e.currentTarget.width,
                          ((e.clientY - rect.top) / rect.height) *
                            e.currentTarget.height,
                        );
                        if (point) zoomEdit({ ...point, mode: "manual" });
                      }
                    }}
                  />
                ) : (
                  <div {...sx.props(s.empty)}>
                    <div {...sx.props(s.emptyIcon)}>
                      <Film size={31} strokeWidth={1.3} />
                    </div>
                    <h1 {...sx.props(s.emptyTitle)}>
                      Make your next recording.
                    </h1>
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
              {status ? (
                <div role="status" {...sx.props(s.status)}>
                  {status}
                </div>
              ) : null}
            </section>
            <nav aria-label="Recording tools" {...sx.props(s.tools)}>
              {tabs.map((t) => {
                const active = tab === t.id && !selection;
                const unavailable = unavailableTool(t.id, project);
                return (
                  <Tooltip key={t.id} label={unavailable ?? t.title}>
                    {(descriptionId) => (
                      <button
                        type="button"
                        aria-describedby={descriptionId}
                        aria-label={t.title}
                        aria-pressed={active}
                        disabled={!!unavailable}
                        data-motion="static"
                        {...sx.props(
                          s.tool,
                          active && s.toolActive,
                          !!unavailable && s.toolUnavailable,
                        )}
                        onClick={() => {
                          setTab(t.id);
                          setSelection(null);
                        }}
                      >
                        <t.icon size={16} strokeWidth={1.5} />
                        {active && !unavailable && (
                          <span
                            aria-hidden="true"
                            {...sx.props(s.toolIndicator)}
                          />
                        )}
                      </button>
                    )}
                  </Tooltip>
                );
              })}
            </nav>
          </div>
          <div {...sx.props(s.transport)}>
            <div {...sx.props(s.transportLeft)}>
              {project && (
                <TimelineVisibility
                  tracks={timelineTracks}
                  hasCamera={!!project.source.camera}
                  hasShortcuts={!!project.shortcuts?.length}
                  onChange={setTimelineTracks}
                />
              )}
            </div>
            <div {...sx.props(s.transportCenter)}>
              <span
                className="playback-timer"
                role="timer"
                aria-label="Playback position"
              >
                {formatTime(time, true)} /{" "}
                {formatTime(project ? duration(project) : 0, true)}
              </span>
              <button
                type="button"
                data-playback-time
                title="Copy playback position"
                {...sx.props(s.time)}
                onClick={() => {
                  void navigator.clipboard
                    .writeText(
                      playbackTime(time, 60, project ? duration(project) : 0),
                    )
                    .then(
                      () => setStatus("Copied to clipboard"),
                      () => setStatus("Could not copy timestamp"),
                    );
                }}
              >
                {playbackTime(
                  time,
                  60,
                  project ? duration(project) : 0,
                  !playing,
                )}
              </button>
              <div {...sx.props(s.playButtons)}>
                <Button
                  icon
                  size="toolbar"
                  title="Start"
                  disabled={!project}
                  onClick={() => seek(0)}
                >
                  <SkipBack size={16} />
                </Button>
                <Button
                  icon
                  size="toolbarWide"
                  title={playing ? "Pause" : "Play"}
                  disabled={!project}
                  onClick={togglePlayback}
                >
                  <StateIcon
                    active={playing}
                    size={24}
                    on={<Pause size={24} />}
                    off={<Play size={24} />}
                  />
                </Button>
                <Button
                  icon
                  size="toolbar"
                  title="End"
                  disabled={!project}
                  onClick={() => seek(project ? duration(project) : 0)}
                >
                  <SkipForward size={16} />
                </Button>
              </div>
              <button
                type="button"
                data-playback-time
                title="Copy video duration"
                {...sx.props(s.time)}
                onClick={() => {
                  void navigator.clipboard
                    .writeText(
                      playbackTime(
                        project ? duration(project) : 0,
                        60,
                        project ? duration(project) : 0,
                      ),
                    )
                    .then(
                      () => setStatus("Copied to clipboard"),
                      () => setStatus("Could not copy timestamp"),
                    );
                }}
              >
                {playbackTime(
                  project ? duration(project) : 0,
                  60,
                  project ? duration(project) : 0,
                  !playing,
                )}
              </button>
            </div>
            <div {...sx.props(s.transportRight)}>
              {project && (
                <>
                  <Button title="Cut at playhead (C)" onClick={cut} icon>
                    <Scissors size={14} />
                  </Button>
                  <span
                    aria-hidden="true"
                    style={{
                      width: 1,
                      height: 24,
                      marginInline: 3,
                      flexShrink: 0,
                      background: "var(--white-a12)",
                    }}
                  />
                </>
              )}
              <Button
                active={loop}
                aria-pressed={loop}
                icon
                title="Loop playback"
                onClick={() => setLoop((v) => !v)}
              >
                <Repeat2 size={14} />
              </Button>
              <Button
                icon
                title={
                  project?.appearance.muted
                    ? "Unmute source audio"
                    : "Mute source audio"
                }
                aria-pressed={project?.appearance.muted ?? false}
                disabled={!project?.source.hasAudio}
                onClick={() =>
                  appearance({ muted: !project?.appearance.muted })
                }
              >
                <StateIcon
                  active={project?.appearance.muted ?? false}
                  size={14}
                  on={<VolumeX size={14} />}
                  off={<Volume2 size={14} />}
                />
              </Button>
              <PreviewSettings
                quality={previewQuality}
                powerSaving={previewPowerSaving}
                onQuality={setPreviewQuality}
                onPowerSaving={setPreviewPowerSaving}
              />
              <PlaybackSpeed value={previewSpeed} onChange={setPreviewSpeed} />
              {project && (
                <input
                  aria-label="Timeline zoom"
                  type="range"
                  min={1}
                  max={8}
                  step={0.1}
                  value={timelineZoom}
                  onChange={(e) => setTimelineZoom(Number(e.target.value))}
                  style={{ width: 72, minWidth: 72, marginLeft: 6 }}
                />
              )}
            </div>
          </div>
        </div>
        <aside {...sx.props(s.sidebar)}>
          <div {...sx.props(s.panel)}>
            {!project ? (
              <>
                <Heading>Background</Heading>
                <Note>Your recording settings will appear here.</Note>
              </>
            ) : z ? (
              <>
                <div style={{ marginBottom: 3 }}>
                  <Button
                    title="Close Zoom editor"
                    onClick={() => setSelection(null)}
                  >
                    <ChevronLeft size={13} />
                    Close Zoom editor
                  </Button>
                </div>
                <Heading>Zoom</Heading>
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
                {z.mode === "manual" && (
                  <>
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
                  </>
                )}
                <Note>
                  {z.mode === "manual"
                    ? "Click the preview to choose a focus point."
                    : "Auto zoom follows recorded mouse movement. Imported videos do not include cursor metadata."}
                </Note>
                <Toggle
                  label="Instant animation"
                  value={z.instantAnimation ?? false}
                  onChange={(instantAnimation) =>
                    zoomEdit({ instantAnimation })
                  }
                />
                <Toggle
                  label="Enabled"
                  value={!z.disabled}
                  onChange={(v) => zoomEdit({ disabled: !v })}
                />
                {z.mode === "auto" && (
                  <Disclosure label="Advanced">
                    <Range
                      label="Snap to edges"
                      value={(z.snapToEdgesRatio ?? 0.25) * 100}
                      min={0}
                      max={45}
                      step={1}
                      unit="% of visible area"
                      resetValue={25}
                      onChange={(value) =>
                        zoomEdit({ snapToEdgesRatio: value / 100 })
                      }
                    />
                    <Note>
                      Bring nearby recording edges into view as the camera
                      follows the cursor.
                    </Note>
                  </Disclosure>
                )}
                <Divider />
                <Button onClick={removeSelection}>
                  <Trash2 size={13} />
                  Remove zoom
                </Button>
              </>
            ) : clip ? (
              <>
                <div style={{ marginBottom: 3 }}>
                  <Button
                    title="Close Slice editor"
                    onClick={() => setSelection(null)}
                  >
                    <ChevronLeft size={13} />
                    Close Slice editor
                  </Button>
                </div>
                <Heading>Clip</Heading>
                <Toggle
                  label="Hide mouse cursor"
                  value={!!clip.hideCursor}
                  onChange={(hideCursor) =>
                    edit({
                      ...project,
                      segments: project.segments.map((c) =>
                        c.id === clip.id ? { ...c, hideCursor } : c,
                      ),
                    })
                  }
                />
                {(project.source.hasAudio || project.microphoneAudio) && (
                  <>
                    <Toggle
                      label="Mute clip audio"
                      value={!!clip.muted}
                      onChange={(muted) =>
                        edit({
                          ...project,
                          segments: project.segments.map((c) =>
                            c.id === clip.id ? { ...c, muted } : c,
                          ),
                        })
                      }
                    />
                    <Range
                      label="Clip volume"
                      value={(clip.volume ?? 1) * 100}
                      max={100}
                      unit="%"
                      resetValue={100}
                      onChange={(volume) =>
                        edit(
                          {
                            ...project,
                            segments: project.segments.map((c) =>
                              c.id === clip.id
                                ? { ...c, volume: volume / 100 }
                                : c,
                            ),
                          },
                          `clip-volume:${clip.id}`,
                        )
                      }
                    />
                  </>
                )}
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
                  min={(trimBounds?.startMin ?? 0) / 1000}
                  max={(trimBounds?.startMax ?? clip.start) / 1000}
                  step={0.01}
                  unit="s"
                  onChange={(start) => editClipTrim("start", start)}
                />
                <Range
                  label="Trim end"
                  value={clip.end / 1000}
                  min={(trimBounds?.endMin ?? clip.end) / 1000}
                  max={(trimBounds?.endMax ?? clip.end) / 1000}
                  step={0.01}
                  unit="s"
                  onChange={(end) => editClipTrim("end", end)}
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
                <div style={{ marginBottom: 3 }}>
                  <Button
                    title="Close Mask editor"
                    onClick={() => setSelection(null)}
                  >
                    <ChevronLeft size={13} />
                    Close Mask editor
                  </Button>
                </div>
                <Heading>Mask & highlight</Heading>
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
                <Note>
                  Drag the mask to move it, or drag a corner to resize it.
                </Note>
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
                <div {...sx.props(s.backgroundTabs)}>
                  {(["wallpaper", "gradient", "color", "image"] as const).map(
                    (v) => (
                      <button
                        key={v}
                        data-motion="static"
                        aria-pressed={project.appearance.background === v}
                        {...sx.props(
                          s.backgroundTab,
                          project.appearance.background === v &&
                            s.backgroundTabSelected,
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
                    <WallpaperPicker
                      value={project.appearance.wallpaper}
                      onChange={(wallpaper) => appearance({ wallpaper })}
                    />
                    <Divider />
                  </>
                ) : project.appearance.background === "image" ? (
                  <>
                    <BackgroundImagePicker
                      key={project.id}
                      value={project.appearance.image}
                      onChange={(image) =>
                        appearance({ image, background: "image" })
                      }
                    />
                    <Divider />
                  </>
                ) : (
                  <>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      <span>
                        {project.appearance.background === "color"
                          ? "Background Color"
                          : "Background Gradient"}
                      </span>
                      <div style={{ display: "flex", gap: 8 }}>
                        <input
                          aria-label="Background color"
                          type="color"
                          value={project.appearance.color}
                          onChange={(e) =>
                            appearance({
                              color: e.target.value,
                              gradientStops: undefined,
                            })
                          }
                        />
                        {project.appearance.background === "gradient" ? (
                          <input
                            aria-label="Gradient second color"
                            type="color"
                            value={project.appearance.color2}
                            onChange={(e) =>
                              appearance({
                                color2: e.target.value,
                                gradientStops: undefined,
                              })
                            }
                          />
                        ) : null}
                      </div>
                    </div>
                    {project.appearance.background === "gradient" && (
                      <Disclosure label="Gradient presets" defaultOpen>
                        <GradientPresets
                          appearance={project.appearance}
                          onChange={(colors) =>
                            appearance({
                              color: colors[0],
                              color2: colors[colors.length - 1],
                              gradientStops: [...colors],
                            })
                          }
                        />
                      </Disclosure>
                    )}
                    <Divider />
                  </>
                )}
                {(project.appearance.background === "wallpaper" ||
                  project.appearance.background === "image") && (
                  <Range
                    label="Background blur"
                    preview={false}
                    value={project.appearance.blur}
                    max={100}
                    onChange={(blur) => appearance({ blur })}
                  />
                )}
                <Range
                  label="Padding"
                  step={0.001}
                  formatValue={(value) => `${value.toFixed(1)}%`}
                  resetValue={defaults.padding}
                  value={project.appearance.padding}
                  max={35}
                  unit="%"
                  onChange={(padding) => appearance({ padding })}
                />
                <Range
                  label="Rounded corners"
                  resetValue={defaults.radius}
                  value={screenCorners(project.appearance).outer}
                  max={200}
                  onChange={(outerRadius) => appearance({ outerRadius })}
                />
                <Range
                  label="Inset"
                  resetValue={defaults.inset}
                  value={project.appearance.inset}
                  max={60}
                  step={0.001}
                  formatValue={(value) => value.toFixed(0)}
                  onChange={(inset) => appearance(insetAppearance(inset))}
                />
                {project.appearance.inset ? (
                  <InsetColors
                    video={video}
                    crop={
                      project.crop ?? {
                        x: 0,
                        y: 0,
                        width: project.source.width,
                        height: project.source.height,
                      }
                    }
                    source={url}
                    playing={playing}
                    value={project.appearance.insetColor}
                    onChange={(insetColor) => appearance({ insetColor })}
                  />
                ) : null}
                {project.appearance.inset > 0 && (
                  <Range
                    label="Inset opacity"
                    value={project.appearance.insetOpacity ?? 1}
                    min={0}
                    max={1}
                    step={0.001}
                    preview={false}
                    onChange={(insetOpacity) => appearance({ insetOpacity })}
                  />
                )}
                {project.appearance.inset > 0 && (
                  <Disclosure label="Inset balance">
                    <InsetBalance
                      value={project.appearance.insetBalance}
                      onChange={(insetBalance) => appearance({ insetBalance })}
                    />
                  </Disclosure>
                )}
                <Range
                  label="Shadow"
                  preview={false}
                  resetValue={defaults.shadow}
                  value={project.appearance.shadow}
                  min={0}
                  max={1}
                  step={0.001}
                  onChange={(shadow) => appearance({ shadow })}
                />
                <Disclosure label="Advanced shadow settings">
                  <Toggle
                    label="Directional shadow"
                    disabled={
                      !supportsDirectionalShadow(
                        project.source.width,
                        project.source.height,
                      )
                    }
                    value={project.appearance.shadowDirectional}
                    onChange={(shadowDirectional) =>
                      appearance({
                        shadowDirectional,
                        shadow: shadowDirectional ? 0.4 : defaults.shadow,
                      })
                    }
                  />
                  {!supportsDirectionalShadow(
                    project.source.width,
                    project.source.height,
                  ) && (
                    <Note>
                      Directional shadow is disabled for recordings on large
                      screens.
                    </Note>
                  )}
                  <Range
                    label="Shadow Distance"
                    preview={false}
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
                    preview={false}
                    value={project.appearance.shadowBlur}
                    min={5}
                    max={30}
                    resetValue={defaults.shadowBlur}
                    onChange={(shadowBlur) => appearance({ shadowBlur })}
                  />
                </Disclosure>
              </>
            ) : tab === "cursor" ? (
              <>
                <Heading>Cursor</Heading>
                {sourceAt(project, time)?.segment.hideCursor && (
                  <>
                    <Note>
                      The cursor is hidden in this clip. Change its clip setting
                      to see cursor adjustments here.
                    </Note>
                    <Button
                      onClick={() => {
                        const segment = sourceAt(project, time)?.segment;
                        if (segment)
                          setSelection({ type: "clip", id: segment.id });
                      }}
                    >
                      Open clip settings
                    </Button>
                    <Divider />
                  </>
                )}
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
                      onChange={(cursorSmooth) =>
                        appearance({
                          cursorSmooth,
                          cursorAnimation:
                            cursorSmooth &&
                            project.appearance.cursorAnimation === "none"
                              ? "smooth"
                              : project.appearance.cursorAnimation,
                        })
                      }
                    />
                    <Toggle
                      label="Loop cursor position"
                      value={project.appearance.cursorLoopMs !== null}
                      onChange={(enabled) =>
                        appearance({ cursorLoopMs: enabled ? 1000 : null })
                      }
                    />
                    <Note>
                      Near the end of the video, the cursor returns to its
                      starting position.
                    </Note>
                    {project.appearance.cursorLoopMs !== null && (
                      <Range
                        label="Loop cursor position duration"
                        value={project.appearance.cursorLoopMs / 1000}
                        min={1}
                        max={4}
                        step={0.1}
                        unit="s"
                        onChange={(seconds) =>
                          appearance({
                            cursorLoopMs: Math.round(seconds * 1000),
                          })
                        }
                      />
                    )}
                    <Row>
                      <label htmlFor="click-effect">Click effect</label>
                      <select
                        id="click-effect"
                        value={project.appearance.clickEffect}
                        onChange={(e) =>
                          appearance({
                            clickEffect: e.target
                              .value as Appearance["clickEffect"],
                          })
                        }
                      >
                        <option value="none">None</option>
                        <option value="circle">Circle</option>
                        <option value="ripple">Ripple</option>
                      </select>
                    </Row>
                    <Row>
                      <label htmlFor="click-sound">Click sound</label>
                      <select
                        id="click-sound"
                        value={project.appearance.clickSound ?? "none"}
                        onChange={(e) => {
                          const value = e.target.value as
                            "none" | "soft" | "mechanical";
                          appearance({ clickSound: value });
                          if (value !== "none") void auditionClick(value);
                        }}
                      >
                        <option value="none">None</option>
                        <option value="soft">Soft</option>
                        <option value="mechanical">Mechanical</option>
                      </select>
                    </Row>
                    {project.appearance.clickSound &&
                      project.appearance.clickSound !== "none" && (
                        <>
                          <Range
                            label="Click sound volume"
                            value={
                              (project.appearance.clickSoundVolume ?? 0.25) *
                              100
                            }
                            min={0}
                            max={100}
                            step={5}
                            unit="%"
                            resetValue={25}
                            onChange={(value) => {
                              appearance({ clickSoundVolume: value / 100 });
                              void auditionClick(
                                project.appearance.clickSound as
                                  "soft" | "mechanical",
                                value / 100,
                              );
                            }}
                          />
                          <Button
                            onClick={() =>
                              void auditionClick(
                                project.appearance.clickSound as
                                  "soft" | "mechanical",
                              )
                            }
                          >
                            Play click sound preview
                          </Button>
                        </>
                      )}
                    <Divider />
                    <Toggle
                      label="Hide cursor if not moving"
                      value={project.appearance.cursorIdleMs !== null}
                      onChange={(enabled) =>
                        appearance({ cursorIdleMs: enabled ? 2000 : null })
                      }
                    />
                    {project.appearance.cursorIdleMs !== null && (
                      <Range
                        label="Hide not moving cursor after"
                        value={project.appearance.cursorIdleMs / 1000}
                        min={0.5}
                        max={5}
                        step={0.1}
                        unit="s"
                        onChange={(seconds) =>
                          appearance({
                            cursorIdleMs: Math.round(seconds * 1000),
                          })
                        }
                      />
                    )}
                  </>
                )}
              </>
            ) : tab === "audio" ? (
              <>
                {project.microphoneAudio && (
                  <>
                    <Heading>Microphone</Heading>
                    <Toggle
                      label="Mute microphone"
                      value={project.microphoneAudio.muted}
                      onChange={(muted) =>
                        edit({
                          ...project,
                          microphoneAudio: {
                            ...project.microphoneAudio!,
                            muted,
                          },
                        })
                      }
                    />
                    {!project.microphoneAudio.muted && (
                      <Range
                        label="Microphone volume"
                        value={project.microphoneAudio.volume * 100}
                        max={100}
                        resetValue={100}
                        unit="%"
                        onChange={(volume) =>
                          edit(
                            {
                              ...project,
                              microphoneAudio: {
                                ...project.microphoneAudio!,
                                volume: volume / 100,
                              },
                            },
                            "microphone-volume",
                          )
                        }
                      />
                    )}
                    <Divider />
                  </>
                )}
                {project.source.hasAudio && (
                  <>
                    <Heading>
                      {project.microphoneAudio ? "System audio" : "Audio"}
                    </Heading>
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
                    <Divider />
                  </>
                )}
                <Heading>Background audio</Heading>
                <AudioLibrary
                  disabled={musicBusy || !window.refract}
                  onSelect={importBackgroundAudio}
                />
                {project.backgroundAudio ? (
                  <>
                    <Button
                      disabled={!audioPreview.ready}
                      title={`${audioPreview.playing ? "Stop" : "Play"} ${project.backgroundAudio.name}`}
                      onClick={() => {
                        pausePreview();
                        audioPreview.toggle();
                      }}
                    >
                      {audioPreview.playing ? (
                        <CircleStop size={14} style={{ flexShrink: 0 }} />
                      ) : (
                        <CirclePlay size={14} style={{ flexShrink: 0 }} />
                      )}
                      <span {...sx.props(s.audioTrackName)}>
                        {audioPreview.playing ? "Stop" : "Play"}{" "}
                        {project.backgroundAudio.name}
                      </span>
                    </Button>
                    <Toggle
                      label="Mute background audio"
                      value={project.backgroundAudio.muted}
                      onChange={(muted) =>
                        edit({
                          ...project,
                          backgroundAudio: {
                            ...project.backgroundAudio!,
                            muted,
                          },
                        })
                      }
                    />
                    {!project.backgroundAudio.muted && (
                      <Range
                        label="Background audio volume"
                        value={project.backgroundAudio.volume * 100}
                        max={100}
                        resetValue={5}
                        unit="%"
                        onChange={(volume) =>
                          edit(
                            {
                              ...project,
                              backgroundAudio: {
                                ...project.backgroundAudio!,
                                volume: volume / 100,
                              },
                            },
                            "background-audio-volume",
                          )
                        }
                      />
                    )}
                    <Button
                      onClick={() =>
                        edit({ ...project, backgroundAudio: undefined })
                      }
                    >
                      Remove background audio
                    </Button>
                  </>
                ) : null}
                <Button
                  disabled={musicBusy || !window.refract}
                  onClick={() => void importBackgroundAudio()}
                >
                  {musicBusy
                    ? "Adding audio…"
                    : project.backgroundAudio
                      ? "Replace background audio…"
                      : "Add background audio…"}
                </Button>
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
                        !project.appearance.screenSpring &&
                          project.appearance.animation === v &&
                          s.segmentActive,
                      )}
                      onClick={() =>
                        appearance({ animation: v, screenSpring: undefined })
                      }
                    >
                      {v[0].toUpperCase() + v.slice(1)}
                    </button>
                  ))}
                </div>
                <Note>
                  Choose how screen movement settles between zooms. Preview and
                  export use the same motion.
                </Note>
                {project.appearance.animation !== "instant" && (
                  <SpringControls
                    target="screen"
                    value={
                      project.appearance.screenSpring ??
                      screenPresets[project.appearance.animation]
                    }
                    onChange={(screenSpring) => appearance({ screenSpring })}
                    onReset={() => appearance({ screenSpring: undefined })}
                  />
                )}
                <Divider />
                <span>Cursor animation style</span>
                <div {...sx.props(s.segmented)} style={{ marginTop: 12 }}>
                  {(["smooth", "medium", "rapid", "none"] as const).map(
                    (style) => (
                      <button
                        key={style}
                        {...sx.props(
                          s.segment,
                          !project.appearance.cursorSpring &&
                            (project.appearance.cursorSmooth
                              ? project.appearance.cursorAnimation
                              : "none") === style &&
                            s.segmentActive,
                        )}
                        onClick={() =>
                          appearance({
                            cursorSpring: undefined,
                            cursorAnimation: style,
                            cursorSmooth: style !== "none",
                          })
                        }
                      >
                        {style[0].toUpperCase() + style.slice(1)}
                      </button>
                    ),
                  )}
                </div>
                <Note>
                  Choose how the cursor settles into each new position.
                </Note>
                {project.appearance.cursorSmooth &&
                  project.appearance.cursorAnimation !== "none" && (
                    <SpringControls
                      target="cursor"
                      value={cursorSpring}
                      onChange={(cursorSpring) => appearance({ cursorSpring })}
                      onReset={() => appearance({ cursorSpring: undefined })}
                    />
                  )}
                <Divider />
                <Range
                  label="Motion blur"
                  value={(project.appearance.motionBlurAmount ?? 0) * 100}
                  min={0}
                  max={100}
                  step={1}
                  unit="%"
                  onChange={(value) =>
                    appearance({ motionBlurAmount: value / 100 })
                  }
                />
                <Note>Add motion blur while the cursor or screen moves.</Note>
                <Disclosure label="Advanced motion blur settings">
                  <Range
                    label="Screen movement blur"
                    value={(project.appearance.screenMoveBlur ?? 0) * 100}
                    min={0}
                    max={100}
                    step={1}
                    unit="%"
                    onChange={(value) =>
                      appearance({ screenMoveBlur: value / 100 })
                    }
                  />
                  <Range
                    label="Screen zoom blur"
                    value={(project.appearance.screenZoomBlur ?? 0) * 100}
                    min={0}
                    max={100}
                    step={1}
                    unit="%"
                    onChange={(value) =>
                      appearance({ screenZoomBlur: value / 100 })
                    }
                  />
                  <Range
                    label="Cursor motion blur"
                    value={(project.appearance.cursorMotionBlur ?? 0) * 100}
                    min={0}
                    max={100}
                    step={1}
                    unit="%"
                    onChange={(value) =>
                      appearance({ cursorMotionBlur: value / 100 })
                    }
                  />
                </Disclosure>
              </>
            ) : tab === "captions" ? (
              <>
                <Heading>Captions</Heading>
                <Row>
                  <span>Language</span>
                  <select
                    aria-label="Caption language"
                    value={captionLocale}
                    disabled={captionBusy}
                    onChange={(e) => setCaptionLocale(e.target.value)}
                  >
                    {[
                      ["en-US", "English (US)"],
                      ["en-GB", "English (UK)"],
                      ["es-ES", "Spanish"],
                      ["fr-FR", "French"],
                      ["de-DE", "German"],
                      ["it-IT", "Italian"],
                      ["pt-BR", "Portuguese"],
                      ["ja-JP", "Japanese"],
                    ].map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Row>
                <Button
                  primary
                  disabled={
                    captionBusy ||
                    (!project.source.hasAudio && !project.microphoneAudio) ||
                    !window.refract
                  }
                  onClick={generateCaptions}
                >
                  {captionBusy
                    ? "Generating captions…"
                    : project.captions.length
                      ? "Regenerate captions locally"
                      : "Generate captions locally"}
                </Button>
                {captionBusy && (
                  <Button onClick={() => void window.refract?.cancelCaptions()}>
                    Cancel generation
                  </Button>
                )}
                <Note>
                  Speech is processed on this Mac. A language model may download
                  from Apple the first time. Captions follow your cuts and speed
                  changes.
                </Note>
                {!project.source.hasAudio && !project.microphoneAudio && (
                  <Note>This video has no audio track.</Note>
                )}
                <Divider />
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
                  and speed changes. Edit the generated text above to correct
                  any transcription errors.
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
                    <CameraLayouts
                      selectedId={
                        selection?.type === "camera" ? selection.id : undefined
                      }
                      onReveal={() =>
                        setTimelineTracks((v) => ({ ...v, camera: true }))
                      }
                      project={project}
                      time={time}
                      edit={edit}
                      seek={seek}
                    />
                  </>
                )}
              </>
            ) : project ? (
              <ShortcutSettings project={project} edit={edit} seek={seek} />
            ) : (
              <Note>Open a recording to edit its shortcuts.</Note>
            )}
          </div>
        </aside>
      </main>
      {project ? (
        <Timeline
          tracks={timelineTracks}
          project={project}
          time={time}
          seek={seek}
          edit={edit}
          selection={selection}
          select={(next) => {
            setSelection(next);
            if (next?.type === "camera") setTab("camera");
          }}
          zoom={timelineZoom}
        />
      ) : (
        <div
          style={{
            height: 192,
            borderTopWidth: 1,
            borderTopStyle: "solid",
            borderTopColor: "var(--white-a0a)",
            background: "var(--surface-app)",
          }}
        />
      )}
      <video
        crossOrigin="anonymous"
        ref={cameraVideo}
        src={cameraUrl || undefined}
        style={{ display: "none" }}
        muted
        playsInline
      />
      <video
        crossOrigin="anonymous"
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
      {modal ? (
        <Modal
          aria-label={modal === "export" ? "Export video" : "Presets"}
          {...sx.props(s.modal)}
          dismissible={!exporting}
          onDismiss={() => setModal(null)}
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
                  {exportError && <p role="alert">{exportError}</p>}
                  <Row>
                    <span>Export to</span>
                    <select
                      aria-label="Export destination"
                      value={exportDestination}
                      onChange={(e) =>
                        setExportDestination(
                          e.target.value as "file" | "clipboard",
                        )
                      }
                    >
                      <option value="file">File</option>
                      <option value="clipboard">Clipboard</option>
                    </select>
                  </Row>
                  <Divider />
                  <Row>
                    <span>Export as</span>
                    <select
                      aria-label="Export format"
                      value={format}
                      onChange={(e) => {
                        const next = e.target.value as "mp4" | "gif";
                        setFormat(next);
                        setFps((current) => exportFrameRate(next, current));
                      }}
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
                      {exportFrameRates[format].map((n) => (
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
                    {format === "gif"
                      ? "Your framing, zooms, masks, captions, and cuts are included. GIF exports are silent."
                      : "Your framing, zooms, masks, captions, cuts, and audio settings are included."}
                  </Note>
                  <Row>
                    <Button onClick={() => setModal(null)}>Cancel</Button>
                    <Button
                      primary
                      defaultAction
                      onClick={() => void exportVideo()}
                    >
                      <Upload size={14} />
                      {exportDestination === "clipboard"
                        ? "Export to clipboard"
                        : "Export to file"}
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
                  data-dialog-initial
                  aria-label="Preset name"
                  type="text"
                  placeholder="Preset name"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                />
                <Button
                  primary
                  defaultAction
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
        </Modal>
      ) : null}
    </div>
  );
}
