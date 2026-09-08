import { useEffect, useRef, useState } from "react";
import * as sx from "@stylexjs/stylex";
import { Search } from "lucide-react";
export type EditorCommand = {
  id: string;
  label: string;
  group: string;
  shortcut?: string;
  keywords?: string;
  disabled?: boolean;
  run: () => void;
};
const s = sx.create({
  dialog: {
    width: 540,
    maxWidth: "calc(100vw - 48px)",
    padding: 0,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#ffffff24",
    backgroundColor: "#1b1d24",
    color: "#eeeef3",
    boxShadow: "0 24px 80px #0009",
  },
  search: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "17px 18px",
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: "#ffffff12",
  },
  input: {
    flex: 1,
    minWidth: 0,
    backgroundColor: "transparent",
    borderWidth: 0,
    outline: "none",
    color: "#f0f0f5",
    fontSize: 15,
  },
  results: { maxHeight: 360, overflowY: "auto", padding: 6 },
  option: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "11px 12px",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 13,
  },
  active: { backgroundColor: "#4d2ff5", color: "white" },
  disabled: { opacity: 0.4, cursor: "default" },
  group: { fontSize: 11, color: "#aaaab7", marginLeft: "auto" },
  footer: {
    display: "flex",
    gap: 14,
    padding: "10px 18px",
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: "#ffffff12",
    fontSize: 11,
    color: "#9696a5",
  },
});
export default function CommandMenu({
  commands,
  onClose,
}: {
  commands: EditorCommand[];
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(""),
    [active, setActive] = useState(0);
  const results = commands.filter((c) =>
    `${c.label} ${c.group} ${c.keywords ?? ""}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  useEffect(() => {
    const node = dialog.current!;
    node.showModal();
    input.current?.focus();
    return () => node.close();
  }, []);
  useEffect(() => {
    dialog.current
      ?.querySelector(`#command-${results[active]?.id}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active, query]);
  const choose = (command: EditorCommand) => {
    if (command.disabled) return;
    onClose();
    command.run();
  };
  return (
    <dialog
      ref={dialog}
      data-command-menu
      aria-label="Command menu"
      {...sx.props(s.dialog)}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          setActive((i) =>
            results.length
              ? (i + (e.key === "ArrowDown" ? 1 : -1) + results.length) %
                results.length
              : 0,
          );
        }
        if (e.key === "Enter") {
          e.preventDefault();
          if (results[active]) choose(results[active]);
        }
      }}
    >
      <div {...sx.props(s.search)}>
        <Search size={18} />
        <input
          ref={input}
          {...sx.props(s.input)}
          aria-label="Search commands"
          role="combobox"
          aria-expanded="true"
          aria-controls="editor-commands"
          aria-activedescendant={
            results[active] ? `command-${results[active].id}` : undefined
          }
          aria-autocomplete="list"
          placeholder="Search commands…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
        />
        <kbd>esc</kbd>
      </div>
      <div
        id="editor-commands"
        role="listbox"
        aria-label="Commands"
        {...sx.props(s.results)}
      >
        {results.length ? (
          results.map((c, i) => (
            <div
              key={c.id}
              id={`command-${c.id}`}
              role="option"
              aria-selected={i === active}
              aria-disabled={!!c.disabled}
              {...sx.props(
                s.option,
                i === active && s.active,
                c.disabled && s.disabled,
              )}
              onMouseMove={() => setActive(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(c)}
            >
              <span>{c.label}</span>
              <span {...sx.props(s.group)}>{c.group}</span>
              {c.shortcut && <kbd>{c.shortcut}</kbd>}
            </div>
          ))
        ) : (
          <p style={{ padding: 12, color: "#a6a6b4" }}>No commands found.</p>
        )}
      </div>
      <div {...sx.props(s.footer)}>
        <span>↑ ↓ Navigate</span>
        <span>↵ Run command</span>
        <span>Esc Close</span>
      </div>
    </dialog>
  );
}
