# SuperIsland for Windows

A Windows port of SuperIsland built with Tauri (Rust + TypeScript). See [ARCHITECTURE.md](ARCHITECTURE.md).

## Build (Windows)
Prerequisites: Node 20+, Rust (stable, MSVC toolchain), WebView2 runtime (ships with Windows 11).
```powershell
cd windows
npm install
npm run dev        # live dev run
npm run build      # NSIS + MSI installers in src-tauri\target\release\bundle
```
`npm run typecheck` type-checks the UI only (works on any OS). CI builds installers on every push to
`windows-port` (artifact: `SuperIsland-windows`).
