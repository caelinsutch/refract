type CloseEvent = { preventDefault(): void };
type AppHost = {
  on(event: "before-quit", listener: (event: CloseEvent) => void): unknown;
  quit(): void;
};
type EditorHost = {
  on(event: "close", listener: (event: CloseEvent) => void): unknown;
  isDestroyed(): boolean;
  hide(): void;
};

export function setupEditorLifecycle(
  app: AppHost,
  editor: EditorHost,
  prepareQuit: () => boolean,
  confirm: () => Promise<boolean>,
) {
  let quitting = false;
  let checkingClose = false;
  let checkingQuit = false;
  editor.on("close", (event) => {
    if (quitting) return;
    event.preventDefault();
    if (checkingClose) return;
    checkingClose = true;
    void confirm()
      .then((allowed) => {
        if (allowed && !editor.isDestroyed()) editor.hide();
      })
      .catch(() => {})
      .finally(() => {
        checkingClose = false;
      });
  });
  app.on("before-quit", (event) => {
    if (quitting) return;
    event.preventDefault();
    if (!prepareQuit() || checkingQuit) return;
    checkingQuit = true;
    void confirm()
      .then((allowed) => {
        if (!allowed) return;
        quitting = true;
        app.quit();
      })
      .catch(() => {})
      .finally(() => {
        checkingQuit = false;
      });
  });
}
