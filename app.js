const dubaiWeekday = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Dubai",
  weekday: "short",
}).format(new Date());
const isWeekend = dubaiWeekday === "Sat" || dubaiWeekday === "Sun";
const defaultMarket = isWeekend
  ? { symbol: "BINANCE:BTCUSDT", label: "BTC/USDT" }
  : { symbol: "OANDA:XAUUSD", label: "XAU/USD" };
const state = { ...defaultMarket, interval: "60" };
const chart = document.querySelector("[data-chart]");
const iframe = document.querySelector("#trading-chart");
const chartRetryButton = document.querySelector("[data-chart-retry]");
let chartLoadTimer = 0;

function chartUrl() {
  const params = new URLSearchParams({
    symbol: state.symbol,
    interval: state.interval,
    hidetoptoolbar: "1",
    hidelegend: "1",
    saveimage: "0",
    toolbarbg: "0B0E12",
    theme: "dark",
    style: "1",
    timezone: "Etc/UTC",
    locale: "en",
    withdateranges: "0",
  });
  return `https://s.tradingview.com/widgetembed/?${params.toString()}`;
}

function setChartState(nextState) {
  if (!chart) return;
  chart.classList.toggle("loaded", nextState === "ready");
  chart.classList.toggle("is-slow", nextState === "slow");
  chart.setAttribute("aria-busy", String(nextState === "loading"));
}

function loadChart({ force = false } = {}) {
  if (!iframe) return;
  const nextUrl = chartUrl();
  if (!force && iframe.dataset.chartUrl === nextUrl) return;

  window.clearTimeout(chartLoadTimer);
  setChartState("loading");
  iframe.dataset.chartUrl = nextUrl;
  iframe.title = `Chart for ${state.label}, ${state.interval === "D" ? "1 day" : `${state.interval} minutes`}`;
  iframe.src = nextUrl;
  chartLoadTimer = window.setTimeout(() => setChartState("slow"), 10000);
}

iframe?.addEventListener("load", () => {
  window.clearTimeout(chartLoadTimer);
  setChartState("ready");
});

chartRetryButton?.addEventListener("click", () => loadChart({ force: true }));

/*
 * The TradingView iframe is kept alive while device previews move around the
 * hero. Only an actual symbol or timeframe change gets a new URL.
 */
function updateHeroChart() {
  loadChart();
}

function activateTab(button, selector) {
  document.querySelectorAll(selector).forEach((tab) => {
    const selected = tab === button;
    tab.classList.toggle("active", selected);
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });
}

function setInitialMarket() {
  const button = [...document.querySelectorAll(".symbol-tabs button")]
    .find((tab) => tab.dataset.symbol === state.symbol);
  if (!button) return;
  activateTab(button, ".symbol-tabs button");
  document.querySelector("#active-market-name").textContent = button.dataset.label;
  document.querySelector("#market-price").textContent = button.dataset.price;
}

document.querySelectorAll(".symbol-tabs button").forEach((button) => {
  button.addEventListener("click", () => {
    activateTab(button, ".symbol-tabs button");
    state.symbol = button.dataset.symbol;
    state.label = button.textContent.trim();
    document.querySelector("#active-market-name").textContent = button.dataset.label;
    document.querySelector("#market-price").textContent = button.dataset.price;
    updateHeroChart();
  });
});

document.querySelectorAll(".timeframe-tabs button").forEach((button) => {
  button.addEventListener("click", () => {
    activateTab(button, ".timeframe-tabs button");
    state.interval = button.dataset.interval;
    updateHeroChart();
  });
});

function enableArrowNavigation(containerSelector, buttonSelector) {
  document.querySelectorAll(containerSelector).forEach((container) => {
    container.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      const buttons = [...container.querySelectorAll(buttonSelector)];
      const current = buttons.indexOf(document.activeElement);
      let next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : current + (event.key === "ArrowRight" ? 1 : -1);
      next = (next + buttons.length) % buttons.length;
      event.preventDefault();
      buttons[next].focus();
      buttons[next].click();
    });
  });
}

enableArrowNavigation(".symbol-tabs", "button");
enableArrowNavigation(".timeframe-tabs", "button");

