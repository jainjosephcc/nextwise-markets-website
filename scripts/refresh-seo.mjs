import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const projectDirectory = fileURLToPath(new URL("..", import.meta.url));
const siteUrl = "https://nextwisemarkets.com";
const socialImage = "https://imagedelivery.net/rOThsJwRI2L_FvAzE6eQ4A/3c30bab4-a81c-4bf8-3d5a-863078110500/public";

const pages = {
  "index.html": {
    title: "Online Forex & CFD Trading | Nextwise Markets",
    description: "Access forex, metals, energy, indices and selected crypto markets with Nextwise Markets through a connected MetaTrader 5 trading experience.",
    path: "/",
    type: "WebPage",
    breadcrumb: "Home",
  },
  "about-us/index.html": {
    title: "About Nextwise Markets | Global Online Trading",
    description: "Learn about Nextwise Markets, our approach to clear online trading, global market access and a connected experience for traders across devices.",
    path: "/about-us/",
    type: "AboutPage",
    breadcrumb: "About Us",
  },
  "account-types/index.html": {
    title: "Trading Account Types | Nextwise Markets",
    description: "Compare Nextwise Markets trading account types, including starting balance, leverage, spreads and commission options, to find the account that fits.",
    path: "/account-types/",
    type: "WebPage",
    breadcrumb: "Account Types",
  },
  "trading-platform/index.html": {
    title: "MetaTrader 5 Trading Platform | Nextwise Markets",
    description: "Explore MetaTrader 5 at Nextwise Markets, with multi-device access, advanced charts, market analysis tools and order management for global markets.",
    path: "/trading-platform/",
    type: "WebPage",
    breadcrumb: "Trading Platform",
  },
  "introducing-broker/index.html": {
    title: "Introducing Broker Program | Nextwise Markets",
    description: "Explore the Nextwise Markets Introducing Broker program, partnership support and commission opportunities for referring eligible trading clients.",
    path: "/introducing-broker/",
    type: "WebPage",
    breadcrumb: "Introducing Broker",
  },
  "contact/index.html": {
    title: "Contact Nextwise Markets | Client Support",
    description: "Contact Nextwise Markets client support and find our Saint Lucia registered address and Dubai representative office in Iris Bay Tower, Business Bay.",
    path: "/contact/",
    type: "ContactPage",
    breadcrumb: "Contact",
  },
  "forex/index.html": {
    title: "Forex Trading | Currency Pairs | Nextwise Markets",
    description: "Explore forex trading at Nextwise Markets, including major and minor currency pairs, live market charts and MetaTrader 5 access.",
    path: "/forex/",
    type: "WebPage",
    breadcrumb: "Forex",
  },
  "crypto/index.html": {
    title: "Cryptocurrency Trading | Nextwise Markets",
    description: "Explore selected cryptocurrency markets at Nextwise Markets with market charts, multi-device access and MetaTrader 5 trading tools.",
    path: "/crypto/",
    type: "WebPage",
    breadcrumb: "Crypto",
  },
  "metals-energy/index.html": {
    title: "Metals & Energy Trading | Nextwise Markets",
    description: "Explore gold, silver and energy markets at Nextwise Markets with clear pricing, market charts and MetaTrader 5 trading access.",
    path: "/metals-energy/",
    type: "WebPage",
    breadcrumb: "Metals & Energy",
  },
  "indices/index.html": {
    title: "Indices Trading | Global Markets | Nextwise Markets",
    description: "Explore major global stock indices at Nextwise Markets, including S&P 500, NASDAQ and FTSE 100, with charts and MetaTrader 5 access.",
    path: "/indices/",
    type: "WebPage",
    breadcrumb: "Indices",
  },
  "privacy-policy/index.html": {
    title: "Privacy Policy | Nextwise Markets",
    description: "Read the Nextwise Markets Privacy Policy to understand how we collect, use, store, protect and disclose personal information.",
    path: "/privacy-policy/",
    type: "WebPage",
    breadcrumb: "Privacy Policy",
  },
  "terms-and-conditions/index.html": {
    title: "Terms and Conditions | Nextwise Markets",
    description: "Read the terms and conditions governing use of the Nextwise Markets website, services, client accounts and related trading activities.",
    path: "/terms-and-conditions/",
    type: "WebPage",
    breadcrumb: "Terms and Conditions",
  },
  "aml-policy/index.html": {
    title: "Anti-Money Laundering Policy | Nextwise Markets",
    description: "Read the Nextwise Markets Anti-Money Laundering Policy covering identity verification, customer due diligence and transaction monitoring.",
    path: "/aml-policy/",
    type: "WebPage",
    breadcrumb: "AML Policy",
  },
  "deposit-withdrawal-policy/index.html": {
    title: "Deposit and Withdrawal Policy | Nextwise Markets",
    description: "Read the Nextwise Markets Deposit and Withdrawal Policy covering accepted funding, payment verification, processing and account requirements.",
    path: "/deposit-withdrawal-policy/",
    type: "WebPage",
    breadcrumb: "Deposit and Withdrawal Policy",
  },
  "restricted-countries/index.html": {
    title: "Restricted Countries | Nextwise Markets",
    description: "Review the countries and jurisdictions where Nextwise Markets does not offer services, together with applicable regional restrictions.",
    path: "/restricted-countries/",
    type: "WebPage",
    breadcrumb: "Restricted Countries",
  },
  "risk-disclosure/index.html": {
    title: "Trading Risk Disclosure | Nextwise Markets",
    description: "Read the Nextwise Markets Risk Disclosure covering leveraged trading, market volatility, execution, liquidity and potential financial losses.",
    path: "/risk-disclosure/",
    type: "WebPage",
    breadcrumb: "Risk Disclosure",
  },
  "client-services-agreement/index.html": {
    title: "Client Services Agreement | Nextwise Markets",
    description: "Read the Nextwise Markets Client Services Agreement covering account terms, client obligations, trading instructions and service conditions.",
    path: "/client-services-agreement/",
    type: "WebPage",
    breadcrumb: "Client Services Agreement",
  },
  "trading-activity-compliance-policy/index.html": {
    title: "Trading Activity Compliance Policy | Nextwise Markets",
    description: "Read the Nextwise Markets Trading Activity Compliance Policy covering prohibited trading practices, account monitoring and enforcement.",
    path: "/trading-activity-compliance-policy/",
    type: "WebPage",
    breadcrumb: "Trading Activity Compliance Policy",
  },
};

