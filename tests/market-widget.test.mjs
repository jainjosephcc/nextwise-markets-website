import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../app.js", import.meta.url), "utf8");

function fixture() {
  const document = new EventTarget();
  class Element extends EventTarget {
    constructor() {
      super();
      this.dataset = {};
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
    querySelector() { return null; }
    querySelectorAll() { return []; }
    focus() { document.activeElement = this; }
    click() { this.dispatchEvent(new Event("click")); }
    remove() { this.removed = true; }
  }

  const shell = new Element(), status = new Element(), panel = new Element();
  const widget = new Element(), retry = new Element();
  const label = { textContent: "" };
  status.querySelector = selector => selector === "span" ? label : null;
  const tabs = new Element();
  tabs.setAttribute("aria-orientation", "horizontal");
  const buttons = [
    ["forex", "Forex"], ["crypto", "Crypto"], ["commodities", "Metals & Energy"], ["indices", "Indices"],
  ].map(([category, name]) => {
    const button = new Element();
    button.id = `market-tab-${category}`;
    button.dataset = { marketCategory: category, marketLabel: name };
    return button;
  });
  tabs.querySelectorAll = selector => selector === "button" ? buttons : [];

  const scripts = [];
  const selectors = new Map([
    ["[data-live-market-widget]", shell], ["[data-market-feed-status]", status],
    ["[data-market-overview-widget]", widget],
    ["[data-market-widget-retry]", retry], ["#market-data-panel", panel],
  ]);
  document.documentElement = { dataset: { theme: "light" } };
  document.body = new Element();
  document.querySelector = selector => selector === "[data-market-widget-script]"
    ? scripts.find(script => !script.removed) ?? null : selectors.get(selector) ?? null;
  document.querySelectorAll = selector => {
    if (selector === "[data-market-category]") return buttons;
    if (selector === ".market-category-tabs") return [tabs];
    return [];
  };
  document.createElement = () => new Element();
  document.head = { append: script => scripts.push(script) };

  let defined = false;
  const definitionCallbacks = [];
  const customElements = {
    get: () => defined,
    whenDefined: () => new Promise(resolve => definitionCallbacks.push(resolve)),
  };
  const timers = new Map();
  let timerId = 0;
  const window = new EventTarget();
  window.customElements = customElements;
  window.setTimeout = callback => { timers.set(++timerId, callback); return timerId; };
  window.clearTimeout = id => timers.delete(id);

  const matchMedia = () => new EventTarget();
  vm.runInNewContext(source, { document, window, customElements, matchMedia, URLSearchParams });

  return {
    shell, panel, widget, retry, label, scripts, timers, tabs, buttons, document,
    async defineWidget() {
      defined = true;
      definitionCallbacks.forEach(resolve => resolve());
      await Promise.resolve();
    },
    key(key) {
      const event = Object.assign(new Event("keydown", { cancelable: true }), { key });
      tabs.dispatchEvent(event);
      return event;
    },
  };
}

test("a late failure from a timed-out market request cannot hide or cancel its retry", async () => {
  const f = fixture();
  assert.equal(f.scripts.length, 1);
  [...f.timers.values()][0]();
  assert.equal(f.shell.classList.contains("has-error"), true);

  f.retry.click();
  assert.equal(f.scripts.length, 2);
  assert.equal(f.scripts[0].removed, true);
  assert.equal(f.panel.getAttribute("aria-busy"), "true");
  f.scripts[0].dispatchEvent(new Event("error"));
  assert.equal(f.shell.classList.contains("has-error"), false);
  assert.equal(f.label.textContent, "Connecting to market data");
  assert.equal(f.panel.getAttribute("aria-busy"), "true");
  assert.equal(f.timers.size, 1, "the active attempt must keep its timeout");

  await f.defineWidget();
  assert.equal(f.shell.classList.contains("is-ready"), true);
  assert.equal(f.label.textContent, "Market board ready");
  assert.equal(f.panel.getAttribute("aria-busy"), "false");
  assert.equal(f.timers.size, 0);
});

test("an already queued timeout from a failed request cannot interrupt the next attempt", () => {
  const f = fixture();
  const staleTimeout = [...f.timers.values()][0];
  f.scripts[0].dispatchEvent(new Event("error"));
  f.retry.click();

  staleTimeout();
  assert.equal(f.label.textContent, "Connecting to market data");
  assert.equal(f.panel.getAttribute("aria-busy"), "true");
  assert.equal(f.timers.size, 1);

  [...f.timers.values()][0]();
  assert.equal(f.shell.classList.contains("has-error"), true);
  assert.equal(f.label.textContent, "Market data unavailable");
  assert.equal(f.panel.getAttribute("aria-busy"), "false");
});

test("horizontal market tabs support arrows, wrapping and Home/End activation", () => {
  const f = fixture();
  assert.equal(f.tabs.getAttribute("aria-orientation"), "horizontal");
  f.buttons[0].focus();
  assert.equal(f.key("ArrowRight").defaultPrevented, true);
  assert.equal(f.document.activeElement, f.buttons[1]);
  assert.equal(f.buttons[1].getAttribute("aria-selected"), "true");
  assert.equal(f.buttons[1].tabIndex, 0);
  assert.equal(f.buttons[0].tabIndex, -1);
  assert.equal(f.panel.getAttribute("aria-labelledby"), "market-tab-crypto");
  assert.match(f.widget.getAttribute("symbol-sectors"), /BINANCE:BTCUSDT/);

  f.key("Home");
  assert.equal(f.document.activeElement, f.buttons[0]);
  f.key("ArrowLeft");
  assert.equal(f.document.activeElement, f.buttons[3]);
  f.key("ArrowRight");
  assert.equal(f.document.activeElement, f.buttons[0]);
  f.key("End");
  assert.equal(f.document.activeElement, f.buttons[3]);
});

test("market tabs leave vertical scrolling keys available on every screen", () => {
  const f = fixture();
  f.buttons[0].focus();
  assert.equal(f.key("ArrowDown").defaultPrevented, false);
  assert.equal(f.document.activeElement, f.buttons[0]);
  assert.equal(f.key("ArrowRight").defaultPrevented, true);
  assert.equal(f.document.activeElement, f.buttons[1]);

  assert.equal(f.key("ArrowUp").defaultPrevented, false);
  f.key("ArrowLeft");
  assert.equal(f.document.activeElement, f.buttons[0]);
});