const deviceStage = document.querySelector("[data-device-stage]");
const liveScreen = document.querySelector("[data-live-screen]");
const deviceButtons = [...document.querySelectorAll("[data-device-option]")];
const devicePanels = [...document.querySelectorAll(".device-panel")];
const deviceNames = { phone: "phone", tablet: "iPad", laptop: "MacBook" };
let deviceSwapTimer = 0;

function selectDevice(button) {
  if (!deviceStage || !liveScreen || button.classList.contains("active")) return;
  const device = button.dataset.deviceOption;
  const target = document.querySelector(`#device-panel-${device}`);
  if (!target) return;

  clearTimeout(deviceSwapTimer);
  deviceStage.classList.add("switching");
  deviceButtons.forEach((item) => {
    const selected = item === button;
    item.classList.toggle("active", selected);
    item.setAttribute("aria-selected", String(selected));
    item.tabIndex = selected ? 0 : -1;
  });

  const finishSwap = () => {
    devicePanels.forEach((panel) => {
      const selected = panel === target;
      panel.classList.toggle("active", selected);
      panel.setAttribute("aria-hidden", String(!selected));
    });
    target.append(liveScreen);
    deviceStage.dataset.device = device;
    liveScreen.setAttribute("aria-label", `Interactive Nextwise Markets chart on ${deviceNames[device]}`);
    requestAnimationFrame(() => deviceStage.classList.remove("switching"));
  };

  if (matchMedia("(prefers-reduced-motion: reduce)").matches) finishSwap();
  else deviceSwapTimer = window.setTimeout(finishSwap, 130);
}

deviceButtons.forEach((button) => button.addEventListener("click", () => selectDevice(button)));
enableArrowNavigation(".device-switcher", "button");

const marketWidgetShell = document.querySelector("[data-live-market-widget]");
const marketWidgetStatus = document.querySelector("[data-market-feed-status]");
const marketDataWidget = document.querySelector("[data-market-overview-widget]");
const marketPanelName = document.querySelector("[data-market-panel-name]");
const marketCategoryButtons = [...document.querySelectorAll("[data-market-category]")];
const marketWidgetRetry = document.querySelector("[data-market-widget-retry]");
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
  setMarketWidgetState("ready", "Market data available");
}

function markMarketWidgetUnavailable() {
  if (marketWidgetReady) return;
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
  setMarketWidgetState("loading", "Connecting to market data");

  document.querySelector("[data-market-widget-script]")?.remove();
  const script = document.createElement("script");
  script.type = "module";
  script.src = `https://widgets.tradingview-widget.com/w/en/tv-market-overview.js${retry ? `?retry=${marketWidgetAttempt}` : ""}`;
  script.dataset.marketWidgetScript = "";
  script.addEventListener("error", markMarketWidgetUnavailable, { once: true });
  document.head.append(script);

  customElements.whenDefined("tv-market-overview").then(markMarketWidgetReady);
  window.clearTimeout(marketWidgetTimer);
  marketWidgetTimer = window.setTimeout(markMarketWidgetUnavailable, 15000);
}

if (marketWidgetShell) {
  if ("IntersectionObserver" in window) {
    const marketLoadObserver = new IntersectionObserver((entries, observer) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      loadMarketOverviewWidget();
    }, { rootMargin: "900px 0px" });
    marketLoadObserver.observe(marketWidgetShell);
  } else {
    loadMarketOverviewWidget();
  }
}

marketWidgetRetry?.addEventListener("click", () => loadMarketOverviewWidget({ retry: true }));

marketCategoryButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const group = liveMarketGroups[button.dataset.marketCategory];
    if (!group || !marketDataWidget) return;
    activateTab(button, "[data-market-category]");
    marketDataWidget.setAttribute("symbol-sectors", JSON.stringify(group));
    const marketLabel = button.dataset.marketLabel || button.textContent.trim();
    document.querySelector("#market-data-panel")?.setAttribute("aria-label", `${marketLabel} market data and interactive chart`);
    marketDataWidget.setAttribute("aria-label", `Interactive ${marketLabel} market prices and chart`);
    if (marketPanelName) marketPanelName.textContent = marketLabel;
  });
});
enableArrowNavigation(".market-category-tabs", "button");

