# Export settings comparison

Inspected September 9, 2026 using the installed Screen Studio renderer bundle. The reference implementation remains outside the public repository; these are observed settings and behavioral notes.

| Setting | MP4 | GIF |
| --- | --- | --- |
| Frame rates, in menu order | 60, 50, 30, 25, 24, 20, 10 | 50, 30, 25, 20, 15, 10 |
| Quality modes | Studio, Social media, Web high, Web low | Studio, Social media |
| Output heights | 720, 1080, 2160 | 480, 720, 1080 |
| Initial settings | Social media, 720p, 60 fps | Studio, 480p, 15 fps |

The reference resolves an unsupported frame rate to the largest supported rate no greater than the request; requests below the minimum use the minimum. It retains separate settings for each format and separate settings for ordinary and quick exports. Web quality modes exclude heights above 1080. GIF settings include a disable-loop option.

Refract now uses the observed frame-rate and output-height lists throughout editor controls and quick-export normalization. Exports size by height, cap width at 3840, and floor both dimensions to even pixels. MP4 and quick-export defaults are 720p/60 fps; GIF defaults to 480p/15 fps. Ordinary MP4/GIF settings persist independently, including the selected format, and quick exports retain separate settings. Remaining gaps include quality-to-encoder mapping and GIF loop selection. Do not treat the frame-rate correction as proof of complete export-settings parity.

The reference requires activation to export, so direct comparison of its encoded outputs remains unavailable.
