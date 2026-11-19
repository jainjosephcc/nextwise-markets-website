# Interior-page hero artwork

Created 19 November 2026 for the public Nextwise Markets website. Each hero has a distinct subject in deep cobalt optical glass, cyan highlights and restrained orange accents. The transparent backgrounds let the same artwork retain contrast in both themes. Homepage and Contact are excluded.

| Page | Asset | Visual rationale |
| --- | --- | --- |
| About | `about-us.webp` | People, an open book and trading tools joined by a clarity prism. |
| Accounts | `account-types.webp` | Four equally prominent glass panels represent the four account choices. |
| Partners | `introducing-broker.webp` | A connected referral network and reporting panel. |
| Forex | `forex.webp` | Paired currency symbols and exchange paths. |
| Metals & Energy | `metals-energy.webp` | Gold and silver ingots alongside an oil barrel and drop. |
| Indices | `indices.webp` | Mixed-height components linked into a benchmark group. |
| Crypto | `crypto.webp` | Connected crystalline blocks, expressing a digital network. |
| Platform | `metatrader5-terminal.png` | An actual MetaTrader5 terminal within a CSS-built cobalt monitor, with the existing MT5 medallion. |

The seven original CGI illustrations are 1448 × 1086 transparent WebP exports. The built-in image generator created the original PNGs; `cwebp` converted them at quality 90 with alpha preserved. No original generated PNG was overwritten. Exact prompts and original paths are recorded in `brand-prompts.json` and `market-prompts.json`.

The Platform image is an unchanged 2360 × 1536 MetaQuotes demo screenshot downloaded from [the official gallery](https://www.metatrader5.com/i/trading-platform/gallery/1.png), linked by the [MetaTrader5 platform page](https://www.metatrader5.com/en/trading-platform). It is a static product preview, not live pricing or a Nextwise client account. The decorative frame does not modify the screenshot's pixels.

Concept research used primary references: [MetaTrader5](https://www.metatrader5.com/en/trading-platform), [CME market groups](https://www.cmegroup.com/markets), [Nasdaq indexes](https://www.nasdaq.com/products/global-indexes), and [Ethereum blocks](https://ethereum.org/developers/docs/blocks/). These informed the subjects; the CGI artwork is conceptual, not a product screenshot or a representation of returns.

Implementation: `hero-visuals.css` and the eight corresponding page templates. Existing wording and link targets are retained, with the original overview points placed beneath the first hero screen. A brief entrance fade respects reduced-motion preferences; there is no looping motion.