document.querySelectorAll(".signal-timeframes button").forEach((button) => {
  button.addEventListener("click", () => activateTab(button, ".signal-timeframes button"));
});
enableArrowNavigation(".signal-timeframes", "button");

const menuButton = document.querySelector(".menu-toggle");
const menu = document.querySelector(".site-nav");
menuButton?.addEventListener("click", () => {
  const open = menu.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(open));
  document.body.classList.toggle("menu-open", open);
});
menu?.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
  menu.classList.remove("open");
  menuButton.setAttribute("aria-expanded", "false");
  document.body.classList.remove("menu-open");
}));

document.querySelectorAll("details").forEach((details) => {
  details.addEventListener("toggle", () => {
    if (!details.open) return;
    document.querySelectorAll("details[open]").forEach((other) => {
      if (other !== details) other.open = false;
    });
  });
});

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.style.setProperty("--delay", `${entry.target.dataset.delay || 0}ms`);
    entry.target.classList.add("visible");
    revealObserver.unobserve(entry.target);
  });
}, { threshold: 0.12, rootMargin: "0px 0px -30px" });
document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));

const signalGallery = document.querySelector("[data-signal-gallery]");
const signalPath = document.querySelector("[data-signal-path]");
const signalChartLine = document.querySelector("[data-signal-chart-line]");
const connectedAccess = document.querySelector("[data-connected-access]");
const connectedRoute = document.querySelector("[data-connected-route]");
const connectedChartLine = document.querySelector("[data-connected-chart-line]");
const claritySection = document.querySelector("[data-clarity-section]");
const clarityRoute = document.querySelector("[data-clarity-route]");
const clarityCards = [...document.querySelectorAll("[data-clarity-card]")];
const journeySection = document.querySelector("[data-journey-section]");
const journeyRoute = document.querySelector("[data-journey-route]");
const journeySteps = [...document.querySelectorAll("[data-journey-step]")];
const journeyChart = document.querySelector("[data-journey-chart]");
const prefersReducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const storySection = document.querySelector("[data-story-section]");
const storyCards = [...document.querySelectorAll("[data-story-card]")];
const storyVideos = [...(storySection?.querySelectorAll("video") || [])];
const responsiveStoryVideos = [...document.querySelectorAll("[data-responsive-story-video]")];
const storyCurrent = document.querySelector("[data-story-current]");
const storyPreviewLogo = document.querySelector(".ribbon-card-logo");
const mt5Cinematic = document.querySelector(".mt5-cinematic");
const mt5RollingCoin = document.querySelector("[data-mt5-rolling-coin]");
let signalAnimationFrame = 0;
let storyLogoOriginX = 0;
let storyLogoOriginY = 0;

function syncStoryVideoSources() {
  const mobile = matchMedia("(max-width: 600px)").matches;
  responsiveStoryVideos.forEach((video) => {
    const nextSource = mobile ? video.dataset.mobileSrc : video.dataset.desktopSrc;
    if (!nextSource || video.getAttribute("src") === nextSource) return;
    const wasPlaying = !video.paused;
    video.src = nextSource;
    video.load();
    if (wasPlaying && !prefersReducedMotion.matches) video.play().catch(() => {});
  });
}

