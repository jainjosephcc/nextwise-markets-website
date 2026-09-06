import { readFile, readdir } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectDirectory = fileURLToPath(new URL("..", import.meta.url));
const targetDirectory = resolve(projectDirectory, process.argv[2] || ".");
const productionOrigin = "https://nextwisemarkets.com";
const officialSocialProfiles = [
  "https://www.linkedin.com/company/nextwise-markets/about/",
  "https://www.facebook.com/nextwise.markets",
  "https://www.instagram.com/nextwise.markets/",
  "https://www.youtube.com/@nextwise.markets",
];

const entries = await readdir(targetDirectory, { withFileTypes: true });
const pageFiles = ["index.html"];
const excludedDirectories = new Set(["assets", "dist", "node_modules", "reference", "scripts"]);
for (const entry of entries) {
  if (!entry.isDirectory() || entry.name.startsWith(".") || excludedDirectories.has(entry.name)) continue;
  const files = await readdir(join(targetDirectory, entry.name));
  if (files.includes("index.html")) pageFiles.push(`${entry.name}/index.html`);
}
pageFiles.sort();

const failures = [];
const titles = new Map();
const descriptions = new Map();
const canonicals = new Set();

const matchContent = (html, pattern) => html.match(pattern)?.[1]?.trim() || "";
const decodeHtml = (value) => value.replaceAll("&amp;", "&").replaceAll("&quot;", '"').replaceAll("&#x27;", "'");

for (const relativePath of pageFiles) {
  const html = await readFile(join(targetDirectory, relativePath), "utf8");
  const title = decodeHtml(matchContent(html, /<title>([^<]+)<\/title>/));
  const description = decodeHtml(matchContent(html, /<meta name="description" content="([^"]+)" \/>/));
  const canonical = matchContent(html, /<link rel="canonical" href="([^"]+)" \/>/);
  const expectedPath = relativePath === "index.html" ? "/" : `/${relativePath.replace(/index\.html$/, "")}`;
  const expectedCanonical = `${productionOrigin}${expectedPath}`;
  const h1Count = (html.match(/<h1(?:\s|>)/g) || []).length;
  const imageTags = html.match(/<img\b[^>]*>/g) || [];
  const schemaBlocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  let parsedSchema;

  if (!title) failures.push(`${relativePath}: missing title`);
  if (title.length < 25 || title.length > 65) failures.push(`${relativePath}: title length is ${title.length}`);
  if (titles.has(title)) failures.push(`${relativePath}: duplicate title also used by ${titles.get(title)}`);
  titles.set(title, relativePath);

  if (!description) failures.push(`${relativePath}: missing meta description`);
  if (description.length < 80 || description.length > 170) failures.push(`${relativePath}: description length is ${description.length}`);
  if (descriptions.has(description)) failures.push(`${relativePath}: duplicate description also used by ${descriptions.get(description)}`);
  descriptions.set(description, relativePath);

  if (canonical !== expectedCanonical) failures.push(`${relativePath}: canonical should be ${expectedCanonical}`);
  canonicals.add(canonical);
  if (h1Count !== 1) failures.push(`${relativePath}: expected one H1, found ${h1Count}`);
  if (!html.includes('name="robots" content="index, follow, max-image-preview:large')) failures.push(`${relativePath}: missing indexable robots directive`);
  if (!html.includes(`property="og:title" content="${title.replaceAll("&", "&amp;")}`) && !html.includes(`property="og:title" content="${title}`)) failures.push(`${relativePath}: Open Graph title does not match page title`);
  if (!html.includes(`property="og:url" content="${canonical}"`)) failures.push(`${relativePath}: Open Graph URL does not match canonical`);
  if (!html.includes('name="twitter:card" content="summary_large_image"')) failures.push(`${relativePath}: missing large X/Twitter card`);
  if (!/href="\/analytics\.css\?v=\d+"/.test(html)) failures.push(`${relativePath}: missing analytics consent styles`);
  if (!html.includes('src="/analytics.js?v=1"')) failures.push(`${relativePath}: missing consent-aware analytics loader`);
  if (imageTags.some((tag) => !/\balt="[^"]*"/.test(tag))) failures.push(`${relativePath}: image without alt attribute`);
  if (schemaBlocks.length !== 1) failures.push(`${relativePath}: expected one JSON-LD block, found ${schemaBlocks.length}`);
  for (const [, json] of schemaBlocks) {
    try {
      parsedSchema = JSON.parse(json);
    } catch (error) {
      failures.push(`${relativePath}: invalid JSON-LD (${error.message})`);
    }
  }

  if (relativePath === "index.html") {
    const organization = parsedSchema?.["@graph"]?.find((item) => item["@id"] === `${productionOrigin}/#organization`);
    for (const profile of officialSocialProfiles) {
      if (!html.includes(`href="${profile}"`)) failures.push(`${relativePath}: missing footer link for ${profile}`);
      if (!organization?.sameAs?.includes(profile)) failures.push(`${relativePath}: Organization sameAs missing ${profile}`);
    }
  }
}

const sitemap = await readFile(join(targetDirectory, "sitemap.xml"), "utf8");
const sitemapUrls = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]));
for (const canonical of canonicals) {
  if (!sitemapUrls.has(canonical)) failures.push(`sitemap.xml: missing ${canonical}`);
}
for (const sitemapUrl of sitemapUrls) {
  if (!canonicals.has(sitemapUrl)) failures.push(`sitemap.xml: unknown URL ${sitemapUrl}`);
}

const robots = await readFile(join(targetDirectory, "robots.txt"), "utf8");
if (!robots.includes("User-agent: *\nAllow: /")) failures.push("robots.txt: site is not explicitly crawlable");
if (!robots.includes(`Sitemap: ${productionOrigin}/sitemap.xml`)) failures.push("robots.txt: missing sitemap declaration");

if (failures.length) {
  console.error(`SEO validation failed in ${basename(targetDirectory)}:\n- ${failures.join("\n- ")}`);
  process.exitCode = 1;
} else {
  console.log(`SEO validation passed for ${pageFiles.length} pages in ${basename(targetDirectory)}.`);
}
