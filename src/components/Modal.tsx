import { useEffect, useRef, type ComponentProps, type ReactNode } from "react";
/** Native modality keeps focus and editor shortcuts out of the background. */
export function Modal({
  children,
  onDismiss,
  dismissible = true,
  nativeWindow = false,
  ...props
}: {
  children: ReactNode;
  onDismiss: () => void;
  dismissible?: boolean;
  nativeWindow?: boolean;
} & Pick<ComponentProps<"dialog">, "className" | "style" | "aria-label">) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = ref.current!;
    const previous = document.activeElement;
    node.showModal();
    (
      node.querySelector<HTMLElement>("[data-dialog-initial]") ??
      node.querySelector<HTMLElement>("[data-dialog-default]") ??
      node
    ).focus({ preventScroll: true });
    return () => {
      node.close();
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      tabIndex={-1}
      data-native-window={nativeWindow || undefined}
      data-app-dialog
      data-floating-surface="dialog"
      {...props}
      onCancel={(e) => {
        e.preventDefault();
        if (dismissible) onDismiss();
      }}
      onClick={(e) => {
        if (e.target === ref.current) {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            dismissible &&
            (e.clientX < r.left ||
              e.clientX > r.right ||
              e.clientY < r.top ||
              e.clientY > r.bottom)
          )
            onDismiss();
        }
      }}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Tab" && !e.nativeEvent.isComposing) {
          const dialog = ref.current!;
          const controls = Array.from(
            dialog.querySelectorAll<HTMLElement>(
              'button,input,select,textarea,a[href],[tabindex],[contenteditable="true"]',
            ),
          ).filter(
            (node) =>
              node.tabIndex >= 0 &&
              !node.matches(":disabled") &&
              !node.closest("[inert]") &&
              node.getClientRects().length > 0 &&
              getComputedStyle(node).visibility !== "hidden",
          );
          const index = controls.indexOf(document.activeElement as HTMLElement);
          if (
            index < 0 ||
            (e.shiftKey ? index === 0 : index === controls.length - 1)
          ) {
            e.preventDefault();
            (e.shiftKey ? controls.at(-1) : controls[0])?.focus({
              preventScroll: true,
            });
            if (!controls.length) dialog.focus({ preventScroll: true });
          }
          return;
        }
        if (
          e.key !== "Enter" ||
          e.nativeEvent.isComposing ||
          e.repeat ||
          e.defaultPrevented
        )
          return;
        const target = e.target as HTMLElement;
        // Keep native button activation, select menus and multiline editing intact.
        if (target.closest('button,select,textarea,[contenteditable="true"]'))
          return;
        const primary = ref.current?.querySelector<HTMLButtonElement>(
          "[data-dialog-default]",
        );
        if (primary && !primary.disabled) {
          e.preventDefault();
          primary.click();
        }
      }}
    >
      {children}
    </dialog>
  );
}
