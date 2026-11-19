# Responsive image delivery

These files are noncreative, compressed derivatives of existing artwork. The originals remain in their original directories; links to the full-resolution CRM screenshot are unchanged. SVG artwork remains vector.

The 12 source images have 48 responsive choices at 480, 768, 1024 and original width where applicable. Six full-width choices reuse the original because encoding a replacement did not save bytes. The 42 new WebP files have content hashes in their names, making them safe for the existing one-year immutable Cloudflare asset cache. Browsers select an appropriate image from `srcset` using its displayed size and screen density. Both themes use compressed backgrounds at their original dimensions.

Measured file sizes, not page-speed or per-visit totals:

| Image | Original | Full-size optimized |
| --- | ---: | ---: |
| Light background | 880,500 B | 49,980 B |
| Dark background | 899,994 B | 118,282 B |
| CRM preview | 798,447 B | 114,774 B |
| MetaTrader5 device preview | 469,514 B | 88,504 B |
| All 12 originals, one full-size choice each | 5,245,645 B | 2,560,234 B |

The whole collection is 51.19% smaller at full size. The seven heroes at 768px total 734,834 bytes versus 2,059,678 bytes for their full-size originals, a 64.32% reduction. Actual transfers depend on the page, device density and browser cache.

## Maintain

Run `npm run images:optimize` to encode derivatives and refresh HTML `srcset` / `sizes` plus background references. Encoding uses Python's standard library and `cwebp` on PATH; no package is installed by the script. Available original hero PNG masters are preferred over recompressing WebP. Their original provenance files are under `assets/hero-art/`.

Run `npm run images:check` to verify original hashes, variant hashes, dimensions, alpha flags and ascending widths. `npm test` also validates published image paths, responsive candidates and full-size screenshot links.

`npm run build` copies the generated WebP files into `dist/assets/optimized/`. This manifest and README remain source-only. Normal Cloudflare builds do not re-encode images or require the encoder.

## Cloudflare status

On 19 November 2026, the dashboard confirmed the `nextwise-markets-website` Worker in The Nextwise Markets Ltd. account. The public domain returned `server: cloudflare` and `cf-cache-status: HIT`. The zone's Images Transformations setting was disabled, with 0 of 5,000 free transformations used. No Cloudflare settings or production deployment were changed during this optimization work.

These static responsive files work with the current Cloudflare Workers asset setup and its existing cache policy; they do not require a paid Images plan or runtime transformations. Cloudflare's optional automatic format conversion can be configured separately once dashboard access is restored. Scope any future flow to the public website hostname and intended artwork paths so the separate client portal and full-size originals are not affected.

References: [Cloudflare static asset caching](https://developers.cloudflare.com/workers/static-assets/), [image transformation setup](https://developers.cloudflare.com/images/optimization/transformations/overview/), [transformation flows](https://developers.cloudflare.com/images/optimization/transformations/flows/).
