# Cursor visibility per clip

Reference: [Screen Studio: Hiding the cursor in specific sections](https://preview.screen.studio/guide/hiding-the-cursor-in-specific-sections), inspected September 8, 2026. The documented workflow uses a fragment's right-click menu and marks fragments with hidden cursors.

Implemented:

- Optional saved `hideCursor` on clips, preserved when splitting and trimming; missing values retain visible-cursor behavior for older projects. Invalid nonboolean values are rejected.
- Clip settings toggle and right-click Hide/Show mouse cursor menu, with a timeline indicator and accessible hidden-state label.
- Keyboard context menu via Shift+F10, focus restoration, outside-pointer dismissal, and Escape support. Manual popover dismissal avoids the opening right-click immediately closing the menu.
- The shared compositor resolves visibility from the current edited clip; both pointer and click effects are suppressed. Global hiding remains authoritative, and idle/loop behavior cannot override clip hiding.
- Cursor settings explain when the current clip hides its cursor and provide a route to that clip's settings.

Verification: production build and 53 core tests pass. Pixel tests cover clip boundaries, cuts/doubled speed, click effects, cursor looping, global override, and backward seeking. Serialization and split inheritance pass. Live desktop checks opened the right-click menu, hid/shown the cursor, displayed the timeline marker, saved/reopened the setting, and restored it with undo/redo. The synthetic fixture was returned to visible cursor and saved after testing. The explanatory Cursor panel notice is build-checked but has not yet had its own live interaction check. No new MP4 check was run for this specific setting; it uses the shared renderer tested above.
