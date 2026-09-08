import { type Project, formatTime } from "../core/project";
import { shortcutLabel } from "../core/shortcuts";
import { visibleRange } from "../core/timeline";
import { Button, Divider, Heading, Note, Range, Row, Toggle } from "./ui";
export function ShortcutSettings({
  project,
  edit,
  seek,
}: {
  project: Project;
  edit: (p: Project, group?: string) => void;
  seek: (time: number) => void;
}) {
  const shortcuts = project.shortcuts ?? [];
  if (!shortcuts.length)
    return (
      <>
        <Heading>Shortcuts</Heading>
        <Note>This recording has no captured keyboard shortcuts.</Note>
      </>
    );
  const appearance = (patch: Partial<Project["appearance"]>, group?: string) =>
    edit(
      { ...project, appearance: { ...project.appearance, ...patch } },
      group,
    );
  return (
    <>
      <Heading>Shortcuts</Heading>
      <Toggle
        label="Show shortcuts"
        value={project.appearance.showShortcuts}
        onChange={(showShortcuts) => appearance({ showShortcuts })}
      />
      <Range
        label="Shortcut labels size"
        value={project.appearance.shortcutSize * 100}
        min={50}
        max={200}
        unit="%"
        resetValue={100}
        onChange={(size) =>
          appearance({ shortcutSize: size / 100 }, "shortcut-size")
        }
      />
      <Toggle
        label="Show single key shortcuts"
        value={project.appearance.showSingleKeyShortcuts}
        onChange={(showSingleKeyShortcuts) =>
          appearance({ showSingleKeyShortcuts })
        }
      />
      <Divider />
      {shortcuts.map((shortcut) => {
        const range = visibleRange(project, shortcut);
        if (!range) return null;
        const label = shortcutLabel(shortcut);
        return (
          <div key={shortcut.id} style={{ marginBottom: 16 }}>
            <Row>
              <Button
                title={`Go to ${label}`}
                onClick={() => seek(range.start)}
              >
                {label} · {formatTime(range.start, true)}
              </Button>
            </Row>
            <Toggle
              label={`Show ${label} at ${formatTime(range.start, true)}`}
              value={!shortcut.disabled}
              onChange={(shown) =>
                edit({
                  ...project,
                  shortcuts: shortcuts.map((s) =>
                    s.id === shortcut.id ? { ...s, disabled: !shown } : s,
                  ),
                })
              }
            />
            <Button
              onClick={() =>
                edit({
                  ...project,
                  shortcuts: shortcuts.map((s) =>
                    shortcutLabel(s) === label ? { ...s, disabled: true } : s,
                  ),
                })
              }
            >
              Hide all {label}
            </Button>
          </div>
        );
      })}
    </>
  );
}
