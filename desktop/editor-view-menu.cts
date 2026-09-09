import { Menu, type MenuItemConstructorOptions } from "electron";

const previewSizes = [480, 720, 1080, 1440, 2160];
export function editorViewMenu(
  send: (action: string) => void,
): MenuItemConstructorOptions[] {
  return [
    {
      id: "view-sidebar",
      label: "Show editor sidebar",
      type: "checkbox",
      checked: true,
      enabled: false,
      click: () => send("toggle-sidebar"),
    },
    {
      id: "view-timeline",
      label: "Show editor timeline",
      type: "checkbox",
      checked: true,
      enabled: false,
      click: () => send("toggle-timeline"),
    },
    {
      id: "view-preview",
      label: "Preview mode",
      type: "checkbox",
      enabled: false,
      accelerator: "CmdOrCtrl+Shift+Return",
      click: () => send("toggle-preview"),
    },
    { type: "separator" },
    {
      id: "view-preview-size",
      label: "Preview size",
      enabled: false,
      submenu: previewSizes.map((height) => ({
        id: `view-preview-${height}`,
        label: `${height}p`,
        type: "radio" as const,
        checked: height === 1080,
        click: () => send(`preview-size-${height}`),
      })),
    },
    {
      id: "view-loop",
      label: "Loop playback",
      type: "checkbox",
      enabled: false,
      click: () => send("toggle-loop"),
    },
  ];
}

export function updateEditorViewMenu(
  value: unknown,
  menu = Menu.getApplicationMenu(),
) {
  const state =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const enabled = state.enabled === true;
  for (const id of [
    "view-sidebar",
    "view-timeline",
    "view-preview",
    "view-preview-size",
    "view-loop",
  ]) {
    const item = menu?.getMenuItemById(id);
    if (item) item.enabled = enabled;
  }
  for (const [id, checked] of [
    ["view-sidebar", state.sidebar === true],
    ["view-timeline", state.timeline === true],
    ["view-preview", state.sidebar === false && state.timeline === false],
    ["view-loop", state.loop === true],
  ] as const) {
    const item = menu?.getMenuItemById(id);
    if (item) item.checked = checked;
  }
  const height = previewSizes.includes(Number(state.previewHeight))
    ? Number(state.previewHeight)
    : 1080;
  const selected = menu?.getMenuItemById(`view-preview-${height}`);
  if (selected) selected.checked = true;
}
