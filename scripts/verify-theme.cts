import { app, BrowserWindow, nativeTheme } from "electron";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

// Compile with tsc, then run with Electron. Uses an isolated profile and the
// production stylesheet, without opening or changing the user's project.
const scratch = path.resolve("work/theme-check");
app.setPath("userData", path.join(scratch, "profile"));
app.whenReady().then(async () => {
  let window: BrowserWindow | undefined;
  try {
    await fs.mkdir(scratch, { recursive: true });
    const index = await fs.readFile("dist/index.html", "utf8");
    const stylesheet = index.match(/href="([^"]+\.css)"/)?.[1];
    assert.ok(stylesheet, "Production stylesheet exists");
    const href = pathToFileURL(path.resolve("dist", stylesheet)).href;
    const fixture = path.join(scratch, "fixture.html");
    await fs.writeFile(
      fixture,
      `<link rel="stylesheet" href="${href}"><body><select><option>System appearance</option></select></body>`,
    );
    window = new BrowserWindow({
      show: false,
      webPreferences: { sandbox: true },
    });
    await window.loadFile(fixture);
    const tokens = [
      "surface-app",
      "surface-panel",
      "surface-raised",
      "surface-popover",
      "surface-control",
      "surface-modal",
      "surface-native-window",
      "surface-recorder",
      "surface-recorder-panel",
      "surface-area-hint",
      "surface-area-label",
      "surface-crop",
      "surface-crop-toolbar",
      "text-primary",
      "text-secondary",
      "text-muted",
      "border-strong",
      "slider-track",
      "focus",
    ];
    const snapshots: Record<string, Record<string, string>> = {};
    for (const theme of ["light", "dark", "light"] as const) {
      nativeTheme.themeSource = theme;
      const values = await window.webContents.executeJavaScript(`(async () => {
        const deadline = performance.now() + 3000;
        while (getComputedStyle(document.documentElement).colorScheme !== ${JSON.stringify(theme)}) {
          if (performance.now() > deadline) throw Error('Theme did not update live');
          await new Promise(resolve => setTimeout(resolve, 20));
        }
        const style = getComputedStyle(document.documentElement);
        return Object.fromEntries(${JSON.stringify(tokens)}.map(token => [token, style.getPropertyValue('--' + token).trim()]));
      })()`);
      for (const token of tokens) assert.ok(values[token], token);
      if (snapshots[theme])
        assert.deepEqual(
          values,
          snapshots[theme],
          "Returning to light restores every token",
        );
      snapshots[theme] = values;
    }
    for (const token of tokens)
      assert.notEqual(
        snapshots.light[token],
        snapshots.dark[token],
        `${token} follows appearance`,
      );
    nativeTheme.themeSource = "system";
    assert.equal(nativeTheme.themeSource, "system");
    console.log(
      `PASS: ${tokens.length} production UI tokens update light → dark → light without reload. System theme restored in the isolated process.`,
    );
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    nativeTheme.themeSource = "system";
    window?.destroy();
    app.exit(Number(process.exitCode ?? 0));
  }
});
