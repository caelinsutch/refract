# Screen Studio preference inspection

Inspected the installed Screen Studio 3.7.5-4595 preferences and reopened its last 12-second project through File → Open last project. The editor exposes its full accessibility tree, but window screenshots remain white, including after raising the window. Settings and the recording toolbar do render in screenshots. This isolates the failed image comparison to the editor surface; it does not establish whether the cause is capture exclusion, graphics rendering, or the UI capture tool.

## Recording preferences observed

- New-project destination with a Change directory action; the displayed location was `~/Screen Studio Projects`.
- Highlight recorded area during recording, described as dimming the region outside the recording; enabled.
- Automatic zoom creation; enabled.
- Recording-in-progress widget visibility; enabled.
- Maximum camera resolution choices: 720p, 1080p, and 4K. The accessibility text did not establish which resolution was selected.

Refract has automatic-zoom preferences and a recording widget. Its `native/Recorder.swift` currently fixes the camera capture preset and encoder dimensions to 1280×720. Configurable camera limits, supported-device fallback, actual stream dimensions, and recorded-output verification are therefore a concrete next recording task. Area dimming and a configurable default project destination also need parity work.

## Other settings observed

General includes launch at login, hiding the Dock icon when idle, usage data, and resetting preferences. Advanced includes disabling hardware-accelerated video encoding/decoding, network-certificate behavior, and a diagnostic-sharing action. Experimental includes optimized preview rendering, masked-content shift detection, enhanced upload settings, and Legacy/Modern audio exporter choices. These are observed controls, not proof that equivalent functionality exists in Refract.

## Blank editor screenshot experiment

Optimized preview rendering was initially enabled. Disabling it was confirmed in the live accessibility tree. After closing Settings, the project editor remained white in a screenshot while its controls and timeline stayed available in accessibility. This rules out that toggle as a demonstrated remedy for the current comparison failure. The preference was restored to its original enabled state. No diagnostic information was sent and no unrelated preference was changed.

No capture-exclusion preference was identified in the General, Recording, Advanced, or Experimental panels inspected. Exact editor spacing, colors, and materials remain unverified; a blank image cannot support those comparisons.
