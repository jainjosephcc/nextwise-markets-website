import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../app.js", import.meta.url), "utf8");

function fixture() {
  const document = new EventTarget();
  class Element extends EventTarget {
    constructor(dataset = {}) {
      super();
      this.dataset = dataset;
      this.attributes = {};
      const classes = new Set();
      this.classList = {
        contains: name => classes.has(name),
        toggle(name, active) { if (active) classes.add(name); else classes.delete(name); },
        remove: name => classes.delete(name),
      };
    }
    setAttribute(name, value) { this.attributes[name] = String(value); }
    getAttribute(name) { return this.attributes[name] ?? null; }
    querySelectorAll() { return []; }
    click() { this.dispatchEvent(new Event("click")); }
  }

  const chart = new Element(), iframe = new Element();
  const overlayRetry = new Element(), persistentRetry = new Element();
  const marketSelect = new Element(), intervalSelect = new Element();
  const marketName = { textContent: "" };
  const symbols = [
    ["OANDA:EURUSD", "EUR / USD"], ["OANDA:XAUUSD", "Gold / USD"],
    ["OANDA:NAS100USD", "NASDAQ 100"], ["BINANCE:BTCUSDT", "Bitcoin / USDT"],
  ].map(([symbol, label]) => new Element({ symbol, label }));
  const intervals = ["15", "60", "240", "D"].map(interval => new Element({ interval }));
  const requests = [];
  Object.defineProperty(iframe, "src", {
    get: () => requests.at(-1),
    set: value => requests.push(value),
  });

  document.documentElement = { dataset: { theme: "light" } };
  document.body = new Element();
  const selectors = new Map([
    ["[data-chart]", chart], ["#trading-chart", iframe],
    ["[data-phone-market]", marketSelect], ["[data-chart-interval]", intervalSelect],
    ["#active-market-name", marketName], ["[data-chart-retry]", overlayRetry],
  ]);
  document.querySelector = selector => {
    const symbol = selector.match(/^\.symbol-tabs button\[data-symbol="([^"]+)"\]$/)?.[1];
    const interval = selector.match(/^\.timeframe-tabs button\[data-interval="([^"]+)"\]$/)?.[1];
    if (symbol) return symbols.find(button => button.dataset.symbol === symbol);
    if (interval) return intervals.find(button => button.dataset.interval === interval);
    return selectors.get(selector) ?? null;
  };
  document.querySelectorAll = selector => {
    if (selector === ".symbol-tabs button") return symbols;
    if (selector === ".timeframe-tabs button") return intervals;
    if (selector === "[data-chart-retry]") return [overlayRetry, persistentRetry];
    return [];
  };

  let timerId = 0;
  const timers = new Map();
  const window = new EventTarget();
  window.setTimeout = (callback, delay) => { timers.set(++timerId, { callback, delay }); return timerId; };
  window.clearTimeout = id => timers.delete(id);
  const matchMedia = () => new EventTarget();
  class WeekdayDate extends Date {
    constructor(...args) { super(...(args.length ? args : ["2026-11-19T12:00:00Z"])); }
  }
  vm.runInNewContext(source, { document, window, matchMedia, URLSearchParams, Date: WeekdayDate });

  return {
    chart, iframe, document, window, overlayRetry, persistentRetry,
    marketSelect, intervalSelect, marketName, symbols, intervals, requests, timers,
    loaded() { iframe.dispatchEvent(new Event("load")); },
    expire() {
      const [id, timer] = [...timers.entries()][0];
      assert.equal(timer.delay, 15000);
      timers.delete(id);
      timer.callback();
    },
    change(select, value) { select.value = value; select.dispatchEvent(new Event("change")); },
    current() {
      const url = new URL(iframe.src);
      return { url, config: JSON.parse(decodeURIComponent(url.hash.slice(1))) };
    },
  };
}

test("hero requests the HTTPS TradingView chart with matching initial controls", () => {
  const f = fixture();
  const { url, config } = f.current();
  assert.equal(url.origin, "https://www.tradingview-widget.com");
  assert.equal(url.pathname, "/embed-widget/advanced-chart/");
  for (const [key, value] of Object.entries({ symbol: "OANDA:XAUUSD", interval: "60", theme: "light" })) {
    assert.equal(url.searchParams.get(key), value);
    assert.equal(config[key], value);
  }
  assert.equal(config.autosize, true);
  assert.equal(f.marketSelect.value, "OANDA:XAUUSD");
  assert.equal(f.chart.getAttribute("aria-busy"), "true");
  assert.equal(f.requests.length, 1);
});

for (const retry of ["persistentRetry", "overlayRetry"]) {
  test(`${retry} reloads the same chart even after an iframe load event`, () => {
    const f = fixture();
    const original = f.iframe.src;
    // A cross-origin iframe can fire load for an error document as well.
    f.loaded();
    assert.equal(f.chart.classList.contains("loaded"), true);
    assert.equal(f.timers.size, 0);

    f[retry].click();
    assert.equal(f.requests.length, 2, "retry must navigate again despite an unchanged URL");
    assert.equal(f.iframe.src, original);
    assert.equal(f.chart.classList.contains("loaded"), false);
    assert.equal(f.chart.getAttribute("aria-busy"), "true");
    assert.equal(f.timers.size, 1);
  });

  test(`${retry} restarts a chart that exceeded its loading timeout`, () => {
    const f = fixture();
    f.expire();
    assert.equal(f.chart.classList.contains("is-slow"), true);
    assert.equal(f.chart.getAttribute("aria-busy"), "false");

    f[retry].click();
    assert.equal(f.requests.length, 2);
    assert.equal(f.chart.classList.contains("is-slow"), false);
    assert.equal(f.chart.getAttribute("aria-busy"), "true");
    f.loaded();
    assert.equal(f.chart.classList.contains("loaded"), true);
    assert.equal(f.timers.size, 0);
  });
}

test("desktop and phone controls change the chart URL and retain selections on reload", () => {
  const f = fixture();
  f.symbols[0].click();
  assert.equal(f.current().url.searchParams.get("symbol"), "OANDA:EURUSD");
  assert.equal(f.current().config.symbol, "OANDA:EURUSD");
  assert.equal(f.marketName.textContent, "EUR / USD");
  assert.equal(f.marketSelect.value, "OANDA:EURUSD");

  f.intervals[0].click();
  assert.equal(f.current().url.searchParams.get("interval"), "15");
  assert.equal(f.current().config.interval, "15");
  assert.equal(f.intervalSelect.value, "15");

  f.change(f.marketSelect, "BINANCE:BTCUSDT");
  f.change(f.intervalSelect, "D");
  f.document.documentElement.dataset.theme = "dark";
  f.window.dispatchEvent(new Event("nextwise:themechange"));
  const beforeRetry = f.iframe.src;
  f.persistentRetry.click();
  const { url, config } = f.current();
  for (const [key, value] of Object.entries({ symbol: "BINANCE:BTCUSDT", interval: "D", theme: "dark" })) {
    assert.equal(url.searchParams.get(key), value);
    assert.equal(config[key], value);
  }
  assert.equal(f.iframe.src, beforeRetry);
  assert.match(f.iframe.title, /Bitcoin \/ USDT, 1 day/);
});
