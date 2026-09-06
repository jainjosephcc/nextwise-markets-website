const menuButton = document.querySelector(".menu-toggle");
const primaryNav = document.querySelector(".content-primary-nav");

function closeMenu({ restoreFocus = false } = {}) {
  primaryNav?.classList.remove("open");
  menuButton?.setAttribute("aria-expanded", "false");
  document.body.classList.remove("menu-open");
  if (restoreFocus) menuButton?.focus();
}

menuButton?.addEventListener("click", () => {
  const open = menuButton.getAttribute("aria-expanded") !== "true";
  menuButton.setAttribute("aria-expanded", String(open));
  primaryNav?.classList.toggle("open", open);
  document.body.classList.toggle("menu-open", open);
  if (open) primaryNav?.querySelector("a")?.focus();
});

primaryNav?.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => closeMenu()));
document.addEventListener("pointerdown", (event) => {
  if (!primaryNav?.classList.contains("open")) return;
  if (primaryNav.contains(event.target) || menuButton?.contains(event.target)) return;
  closeMenu();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && primaryNav?.classList.contains("open")) closeMenu({ restoreFocus: true });
});

document.querySelectorAll("[data-current-year]").forEach((node) => {
  node.textContent = String(new Date().getFullYear());
});

const countrySelect = document.querySelector("#country");
if (countrySelect?.options?.length) {
  countrySelect.options[0].value = "";
  countrySelect.options[0].disabled = true;
  countrySelect.options[0].textContent = "Choose a country";
}

const footerBrand = document.querySelector(".content-footer-brand");
if (footerBrand && !footerBrand.querySelector(".content-social-links")) {
  const socialNav = document.createElement("nav");
  socialNav.className = "content-social-links";
  socialNav.setAttribute("aria-label", "Follow Nextwise Markets");
  [
    ["LinkedIn", "https://www.linkedin.com/company/nextwise-markets/about/"],
    ["Facebook", "https://www.facebook.com/nextwise.markets"],
    ["Instagram", "https://www.instagram.com/nextwise.markets/"],
    ["YouTube", "https://www.youtube.com/@nextwise.markets"],
  ].forEach(([label, url]) => {
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = label;
    link.setAttribute("aria-label", `${label} (opens in a new tab)`);
    socialNav.append(link);
  });
  footerBrand.append(socialNav);
}

const contactForm = document.querySelector("[data-contact-form]");
contactForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!contactForm.reportValidity()) return;
  const data = new FormData(contactForm);
  const name = `${data.get("first-name") || ""} ${data.get("last-name") || ""}`.trim();
  const subject = String(data.get("subject") || "Nextwise Markets enquiry");
  const body = [
    `Name: ${name}`,
    `Email: ${data.get("email") || ""}`,
    `Country: ${data.get("country") || ""}`,
    `City: ${data.get("city") || ""}`,
    `Phone: ${data.get("phone") || ""}`,
    "",
    String(data.get("message") || ""),
  ].join("\n");
  const status = contactForm.querySelector("[data-form-status]");
  if (status) status.textContent = "Opening your email application. Review the message before sending.";
  window.location.href = `mailto:support@nextwisemarkets.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});
