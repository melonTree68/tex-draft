# TeXDraft

A small desktop scratchpad for display mathematics on macOS 13+, Windows with WebView2 Evergreen, and Linux (CI targets Ubuntu 24.04). Write the contents of a display-math environment on the left; real TeX typesetting appears on the right. User macros, custom presets, keyboard bindings, theme, and language are stored locally. Initial drafts and preset collections are empty.

## Development

Install Node.js 24+ and stable Rust, then install [Tauri's platform prerequisites](https://v2.tauri.app/start/prerequisites/) and [Tectonic's native build dependencies](https://tectonic-typesetting.github.io/book/latest/howto/build-tectonic/). macOS needs Xcode command-line tools, pkgconf, CMake, FreeType, Graphite2, ICU, and libpng; Linux additionally needs GTK/WebKit for Tauri; Windows uses the MSVC toolchain and vcpkg libraries. The platform CI workflow records the exact dependency setup.

```sh
npm install
npm run tauri -- dev
```

Tectonic runs inside the desktop app. Its first compilation needs internet access to download the TeX bundle; downloaded resources are cached for subsequent use. amsmath, amssymb, mathtools, bm, and esint are loaded automatically. Font choices are Latin Modern, TeX Gyre Pagella, and TeX Gyre Termes.

```sh
npm test
npm run build
npm run tauri -- build
```

`npm run dev` opens the frontend at http://127.0.0.1:1420 for browser UI development. Compilation requires the desktop application. Desktop CI is configured to run native tests and produce installers for macOS, Windows, and Linux.

Subsystem architecture and maintenance workflows live in `.agents/skills/`.
