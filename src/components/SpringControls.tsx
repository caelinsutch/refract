import { Disclosure } from "./Disclosure";
import type { SpringConfig } from "../core/spring";
import { Button, Range } from "./ui";

export function SpringControls({
  target,
  value,
  onChange,
  onReset,
}: {
  target: "screen" | "cursor";
  value: SpringConfig;
  onChange: (value: SpringConfig) => void;
  onReset: () => void;
}) {
  return (
    <div style={{ marginTop: 12 }}>
      <Disclosure label={`Customize ${target} animation`}>
        <div role="group" aria-label={`${target} spring settings`}>
          <Range
            label="Rigidity"
            value={value.stiffness}
            min={5}
            max={600}
            step={1}
            onChange={(stiffness) => onChange({ ...value, stiffness })}
          />
          <Range
            label="Smoothness"
            value={value.damping}
            min={5}
            max={200}
            step={1}
            onChange={(damping) => onChange({ ...value, damping })}
          />
          <Range
            label="Momentum"
            value={value.mass}
            min={0.1}
            max={15}
            step={0.1}
            onChange={(mass) => onChange({ ...value, mass })}
          />
          <Button onClick={onReset}>Reset {target} animation</Button>
        </div>
      </Disclosure>
    </div>
  );
}
