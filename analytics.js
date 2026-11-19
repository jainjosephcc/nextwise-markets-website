(function () {
  "use strict";

  const measurementId = "G-8H0V825E7C";
  const storageKey = "nextwise-analytics-consent";
  const isProduction = /(^|\.)nextwisemarkets\.com$/i.test(window.location.hostname);
  let tagLoaded = false;

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
    window.gtag("consent", "update", {
      analytics_storage: accepted ? "granted" : "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    if (accepted) loadAnalytics();
  }

  function createPreferencesButton(openPreferences) {
    const button = document.createElement("button");
    button.className = "cookie-preferences";
    button.type = "button";
    button.textContent = "Cookie preferences";
    button.addEventListener("click", openPreferences);
    document.body.appendChild(button);
    return button;
  }

  function createBanner() {
    const banner = document.createElement("section");
    banner.className = "cookie-banner";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-modal", "false");
    banner.setAttribute("aria-labelledby", "cookie-banner-title");
    banner.innerHTML = `
      <div class="cookie-banner-copy">
        <h2 id="cookie-banner-title">Analytics preferences</h2>
        <p>We use Google Analytics to understand how visitors use this website. Analytics is disabled unless you accept. <a href="/privacy-policy/#website-analytics-and-cookies">Privacy details</a></p>
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
    let preferencesButton;

    const openPreferences = () => {
      if (!banner) banner = createBanner();
      banner.hidden = false;
      preferencesButton.hidden = true;
      banner.querySelector("[data-cookie-choice='accepted']").focus();
    };

    const closePreferences = () => {
      if (banner) banner.hidden = true;
      preferencesButton.hidden = false;
    };

    preferencesButton = createPreferencesButton(openPreferences);
    document.addEventListener("click", (event) => {
      const choiceButton = event.target.closest("[data-cookie-choice]");
      if (!choiceButton || !banner?.contains(choiceButton)) return;
      const choice = choiceButton.dataset.cookieChoice;
      storeConsent(choice);
      applyConsent(choice);
      closePreferences();
    });

    const savedConsent = readConsent();

    if (savedConsent === "accepted" || savedConsent === "rejected") {
      applyConsent(savedConsent);
      return;
    }

    preferencesButton.hidden = true;
    banner = createBanner();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialiseConsentUi, { once: true });
  } else {
    initialiseConsentUi();
  }
})();
