import { app, BrowserWindow } from "electron";
import assert from "node:assert/strict";
import path from "node:path";
app.setPath(
  "userData",
  path.resolve(`work/button-hover/profile-${process.pid}`),
);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
void app.whenReady().then(async () => {
  try {
    const window = new BrowserWindow({
      width: 855,
      height: 404,
      show: false,
      webPreferences: { backgroundThrottling: false },
    });
    await window.loadFile(path.resolve("dist/index.html"), {
      hash: "recorder",
    });
    const c = window.webContents;
    const read = (code: string) => c.executeJavaScript(code);
    await wait(200);
    await read(`window.subject = [...document.querySelectorAll('button')].find(b=>b.textContent==='Display');
      subject.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); });
      window.glyph=subject.querySelector('svg');
      window.geometry=()=>[subject,glyph].map(e=>{const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height]});
      window.before=geometry(); window.events=[]; ['pointerover','pointerout','pointerdown','pointerup'].forEach(t=>subject.addEventListener(t,e=>events.push([t,e.relatedTarget?.tagName]))); window.addEventListener('blur',()=>events.push(['blur']));
      window.sample=()=>({opacity: Number(getComputedStyle(subject,'::before').opacity),scale:Number(getComputedStyle(subject,'::before').scale),x:parseFloat(getComputedStyle(subject,'::before').translate),geometry:geometry()}); void 0;`);
    const rect = await read(
      `(()=>{const r=subject.getBoundingClientRect();return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2),edge:Math.round(r.right-3)}})()`,
    );
    c.sendInputEvent({ type: "mouseMove", x: rect.x, y: rect.y });
    await wait(60);
    const entering = await read("sample()");
    assert.ok(
      entering.scale > 0.8 && entering.scale < 1,
      "Fill did not scale in",
    );
    await wait(650);
    assert.equal((await read("sample()")).scale, 1);
    assert.deepEqual(
      await read("geometry()"),
      await read("before"),
      "Hover moved text/hit target",
    );
    c.sendInputEvent({ type: "mouseMove", x: rect.edge, y: rect.y });
    await wait(600);
    assert.ok(
      (await read("sample()")).x > 1,
      "Fill did not follow the pointer",
    );
    c.sendInputEvent({
      type: "mouseDown",
      button: "left",
      x: rect.edge,
      y: rect.y,
    });
    await wait(650);
    assert.ok((await read("sample()")).scale < 1, "Held press did not settle");
    c.sendInputEvent({
      type: "mouseUp",
      button: "left",
      x: rect.edge,
      y: rect.y,
    });
    await wait(650);
    assert.equal(
      (await read("sample()")).scale,
      1,
      "Long-held press did not release: " +
        JSON.stringify(await read("events")),
    );
    c.sendInputEvent({ type: "mouseMove", x: 5, y: 5 });
    await wait(650);
    assert.equal((await read("sample()")).opacity, 0, "Hover did not fade out");
    c.debugger.attach("1.3");
    await c.debugger.sendCommand("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });
    c.sendInputEvent({ type: "mouseMove", x: rect.x, y: rect.y });
    await wait(100);
    const reduced = await read("sample()");
    assert.equal(reduced.scale, 1);
    assert.equal(reduced.x, 0);
    assert.equal(reduced.opacity, 1);
    c.sendInputEvent({ type: "mouseMove", x: 5, y: 5 });
    await wait(50);
    await read("subject.disabled=true");
    c.sendInputEvent({ type: "mouseMove", x: rect.x, y: rect.y });
    await wait(100);
    assert.equal(
      (await read("sample()")).opacity,
      0,
      "Disabled button animated",
    );
    c.debugger.detach();
    console.log(
      JSON.stringify({
        hover: "scale and pointer-follow passed",
        geometry: "stationary",
        heldPress: "released",
        reducedMotion: "static",
        disabled: "quiet",
      }),
    );
    app.exit(0);
  } catch (error) {
    console.error(error);
    app.exit(1);
  }
});
