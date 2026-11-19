/* Runs before styles: light by default, an explicit saved choice on later visits. */
(() => {
  const key = "nextwise-theme";
  const root = document.documentElement;
  const normalize = (value) => value === "dark" ? "dark" : "light";
  let saved;
  try { saved = localStorage.getItem(key); } catch { /* Storage may be disabled. */ }
  root.dataset.theme = normalize(saved);
  root.style.colorScheme = root.dataset.theme;

  function syncPresentation() {
    const dark = root.dataset.theme === "dark";
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      button.setAttribute("aria-checked", String(dark));
      button.setAttribute("aria-label", "Dark mode");
      button.title = `Use ${dark ? "light" : "dark"} theme`;
    });
    document.querySelectorAll("img[data-theme-light-src][data-theme-dark-src]").forEach((img) => {
      const source = dark ? img.dataset.themeDarkSrc : img.dataset.themeLightSrc;
      if (img.getAttribute("src") !== source) img.setAttribute("src", source);
    });
    document.querySelectorAll('tv-market-overview, tv-mini-chart').forEach((widget) => widget.setAttribute("theme", root.dataset.theme));
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#020d1b" : "#edf8ff");
  }

  function setTheme(value, persist) {
    root.dataset.theme = normalize(value);
    root.style.colorScheme = root.dataset.theme;
    if (persist) {
      try { localStorage.setItem(key, root.dataset.theme); } catch { /* The control still works without persistence. */ }
    }
    syncPresentation();
    window.dispatchEvent(new CustomEvent("nextwise:themechange", { detail: { theme: root.dataset.theme } }));
  }

  function bindControls() {
    syncPresentation();
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      button.addEventListener("click", () => setTheme(root.dataset.theme === "dark" ? "light" : "dark", true));
    });
    const switcher = document.querySelector(".policy-switcher");
    if (switcher) {
      const narrow = matchMedia("(max-width: 760px)");
      switcher.open = !narrow.matches;
      narrow.addEventListener?.("change", (event) => { switcher.open = !event.matches; });
    }
  }
  window.addEventListener("storage", (event) => {
    if (event.key === key || event.key === null) setTheme(event.key === null ? null : event.newValue, false);
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bindControls, { once: true });
  else bindControls();
})();