const escapeHtml = (value) => value
  .replaceAll("&", "&amp;")
  .replaceAll('"', "&quot;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;");

const organization = {
  "@type": "Organization",
  "@id": `${siteUrl}/#organization`,
  name: "The Nextwise Markets Ltd.",
  alternateName: "Nextwise Markets",
  url: `${siteUrl}/`,
  logo: `${siteUrl}/assets/nextwise-logo-gradient.svg`,
  email: "support@nextwisemarkets.com",
  telephone: "+2302138158",
  sameAs: [
    "https://www.facebook.com/nextwise.markets",
    "https://www.instagram.com/nextwise.markets/",
    "https://www.youtube.com/@nextwise.markets",
  ],
  address: {
    "@type": "PostalAddress",
    streetAddress: "Ground Floor, The Sotheby Building, Rodney Village, Rodney Bay",
    addressLocality: "Gros-Islet",
    addressCountry: "LC",
  },
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+2302138158",
    email: "support@nextwisemarkets.com",
    contactType: "customer support",
    availableLanguage: "English",
  },
  location: { "@id": `${siteUrl}/#dubai-representative-office` },
};

const representativeOffice = {
  "@type": "FinancialService",
  "@id": `${siteUrl}/#dubai-representative-office`,
  name: "Nextwise Markets Ltd. (Rep. Office)",
  url: `${siteUrl}/contact/#where-to-find-us`,
  image: [
    `${siteUrl}/assets/dubai-office-entrance.webp`,
    `${siteUrl}/assets/dubai-office-reception.webp`,
    `${siteUrl}/assets/dubai-office-workspace-1.webp`,
  ],
  telephone: "+971586765113",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Office 3002, 30th Floor, Iris Bay Tower, Business Bay",
    addressLocality: "Dubai",
    addressCountry: "AE",
  },
  hasMap: "https://www.google.com/maps/search/?api=1&query=Iris%20Bay%20Tower%2C%20Business%20Bay%2C%20Dubai",
  sameAs: [
    "https://www.google.com/maps?cid=10873996067987219276",
    "https://www.facebook.com/nextwise.markets",
    "https://www.instagram.com/nextwise.markets/",
    "https://www.youtube.com/@nextwise.markets",
  ],
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    opens: "10:00",
    closes: "20:00",
  },
  parentOrganization: { "@id": `${siteUrl}/#organization` },
};

const homeFaq = [
  ["What can I trade with Nextwise Markets?", "Nextwise Markets is designed to provide access across major asset classes, including forex, metals, indices, energy and selected digital assets. Availability can vary by account and region."],
  ["Which platform does Nextwise support?", "The account options shown on this page use MetaTrader 5. Final platform access and account conditions are confirmed during onboarding."],
  ["How do I choose an account type?", "Compare starting balance, trading style, leverage and commission preferences. If you are unsure, speak with the team before funding an account."],
  ["Is the chart in the mobile preview live?", "The chart uses TradingView market data for exploration. Data may be delayed and the preview does not place trades or provide investment advice."],
];

