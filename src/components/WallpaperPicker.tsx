import { useEffect, useLayoutEffect, useRef, useState } from "react";
import * as sx from "@stylexjs/stylex";
import { Star, WandSparkles } from "lucide-react";
import { wallpapers } from "../core/compositor";

const storageKey = "refract.wallpaper-favorites";
function readFavorites(): number[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
    return Array.isArray(value)
      ? [
          ...new Set(
            value.filter(
              (id): id is number =>
                Number.isInteger(id) && id >= 0 && id < wallpapers.length,
            ),
          ),
        ]
      : [];
  } catch {
    return [];
  }
}
const s = sx.create({
  root: { display: "flex", flexDirection: "column", gap: 12 },
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  collection: {
    maxWidth: 160,
    fontSize: 12,
    borderWidth: 0,
    borderRadius: 5,
    backgroundColor: "var(--white-a05)",
    color: "var(--text-primary)",
    padding: 4,
  },
  random: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    width: "100%",
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--white-a06)",
    backgroundColor: "var(--white-a05)",
    color: "var(--text-primary)",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, 32px)",
    gap: 7,
    marginBottom: 22,
  },
  swatch: (a: string, b: string, c: string) => ({
    height: 32,
    position: "relative",
    overflow: "hidden",
    borderRadius: "var(--radius-control)",
    borderWidth: 0,
    outlineWidth: 1,
    outlineStyle: "solid",
    outlineColor: "transparent",
    outlineOffset: 1,
    backgroundImage: `linear-gradient(125deg, ${a}, ${b} 56%, ${c})`,
  }),
  selected: { outlineColor: "var(--sample-selected)" },
  star: {
    position: "absolute",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
    color: "white",
    filter: "drop-shadow(0 1px 2px #000)",
    pointerEvents: "none",
    transitionProperty: "opacity",
    transitionDuration: {
      default: "125ms",
      "@media (prefers-reduced-motion: reduce)": "0ms",
    },
    transitionTimingFunction: "ease-in-out",
  },
  empty: {
    fontSize: 12,
    color: "var(--text-secondary)",
    lineHeight: 1.5,
    marginBottom: 12,
  },
  menu: {
    position: "fixed",
    inset: "auto",
    margin: 0,
    width: 190,
    padding: 5,
    borderRadius: 9,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--white-a20)",
    backgroundColor: "var(--surface-popover)",
    color: "var(--text-primary)",
    boxShadow: "0 8px 30px var(--black-a88)",
  },
  item: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    height: 30,
    paddingInline: 8,
    borderWidth: 0,
    borderRadius: 5,
    backgroundColor: "transparent",
    color: "var(--text-primary)",
    fontSize: 12,
  },
});
export function WallpaperPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const [favorites, setFavorites] = useState(readFavorites);
  const [collection, setCollection] = useState("all");
  const [target, setTarget] = useState<{
    id: number;
    x: number;
    y: number;
    anchor: HTMLButtonElement;
  } | null>(null);
  const menu = useRef<HTMLDivElement>(null);
  const collectionControl = useRef<HTMLSelectElement>(null);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === storageKey || event.key === null)
        setFavorites(readFavorites());
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  useLayoutEffect(() => {
    if (!target || !menu.current) return;
    const node = menu.current;
    node.style.left = `${Math.max(4, Math.min(target.x, window.innerWidth - 198))}px`;
    node.style.top = `${Math.max(4, Math.min(target.y, window.innerHeight - 48))}px`;
    node.showPopover();
    node.querySelector("button")?.focus();
  }, [target]);
  const ids =
    collection === "favorites" ? favorites : wallpapers.map((_, i) => i);
  const close = () => {
    menu.current?.hidePopover();
    if (target?.anchor.isConnected) target.anchor.focus();
    else collectionControl.current?.focus();
  };
  return (
    <div {...sx.props(s.root)}>
      <div {...sx.props(s.row)}>
        <span>Wallpaper</span>
        <select
          ref={collectionControl}
          aria-label="Wallpaper collection"
          value={collection}
          onChange={(event) => setCollection(event.target.value)}
          {...sx.props(s.collection)}
        >
          <option value="favorites">★ Favorites</option>
          <option value="all">Refract collection</option>
        </select>
      </div>
      <button
        {...sx.props(s.random)}
        onClick={() => {
          const next = Math.floor(Math.random() * wallpapers.length);
          setCollection("all");
          if (next !== value) onChange(next);
        }}
      >
        <WandSparkles size={13} />
        Pick random wallpaper
      </button>
      {ids.length ? (
        <div role="group" aria-label="Wallpapers" {...sx.props(s.grid)}>
          {ids.map((id) => {
            const colors = wallpapers[id];
            return (
              <button
                key={id}
                data-wallpaper-swatch
                data-motion="static"
                aria-pressed={value === id}
                title={`Wallpaper ${id + 1}`}
                aria-label={`Wallpaper ${id + 1}`}
                aria-description={
                  favorites.includes(id)
                    ? "Favorite wallpaper. Open context menu to remove from favorites."
                    : "Open context menu to add to favorites."
                }
                aria-haspopup="menu"
                {...sx.props(
                  s.swatch(colors[0], colors[1], colors[2]),
                  value === id && s.selected,
                )}
                onClick={() => {
                  if (value !== id) onChange(id);
                }}
                onContextMenu={(event) => {
                  event.preventDefault();
                  setTarget({
                    id,
                    x: event.clientX,
                    y: event.clientY,
                    anchor: event.currentTarget,
                  });
                }}
                onKeyDown={(event) => {
                  if (
                    event.key === "ContextMenu" ||
                    (event.shiftKey && event.key === "F10")
                  ) {
                    event.preventDefault();
                    event.stopPropagation();
                    const r = event.currentTarget.getBoundingClientRect();
                    setTarget({
                      id,
                      x: r.left,
                      y: r.bottom + 4,
                      anchor: event.currentTarget,
                    });
                  }
                }}
              >
                <Star
                  size={16}
                  aria-hidden="true"
                  style={{ opacity: favorites.includes(id) ? 1 : 0 }}
                  {...sx.props(s.star)}
                />
              </button>
            );
          })}
        </div>
      ) : (
        <p {...sx.props(s.empty)}>
          Right-click a wallpaper to add it to favorites.
        </p>
      )}
      <div
        ref={menu}
        popover="auto"
        role="menu"
        aria-label="Wallpaper options"
        data-motion-popover
        {...sx.props(s.menu)}
        onToggle={(event) => {
          if (event.newState === "closed") setTarget(null);
        }}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === "Escape") {
            event.preventDefault();
            close();
          } else if (event.key === "Enter") {
            event.preventDefault();
            menu.current?.querySelector("button")?.click();
          }
        }}
      >
        <button
          role="menuitemcheckbox"
          aria-checked={target ? favorites.includes(target.id) : false}
          {...sx.props(s.item)}
          onClick={() => {
            if (!target) return;
            const next = favorites.includes(target.id)
              ? favorites.filter((id) => id !== target.id)
              : [...favorites, target.id];
            close();
            setFavorites(next);
            try {
              localStorage.setItem(storageKey, JSON.stringify(next));
            } catch {
              /* Session favorites still work without storage. */
            }
            if (collection === "favorites") collectionControl.current?.focus();
          }}
        >
          <Star size={13} />
          Add to favorites
        </button>
      </div>
    </div>
  );
}
