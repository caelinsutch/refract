import { useEffect, useRef, useState } from "react";
import { ImageIcon } from "lucide-react";
import * as sx from "@stylexjs/stylex";
const styles = sx.create({
  card: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    minHeight: 132,
    overflow: "hidden",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--white-a20)",
    borderRadius: 8,
    backgroundColor: "var(--white-a0a)",
    color: "var(--text-secondary)",
    padding: 0,
  },
  active: { borderColor: "var(--primary)", color: "var(--text-primary)" },
  image: {
    display: "block",
    maxWidth: "100%",
    maxHeight: 240,
    objectFit: "contain",
  },
  instructions: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    padding: 20,
    fontSize: 12,
    lineHeight: 1.4,
    textAlign: "center",
  },
  overlay: {
    position: "absolute",
    inset: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  glass: {
    backgroundColor: "var(--surface-popover)",
    backdropFilter: "blur(10px)",
    borderRadius: "var(--radius-control)",
  },
});
export function BackgroundImagePicker({
  value,
  onChange,
}: {
  value?: string;
  onChange: (value: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null),
    card = useRef<HTMLButtonElement>(null),
    hover = useRef(false),
    attempt = useRef(0);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [dragging, setDragging] = useState(false);
  const callback = useRef(onChange);
  callback.current = onChange;
  const load = async (file: File) => {
    const id = ++attempt.current;
    setError("");
    setBusy(true);
    try {
      if (
        !/^image\//.test(file.type) &&
        !/\.(png|jpe?g|webp|gif|avif)$/i.test(file.name)
      )
        throw Error("Choose an image file.");
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(Error("The image could not be read."));
        reader.readAsDataURL(file);
      });
      const image = new Image();
      image.src = data;
      await image.decode();
      if (id === attempt.current) callback.current(data);
    } catch {
      if (id === attempt.current)
        setError("This image could not be opened. Choose another image.");
    } finally {
      if (id === attempt.current) setBusy(false);
    }
  };
  const loadRef = useRef(load);
  loadRef.current = load;
  useEffect(() => {
    const paste = (event: ClipboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || target.matches("input,textarea"))
      )
        return;
      if (!hover.current && !card.current?.contains(document.activeElement))
        return;
      const file = Array.from(event.clipboardData?.items ?? [])
        .find((item) => item.kind === "file" && item.type.startsWith("image/"))
        ?.getAsFile();
      if (file) {
        event.preventDefault();
        event.stopPropagation();
        void loadRef.current(file);
      }
    };
    document.addEventListener("paste", paste);
    return () => {
      attempt.current++;
      document.removeEventListener("paste", paste);
    };
  }, []);
  const message = (
    <span {...sx.props(styles.instructions)}>
      <ImageIcon size={24} />
      <span>
        {busy
          ? "Opening image…"
          : "Click to select, drop image, or press ⌘V while hovering."}
      </span>
    </span>
  );
  return (
    <div>
      <button
        ref={card}
        type="button"
        aria-label="Choose background image"
        aria-busy={busy}
        {...sx.props(styles.card, dragging && styles.active)}
        onPointerEnter={() => {
          hover.current = true;
        }}
        onPointerLeave={() => {
          hover.current = false;
        }}
        onClick={() => input.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
          setDragging(true);
        }}
        onDragLeave={(event) => {
          if (
            !(event.relatedTarget instanceof Node) ||
            !event.currentTarget.contains(event.relatedTarget)
          )
            setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setDragging(false);
          const file = event.dataTransfer.files[0];
          if (file) void load(file);
        }}
      >
        {value ? (
          <>
            <img
              src={value}
              alt="Background image preview"
              {...sx.props(styles.image)}
            />
            <span {...sx.props(styles.overlay)}>
              <span {...sx.props(styles.glass)}>{message}</span>
            </span>
          </>
        ) : (
          message
        )}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void load(file);
        }}
      />
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
