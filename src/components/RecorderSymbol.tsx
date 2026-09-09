import { createContext, useContext, type ReactNode } from "react";

export const RecorderSymbols = createContext<Record<string, string>>({});

/** Preserve native point-size metrics, tinting only the glyph's alpha mask. */
export function RecorderSymbol({
  name,
  size,
  fallback,
}: {
  name: string;
  size: number;
  fallback: ReactNode;
}) {
  const image = useContext(RecorderSymbols)[name];
  if (!image) return fallback;
  // Swift draws a 22pt symbol in a 48pt canvas at 3x. Keep that relationship:
  // font glyphs can be wider than their nominal size, unlike square SVG icons.
  const canvasSize = (48 / 22) * size;
  return (
    <span
      aria-hidden="true"
      data-native-symbol={name}
      style={{
        display: "inline-block",
        position: "relative",
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          translate: "-50% -50%",
          width: canvasSize,
          height: canvasSize,
          pointerEvents: "none",
          backgroundColor: "currentColor",
          maskImage: `url("${image}")`,
          maskSize: "contain",
          maskPosition: "center",
          maskRepeat: "no-repeat",
        }}
      />
    </span>
  );
}
