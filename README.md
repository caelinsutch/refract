# Frame Studio

A macOS recording and editing application being built against Screen Studio 3.7.5's observed interface and workflows. The implementation uses React, StyleX, Electron, and a native Swift capture helper.

**Status: research and specification. Exact visual and functional parity has not been achieved.**

## Documentation

- [Research report](docs/research/report.md): product behavior, implementation evidence, platform evaluation, and sources.
- [Architecture](docs/architecture/design.md): module boundaries, timeline model, capture, compositing, persistence, and export.
- [Parity matrix](docs/verification/parity.md): requirements and acceptance checks.
- [Reference observations](docs/research/observations.md): installed-version findings and remaining unknowns.

Research precedes implementation. Each working milestone is committed and pushed independently. Vendor bundles and binaries remain outside this repository; the application is independently implemented.
