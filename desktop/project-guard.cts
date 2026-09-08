import { ipcMain, type BrowserWindow } from "electron";
import { randomUUID } from "node:crypto";

/** Ask the editor that owns the unsaved snapshot before a native action replaces it. */
export function setupProjectGuard(editor: BrowserWindow) {
  let pending: {
    id: string;
    resolve: (allowed: boolean) => void;
    promise: Promise<boolean>;
  } | null = null;
  const settle = (allowed: boolean) => {
    const request = pending;
    pending = null;
    request?.resolve(allowed);
  };
  ipcMain.handle(
    "project-guard-result",
    (event, id: string, allowed: boolean) => {
      if (event.sender !== editor.webContents) throw Error("Unknown sender");
      if (pending?.id === id) settle(allowed === true);
    },
  );
  editor.webContents.on("render-process-gone", () => settle(false));
  editor.webContents.on("did-start-loading", () => settle(false));
  editor.on("closed", () => settle(false));
  return () => {
    if (pending) return pending.promise;
    if (editor.isDestroyed() || editor.webContents.isLoading())
      return Promise.resolve(false);
    const id = randomUUID();
    let resolve!: (allowed: boolean) => void;
    const promise = new Promise<boolean>((done) => {
      resolve = done;
    });
    pending = { id, resolve, promise };
    editor.webContents.send("project-guard-request", id);
    return promise;
  };
}
