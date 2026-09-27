# macOS 安装与构建

要求 macOS 13+。你的电脑已安装 Homebrew、Node.js 24、Rust 和 Xcode。

安装[构建依赖](https://tectonic-typesetting.github.io/book/latest/howto/build-tectonic/)：

```sh
brew install pkgconf cmake freetype graphite2 icu4c libpng
```

在同一终端中构建：

```sh
cd /Users/zhijiechen/Documents/tex-draft
npm ci
export PKG_CONFIG_PATH="$(brew --prefix icu4c)/lib/pkgconfig${PKG_CONFIG_PATH:+:$PKG_CONFIG_PATH}"
export TECTONIC_PKGCONFIG_FORCE_SEMI_STATIC=1
npm run tauri -- build --bundles app
open src-tauri/target/release/bundle/macos
```

将生成的 `TeXDraft.app` 拖入「应用程序」，双击启动。首次编译公式需要联网下载 TeX 资源。

开发运行：在上述终端执行 `npm run tauri -- dev`。
