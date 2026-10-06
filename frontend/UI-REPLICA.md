# RMS UI replica

The layout follows the four provided RMS wizard screenshots and the earlier
[Replit requirements](REPLIT-UI-PROMPT.md): navigation rail/header, App Builder
toolbar, seven tabs, blue/gray controls, rounded cards and phone preview.
The floating Replit “Update from main” editor overlay is excluded.

The replica now supports **real API mode by default**, with an explicit demo
adapter retained for offline UI work. Both modes use the same components and
`src/appBuilderService.js` boundary. Screenshot-only replication cannot establish
pixel-perfect parity with private RMS font/component tokens.

See [README.md](README.md) to run and configure it, and
[API-FLOW-GAPS.md](API-FLOW-GAPS.md) for the implemented API mappings and remaining
backend requirements. The previous mock-only integration notes have been superseded
by that document.
