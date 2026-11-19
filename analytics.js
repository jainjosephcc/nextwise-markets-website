(function () {
  "use strict";

  const measurementId = "G-8H0V825E7C";
  const storageKey = "nextwise-analytics-consent";
  const isProduction = /(^|\.)nextwisemarkets\.com$/i.test(window.location.hostname);
  const disableAnalyticsKey = `ga-disable-${measurementId}`;
  let tagLoaded = false;

  window[disableAnalyticsKey] = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments);
  };

  window.gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
    wait_for_update: 500,
  });

  function readConsent() {
    try {
      return window.localStorage.getItem(storageKey);
    } catch {
      return null;
    }
  }

  function storeConsent(value) {
    try {
      window.localStorage.setItem(storageKey, value);
    } catch {
      // Consent still applies for the current page when storage is unavailable.
    }
  }

  function loadAnalytics() {
    if (tagLoaded || !isProduction) return;
    tagLoaded = true;

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);

    window.gtag("js", new Date());
    window.gtag("config", measurementId, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });
  }

  function applyConsent(value) {
    const accepted = value === "accepted";
    // Also stops an already-loaded tag if consent is later withdrawn.
    window[disableAnalyticsKey] = !accepted || !isProduction;
    window.gtag("consent", "update", {
      analytics_storage: accepted ? "granted" : "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    if (accepted) loadAnalytics();
    else clearAnalyticsCookies();
  }

  function clearAnalyticsCookies() {
    try {
      const names = document.cookie.split(";")
        .map(cookie => cookie.trim().split("=")[0])
        .filter(name => /^(_ga($|_)|_gid$|_gat($|_))/.test(name));
      const domains = [""];
      const parts = window.location.hostname.split(".");
      while (parts.length > 1) {
        domains.push(`; Domain=${parts.join(".")}`);
        parts.shift();
      }
      for (const name of new Set(names)) {
        for (const domain of domains) {
          document.cookie = `${name}=; Max-Age=0; Path=/${domain}; SameSite=Lax`;
        }
      }
    } catch {
      // Blocking cookie access does not prevent rejecting analytics.
    }
  }

  function createBanner() {
    const banner = document.createElement("section");
    banner.className = "cookie-banner";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-modal", "false");
    banner.setAttribute("aria-labelledby", "cookie-banner-title");
    banner.setAttribute("aria-describedby", "cookie-banner-description");
    banner.innerHTML = `
      <div class="cookie-banner-copy">
        <h2 id="cookie-banner-title">Your cookie choice</h2>
        <p id="cookie-banner-description">Allow optional analytics cookies to help us improve the website. Analytics stays off unless you accept. We’ll remember your choice. <a href="/privacy-policy/#website-analytics-and-cookies">Privacy details</a></p>
      </div>
      <div class="cookie-banner-actions">
        <button type="button" data-cookie-choice="rejected">Reject analytics</button>
        <button type="button" data-cookie-choice="accepted">Accept analytics</button>
      </div>`;
    document.body.appendChild(banner);
    return banner;
  }

  function initialiseConsentUi() {
    let banner;
    let returnFocus;

    const openPreferences = (trigger) => {
      if (!banner) banner = createBanner();
      banner.hidden = false;
      if (trigger) {
        returnFocus = trigger;
        banner.querySelector("[data-cookie-choice='rejected']").focus();
      }
    };

    const closePreferences = () => {
      const hadFocus = banner?.contains(document.activeElement);
      if (hadFocus) document.activeElement.blur();
      if (banner) banner.hidden = true;
      if (hadFocus && returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
      returnFocus = null;
    };

    document.addEventListener("click", (event) => {
      const settingsButton = event.target.closest("[data-cookie-settings]");
      if (settingsButton) {
        openPreferences(settingsButton);
        return;
      }
      const choiceButton = event.target.closest("[data-cookie-choice]");
      if (!choiceButton || !banner?.contains(choiceButton)) return;
      const choice = choiceButton.dataset.cookieChoice;
      if (choice !== "accepted" && choice !== "rejected") return;
      storeConsent(choice);
      applyConsent(choice);
      closePreferences();
    });

    window.addEventListener("storage", (event) => {
      if (event.key !== storageKey) return;
      applyConsent(event.newValue);
      if (event.newValue === "accepted" || event.newValue === "rejected") closePreferences();
    });

    const savedConsent = readConsent();
    applyConsent(savedConsent);
    if (savedConsent === "accepted" || savedConsent === "rejected") {
      return;
    }

    openPreferences();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialiseConsentUi, { once: true });
  } else {
    initialiseConsentUi();
  }
})();
