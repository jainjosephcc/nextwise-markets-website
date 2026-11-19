import { cp, mkdir, readFile, readdir, rm } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectDirectory = dirname(dirname(fileURLToPath(import.meta.url)));
const outputDirectory = join(projectDirectory, "dist");

if (dirname(outputDirectory) !== projectDirectory || basename(outputDirectory) !== "dist") {
  throw new Error("Refusing to clean an unexpected build directory.");
}

const publicFiles = [
  "6e02189adaa4463eafada2b903695fe7.txt",
  "_headers",
  "analytics.css",
  "analytics.js",
  "app.js",
  "theme.js",
  "horizon.css",
  "brand-material.css",
  "crm-finish.css",
  "hero-visuals.css",
  "site-footer.css",
  "account-journey.css",
  "content.css",
  "content.js",
  "favicon.ico",
  "index.html",
  "llms.txt",
  "live-chat.js",
  "live-chat.css",
  "policy.css",
  "policy.js",
  "robots.txt",
  "site.webmanifest",
  "sitemap.xml",
  "styles.css",
  "home-refinement.css",
  "home-scroll.css",
  "home-scroll.js",
  "illustrations.css",
  "responsive-art.css",
  "section-art-layout.css",
  "site-refinement.css",
  "site-interactions.js",
  "screen-layout.css",
  "screen-layout.js",
  "site-header.css",
  "glacier.css",
];

const publicAssets = [
  "apple-touch-icon.png",
  "favicon-16x16.png",
  "favicon-192x192.png",
  "favicon-32x32.png",
  "favicon-512x512.png",
  "favicon.ico",
  "favicon.svg",
  "legal/client-services-agreement.pdf",
  "legal/trading-activity-compliance-policy.pdf",
  "mt5-logo.png",
  "paperbot-chat-icon.png",
  "mt5-metal-medallion-v3.png",
  "nextwise-cinematic-clouds-v1.jpg",
  "nextwise-connected-device-workspace-v1.webp",
  "nextwise-continuity-devices-v1.webp",
  "nextwise-hero-hand-laptop-v1.webp",
  "nextwise-hero-hand-phone-pro-480.webp",
  "nextwise-hero-hand-phone-pro-v2.webp",
  "nextwise-hero-hand-tablet-v1.webp",
  "nextwise-kinetic-ribbons-desktop-v1.webp",
  "nextwise-kinetic-ribbons-mobile-480.webp",
  "nextwise-kinetic-ribbons-mobile-v1.webp",
  "nextwise-logo-blue.svg",
  "nextwise-logo-gradient.svg",
  "nextwise-logo-white.svg",
  "nextwise-mt5-cinematic-terminal-v1.webp",
  "nextwise-mt5-terminal-only-v2.webp",
  "nextwise-og-v3.jpg",
  "nextwise-story-activity-ledger-v3.webp",
  "nextwise-story-activity-ledger-640.webp",
  "nextwise-story-context-terminal-640.webp",
  "nextwise-story-context-terminal-v2.webp",
  "nextwise-story-funding-gateway-640.webp",
  "nextwise-story-funding-gateway-v1.webp",
  "nextwise-story-hand-dashboard-web.jpg",
  "nextwise-story-three-phones-web.jpg",
  "nextwise-story-two-phones-web.jpg",
  "storyboard/nextwise-light-cloud-stage-v1.png",
];

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

for (const file of publicFiles) {
  await cp(join(projectDirectory, file), join(outputDirectory, file));
}

for (const asset of publicAssets) {
  const destination = join(outputDirectory, "assets", asset);
  await mkdir(dirname(destination), { recursive: true });
  await cp(join(projectDirectory, "assets", asset), destination);
}

await cp(join(projectDirectory, "assets", "glacier"), join(outputDirectory, "assets", "glacier"), { recursive: true });
await cp(join(projectDirectory, "assets", "horizon"), join(outputDirectory, "assets", "horizon"), { recursive: true });
await cp(join(projectDirectory, "assets", "portal-signature"), join(outputDirectory, "assets", "portal-signature"), { recursive: true });
await cp(join(projectDirectory, "assets", "fonts"), join(outputDirectory, "assets", "fonts"), { recursive: true });
await cp(join(projectDirectory, "assets", "illustrations"), join(outputDirectory, "assets", "illustrations"), { recursive: true });
await cp(join(projectDirectory, "assets", "product"), join(outputDirectory, "assets", "product"), { recursive: true });
await cp(join(projectDirectory, "assets", "hero-art"), join(outputDirectory, "assets", "hero-art"), {
  recursive: true,
  filter: (source) => !/\.(?:json|md)$/i.test(source),
});
await cp(join(projectDirectory, "assets", "optimized"), join(outputDirectory, "assets", "optimized"), {
  recursive: true,
  filter: (source) => !/\.(?:json|md)$/i.test(source),
});

const sitemap = await readFile(join(projectDirectory, "sitemap.xml"), "utf8");
const publishedRoutes = new Set([...sitemap.matchAll(/<loc>https:\/\/nextwisemarkets\.com\/([^/<]+)\/<\/loc>/g)].map((match) => match[1]));
const entries = await readdir(projectDirectory, { withFileTypes: true });
const routeDirectories = entries
  .filter((entry) => entry.isDirectory() && publishedRoutes.has(entry.name))
  .map((entry) => entry.name)
  .sort();

let builtRouteCount = 0;
for (const route of routeDirectories) {
  const routeFiles = await readdir(join(projectDirectory, route));
  if (!routeFiles.includes("index.html")) continue;
  await cp(join(projectDirectory, route), join(outputDirectory, route), { recursive: true });
  builtRouteCount += 1;
}

console.log(`Built NEXTWISE MARKETS: ${builtRouteCount + 1} pages in dist/`);