function updateSignalAnimation() {
  signalAnimationFrame = 0;
  if (signalGallery) {
    const rect = signalGallery.getBoundingClientRect();
    const distance = innerHeight + rect.height * 0.62;
    const progress = prefersReducedMotion.matches
      ? 1
      : Math.max(0, Math.min(1, (innerHeight * 0.88 - rect.top) / distance));
    signalGallery.style.setProperty("--signal-progress", progress.toFixed(3));
    if (signalPath) signalPath.style.strokeDashoffset = String(1 - progress);
    if (signalChartLine) signalChartLine.style.strokeDashoffset = String(1 - Math.max(0, Math.min(1, progress * 1.45)));
  }
  if (connectedAccess) {
    const rect = connectedAccess.getBoundingClientRect();
    const distance = innerHeight * 1.05 + rect.height * 0.72;
    const progress = prefersReducedMotion.matches
      ? 1
      : Math.max(0, Math.min(1, (innerHeight * 0.9 - rect.top) / distance));
    connectedAccess.style.setProperty("--connected-progress", progress.toFixed(3));
    connectedAccess.classList.toggle("connected-active", progress > 0.08 && progress < 1);
    if (connectedRoute) connectedRoute.style.strokeDashoffset = String(1 - progress);
    if (connectedChartLine) connectedChartLine.style.strokeDashoffset = String(1 - Math.min(1, progress * 1.55));
  }
  if (claritySection) {
    const rect = claritySection.getBoundingClientRect();
    const distance = innerHeight * 0.9 + rect.height * 0.38;
    const progress = prefersReducedMotion.matches
      ? 1
      : Math.max(0, Math.min(1, (innerHeight * 0.88 - rect.top) / distance));
    claritySection.style.setProperty("--clarity-progress", progress.toFixed(3));
    claritySection.classList.toggle("clarity-active", progress > 0.07 && progress < 1);
    if (clarityRoute) clarityRoute.style.strokeDashoffset = String(1 - progress);
    clarityCards.forEach((card, index) => {
      const cardProgress = prefersReducedMotion.matches
        ? 1
        : Math.max(0, Math.min(1, (progress - index * 0.17) / 0.3));
      card.style.setProperty("--card-progress", cardProgress.toFixed(3));
      card.classList.toggle("card-active", cardProgress > 0.08 && cardProgress < 0.96);
      card.classList.toggle("card-visited", cardProgress > 0.08);
      const riskValue = card.querySelector("[data-risk-value]");
      if (riskValue) riskValue.textContent = String(Math.round(Number(riskValue.dataset.riskValue) * cardProgress));
    });
  }
  if (journeySection) {
    const rect = journeySection.getBoundingClientRect();
    const distance = innerHeight * 0.9 + rect.height * 0.48;
    const progress = prefersReducedMotion.matches
      ? 1
      : Math.max(0, Math.min(1, (innerHeight * 0.88 - rect.top) / distance));
    journeySection.style.setProperty("--journey-progress", progress.toFixed(3));
    if (journeyRoute) journeyRoute.style.strokeDashoffset = String(1 - progress);
    journeySteps.forEach((step, index) => {
      const stepProgress = prefersReducedMotion.matches
        ? 1
        : Math.max(0, Math.min(1, (progress - index * 0.18) / 0.28));
      step.style.setProperty("--step-progress", stepProgress.toFixed(3));
      step.classList.toggle("step-active", stepProgress > 0.08 && stepProgress < 0.97);
      step.classList.toggle("step-visited", stepProgress > 0.08);
      const value = step.querySelector("[data-journey-value]");
      if (value) value.textContent = `${Math.round(Number(value.dataset.journeyValue) * stepProgress)}%`;
    });
    if (journeyChart) {
      const chartProgress = Math.max(0, Math.min(1, (progress - 0.18) / 0.3));
      journeyChart.style.strokeDashoffset = String(1 - chartProgress);
    }
  }
  updateStoryAnimation();
  updateMt5Coin();
}

const clamp = (value) => Math.max(0, Math.min(1, value));
const progressBetween = (progress, start, end) => clamp((progress - start) / Math.max(0.001, end - start));

function updateMt5Coin() {
  if (!mt5Cinematic || !mt5RollingCoin) return;
  const track = mt5RollingCoin.closest(".mt5-feature-band");
  const trackTop = track?.getBoundingClientRect().top ?? innerHeight;
  const progress = prefersReducedMotion.matches
    ? 0.5
    : clamp((innerHeight - trackTop) / Math.max(1, innerHeight * 0.9));
  const coinWidth = mt5RollingCoin.getBoundingClientRect().width || 132;
  const travel = mt5Cinematic.clientWidth + coinWidth * 1.7;
  const x = -coinWidth * 1.15 + progress * travel;
  const rolledDistance = Math.max(0, x + coinWidth * 1.15);
  const rotation = rolledDistance / Math.max(1, Math.PI * coinWidth) * 360;
  mt5Cinematic.style.setProperty("--mt5-coin-x", `${x.toFixed(1)}px`);
  mt5Cinematic.style.setProperty("--mt5-coin-rotation", `${rotation.toFixed(1)}deg`);
}

