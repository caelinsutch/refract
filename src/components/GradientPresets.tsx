import * as sx from "@stylexjs/stylex";
import type { Appearance } from "../core/project";
import { gradientColors, gradientPresets } from "../core/gradient-presets";
const styles = sx.create({
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(6,32px)",
    gap: 8,
    height: 180,
    overflowY: "auto",
    alignContent: "start",
    padding: 3,
  },
  swatch: {
    width: 32,
    height: 32,
    padding: 0,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--sample-edge)",
    borderRadius: "var(--radius-control)",
    outline: "1px solid transparent",
    outlineOffset: 1,
  },
  selected: { outlineColor: "var(--sample-selected)" },
});
export function GradientPresets({
  appearance,
  onChange,
}: {
  appearance: Appearance;
  onChange: (colors: readonly string[]) => void;
}) {
  const selected = gradientColors(appearance).join(",").toLowerCase();
  return (
    <div role="group" aria-label="Gradient presets" {...sx.props(styles.grid)}>
      {gradientPresets.map((colors, index) => {
        const active = selected === colors.join(",").toLowerCase();
        return (
          <button
            key={index}
            type="button"
            aria-label={`Gradient preset ${index + 1}`}
            title={`Gradient preset ${index + 1}`}
            aria-pressed={active}
            {...sx.props(styles.swatch, active && styles.selected)}
            style={{
              backgroundImage: `linear-gradient(to bottom right,${colors.join(",")})`,
            }}
            onClick={() => {
              if (!active) onChange(colors);
            }}
          />
        );
      })}
    </div>
  );
}
