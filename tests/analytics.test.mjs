import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../analytics.js", import.meta.url), "utf8");
const consentKey = "nextwise-analytics-consent";
const disableKey = "ga-disable-G-8H0V825E7C";

function fixture({ saved, hostname = "www.nextwisemarkets.com", storageBlocked = false, cookies = {} } = {}) {
  const storage = new Map(saved === undefined ? [] : [[consentKey, saved]]);
  const nodes = [], scripts = [], expiredCookies = [];
  const cookieJar = new Map(Object.entries(cookies));
  const documentListeners = new Map(), windowListeners = new Map();
  let document;
  class Element {
    constructor(tag, dataset = {}) {
      this.tagName = tag;
      this.dataset = dataset;
      this.attributes = {};
      this.children = [];
      this.hidden = false;
      this.isConnected = true;
    }
    setAttribute(key, value) { this.attributes[key] = value; }
    set innerHTML(value) {
      this.html = value;
      this.children = [...value.matchAll(/data-cookie-choice="([^"]+)"/g)].map(([, choice]) => {
        const child = new Element("button", { cookieChoice: choice });
        child.parent = this;
        return child;
      });
    }
    querySelector(selector) {
      return this.children.find(child => selector.includes(`'${child.dataset.cookieChoice}'`));
    }
    contains(element) { return element === this || this.children.includes(element); }
    closest(selector) {
      if (selector === "[data-cookie-settings]" && "cookieSettings" in this.dataset) return this;
      if (selector === "[data-cookie-choice]" && "cookieChoice" in this.dataset) return this;
      return null;
    }
    focus() { document.activeElement = this; }
    blur() { document.activeElement = document.body; }
  }
  const body = new Element("body");
  body.appendChild = node => nodes.push(node);
  document = {
    readyState: "complete", body, activeElement: body,
    head: { appendChild(node) { scripts.push(node); } },
    createElement(tag) { return new Element(tag); },
    addEventListener(name, callback) { documentListeners.set(name, callback); },
    get cookie() { return [...cookieJar].map(([name, value]) => `${name}=${value}`).join("; "); },
    set cookie(value) {
      expiredCookies.push(value);
      cookieJar.delete(value.split("=")[0]);
    },
  };
  const window = {
    location: { hostname },
    localStorage: {
      getItem(key) { if (storageBlocked) throw new Error("Blocked storage"); return storage.get(key) ?? null; },
      setItem(key, value) { if (storageBlocked) throw new Error("Blocked storage"); storage.set(key, value); },
    },
    addEventListener(name, callback) { windowListeners.set(name, callback); },
  };
  vm.runInNewContext(source, { window, document });
  const click = target => { target.focus(); documentListeners.get("click")({ target }); };
  return {
    window, document, nodes, scripts, storage, cookieJar, expiredCookies,
    banner: () => nodes.find(node => node.className === "cookie-banner"),
    floatingButtons: () => nodes.filter(node => node.className === "cookie-preferences"),
    choose(value) { click(this.banner().children.find(child => child.dataset.cookieChoice === value)); },
    openSettings() {
      const trigger = new Element("button", { cookieSettings: "" });
      click(trigger);
      return trigger;
    },
    receiveChoice(value) { windowListeners.get("storage")({ key: consentKey, newValue: value }); },
    lastConsent() { return [...window.dataLayer].reverse().find(args => args[0] === "consent" && args[1] === "update")[2]; },
  };
}

test("first visit shows the bottom notice without starting analytics or moving focus", () => {
  const f = fixture();
  assert.equal(f.banner().hidden, false);
  assert.equal(f.banner().attributes["role"], "dialog");
  assert.equal(f.document.activeElement, f.document.body);
  assert.equal(f.scripts.length, 0);
  assert.equal(f.window[disableKey], true);
  assert.equal(f.lastConsent().analytics_storage, "denied");
  assert.equal(f.floatingButtons().length, 0);
});

for (const choice of ["accepted", "rejected"]) {
  test(`${choice} is remembered on later pages without a banner or floating button`, () => {
    const f = fixture();
    f.choose(choice);
    assert.equal(f.banner().hidden, true);
    assert.equal(f.storage.get(consentKey), choice);
    assert.equal(f.floatingButtons().length, 0);
    assert.equal(f.window[disableKey], choice === "rejected");
    const nextPage = fixture({ saved: f.storage.get(consentKey) });
    assert.equal(nextPage.banner(), undefined);
    assert.equal(nextPage.floatingButtons().length, 0);
    assert.equal(nextPage.scripts.length, choice === "accepted" ? 1 : 0);
    assert.equal(nextPage.lastConsent().ad_storage, "denied");
    assert.equal(nextPage.lastConsent().ad_personalization, "denied");
  });
}

test("withdrawing from the Privacy Policy disables the loaded tag and clears only analytics cookies", () => {
  const f = fixture({ saved: "accepted", cookies: { _ga: "123", _ga_8H0V825E7C: "456", _gid: "789", site_session: "keep" } });
  const trigger = f.openSettings();
  assert.equal(f.banner().hidden, false);
  assert.equal(f.document.activeElement.dataset.cookieChoice, "rejected");
  f.choose("rejected");
  assert.equal(f.window[disableKey], true);
  assert.equal(f.lastConsent().analytics_storage, "denied");
  assert.deepEqual([...f.cookieJar.keys()], ["site_session"]);
  assert.ok(f.expiredCookies.some(value => value.includes("Domain=nextwisemarkets.com")));
  assert.ok(f.expiredCookies.some(value => !value.includes("Domain=")));
  assert.equal(f.document.activeElement, trigger);
  assert.equal(f.banner().hidden, true);
  f.openSettings();
  f.choose("accepted");
  assert.equal(f.window[disableKey], false);
  assert.equal(f.scripts.length, 1);
});

test("a stored rejection removes legacy analytics cookies without loading the tag", () => {
  const f = fixture({ saved: "rejected", cookies: { _ga: "123", preference: "keep" } });
  assert.equal(f.scripts.length, 0);
  assert.equal(f.cookieJar.has("_ga"), false);
  assert.equal(f.cookieJar.get("preference"), "keep");
});

test("a choice made in another tab closes the notice and respects a later rejection", () => {
  const f = fixture();
  f.receiveChoice("accepted");
  assert.equal(f.banner().hidden, true);
  assert.equal(f.scripts.length, 1);
  f.receiveChoice("rejected");
  assert.equal(f.window[disableKey], true);
  assert.equal(f.lastConsent().analytics_storage, "denied");
  assert.equal(f.banner().hidden, true);
  assert.equal(f.floatingButtons().length, 0);
});

test("blocked storage still lets the visitor dismiss and reject on the current page", () => {
  const f = fixture({ storageBlocked: true });
  f.choose("rejected");
  assert.equal(f.banner().hidden, true);
  assert.equal(f.window[disableKey], true);
  assert.equal(f.scripts.length, 0);
});

test("invalid stored consent never enables analytics", () => {
  const f = fixture({ saved: "anything" });
  assert.equal(f.banner().hidden, false);
  assert.equal(f.scripts.length, 0);
  assert.equal(f.window[disableKey], true);
});

test("local website previews do not send analytics after acceptance", () => {
  const f = fixture({ hostname: "127.0.0.1" });
  f.choose("accepted");
  assert.equal(f.banner().hidden, true);
  assert.equal(f.scripts.length, 0);
  assert.equal(f.window[disableKey], true);
});
