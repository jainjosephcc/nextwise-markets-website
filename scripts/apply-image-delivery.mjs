import { readFile, writeFile } from 'node:fs/promises';
import { basename } from 'node:path';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('assets/optimized/manifest.json', root), 'utf8'));
const sitemap = await readFile(new URL('sitemap.xml', root), 'utf8');
const routes = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, url]) => new URL(url).pathname);
const escapePattern = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function setAttribute(tag, name, value) {
  const pattern = new RegExp(`\\s${name}="[^"]*"`);
  return pattern.test(tag)
    ? tag.replace(pattern, ` ${name}="${value}"`)
    : tag.replace(/\s*\/?>$/, ` ${name}="${value}" />`);
}

function sizesFor(source, route) {
  if (source.includes('/hero-art/')) {
    return '(max-width: 600px) calc(100vw - 40px), (max-width: 1100px) calc((100vw - 72px) / 2), 47vw';
  }
  if (source.endsWith('nextwise-crm-original.png')) {
    return route === '/'
      ? '(max-width: 600px) calc(100vw - 40px), (max-width: 900px) 560px, 50vw'
      : '(max-width: 600px) calc(100vw - 40px), (max-width: 900px) 560px, (max-width: 1184px) calc(100vw - 96px), 1088px';
  }
  return route === '/'
    ? '(max-width: 600px) calc(100vw - 80px), (max-width: 1100px) 40vw, 20vw'
    : '(max-width: 600px) calc(100vw - 80px), (max-width: 1100px) 40vw, 25vw';
}

let updatedImages = 0;
for (const route of routes) {
  const file = new URL(`${route.replace(/^\//, '')}index.html`, root);
  const previous = await readFile(file, 'utf8');
  let html = previous.replace(/<img\b[^>]*>/g, (tag) => {
    const original = tag.match(/\sdata-image-original="([^"]+)"/)?.[1]
      || tag.match(/\ssrc="([^"]+)"/)?.[1];
    const image = manifest.assets[original];
    if (!image || !image.variants.length) return tag;
    const variants = image.variants;
    // Browsers choose a candidate using the rendered width and display density.
    // Full-size screenshot links remain untouched and continue opening originals.
    const fallback = variants.at(-1);
    tag = setAttribute(tag, 'src', fallback.src);
    tag = setAttribute(tag, 'srcset', variants.map((v) => `${v.src} ${v.width}w`).join(', '));
    tag = setAttribute(tag, 'sizes', sizesFor(original, route));
    tag = setAttribute(tag, 'data-image-original', original);
    updatedImages += 1;
    return tag;
  });
  html = html.replace(/crm-finish\.css\?v=\d+/g, 'crm-finish.css?v=8');
  if (html !== previous) await writeFile(file, html);
}

const cssFile = new URL('crm-finish.css', root);
let css = await readFile(cssFile, 'utf8');
for (const [original, image] of Object.entries(manifest.assets)) {
  if (!original.includes('/portal-signature/glacier-')) continue;
  const stem = basename(original, '.webp');
  const pattern = new RegExp(`${escapePattern(original)}|/assets/optimized/${escapePattern(stem)}-\\d+\\.[a-f0-9]+\\.webp`, 'g');
  css = css.replace(pattern, image.variants.at(-1).src);
}
await writeFile(cssFile, css);
console.log(`Applied responsive image delivery to ${updatedImages} images across ${routes.length} pages; full-size originals preserved.`);
