(function () {
  "use strict";
  if (document.getElementById("nextwise-live-chat")) return;

  const baseUrl = "https://chat.nextwisemarkets.com";
  // Public website inbox identifier; this is not a CRM credential or HMAC key.
  const websiteToken = "f6u5LY37dy78BhwQBPfpNj8q";
  const launcher = document.createElement("aside");
  launcher.id = "nextwise-live-chat";
  launcher.setAttribute("aria-label", "Live chat");
  launcher.innerHTML = `
    <div class="website-chat-notice" hidden>
      <span role="status" aria-live="polite"></span>
      <a href="/contact/">Contact support</a>
    </div>
    <button type="button" aria-expanded="false" aria-controls="chatwoot_live_chat_widget">
      <img src="/assets/paperbot-chat-icon.png" width="24" height="24" alt="" aria-hidden="true" />
      <span>Live chat</span>
    </button>`;
  document.body.appendChild(launcher);
  const button = launcher.querySelector("button");
  const label = button.querySelector("span");
  const notice = launcher.querySelector(".website-chat-notice");
  let loading = null;
  let started = false;
  let ready = false;
  let opened = false;

  function setOpen(value) {
    opened = value;
    button.setAttribute("aria-expanded", String(value));
  }
  window.addEventListener("chatwoot:opened", () => {
    setOpen(true);
    document.getElementById("chatwoot_live_chat_widget")?.focus();
  });
  window.addEventListener("chatwoot:closed", () => {
    const restoreFocus = opened;
    setOpen(false);
    if (restoreFocus) button.focus();
  });

  function loadWidget() {
    if (ready || window.$chatwoot?.hasLoaded) return Promise.resolve();
    if (loading) return loading;
    loading = new Promise((resolve, reject) => {
      let script;
      const cleanup = () => {
        clearTimeout(timer);
        window.removeEventListener("chatwoot:ready", onReady);
        window.removeEventListener("chatwoot:error", onError);
      };
      const onReady = () => {
        ready = true;
        document.getElementById("chatwoot_live_chat_widget")?.setAttribute("title", "Nextwise Support live chat");
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        if (!started) script?.remove();
        reject(new Error("Chat could not load"));
      };
      const timer = setTimeout(onError, 30000);
      window.addEventListener("chatwoot:ready", onReady);
      window.addEventListener("chatwoot:error", onError);
      const run = () => {
        try {
          if (!window.chatwootSDK) return onError();
          // Leave baseDomain unset: visitor cookies stay on this website host.
          window.chatwootSettings = {
            hideMessageBubble: true,
            showUnreadMessagesDialog: false,
            showPopoutButton: false,
            position: "right",
            locale: "en",
            useBrowserLanguage: false,
            darkMode: "light",
          };
          started = true;
          window.chatwootSDK.run({ websiteToken, baseUrl });
        } catch {
          started = false;
          onError();
        }
      };
      if (started) return;
      if (window.chatwootSDK) return run();
      script = document.createElement("script");
      script.src = `${baseUrl}/packs/js/sdk.js?v=paperbot-4.19.1.1`;
      script.async = true;
      script.referrerPolicy = "strict-origin-when-cross-origin";
      script.onload = run;
      script.onerror = onError;
      document.head.appendChild(script);
    }).finally(() => { loading = null; });
    return loading;
  }

  button.addEventListener("click", async () => {
    if (button.disabled) return;
    notice.hidden = true;
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    label.textContent = "Connecting…";
    try {
      await loadWidget();
      if (!window.$chatwoot) throw new Error("Chat is not ready");
      window.$chatwoot.toggle(opened ? "close" : "open");
    } catch {
      notice.querySelector("[role='status']").textContent = "Live chat could not connect. Please retry or contact support.";
      notice.hidden = false;
    } finally {
      label.textContent = "Live chat";
      button.disabled = false;
      button.removeAttribute("aria-busy");
    }
  });

  // The consent banner may be created later when preferences are reopened.
  const observedBanners = new WeakSet();
  function observeBanner() {
    const banner = document.querySelector(".cookie-banner");
    if (!banner || observedBanners.has(banner)) return;
    observedBanners.add(banner);
    const reposition = () => {
      const height = banner.hidden ? 0 : banner.getBoundingClientRect().height;
      launcher.style.setProperty("--chat-consent-offset", `${height ? height + 20 : 0}px`);
    };
    if (window.ResizeObserver) new ResizeObserver(reposition).observe(banner);
    new MutationObserver(reposition).observe(banner, { attributes: true, attributeFilter: ["hidden"] });
    reposition();
  }
  new MutationObserver(observeBanner).observe(document.body, { childList: true });
  observeBanner();
})();
