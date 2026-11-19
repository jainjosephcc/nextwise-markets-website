# Website illustration library

The homepage and account-types page use the original user-supplied portal
screenshot in `../product/`. The partner programme uses `partner-network.svg`,
an illustration of referrals, reporting and support rather than a product screen.
MetaTrader previews use official screenshots from `../product/`; preserve their
source notes and captions. Retained device illustrations are not evidence of the
current product UI.

## Content illustration variety

Each large content illustration or product image appears in at most two
components across the published pages. `tests/illustrations.test.mjs` checks the
published routes, ignoring query strings and detecting identical image files.
Shared logos, decorative background ribbons and small interface icons keep their
consistent roles and are outside this content-image limit.

The expanded artwork uses original transparent SVG compositions with vivid blue,
orange, glass highlights and subtle ground shadows. Keep the 480 × 320 view boxes
and transparent surroundings; do not add image-only background panels.

- Company and onboarding: `onboarding-path`, `company-journey`, `company-guide`,
  `account-comparison`, `partner-network`, `platform-toolkit`.
- Support: `onboarding-assistance`, `platform-assistance`, `market-assistance`,
  `research-assistance`.
- Forex: `forex-pair-terminal`, `forex-exchange-routes`, `forex-banknotes`.
- Crypto: `crypto-network`, `crypto-token-pair`, `crypto-chain`.
- Indices: `indices-benchmark`, `indices-market-board`, `indices-exchange-towers`.
- Commodities: `commodity-terminal`, `precious-metals`, `energy-instruments`.
- Conditions and policies: `trading-specifications`, `margin-controls`,
  `data-vault`, `privacy-controls`, `identity-review`, `trade-audit`,
  `order-history`, `jurisdiction-check`, `payment-flow`, `policy-library`,
  `risk-analysis`, `pricing-breakdown`.

Existing artwork remains available. The original globe now appears only in the
company statistics and regional-availability sections.

## Retained portal illustration reference

The device and client-workspace illustrations follow the current Nextwise Studio portal reference confirmed by the Client Portal chat (`New-UI`, `7f223e6`).

- Canvas `#DBEDFB`, navigation `#B5DDF7`, header `#FFFFFF`, panels `#FAFDFF`, borders `#C9DCE9`, text `#26292D` / `#596168`.
- Trading/funding controls use `#286C9E` outlines; general actions use `#C94F18`. Blue/orange accents follow `#175BA0` / `#FF7546`.
- Logo and orange silk paths come from the portal's `logo_wide.svg` and `silk-drape-wave-v2.svg`. The silk is static inside these small illustrations.
- Portal and browser lettering uses outlined Boing glyphs; the dashboard tagline uses outlined Georgia Italic. No external fonts or bitmap images are required.
- `client-workspace.svg` depicts the dashboard with neutral account placeholders. The MT5 device illustrations retain trading charts; they are illustrative, not screenshots or live account data.
- Preserve the 480 × 320 view boxes and transparent surroundings. Do not add image-only rounded background panels. The Web illustration must remain a browser window with tabs and an address bar.
- The MT5 access gallery pairs each download link with its own device: `platform-ios.svg` (iPhone), `platform-android.svg` (Android phone), `platform-desktop.svg` (Mac laptop), `platform-windows.svg` (desktop monitor, keyboard and mouse), and `platform-web.svg` (browser). The phone variants reuse the existing mobile workspace artwork; their camera cutouts and casings distinguish the two devices. All three new assets are self-contained SVGs with transparent surroundings.

## Theme-aware glass artwork

`themed/light/` and `themed/dark/` contain native SVG variants for the published
illustration library. Light-mode artwork uses deep cobalt surfaces so it remains
clear against the Glacier blue canvas. Dark-mode artwork uses brighter electric
blue surfaces. Both retain white specular edges and restrained orange accents;
product screenshots and brand logos are unchanged.

`themed/manifest.json` maps original assets to each theme. The public pages use
`data-theme-light-src` / `data-theme-dark-src`, handled by the shared theme switcher.
Run `python3 scripts/build-illustration-themes.py` to regenerate the variants from
the preserved originals. The script retains the manifest's source inventory after
pages have been connected to the new paths.

The themed compact compositions and individual icon canvases use tighter view
boxes with a clear margin around artwork and shadows. Their intrinsic dimensions
match those view boxes so they fill illustration slots without being stretched.
The original source canvases remain untouched.
