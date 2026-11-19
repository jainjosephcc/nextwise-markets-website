import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
const source = readFileSync(new URL("../live-chat.js", import.meta.url), "utf8");
const flush = () => new Promise(setImmediate);

function fixture({ withBanner = false } = {}) {
  const element = () => ({
    attributes: {}, disabled: false, hidden: false, handlers: {}, focused: false,
    style: { values: {}, setProperty(key, value) { this.values[key] = value; } },
    setAttribute(key, value) { this.attributes[key] = value; },
    removeAttribute(key) { delete this.attributes[key]; },
    addEventListener(key, callback) { this.handlers[key] = callback; },
    focus() { this.focused = true; }, remove() { this.removed = true; },
  });
  const label = element(), message = element(), button = element(), notice = element(), launcher = element(), frame = element();
  notice.hidden = true;
  button.querySelector = () => label;
  notice.querySelector = () => message;
  launcher.querySelector = selector => selector === "button" ? button : notice;
  const banner = withBanner ? { ...element(), getBoundingClientRect: () => ({ height: 180 }) } : null;
  const scripts = [], nodes = [], listeners = new Map(), timers = new Map(), observers = [];
  let timerId = 0;
  const window = {
    addEventListener(name, callback) { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(callback); },
    removeEventListener(name, callback) { listeners.get(name)?.delete(callback); },
  };
  const emit = name => [...(listeners.get(name) || [])].forEach(callback => callback());
  const document = {
    getElementById(id) { return id === "chatwoot_live_chat_widget" ? frame : nodes.find(node => node.id === id); },
    createElement(tag) { return tag === "aside" ? launcher : element(); },
    querySelector() { return banner; },
    body: { appendChild(node) { nodes.push(node); } },
    head: { appendChild(node) { scripts.push(node); } },
  };
  Object.defineProperty(document, "cookie", { get() { throw new Error("Website launcher must not read CRM cookies"); } });
  class Observer {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe() {}
  }
  window.ResizeObserver = Observer;
  const context = vm.createContext({ window, document, ResizeObserver: Observer, MutationObserver: Observer,
    setTimeout(callback) { timers.set(++timerId, callback); return timerId; }, clearTimeout(id) { timers.delete(id); },
  });
  vm.runInContext(source, context);
  let runs = 0;
  const calls = [];
  const installSdk = () => {
    window.chatwootSDK = { run(config) {
      runs++;
      calls.push(config);
      window.$chatwoot = { hasLoaded: false, toggle(state) { calls.push(state); emit(state === "open" ? "chatwoot:opened" : "chatwoot:closed"); } };
    } };
  };
  return { window, document, context, nodes, button, launcher, label, notice, message, frame, banner, scripts, timers, observers, calls, emit,
    installSdk, runs: () => runs, click: () => button.handlers.click() };
}

test("initial page shows one launcher without loading the support service", () => {
  const f = fixture();
  assert.equal(f.scripts.length, 0);
  assert.equal(f.nodes.length, 1);
  vm.runInContext(source, f.context);
  assert.equal(f.nodes.length, 1);
  assert.equal(f.scripts.length, 0);
  assert.match(f.launcher.innerHTML, /Live chat/);
});

test("loads once on demand, opens the public inbox and restores focus on close", async () => {
  const f = fixture();
  const opening = f.click();
  await f.click();
  assert.equal(f.scripts.length, 1);
  assert.equal(f.button.disabled, true);
  f.installSdk(); f.scripts[0].onload();
  assert.equal(f.runs(), 1);
  assert.equal(f.calls[0].baseUrl, "https://chat.nextwisemarkets.com");
  assert.equal(Object.keys(f.calls[0]).sort().join(","), "baseUrl,websiteToken");
  assert.equal(f.window.chatwootSettings.baseDomain, undefined);
  f.window.$chatwoot.hasLoaded = true; f.emit("chatwoot:ready");
  await opening;
  assert.equal(f.button.attributes["aria-expanded"], "true");
  assert.equal(f.frame.focused, true);
  assert.equal(f.frame.attributes.title, "Nextwise Support live chat");
  assert.equal(f.label.textContent, "Live chat");
  await f.click();
  assert.equal(f.button.attributes["aria-expanded"], "false");
  assert.equal(f.button.focused, true);
  assert.equal(f.scripts.length, 1);
});

test("network failure offers contact fallback and a working retry", async () => {
  const f = fixture(); const first = f.click(); f.scripts[0].onerror(); await first;
  assert.equal(f.notice.hidden, false);
  assert.equal(f.button.disabled, false);
  assert.equal(f.scripts[0].removed, true);
  assert.match(f.message.textContent, /retry/);
  const retry = f.click();
  assert.equal(f.scripts.length, 2);
  f.installSdk(); f.scripts[1].onload(); f.emit("chatwoot:ready"); await retry;
  assert.equal(f.notice.hidden, true);
  assert.equal(f.button.attributes["aria-expanded"], "true");
});

test("slow widget can recover after timeout without creating another visitor session", async () => {
  const f = fixture(); const first = f.click(); f.installSdk(); f.scripts[0].onload();
  [...f.timers.values()][0](); await first;
  assert.equal(f.notice.hidden, false);
  f.window.$chatwoot.hasLoaded = true;
  await f.click();
  assert.equal(f.runs(), 1);
  assert.equal(f.scripts.length, 1);
  assert.equal(f.button.attributes["aria-expanded"], "true");
});

test("moves above the consent banner and returns to the corner when it closes", () => {
  const f = fixture({ withBanner: true });
  assert.equal(f.launcher.style.values["--chat-consent-offset"], "200px");
  f.banner.hidden = true;
  f.observers.forEach(observer => observer.callback());
  assert.equal(f.launcher.style.values["--chat-consent-offset"], "0px");
});
