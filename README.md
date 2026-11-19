# NEXTWISE MARKETS Website

This repository contains the responsive NEXTWISE MARKETS landing page, including its interactive market experience, scroll-led feature sequences, account comparison, live TradingView market board, and complete company footer.

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

## Website live chat

All 18 published pages include the shared `live-chat.js` and `live-chat.css` launcher. It displays **Live chat** and loads the Paperbot SDK only when a visitor clicks. Network failures keep a retry button and a link to the contact page. The launcher moves above the analytics preferences banner, and its visitor cookies use the SDK's host-only default.

Website conversations use account 1's **Public Website Live Chat** inbox (ID 2) at `https://chat.nextwisemarkets.com`, with the heading **Nextwise Support** and the **Powered by Paperbot** footer. Its website token is a public widget identifier. Never put a CRM bearer token, HMAC key, support password or client identity in this static site. The separate client-portal inbox continues to require signed identity verification. Existing account administrators retain their normal account-wide inbox access; this integration does not change staff permissions or inbox memberships.

Run `npm test` for lazy loading, duplicate prevention, connection recovery, keyboard focus restoration and consent-banner positioning checks. To disable the website launcher, remove its script and stylesheet tags from the published HTML and rebuild; keep existing inbox conversations intact.
