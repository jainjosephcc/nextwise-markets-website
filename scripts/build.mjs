import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectDirectory = dirname(dirname(fileURLToPath(import.meta.url)));
const outputDirectory = join(projectDirectory, "dist");

if (dirname(outputDirectory) !== projectDirectory || basename(outputDirectory) !== "dist") {
  throw new Error("Refusing to clean an unexpected build directory.");
}

const publicFiles = [
  "app.js",
  "content.css",
  "content.js",
  "favicon.ico",
  "index.html",
  "policy.css",
  "policy.js",
  "site.webmanifest",
  "styles.css",
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
  "mt5-metal-medallion-v3.png",
  "nextwise-cinematic-clouds-v1.jpg",
  "nextwise-connected-device-workspace-v1.png",
  "nextwise-continuity-devices-v1.png",
  "nextwise-hero-hand-laptop-v1.png",
  "nextwise-hero-hand-phone-pro-v2.png",
  "nextwise-hero-hand-tablet-v1.png",
  "nextwise-kinetic-ribbons-desktop-v1.webp",
  "nextwise-kinetic-ribbons-mobile-v1.webp",
  "nextwise-logo-blue.svg",
  "nextwise-logo-gradient.svg",
  "nextwise-logo-white.svg",
  "nextwise-mt5-cinematic-terminal-v1.webp",
  "nextwise-mt5-terminal-only-v2.webp",
  "nextwise-og-v3.jpg",
  "nextwise-story-activity-ledger-v3.webp",
  "nextwise-story-context-terminal-v2.webp",
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

const entries = await readdir(projectDirectory, { withFileTypes: true });
const routeDirectories = entries
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith(".") && !["assets", "dist", "node_modules", "reference", "scripts"].includes(entry.name))
  .map((entry) => entry.name)
  .sort();

let builtRouteCount = 0;
for (const route of routeDirectories) {
  const routeFiles = await readdir(join(projectDirectory, route));
  if (!routeFiles.includes("index.html")) continue;
  await cp(join(projectDirectory, route), join(outputDirectory, route), { recursive: true });
  builtRouteCount += 1;
}

console.log(`Built Nextwise Markets: ${builtRouteCount + 1} pages in dist/`);
