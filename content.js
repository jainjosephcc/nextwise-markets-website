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
});

primaryNav?.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => closeMenu()));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && primaryNav?.classList.contains("open")) closeMenu({ restoreFocus: true });
});

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
