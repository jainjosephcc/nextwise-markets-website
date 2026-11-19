import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../theme.js", import.meta.url), "utf8");
const preferenceKey = "nextwise-theme";

function fixture({ saved, loading = false, readFails = false, writeFails = false } = {}) {
  class Element extends EventTarget {
    constructor(attributes = {}, dataset = {}) {
      super();
      this.attributes = { ...attributes };
      this.dataset = { ...dataset };
      this.style = {};
    }
    setAttribute(name, value) { this.attributes[name] = String(value); }
    getAttribute(name) { return this.attributes[name] ?? null; }
    click() { this.dispatchEvent(new Event("click")); }
  }
  class DetailEvent extends Event {
    constructor(type, options) { super(type); this.detail = options.detail; }
  }

  const root = new Element();
  const buttons = [new Element(), new Element()];
  const images = ["workspace", "platform"].map(name => new Element(
    { src: `/assets/horizon/${name}.svg` },
    { themeLightSrc: `/assets/horizon/${name}.svg`, themeDarkSrc: `/assets/horizon/${name}-dark.svg` },
  ));
  const widgets = [new Element(), new Element()];
  const meta = new Element({ content: "#edf8ff" });
  const document = new EventTarget();
  document.documentElement = root;
  document.readyState = loading ? "loading" : "complete";
  document.querySelectorAll = selector => {
    if (selector === "[data-theme-toggle]") return buttons;
    if (selector === "img[data-theme-light-src][data-theme-dark-src]") return images;
    if (selector === "tv-market-overview, tv-mini-chart") return widgets;
    return [];
  };
  document.querySelector = selector => selector === 'meta[name="theme-color"]' ? meta : null;

  const values = new Map(saved === undefined ? [] : [[preferenceKey, saved]]);
  const writes = [];
  const localStorage = {
    getItem(key) {
      if (readFails) throw new Error("Storage is unavailable");
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      if (writeFails) throw new Error("Storage is unavailable");
      writes.push([key, value]);
      values.set(key, String(value));
    },
  };
  const window = new EventTarget();
  const changes = [];
  window.addEventListener("nextwise:themechange", event => changes.push(event.detail.theme));
  const context = vm.createContext({ document, window, localStorage, CustomEvent: DetailEvent });
  vm.runInContext(source, context);

  return {
    root, buttons, images, widgets, meta, writes, changes,
    savedValue: () => values.get(preferenceKey),
    finishLoading() {
      document.readyState = "complete";
      document.dispatchEvent(new Event("DOMContentLoaded"));
    },
    receiveStorage(key, newValue) {
      window.dispatchEvent(Object.assign(new Event("storage"), { key, newValue }));
    },
  };
}

test("new visits and unrecognised preferences use light mode without creating a saved choice", () => {
  for (const saved of [undefined, "light", "system", "Dark", "invalid"]) {
    const f = fixture({ saved });
    assert.equal(f.root.dataset.theme, "light");
    assert.equal(f.root.style.colorScheme, "light");
    assert.equal(f.buttons[0].getAttribute("aria-checked"), "false");
    assert.equal(f.buttons[0].getAttribute("aria-label"), "Dark mode");
    assert.equal(f.writes.length, 0, "reading a preference must not persist a new choice");
  }
});

test("an explicit saved dark choice is applied before document readiness and reaches controls and artwork", () => {
  const f = fixture({ saved: "dark", loading: true });
  assert.equal(f.root.dataset.theme, "dark");
  assert.equal(f.root.style.colorScheme, "dark");

  f.finishLoading();
  for (const button of f.buttons) {
    assert.equal(button.getAttribute("aria-checked"), "true");
    assert.equal(button.getAttribute("aria-label"), "Dark mode");
  }
  for (const image of f.images) assert.equal(image.getAttribute("src"), image.dataset.themeDarkSrc);
  for (const widget of f.widgets) assert.equal(widget.getAttribute("theme"), "dark");
  assert.equal(f.meta.getAttribute("content"), "#020d1b");
  assert.equal(f.writes.length, 0);
});

test("either theme control updates the whole page, saves the choice and notifies consumers", () => {
  const f = fixture();
  f.buttons[1].click();
  assert.equal(f.savedValue(), "dark");
  assert.equal(f.root.style.colorScheme, "dark");
  assert.deepEqual(f.changes, ["dark"]);
  for (const button of f.buttons) {
    assert.equal(button.getAttribute("aria-checked"), "true");
    assert.equal(button.getAttribute("aria-label"), "Dark mode");
    assert.equal(button.title, "Use light theme");
  }
  for (const image of f.images) assert.equal(image.getAttribute("src"), image.dataset.themeDarkSrc);
  for (const widget of f.widgets) assert.equal(widget.getAttribute("theme"), "dark");

  f.buttons[0].click();
  assert.equal(f.savedValue(), "light");
  assert.equal(f.root.dataset.theme, "light");
  assert.equal(f.root.style.colorScheme, "light");
  assert.deepEqual(f.changes, ["dark", "light"]);
  assert.deepEqual(f.writes, [[preferenceKey, "dark"], [preferenceKey, "light"]]);
  for (const button of f.buttons) assert.equal(button.getAttribute("aria-checked"), "false");
  for (const image of f.images) assert.equal(image.getAttribute("src"), image.dataset.themeLightSrc);
  for (const widget of f.widgets) assert.equal(widget.getAttribute("theme"), "light");
  assert.equal(f.meta.getAttribute("content"), "#edf8ff");
});

test("disabled storage falls back to light while theme changes remain usable", () => {
  const f = fixture({ saved: "dark", readFails: true, writeFails: true });
  assert.equal(f.root.dataset.theme, "light");
  assert.doesNotThrow(() => f.buttons[0].click());
  assert.equal(f.root.dataset.theme, "dark");
  assert.equal(f.buttons[1].getAttribute("aria-label"), "Dark mode");
  for (const image of f.images) assert.equal(image.getAttribute("src"), image.dataset.themeDarkSrc);
  assert.deepEqual(f.changes, ["dark"]);
  assert.doesNotThrow(() => f.buttons[1].click());
  assert.equal(f.root.dataset.theme, "light");
  assert.deepEqual(f.changes, ["dark", "light"]);
});

test("cross-tab changes and clearing the saved choice update the page without writing back", () => {
  const f = fixture();
  f.receiveStorage("unrelated-setting", "dark");
  assert.equal(f.root.dataset.theme, "light");
  assert.deepEqual(f.changes, []);

  f.receiveStorage(preferenceKey, "dark");
  assert.equal(f.root.dataset.theme, "dark");
  assert.equal(f.buttons[0].getAttribute("aria-checked"), "true");
  for (const image of f.images) assert.equal(image.getAttribute("src"), image.dataset.themeDarkSrc);

  f.receiveStorage(preferenceKey, null);
  assert.equal(f.root.dataset.theme, "light");
  f.receiveStorage(preferenceKey, "dark");
  f.receiveStorage(null, null);
  assert.equal(f.root.dataset.theme, "light");
  assert.equal(f.root.style.colorScheme, "light");
  for (const image of f.images) assert.equal(image.getAttribute("src"), image.dataset.themeLightSrc);
  assert.deepEqual(f.changes, ["dark", "light", "dark", "light"]);
  assert.equal(f.writes.length, 0, "cross-tab synchronization must not trigger a storage feedback loop");
});
