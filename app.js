const isDark = () => document.documentElement.dataset.theme === "dark";
const dubaiWeekday = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Dubai", weekday: "short" }).format(new Date());
const isWeekend = ["Sat", "Sun"].includes(dubaiWeekday);
const state = { symbol: isWeekend ? "BINANCE:BTCUSDT" : "OANDA:XAUUSD", label: isWeekend ? "Bitcoin / USDT" : "Gold / USD", interval: "60" };
const chart = document.querySelector("[data-chart]");
const iframe = document.querySelector("#trading-chart");
let chartTimer;
let chartRequested = false;

function chartUrl() {
  const config = {
    symbol: state.symbol, interval: state.interval, theme: isDark() ? "dark" : "light",
    style: "1", timezone: "Etc/UTC", locale: "en", autosize: true,
    hide_top_toolbar: true, hide_side_toolbar: true, hide_legend: true, hide_volume: true,
    allow_symbol_change: false, save_image: false, withdateranges: false,
    // Custom ranges preserve the selected interval and avoid a dense month of candles.
    range: state.interval === "D" ? "2M" : state.interval === "240" ? "8D" : "2D",
    backgroundColor: isDark() ? "#111a2b" : "#ffffff",
  };
  const colors = {};
  for (const [side, color] of [["Up", "#288cce"], ["Down", "#f86135"]]) {
    for (const key of [`${side.toLowerCase()}Color`, `border${side}Color`, `wick${side}Color`]) {
      colors[`mainSeriesProperties.candleStyle.${key}`] = color;
    }
  }
  const overrides = JSON.stringify({
    ...colors,
    "scalesProperties.fontSize": 14,
  });
  // Put changing controls in the query too: a hash-only URL change does not
  // reload the embedded chart, leaving its market, interval or theme stale.
  const params = new URLSearchParams({ locale: "en", symbol: state.symbol,
    interval: state.interval, theme: config.theme, overrides });
  return `https://www.tradingview-widget.com/embed-widget/advanced-chart/?${params}#${encodeURIComponent(JSON.stringify(config))}`;
}
function setChartState(next) {
  chart?.classList.toggle("loaded", next === "ready");
  chart?.classList.toggle("is-slow", next === "slow");
  chart?.setAttribute("aria-busy", String(next === "loading"));
}
function loadChart({ force = false } = {}) {
  if (!iframe) return;
  chartRequested = true;
  const next = chartUrl();
  if (!force && iframe.dataset.chartUrl === next) return;
  window.clearTimeout(chartTimer);
  setChartState("loading");
  iframe.dataset.chartUrl = next;
  iframe.title = `Chart for ${state.label}, ${state.interval === "D" ? "1 day" : `${state.interval} minutes`}`;
  iframe.src = next;
  chartTimer = window.setTimeout(() => setChartState("slow"), 15000);
}
iframe?.addEventListener("load", () => {
  if (!chartRequested) return;
  window.clearTimeout(chartTimer);
  setChartState("ready");
});
document.querySelector("[data-chart-retry]")?.addEventListener("click", () => loadChart({ force: true }));
if (chart) {
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      loadChart();
    }, { rootMargin: "250px 0px" });
    observer.observe(chart);
  } else loadChart();
}
function activateTab(button, selector) {
  document.querySelectorAll(selector).forEach((tab) => {
    const selected = tab === button;
    tab.classList.toggle("active", selected);
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });
}
const initial = [...document.querySelectorAll(".symbol-tabs button")].find((button) => button.dataset.symbol === state.symbol);
if (initial) {
  activateTab(initial, ".symbol-tabs button");
  const marketSelect = document.querySelector("[data-phone-market]");
  if (marketSelect) marketSelect.value = state.symbol;
  document.querySelector("#active-market-name").textContent = state.label;
}
document.querySelectorAll(".symbol-tabs button").forEach((button) => button.addEventListener("click", () => {
  activateTab(button, ".symbol-tabs button");
  state.symbol = button.dataset.symbol;
  state.label = button.dataset.label;
  const marketSelect = document.querySelector("[data-phone-market]");
  if (marketSelect) marketSelect.value = state.symbol;
  document.querySelector("#active-market-name").textContent = state.label;
  loadChart();
}));
document.querySelector("[data-phone-market]")?.addEventListener("change", (event) => {
  document.querySelector(`.symbol-tabs button[data-symbol="${event.target.value}"]`)?.click();
});
document.querySelector("[data-chart-interval]")?.addEventListener("change", (event) => {
  document.querySelector(`.timeframe-tabs button[data-interval="${event.target.value}"]`)?.click();
});
document.querySelectorAll(".timeframe-tabs button").forEach((button) => button.addEventListener("click", () => {
  activateTab(button, ".timeframe-tabs button");
  state.interval = button.dataset.interval;
  const intervalSelect = document.querySelector("[data-chart-interval]");
  if (intervalSelect) intervalSelect.value = state.interval;
  loadChart();
}));
function enableArrowNavigation(containerSelector, buttonSelector) {
  document.querySelectorAll(containerSelector).forEach((container) => container.addEventListener("keydown", (event) => {
    const arrowKeys = container.getAttribute("aria-orientation") === "vertical"
      ? ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]
      : ["ArrowLeft", "ArrowRight"];
    if (![...arrowKeys, "Home", "End"].includes(event.key)) return;
    const buttons = [...container.querySelectorAll(buttonSelector)];
    if (!buttons.length) return;
    const current = buttons.indexOf(document.activeElement);
    let next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : current + (["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : -1);
    next = (next + buttons.length) % buttons.length;
    event.preventDefault(); buttons[next].focus(); buttons[next].click();
  }));
}
enableArrowNavigation(".symbol-tabs", "button");
enableArrowNavigation(".timeframe-tabs", "button");
window.addEventListener("nextwise:themechange", () => {
  if (chartRequested) loadChart();
});

const marketWidgetShell = document.querySelector("[data-live-market-widget]");
const marketWidgetStatus = document.querySelector("[data-market-feed-status]");
const marketDataWidget = document.querySelector("[data-market-overview-widget]");
const marketCategoryButtons = [...document.querySelectorAll("[data-market-category]")];
const marketWidgetRetry = document.querySelector("[data-market-widget-retry]");
// TradingView exposes compact/normal/large chart sizes. Reserve usable space
// for its symbol list as well as the graph on shorter screens.
const marketWidgetStage = document.querySelector(".market-widget-stage");
if (marketDataWidget && marketWidgetStage && "ResizeObserver" in window) {
  const marketSizeObserver = new ResizeObserver(([entry]) => {
    const height = entry.contentRect.height;
    const size = height >= 500 ? "large" : height >= 300 ? "normal" : "compact";
    if (marketDataWidget.getAttribute("chart-size") !== size) marketDataWidget.setAttribute("chart-size", size);
  });
  marketSizeObserver.observe(marketWidgetStage);
}
const liveMarketGroups = {
  forex: [{ sectionName: "Forex", symbols: ["FX:EURUSD", "FX:GBPUSD", "FX:USDJPY", "FX:USDCHF", "FX:AUDUSD", "FX:USDCAD"] }],
  crypto: [{ sectionName: "Crypto", symbols: ["BINANCE:BTCUSDT", "BINANCE:ETHUSDT", "BINANCE:SOLUSDT", "BINANCE:XRPUSDT", "BINANCE:BNBUSDT", "BINANCE:ADAUSDT"] }],
  commodities: [{ sectionName: "Metals & Energy", symbols: ["CMCMARKETS:GOLD", "OANDA:XAGUSD", "OANDA:XPTUSD", "OANDA:XPDUSD", "TVC:USOIL", "TVC:UKOIL"] }],
  indices: [{ sectionName: "Indices", symbols: ["FOREXCOM:SPXUSD", "FOREXCOM:NSXUSD", "FOREXCOM:DJI", "INDEX:NKY", "INDEX:DEU40", "FOREXCOM:UKXGBP"] }],
};
let marketWidgetReady = false;
let marketWidgetLoadStarted = false;
let marketWidgetTimer = 0;
let marketWidgetAttempt = 0;

function setMarketWidgetState(state, message) {
  if (!marketWidgetShell) return;
  marketWidgetShell.classList.toggle("is-ready", state === "ready");
  marketWidgetShell.classList.toggle("has-error", state === "error");
  marketWidgetStatus?.classList.toggle("is-ready", state === "ready");
  marketWidgetStatus?.classList.toggle("has-error", state === "error");
  const label = marketWidgetStatus?.querySelector("span");
  if (label) label.textContent = message;
  document.querySelector("#market-data-panel")?.setAttribute("aria-busy", String(state === "loading"));
}

function markMarketWidgetReady() {
  marketWidgetReady = true;
  window.clearTimeout(marketWidgetTimer);
  setMarketWidgetState("ready", "Market board ready");
}

function markMarketWidgetUnavailable(attempt) {
  if (attempt !== marketWidgetAttempt || marketWidgetReady) return;
  window.clearTimeout(marketWidgetTimer);
  setMarketWidgetState("error", "Market data unavailable");
}

function loadMarketOverviewWidget({ retry = false } = {}) {
  if (!marketWidgetShell || !("customElements" in window)) return;
  if (customElements.get("tv-market-overview")) {
    markMarketWidgetReady();
    return;
  }
  if (marketWidgetLoadStarted && !retry) return;

  marketWidgetLoadStarted = true;
  marketWidgetReady = false;
  marketWidgetAttempt += 1;
  const attempt = marketWidgetAttempt;
  setMarketWidgetState("loading", "Connecting to market data");

  document.querySelector("[data-market-widget-script]")?.remove();
  const script = document.createElement("script");
  script.type = "module";
  script.src = `https://widgets.tradingview-widget.com/w/en/tv-market-overview.js${retry ? `?retry=${marketWidgetAttempt}` : ""}`;
  script.dataset.marketWidgetScript = "";
  script.addEventListener("error", () => markMarketWidgetUnavailable(attempt), { once: true });
  document.head.append(script);

  customElements.whenDefined("tv-market-overview").then(markMarketWidgetReady);
  window.clearTimeout(marketWidgetTimer);
  marketWidgetTimer = window.setTimeout(() => markMarketWidgetUnavailable(attempt), 15000);
}

function requestMarketOverviewWidget() {
  loadMarketOverviewWidget();
}

if (marketWidgetShell) {
  if ("IntersectionObserver" in window) {
    const marketLoadObserver = new IntersectionObserver((entries, observer) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      requestMarketOverviewWidget();
    }, { rootMargin: "200px 0px" });
    marketLoadObserver.observe(marketWidgetShell);
  } else {
    requestMarketOverviewWidget();
  }
}

