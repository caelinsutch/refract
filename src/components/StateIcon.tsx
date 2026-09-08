import type { ReactNode } from "react";

/** Keep both glyphs mounted so interrupted state changes reverse smoothly. */
export function StateIcon({
  active,
  on,
  off,
  size,
}: {
  active: boolean;
  on: ReactNode;
  off: ReactNode;
  size: number;
}) {
  return (
    <span
      data-state-icon
      aria-hidden="true"
      style={{ width: size, height: size }}
    >
      <span data-visible={!active}>{off}</span>
      <span data-visible={active}>{on}</span>
    </span>
  );
}
