import { useEffect, useState } from "react";
import { FolderOpen } from "lucide-react";
import * as sx from "@stylexjs/stylex";
import { Button, Note } from "./ui";

const styles = sx.create({
  root: { display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 },
  label: { color: "var(--text-secondary)", fontSize: 12 },
  select: { width: "100%", minWidth: 0 },
});

export function AudioLibrary({
  disabled,
  onSelect,
}: {
  disabled: boolean;
  onSelect: (name: string) => void;
}) {
  const [tracks, setTracks] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const api = window.refract;
    if (!api) return;
    let cancelled = false;
    let pending = false;
    const refresh = async () => {
      if (pending || cancelled) return;
      pending = true;
      try {
        const next = await api.audioLibraryList();
        if (!cancelled) {
          setTracks((current) =>
            current.length === next.length &&
            current.every((name, i) => name === next[i])
              ? current
              : next,
          );
          setLoaded(true);
          setError("");
        }
      } catch {
        if (!cancelled) setError("The audio library could not be read.");
      } finally {
        pending = false;
      }
    };
    void refresh();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 1500);
    window.addEventListener("focus", refresh);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  return (
    <div {...sx.props(styles.root)}>
      <label {...sx.props(styles.label)} htmlFor="audio-library-track">
        User Library
      </label>
      {tracks.length > 0 ? (
        <select
          id="audio-library-track"
          {...sx.props(styles.select)}
          value=""
          disabled={disabled}
          onChange={(event) => {
            if (event.target.value) onSelect(event.target.value);
          }}
        >
          <option value="" disabled>
            Choose a track…
          </option>
          {tracks.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      ) : (
        <Note>
          {loaded
            ? "Add audio tracks to your library folder to access them here."
            : "Loading audio library…"}
        </Note>
      )}
      <Button
        disabled={!window.refract}
        onClick={() => {
          void window.refract
            ?.audioLibraryOpen()
            .catch(() =>
              setError("The audio library folder could not be opened."),
            );
        }}
      >
        <FolderOpen size={14} />
        Open audio library folder
      </Button>
      {error && (
        <div role="status">
          <Note>{error}</Note>
        </div>
      )}
    </div>
  );
}
