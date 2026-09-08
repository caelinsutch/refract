# Refract UI theme

`src/theme.css` is the shared source of truth for editor and recording-controller styling. StyleX and global CSS both consume its CSS custom properties. Import it once from `src/main.tsx`.

The primary is cool teal (`#087f8c`). White primary-button text has a calculated 4.75:1 contrast ratio. Hover, translucent timeline fills, timeline borders, and pale primary text derive from the primary with `color-mix()`. `--accent` and `--focus` provide a lighter teal for foreground accents and focus outlines on dark surfaces.

Semantic groups cover primary actions, text hierarchy, editor/popover/recorder surfaces, clip and mask tracks, recording/stop states, and native-style window controls. Alpha white/black primitives supply glass highlights, separators, and shadows. Shared corner radii, UI font stack, and sidebar width are also tokens. Change the theme values rather than inserting new literal colors into components.

These tokens style the application chrome. Project backgrounds, cursor artwork, masks, and rendered video colors remain composition data; changing the app theme does not recolor saved footage or exports.

Verification: production TypeScript/StyleX build passed; all UI token references resolve and no literal hex colors remain in the editor, recorder, components, or reset stylesheet. Live desktop inspection confirmed teal Export, enabled cursor switches, and zoom timeline with retained layout. Recording stop remains red and clip/mask tracks retain distinct semantic colors.
