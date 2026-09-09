const hoverMotion = {
  stiffness: 1500,
  damping: 100,
  mass: 2,
  entranceScale: 0.8,
  pointerTravel: 2,
  escapeMultiplier: 11,
  pressInset: 2,
} as const;

/** Animate decorative backgrounds, never text, hit targets, or React state. */
export function installButtonHover() {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const fine = matchMedia("(hover: hover) and (pointer: fine)");
  const abort = new AbortController();
  const controls =
    'button, [role="button"], [role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"], [role="tab"], [role="option"], [role="switch"], [role="checkbox"], [role="radio"], a[href], summary, [data-hover-control]';
  const disabled = (button: HTMLElement) =>
    button.matches(':disabled, [aria-disabled="true"]') ||
    !!button.closest("[inert]");
  type Spring = { value: number; velocity: number; target: number };
  type Surface = {
    button: HTMLElement;
    x: Spring;
    y: Spring;
    hover: Spring;
    press: Spring;
    frame: number;
    last: number;
    inside: boolean;
    width: number;
    height: number;
  };
  const surfaces = new WeakMap<HTMLElement, Surface>();
  const running = new Set<Surface>();
  let pressed: Surface | undefined;
  const spring = (): Spring => ({ value: 0, velocity: 0, target: 0 });
  function eligible(button: HTMLElement) {
    return !button.matches('[data-hover="none"]');
  }
  function prepare(root: ParentNode) {
    root.querySelectorAll<HTMLElement>(controls).forEach((button) => {
      if (!eligible(button) || button.dataset.hoverSurface) return;
      const style = getComputedStyle(button);
      // Keep filled/selected controls' own color; plain controls use the moving fill.
      button.dataset.hoverSurface =
        style.backgroundColor === "rgba(0, 0, 0, 0)" ||
        style.backgroundColor === "transparent"
          ? "plain"
          : "filled";
      if (style.position === "static") button.style.position = "relative";
    });
  }
  function paint(s: Surface) {
    const amount = Math.max(0, Math.min(1, s.hover.value));
    s.button.style.setProperty("--hover-x", `${s.x.value}px`);
    s.button.style.setProperty("--hover-y", `${s.y.value}px`);
    s.button.style.setProperty("--hover-opacity", String(amount));
    s.button.style.setProperty(
      "--hover-scale",
      String(
        (hoverMotion.entranceScale + (1 - hoverMotion.entranceScale) * amount) *
          (1 -
            (s.press.value * hoverMotion.pressInset) /
              Math.max(1, s.width, s.height)),
      ),
    );
  }
  function tick(s: Surface, time: number) {
    s.frame = 0;
    if (!s.button.isConnected || disabled(s.button)) {
      s.button.style.setProperty("--hover-opacity", "0");
      running.delete(s);
      surfaces.delete(s.button);
      return;
    }
    const dt = Math.min((time - (s.last || time)) / 1000, 0.05);
    s.last = time;
    const values = [s.x, s.y, s.hover, s.press];
    const steps = Math.max(1, Math.ceil(dt * 120));
    for (let i = 0; i < steps; i++)
      for (const value of values) {
        value.velocity +=
          (((hoverMotion.stiffness * (value.target - value.value) -
            hoverMotion.damping * value.velocity) /
            hoverMotion.mass) *
            dt) /
          steps;
        value.value += (value.velocity * dt) / steps;
      }
    const settled = values.every(
      (v) =>
        Math.abs(v.target - v.value) < 0.001 && Math.abs(v.velocity) < 0.01,
    );
    if (settled)
      values.forEach((v) => {
        v.value = v.target;
        v.velocity = 0;
      });
    paint(s);
    if (!settled) s.frame = requestAnimationFrame((time) => tick(s, time));
    else {
      s.last = 0;
      running.delete(s);
    }
  }
  function animate(s: Surface) {
    if (reduced.matches) {
      cancelAnimationFrame(s.frame);
      s.frame = 0;
      s.last = 0;
      running.delete(s);
      [s.x, s.y, s.press].forEach((v) => {
        v.value = 0;
        v.velocity = 0;
      });
      s.hover.value = s.hover.target;
      // Reduced motion keeps a static, full-size hover highlight.
      paint(s);
      s.button.style.setProperty("--hover-scale", "1");
      return;
    }
    if (!s.frame) {
      running.add(s);
      s.frame = requestAnimationFrame((time) => tick(s, time));
    }
  }
  function get(event: PointerEvent) {
    const button =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>("[data-hover-surface]")
        : null;
    if (
      !button ||
      disabled(button) ||
      !fine.matches ||
      event.pointerType === "touch"
    )
      return;
    let s = surfaces.get(button);
    if (!s) {
      s = {
        button,
        x: spring(),
        y: spring(),
        hover: spring(),
        press: spring(),
        frame: 0,
        last: 0,
        inside: false,
        width: 1,
        height: 1,
      };
      surfaces.set(button, s);
    }
    return s;
  }
  function point(s: Surface, event: PointerEvent) {
    const r = s.button.getBoundingClientRect();
    s.width = r.width;
    s.height = r.height;
    s.x.target =
      (((event.clientX - r.x) / Math.max(1, r.width)) * 2 - 1) *
      hoverMotion.pointerTravel;
    s.y.target =
      (((event.clientY - r.y) / Math.max(1, r.height)) * 2 - 1) *
      hoverMotion.pointerTravel;
  }
  const options = { signal: abort.signal };
  document.addEventListener(
    "pointerover",
    (event) => {
      const s = get(event);
      if (!s || s.inside) return;
      s.inside = true;
      point(s, event);
      s.hover.target = 1;
      animate(s);
    },
    options,
  );
  document.addEventListener(
    "pointermove",
    (event) => {
      const s = get(event);
      if (!s) return;
      s.inside = true;
      s.hover.target = 1;
      point(s, event);
      animate(s);
    },
    options,
  );
  document.addEventListener(
    "pointerout",
    (event) => {
      const s = get(event);
      if (
        !s ||
        (event.relatedTarget instanceof Node &&
          s.button.contains(event.relatedTarget))
      )
        return;
      s.inside = false;
      s.hover.target = 0;
      s.press.target = 0;
      s.x.target *= hoverMotion.escapeMultiplier;
      s.y.target *= hoverMotion.escapeMultiplier;
      animate(s);
    },
    options,
  );
  document.addEventListener(
    "pointerdown",
    (event) => {
      const s = get(event);
      if (!s || event.button !== 0) return;
      s.inside = true;
      s.hover.target = 1;
      pressed = s;
      s.press.target = 1;
      animate(s);
    },
    options,
  );
  const release = () => {
    if (!pressed) return;
    pressed.press.target = 0;
    animate(pressed);
    pressed = undefined;
  };
  document.addEventListener("pointerup", release, options);
  document.addEventListener("pointercancel", release, options);
  window.addEventListener(
    "blur",
    () => {
      document
        .querySelectorAll<HTMLElement>("[data-hover-surface]")
        .forEach((button) => {
          const s = surfaces.get(button);
          if (!s) return;
          s.inside = false;
          s.hover.target = 0;
          s.press.target = 0;
          animate(s);
        });
    },
    options,
  );
  reduced.addEventListener(
    "change",
    () => {
      document
        .querySelectorAll<HTMLElement>("[data-hover-surface]")
        .forEach((button) => {
          const s = surfaces.get(button);
          if (s) animate(s);
        });
    },
    options,
  );
  const observer = new MutationObserver((records) => {
    for (const record of records)
      for (const node of record.addedNodes) {
        if (node instanceof Element) prepare(node.parentElement ?? node);
      }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  prepare(document);
  return () => {
    abort.abort();
    observer.disconnect();
    running.forEach((s) => cancelAnimationFrame(s.frame));
  };
}