marketWidgetRetry?.addEventListener("click", () => loadMarketOverviewWidget({ retry: true }));

marketCategoryButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const group = liveMarketGroups[button.dataset.marketCategory];
    if (!group || !marketDataWidget) return;
    activateTab(button, "[data-market-category]");
    marketDataWidget.setAttribute("symbol-sectors", JSON.stringify(group));
    document.querySelector("#market-data-panel")?.setAttribute("aria-labelledby", button.id);
  });
});
enableArrowNavigation(".market-category-tabs", "button");


const menuButton = document.querySelector(".menu-toggle");
const menu = document.querySelector(".site-nav");
menuButton?.addEventListener("click", () => {
  const open = menu.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(open));
  document.body.classList.toggle("menu-open", open);
  if (open) menu.querySelector("a")?.focus();
});
menu?.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
  menu.classList.remove("open");
  menuButton.setAttribute("aria-expanded", "false");
  document.body.classList.remove("menu-open");
}));
document.addEventListener("pointerdown", (event) => {
  if (!menu?.classList.contains("open")) return;
  if (menu.contains(event.target) || menuButton?.contains(event.target)) return;
  menu.classList.remove("open");
  menuButton?.setAttribute("aria-expanded", "false");
  document.body.classList.remove("menu-open");
});
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || !menu?.classList.contains("open")) return;
  menu.classList.remove("open");
  menuButton?.setAttribute("aria-expanded", "false");
  document.body.classList.remove("menu-open");
  menuButton?.focus();
});

