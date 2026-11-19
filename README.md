# NEXTWISE MARKETS Website

This repository contains all 18 responsive NEXTWISE MARKETS public pages: the homepage, account comparison, platform and market pages, company information, contact, and full legal documents.

The website follows the current Nextwise client portal brand: Boing Regular and Bold, a white/blue canvas, orange outline controls and Lucide icons. `horizon.css` owns shared tokens and typography; `site-header.css` keeps navigation geometry consistent across all page families. The theme switch uses the portal’s sliding orange thumb and accessible switch semantics. `theme.js` defaults to light and remembers an explicit choice. Hero panels use meaningful HTML content with real links, without generated imagery, tilted mockups, serif headlines or decorative section captions. The original portal silk ribbons, boxed MetaTrader 5 mark, fonts and matching light/dark Paperbot icons are copied unchanged from the client portal. `brand-material.css` adds glazed surfaces, ribbon placement and a lighter optical Boing heading treatment. `site-footer.css` provides the shared all-page directory and social icons. `account-journey.css` styles the complete account-opening and platform-connection roadmaps. Earlier concept artwork remains under `assets/` for reference.

The site is designed as a static website and can be published directly through GitHub Pages.

## Run locally

```sh
npm start
```

Open `http://127.0.0.1:4174`.

For a page-by-page review, open `http://127.0.0.1:4174/review-local/`. The picker includes all 18 pages, desktop and phone previews, and direct page links. This local review tool is excluded from the production build.

## Validate JavaScript

```sh
npm run check
```

## Build for deployment

```sh
npm run build
```

The production-ready static site is written to `dist/`. For a Cloudflare Git deployment, use `npm run build` as the build command and `dist` as the build output directory.

The homepage chart and market board use TradingView's public embeds and therefore need an internet connection. They are read-only market previews and may use delayed data. The hero’s account and platform shortcuts use semantic HTML and native icons, separate from these live previews. They contain no real client account information.

## Website live chat

All 18 published pages include the shared `live-chat.js` and `live-chat.css` launcher. It displays **Live chat** and loads the Paperbot SDK only when a visitor clicks. Network failures keep a retry button and a link to the contact page. The launcher moves above the analytics preferences banner, and its visitor cookies use the SDK's host-only default.

Website conversations use account 1's **Public Website Live Chat** inbox (ID 2) at `https://chat.nextwisemarkets.com`, with the heading **Nextwise Support** and the **Powered by Paperbot** footer. Its website token is a public widget identifier. Never put a CRM bearer token, HMAC key, support password or client identity in this static site. The separate client-portal inbox continues to require signed identity verification. Existing account administrators retain their normal account-wide inbox access; this integration does not change staff permissions or inbox memberships.

Run `npm test` for lazy loading, duplicate prevention, connection recovery, keyboard focus restoration and consent-banner positioning checks. To disable the website launcher, remove its script and stylesheet tags from the published HTML and rebuild; keep existing inbox conversations intact.