function schemaForPage(page) {
  const canonical = `${siteUrl}${page.path}`;
  const graph = [
    {
      "@type": page.type,
      "@id": `${canonical}#webpage`,
      url: canonical,
      name: page.title,
      description: page.description,
      isPartOf: { "@id": `${siteUrl}/#website` },
      about: { "@id": `${siteUrl}/#organization` },
      inLanguage: "en",
      primaryImageOfPage: {
        "@type": "ImageObject",
        url: socialImage,
        width: 1200,
        height: 630,
      },
    },
  ];

  if (page.path === "/") {
    graph.unshift(
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: `${siteUrl}/`,
        name: "Nextwise Markets",
        alternateName: "The Nextwise Markets",
        publisher: { "@id": `${siteUrl}/#organization` },
        inLanguage: "en",
      },
      organization,
      representativeOffice,
    );
    graph.push({
      "@type": "FAQPage",
      "@id": `${siteUrl}/#faq`,
      url: `${siteUrl}/#faq`,
      isPartOf: { "@id": `${siteUrl}/#website` },
      mainEntity: homeFaq.map(([name, text]) => ({
        "@type": "Question",
        name,
        acceptedAnswer: { "@type": "Answer", text },
      })),
    });
  } else {
    if (page.path === "/contact/") graph.push(representativeOffice);
    graph.push({
      "@type": "BreadcrumbList",
      "@id": `${canonical}#breadcrumb`,
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Nextwise Markets",
          item: `${siteUrl}/`,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: page.breadcrumb,
          item: canonical,
        },
      ],
    });
  }

  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph }, null, 2).replaceAll("<", "\\u003c");
}

function replaceAttributeMeta(html, attribute, key, content) {
  const pattern = new RegExp(`<meta ${attribute}="${key}" content="[^"]*" \\/>`);
  if (!pattern.test(html)) throw new Error(`Missing metadata: ${attribute}=${key}`);
  return html.replace(pattern, `<meta ${attribute}="${key}" content="${escapeHtml(content)}" />`);
}

for (const [relativePath, page] of Object.entries(pages)) {
  const filePath = join(projectDirectory, relativePath);
  let html = await readFile(filePath, "utf8");
  const canonical = `${siteUrl}${page.path}`;

  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(page.title)}</title>`);
  html = replaceAttributeMeta(html, "name", "description", page.description);
  html = html.replace(/<link rel="canonical" href="[^"]+" \/>/, `<link rel="canonical" href="${canonical}" />`);
  html = replaceAttributeMeta(html, "property", "og:title", page.title);

  const propertyMetas = [
    ["og:description", page.description],
    ["og:url", canonical],
  ];
  for (const [property, value] of propertyMetas) {
    html = html.replace(
      new RegExp(`<meta property="${property}" content="[^"]*" \\/>`),
      `<meta property="${property}" content="${escapeHtml(value)}" />`,
    );
  }

  const nameMetas = [
    ["twitter:title", page.title],
    ["twitter:description", page.description],
  ];
  for (const [name, value] of nameMetas) {
    html = html.replace(
      new RegExp(`<meta name="${name}" content="[^"]*" \\/>`),
      `<meta name="${name}" content="${escapeHtml(value)}" />`,
    );
  }

  if (!html.includes('name="robots"')) {
    html = html.replace(
      '    <meta name="viewport" content="width=device-width, initial-scale=1" />',
      '    <meta name="viewport" content="width=device-width, initial-scale=1" />\n    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />\n    <meta name="author" content="The Nextwise Markets Ltd." />',
    );
  }

  if (!html.includes('href="/analytics.css')) {
    html = html.replace(
      /(    <link rel="stylesheet")/,
      '    <link rel="stylesheet" href="/analytics.css?v=1" />\n    <script src="/analytics.js?v=1" defer></script>\n$1',
    );
  }

  const schemaBlock = `    <!-- SEO structured data -->\n    <script type="application/ld+json">\n${schemaForPage(page)}\n    </script>`;
  if (html.includes("<!-- SEO structured data -->")) {
    html = html.replace(/    <!-- SEO structured data -->\n    <script type="application\/ld\+json">[\s\S]*?<\/script>/, schemaBlock);
  } else {
    html = html.replace(/(    <link rel="stylesheet")/, `${schemaBlock}\n$1`);
  }

  await writeFile(filePath, html);
}

console.log(`Refreshed SEO metadata and structured data for ${Object.keys(pages).length} pages.`);
