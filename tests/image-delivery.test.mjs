import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const root = new URL('../', import.meta.url);
const site = 'https://nextwisemarkets.com';

function attribute(tag, name) {
  return tag.match(new RegExp(`\\s${name}\\s*=\\s*(["'])(.*?)\\1`, 'is'))?.[2];
}

async function publishedPages() {
  const sitemap = await readFile(new URL('sitemap.xml', root), 'utf8');
  return Promise.all([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(async ([, location]) => {
    const url = new URL(location);
    const html = await readFile(new URL(`${url.pathname.slice(1)}index.html`, root), 'utf8');
    return { url, html };
  }));
}

function localImageUrl(source, pageUrl) {
  const url = new URL(source.replace(/&amp;/g, '&'), pageUrl);
  return url.origin === site ? url : null;
}

function srcsetCandidates(srcset) {
  const candidates = [];
  // URLs are whitespace-delimited, so commas inside a data URL are preserved.
  // A trailing comma terminates a descriptor-free candidate.
  let remaining = srcset;
  while ((remaining = remaining.replace(/^[\s,]+/, ''))) {
    const source = remaining.match(/^\S+/)[0];
    remaining = remaining.slice(source.length);
    if (source.endsWith(',')) {
      candidates.push({ source: source.replace(/,+$/, ''), descriptor: '' });
      continue;
    }
    const separator = remaining.indexOf(',');
    const descriptor = (separator < 0 ? remaining : remaining.slice(0, separator)).trim();
    candidates.push({ source, descriptor });
    remaining = separator < 0 ? '' : remaining.slice(separator + 1);
  }
  return candidates;
}

test('every published image source and responsive candidate resolves locally', async () => {
  const manifest = JSON.parse(await readFile(new URL('assets/optimized/manifest.json', root), 'utf8'));
  const variants = new Map(Object.values(manifest.assets)
    .flatMap(({ variants }) => variants.map(variant => [variant.src, variant])));
  const checked = new Set();
  let responsiveImages = 0;

  for (const { url, html } of await publishedPages()) {
    for (const [tag] of html.matchAll(/<(?:img|source)\b[^>]*>/gi)) {
      const original = attribute(tag, 'data-image-original');
      const originalAsset = original ? manifest.assets[original] : null;
      if (original) assert.ok(originalAsset, `Unknown original image on ${url.pathname}: ${original}`);
      const sources = ['src', 'data-theme-light-src', 'data-theme-dark-src', 'data-image-original']
        .map(name => ({ source: attribute(tag, name), descriptor: '' }))
        .filter(({ source }) => source);
      const srcset = attribute(tag, 'srcset');
      if (srcset) {
        responsiveImages += 1;
        assert.ok(attribute(tag, 'sizes'), `Responsive image needs a display size on ${url.pathname}`);
        sources.push(...srcsetCandidates(srcset));
      }
      for (const { source, descriptor } of sources) {
        const imageUrl = localImageUrl(source, url);
        if (!imageUrl) continue;
        const label = `${url.pathname}: ${source}`;
        if (!checked.has(imageUrl.pathname)) {
          const bytes = await readFile(new URL(imageUrl.pathname.slice(1), root));
          assert.ok(bytes.length > 0, `Empty image: ${label}`);
          checked.add(imageUrl.pathname);
        }
        const variant = variants.get(imageUrl.pathname);
        if (originalAsset && imageUrl.pathname !== original) {
          assert.ok(originalAsset.variants.some(item => item.src === imageUrl.pathname),
            `Responsive candidate belongs to different artwork: ${label}`);
        }
        if (imageUrl.pathname.startsWith('/assets/optimized/')) {
          assert.ok(variant, `Responsive image missing from manifest: ${label}`);
        }
        if (variant && descriptor.endsWith('w')) {
          assert.equal(Number.parseInt(descriptor, 10), variant.width,
            `Incorrect responsive width descriptor: ${label}`);
        }
      }
    }
  }
  assert.ok(checked.size > 0, 'The audit must include published images');
  assert.ok(responsiveImages > 0, 'Published pages must use the responsive image variants');
});

test('optimized image files match their manifest and cache-busting content hashes', async () => {
  const manifest = JSON.parse(await readFile(new URL('assets/optimized/manifest.json', root), 'utf8'));
  assert.ok(Object.keys(manifest.assets).length > 0, 'The image manifest must not be empty');

  for (const [original, asset] of Object.entries(manifest.assets)) {
    const originalBytes = await readFile(new URL(original.slice(1), root));
    assert.equal(originalBytes.length, asset.bytes, `Original size changed: ${original}`);
    assert.equal(createHash('sha256').update(originalBytes).digest('hex'), asset.sha256,
      `Original image changed without regenerating variants: ${original}`);
    assert.ok(asset.variants.length > 0, `No variants for ${original}`);
    for (const variant of asset.variants) {
      const bytes = await readFile(new URL(variant.src.slice(1), root));
      const digest = createHash('sha256').update(bytes).digest('hex');
      assert.equal(bytes.length, variant.bytes, `Variant size mismatch: ${variant.src}`);
      assert.equal(digest, variant.sha256, `Variant checksum mismatch: ${variant.src}`);
      if (variant.reused_original) {
        assert.equal(variant.src, original, `Original fallback must use the original URL: ${variant.src}`);
        assert.equal(digest, asset.sha256, `Original fallback changed: ${variant.src}`);
      } else {
        assert.ok(variant.src.endsWith(`-${variant.width}.${digest.slice(0, 12)}.webp`),
          `Variant filename must identify its width and actual content: ${variant.src}`);
      }
    }
  }
});

test('CRM previews still open the full-resolution original screenshot', async () => {
  const original = '/assets/product/nextwise-crm-original.png';
  for (const route of ['/', '/account-types/']) {
    const html = await readFile(new URL(`${route.slice(1)}index.html`, root), 'utf8');
    const previews = [...html.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/gi)].filter(([anchor]) =>
      [...anchor.matchAll(/<img\b[^>]*>/gi)].some(([image]) =>
        (attribute(image, 'data-image-original') || attribute(image, 'src')) === original));
    assert.ok(previews.length > 0, `Missing linked CRM preview on ${route}`);
    for (const [anchor] of previews) {
      const href = attribute(anchor.match(/^<a\b[^>]*>/i)[0], 'href');
      assert.ok(href, `CRM preview is missing its full-size link on ${route}`);
      assert.equal(localImageUrl(href, `${site}${route}`)?.pathname, original,
        `CRM preview must open the original, not a reduced image, on ${route}`);
    }
  }
  const bytes = await readFile(new URL(original.slice(1), root));
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'The original CRM asset must remain a PNG');
  assert.equal(bytes.readUInt32BE(16), 2462, 'Retain the original CRM screenshot width');
  assert.equal(bytes.readUInt32BE(20), 1354, 'Retain the original CRM screenshot height');
});
