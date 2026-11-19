import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const root = new URL('../', import.meta.url);

for (const theme of ['light', 'dark']) test(`published ${theme} artwork exists and content images are used in at most two components`, async () => {
  const sitemap = await readFile(new URL('sitemap.xml', root), 'utf8');
  const routes = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map(([, location]) => new URL(location).pathname);
  assert.ok(routes.includes('/'), 'Include the homepage in the image audit');
  const images = new Map();

  for (const route of routes) {
    const html = await readFile(new URL(`${route.replace(/^\//, '')}index.html`, root), 'utf8');
    for (const [tag] of html.matchAll(/<img\b[^>]*>/g)) {
      const servedSource = tag.match(/\ssrc="([^"]+)"/)?.[1];
      if (servedSource) {
        const servedUrl = new URL(servedSource, `https://nextwisemarkets.com${route}`);
        if (servedUrl.origin === 'https://nextwisemarkets.com') {
          await readFile(new URL(servedUrl.pathname.slice(1), root));
        }
      }
      const source = tag.match(new RegExp(`\\sdata-theme-${theme}-src="([^"]+)"`))?.[1]
        || tag.match(/\sdata-image-original="([^"]+)"/)?.[1]
        || servedSource;
      if (!source) continue;
      const path = new URL(source, `https://nextwisemarkets.com${route}`).pathname;
      // Logos, shared background artwork and small UI icons serve consistent
      // interface roles; this cap applies to the large content images.
      if (!/^\/assets\/(illustrations|product)\//.test(path)) continue;
      // Theme-only artwork and small icons must resolve as well as the default src.
      await readFile(new URL(path.slice(1), root));
      if (path.includes('/icons/')) continue;
      if (!images.has(path)) images.set(path, []);
      images.get(path).push(route);
    }
  }

  const byContent = new Map();
  for (const [path, placements] of images) {
    const bytes = await readFile(new URL(path.slice(1), root));
    // Cropping the SVG canvas or renaming its title does not make new artwork.
    const artwork = path.endsWith('.svg')
      ? bytes.toString('utf8').replace(/<svg\b[^>]*>|<title>[\s\S]*?<\/title>|<!--[\s\S]*?-->|<\/svg>|\s+/g, '')
      : bytes;
    const digest = createHash('sha256').update(artwork).digest('hex');
    if (!byContent.has(digest)) byContent.set(digest, []);
    byContent.get(digest).push(...placements.map((route) => `${route} → ${path}`));
  }
  assert.ok(images.size > 0, 'Published pages must contain content images');
  for (const placements of byContent.values()) {
    assert.ok(placements.length <= 2, `Repeated content image (${placements.length} uses):\n${placements.join('\n')}`);
  }
});