document.querySelectorAll(".faq details").forEach((details) => {
  details.addEventListener("toggle", () => {
    if (!details.open) return;
    document.querySelectorAll(".faq details[open]").forEach((other) => {
      if (other !== details) other.open = false;
    });
  });
});



const year = document.querySelector("#year");
if (year) year.textContent = new Date().getFullYear();
matchMedia("(min-width: 1161px)").addEventListener?.("change", (event) => {
  if (!event.matches) return;
  menu?.classList.remove("open");
  menuButton?.setAttribute("aria-expanded", "false");
  document.body.classList.remove("menu-open");
});

const heroDevices = document.querySelector("[data-hero-devices]");
if (heroDevices) {
  const device = heroDevices.querySelector(".hero-device");
  const choices = [...heroDevices.querySelectorAll("[data-device-view]")];
  const narrowScreen = window.matchMedia("(max-width: 600px)");
  const wideScreen = window.matchMedia("(min-width: 1024px)");
  let selectedByVisitor = false;

  function showDevice(name) {
    device.dataset.device = name;
    for (const choice of choices) {
      choice.setAttribute("aria-pressed", String(choice.dataset.deviceView === name));
    }
  }

  function showDefaultDevice() {
    if (selectedByVisitor) return;
    if (narrowScreen.matches) showDevice("phone");
    else showDevice(wideScreen.matches ? "laptop" : "tablet");
  }

  for (const choice of choices) {
    choice.addEventListener("click", () => {
      selectedByVisitor = true;
      showDevice(choice.dataset.deviceView);
    });
  }
  narrowScreen.addEventListener("change", showDefaultDevice);
  wideScreen.addEventListener("change", showDefaultDevice);
  showDefaultDevice();
}