function updateStoryAnimation() {
  if (!storySection || !storyCards.length) return;
  const rect = storySection.getBoundingClientRect();
  const visible = rect.bottom > 0 && rect.top < innerHeight;
  let progress = prefersReducedMotion.matches ? 1 : 0;

  if (!prefersReducedMotion.matches) {
    const scrollDistance = Math.max(1, storySection.offsetHeight - innerHeight);
    progress = clamp(-rect.top / scrollDistance);
  }

  progress = clamp(progress);
  const railProgress = progressBetween(progress, 0, 0.29);
  const cardsFade = 1 - progressBetween(progress, 0.36, 0.44);
  const ribbonProgress = progressBetween(progress, 0.27, 0.52);
  const logoReveal = progressBetween(progress, 0.255, 0.295);
  const logoTravel = progressBetween(progress, 0.255, 0.52);
  const darkModeMix = progressBetween(progress, 0.53, 0.66);
  const blackout = progressBetween(progress, 0.52, 0.61);
  const finaleProgress = progressBetween(progress, 0.84, 0.94);
  const warmLogo = logoReveal * (1 - darkModeMix);
  const blueLogo = logoReveal * darkModeMix * (1 - finaleProgress);

  if (storyPreviewLogo && progress <= 0.275) {
    const previewLogoRect = storyPreviewLogo.getBoundingClientRect();
    if (previewLogoRect.width > 0 && previewLogoRect.height > 0) {
      storyLogoOriginX = previewLogoRect.left + previewLogoRect.width / 2 - innerWidth / 2;
      storyLogoOriginY = previewLogoRect.top + previewLogoRect.height / 2 - innerHeight / 2;
    }
  }

  const activeCard = Math.min(storyCards.length - 1, Math.floor(railProgress * storyCards.length));
  storyCards.forEach((card, index) => card.classList.toggle("active", index === activeCard));
  storyVideos.forEach((video) => {
    const shouldPlay = visible && progress > 0.16 && progress < 0.62 && !prefersReducedMotion.matches;
    if (shouldPlay) video.play().catch(() => {});
    else video.pause();
  });

  document.querySelector("[data-header]")?.classList.remove("story-blackout");
  storySection.style.setProperty("--story-progress", progress.toFixed(3));
  storySection.style.setProperty("--rail-progress", railProgress.toFixed(3));
  storySection.style.setProperty("--cards-fade", cardsFade.toFixed(3));
  storySection.style.setProperty("--ribbon-progress", ribbonProgress.toFixed(3));
  storySection.style.setProperty("--logo-shift-x", `${(storyLogoOriginX * (1 - logoTravel)).toFixed(1)}px`);
  storySection.style.setProperty("--logo-shift-y", `${(storyLogoOriginY * (1 - logoTravel)).toFixed(1)}px`);
  storySection.style.setProperty("--warm-logo", warmLogo.toFixed(3));
  storySection.style.setProperty("--blue-logo", blueLogo.toFixed(3));
  storySection.style.setProperty("--story-blackout", blackout.toFixed(3));
  storySection.style.setProperty("--finale-progress", finaleProgress.toFixed(3));
  const stage = progress < 0.1 ? 1 : progress < 0.2 ? 2 : progress < 0.3 ? 3 : progress < 0.52 ? 4 : progress < 0.86 ? 5 : 6;
  if (storyCurrent) storyCurrent.textContent = String(stage).padStart(2, "0");
}

function handlePageMotion() {
  document.querySelector("[data-header]")?.classList.toggle("scrolled", scrollY > 24);
  if (!signalAnimationFrame) signalAnimationFrame = requestAnimationFrame(updateSignalAnimation);
}

window.addEventListener("scroll", handlePageMotion, { passive: true });
window.addEventListener("resize", () => {
  syncStoryVideoSources();
  handlePageMotion();
}, { passive: true });
prefersReducedMotion.addEventListener?.("change", updateSignalAnimation);
document.querySelector("#year").textContent = new Date().getFullYear();
setInitialMarket();
loadChart();
syncStoryVideoSources();
updateSignalAnimation();
