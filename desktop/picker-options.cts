import { BrowserWindow, Menu } from "electron";
export function createPickerOptions(onSettings: () => void) {
  let activeMenu: Menu | null = null;
  return {
    cancel() {
      activeMenu?.closePopup();
    },
    open(
      owner: BrowserWindow,
      request: {
        automaticZooms?: boolean;
        completionAction?: string;
        x?: number;
        y?: number;
      },
    ) {
      if (activeMenu || !request || typeof request !== "object") return null;
      return new Promise((resolve) => {
        let selection: {
          settings?: "quick-export";
          automaticZooms?: boolean;
          completionAction?:
            "create-project" | "export-file" | "export-clipboard";
        } | null = null;
        const menu = Menu.buildFromTemplate([
          { label: "After recording:", enabled: false },
          {
            label: "Create project",
            type: "checkbox",
            checked:
              !request.completionAction ||
              request.completionAction === "create-project",
            click: () => {
              selection = { completionAction: "create-project" };
            },
          },
          {
            label: "Export and copy to clipboard",
            type: "checkbox",
            checked: request.completionAction === "export-clipboard",
            click: () => {
              selection = { completionAction: "export-clipboard" };
            },
          },
          { label: "Export and create shareable link", enabled: false },
          {
            label: "Export and save to file",
            type: "checkbox",
            checked: request.completionAction === "export-file",
            click: () => {
              selection = { completionAction: "export-file" };
            },
          },
          { type: "separator" },
          {
            label: "Automatically create zooms",
            type: "checkbox",
            checked: request.automaticZooms !== false,
            click: () => {
              selection = { automaticZooms: request.automaticZooms === false };
            },
          },
          { type: "separator" },
          {
            label: "Quick export settings…",
            click: () => {
              selection = { settings: "quick-export" };
            },
          },
        ]);
        activeMenu = menu;
        const finish = () => {
          if (activeMenu !== menu) return;
          activeMenu = null;
          owner.removeListener("closed", finish);
          resolve(owner.isDestroyed() ? null : selection);
          if (!owner.isDestroyed() && selection?.settings === "quick-export")
            onSettings();
        };
        owner.once("closed", finish);
        const bounds = owner.getContentBounds();
        menu.popup({
          window: owner,
          x: Math.round(
            Math.max(0, Math.min(bounds.width, Number(request.x) || 0)),
          ),
          y: Math.round(
            Math.max(0, Math.min(bounds.height, Number(request.y) || 0)),
          ),
          callback: finish,
        });
      });
    },
  };
}
