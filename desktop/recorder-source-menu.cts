import type { MenuItemConstructorOptions } from "electron";
import type {
  CaptureSource,
  CaptureSources,
  RecorderSourceMenu,
} from "../src/core/recorder.js" with { "resolution-mode": "import" };

export function recorderSourceItems(
  request: RecorderSourceMenu,
  sources: CaptureSources,
  select: (source: CaptureSource) => void,
): MenuItemConstructorOptions[] {
  if (sources.permission !== "granted")
    return [
      { label: "Allow screen recording in macOS Settings", enabled: false },
    ];
  const item = (
    source: CaptureSource,
    label = source.name,
  ): MenuItemConstructorOptions => ({
    label,
    type: "checkbox",
    checked: source.id === request.selected,
    click: () => select(source),
  });
  if (request.kind === "display")
    return sources.displays.length
      ? sources.displays.map((source) => item(source))
      : [{ label: "No displays available", enabled: false }];
  const groups = new Map<string, CaptureSource[]>();
  for (const source of sources.windows) {
    const key = source.appPath || source.app || String(source.id);
    const group = groups.get(key) ?? [];
    group.push(source);
    groups.set(key, group);
  }
  return groups.size
    ? [...groups.values()].map((group) =>
        group.length === 1
          ? item(group[0], group[0].app || group[0].name)
          : {
              label: group[0].app || group[0].name,
              submenu: group.map((source) => item(source)),
            },
      )
    : [{ label: "No windows available", enabled: false }];
}
