# Newsphere (Tauri grid)

Desktop app: a **responsive column grid** for future RSS sources. **Phase 1** includes a **custom frameless title bar** with **window controls on the left on macOS** and **on the right on Windows/Linux**, **rounded corners** (CSS clip on macOS with a transparent window; Windows 11 also rounds undecorated windows when shadow is enabled), **React Router** (`/` grid, `/settings`), a **searchable catalog** of feeds, column reorder/remove, optional manual URLs, and **persistence** via the Tauri Store plugin. The Rust crate enables Tauri’s **`macos-private-api`** feature so **transparent windows** work on macOS (not App Store–compatible if you ship that build). Plain `npm run dev` without Tauri uses `localStorage` and hides window controls.

## Prerequisites

- [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS (Rust, Xcode command-line tools on macOS, etc.)
- Node.js 20+ and npm

If `npm install` fails with `EPERM` on `~/.npm`, fix npm cache ownership (example: `sudo chown -R "$(id -u):$(id -g)" ~/.npm`).

## Scripts

```bash
npm install
npm run tauri dev    # desktop app + Vite
npm run dev          # Vite only (no Tauri APIs for store; uses localStorage)
npm run build        # frontend production build
npm run tauri build  # full app bundle
```

## Icons

The template expects icons under `src-tauri/icons/`. To replace them with your own asset:

```bash
npm run tauri icon path/to/your.png
```

## Phase 2 (not implemented here)

- Fetch and parse RSS per column `feedUrl`
- Optional **reader view**: fetch HTML, extract main content, sanitize, render in-app (still on Tauri)

## License

Private / your choice. Dependencies include MIT and other OSS licenses; Tauri app template components follow their respective licenses.
