# Newsphere — desktop (Tauri + React)

The **Newsphere** desktop app: a Tauri 2 + React + Vite reader built around a **column grid of feeds** on topic pages, with a **frameless, rounded window** and platform-native window controls (macOS: traffic lights on the left; Windows: controls on the right). This repository is the **application**; the public marketing page (downloads, product copy) usually lives in a separate repo, e.g. **`newsphere-site`**, under the same GitHub owner.

## Beta status

This app is **early / beta**. Expect **bugs**, rough edges, and **UI changes** that still need design and polish. Day-to-day development has focused on **Apple Silicon macOS**; the project **has not been meaningfully tested on Windows** or on **Intel-based Macs**. Behavior there may differ or fail in ways we have not seen.

**Contributors welcome:** if you can run the app on **Windows**, **Intel Mac**, or other setups, please **test**, **file issues**, and **submit pull requests** (fixes, UX improvements, docs, CI). Small, focused PRs are easiest to review.

## Features

- **Grid home** — Multiple pages, each with rows of feed columns; drag-and-drop order, section labels, and a searchable **feed catalog** plus optional custom feed URLs.
- **Reader** — Open articles in a focused reading view (extracted main content, navigation, and actions) instead of a noisy browser tab.
- **History & bookmarks** — Searchable **history** and a dedicated **bookmarks** list with quick actions.
- **Latest** — A single “newest first” stream of articles across the feeds on a page.
- **Persistence** — Layout and settings stored with the Tauri Store plugin; `npm run dev` without Tauri uses `localStorage` and hides window controls.
- **Window chrome** — Transparent window with CSS clipping for rounded corners on macOS; `macos-private-api` is enabled in Rust for that (not App Store–compatible for that build).

## AI assistant (beta)

The in-app assistant is **optional** and **off by default**. Turn it on under **Settings → App → AI tools (beta)**. You supply your own **API credentials** (nothing is sent to a Newsphere-hosted backend): choose **OpenAI**, **Anthropic**, **Google Gemini**, or an **OpenAI-compatible** endpoint (e.g. **Ollama**, **LM Studio**). Keys and config are stored **only on the device** (Tauri Store in the desktop app; `localStorage` if you run Vite without Tauri).

**UI:** With AI enabled, a control in the **title bar** opens a **side drawer** for multi-session chat. When the drawer is closed, a **floating prompt** at the bottom of the window sends the first message and opens the drawer. Markdown in replies can link to in-app routes, reader URLs, and external sites (external links open in the system browser).

**How it works (high level):** Each user message builds a **system prompt** that includes a **retrieval pass** over locally cached feed snippets (headlines/excerpts) so the model sees relevant articles without you pasting them. The model can also call **tools** in a loop (OpenAI-style function calling, with adapters for Anthropic and Gemini in code): it can read the **current reader article**, **search the feed cache**, list **columns** and **grid pages**, read **bookmarks** and **reading history**, **fetch full article text** from a URL (Readability-style extraction), **open** an article in the reader, **navigate** inside the app, and—if you explicitly enable it—**web search** via **DuckDuckGo instant answers** (off by default so feeds and local data stay the default).

**Limitations and room for improvement:** This stack is **early**. Retrieval is **snippet-based**, not a full semantic database; tool calling can **fail or mis-fire** depending on the model; **streaming**, richer citations, and **cost / token controls** are minimal; **errors and timeouts** are not as polished as a production product; behavior varies by **provider and model**. **Web search** is best-effort and should not be treated as authoritative. Contributions are welcome for **prompting**, **tools**, **UX**, **new providers**, and **tests**.

## Prerequisites

- [Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS (Rust, Xcode command-line tools on macOS, MSVC/WebView2 on Windows, etc.)
- **Node.js 20+** and npm

If `npm install` fails with `EPERM` on `~/.npm`, fix npm cache ownership (example: `sudo chown -R "$(id -u):$(id -g)" ~/.npm`).

## Scripts

```bash
npm install
npm run tauri dev    # desktop app + Vite
npm run dev          # Vite only (no Tauri store plugin; localStorage; no window controls)
npm run build        # frontend production build
npm run tauri build  # full app bundle
```

## Icons

Icons live under `src-tauri/icons/`. Replace with your own asset:

```bash
npm run tauri icon public/app-icon.svg -o src-tauri/icons
```

## macOS install downloads (CI)

On every push to **`main`** that does **not** only touch `public/downloads/`, the workflow [`.github/workflows/macos-dmg-to-main.yml`](.github/workflows/macos-dmg-to-main.yml) runs on a **macOS** GitHub runner, builds **Apple Silicon** (`aarch64-apple-darwin`) and **Intel** (`x86_64-apple-darwin`) `.dmg` bundles, and commits the results to:

- `public/downloads/macos-arm64/Newsphere.dmg`
- `public/downloads/macos-x64/Newsphere.dmg`

The commit message includes **`[skip ci]`**, and the workflow uses **`paths-ignore`**, so the installer commit does not trigger an infinite rebuild loop. Direct links use `raw.githubusercontent.com` (the marketing site encodes the `owner/Newsfeed` pair via its own build env; see that repo’s README).

**Requirements:** the default branch must allow **GitHub Actions** to push. If **branch protection** blocks the `github-actions[bot]`, add an exception or change the flow (for example, upload to Releases instead of committing binaries).

## Roadmap (high level)

- **Near term** — Hardening feed fetching, error handling, and performance on large feed sets.
- **Reader** — Continued improvements to extraction quality and reading UX.
- **Platform** — Optional signed/notarized macOS builds; a Windows build job when ready to ship installers.
- **Web** — Optional light web build or hosted demo (no firm commitment in this repo).

## Related repositories

- **Marketing / downloads** — Static site (e.g. Vite + GitHub Pages) with buttons pointing at the `public/downloads/.../Newsphere.dmg` URLs in this repo on `main`.
- **This repo** — Desktop app source and committed macOS artifacts as above.

## License

Private / your choice. Dependencies are under MIT and other open-source licenses; Tauri and template bits follow their respective licenses.
