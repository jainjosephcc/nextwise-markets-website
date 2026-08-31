# Nextwise Markets Website

This repository contains the responsive Nextwise Markets landing page, including its interactive market experience, scroll-led feature sequences, account comparison, live TradingView market board, and complete company footer.

The site is designed as a static website and can be published directly through GitHub Pages.

## Run locally

```sh
npm start
```

Open `http://127.0.0.1:4174`.

## Validate JavaScript

```sh
npm run check
```

## Build for deployment

```sh
npm run build
```

The production-ready static site is written to `dist/`. For a Cloudflare Git deployment, use `npm run build` as the build command and `dist` as the build output directory.

The hero chart and market board use TradingView's public embeds and therefore need an internet connection. They are read-only market previews and may use delayed data.
