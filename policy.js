const menuButton = document.querySelector(".menu-toggle");
const primaryNav = document.querySelector(".policy-primary-nav");
function closeMenu() {
  primaryNav?.classList.remove("open");
  menuButton?.setAttribute("aria-expanded", "false");
  document.body.classList.remove("menu-open");
}
window.matchMedia("(min-width: 1161px)").addEventListener("change", (event) => {
  if (event.matches) closeMenu();
});
document.addEventListener("pointerdown", (event) => {
  if (!primaryNav?.classList.contains("open")) return;
  if (primaryNav.contains(event.target) || menuButton?.contains(event.target)) return;
  closeMenu();
});

menuButton?.addEventListener("click", () => {
  const open = menuButton.getAttribute("aria-expanded") !== "true";
  menuButton.setAttribute("aria-expanded", String(open));
  primaryNav?.classList.toggle("open", open);
  document.body.classList.toggle("menu-open", open);
  if (open) primaryNav?.querySelector("a")?.focus();
});

primaryNav?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    menuButton?.setAttribute("aria-expanded", "false");
    primaryNav.classList.remove("open");
    document.body.classList.remove("menu-open");
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || !primaryNav?.classList.contains("open")) return;
  primaryNav.classList.remove("open");
  menuButton?.setAttribute("aria-expanded", "false");
  document.body.classList.remove("menu-open");
  menuButton?.focus();
});
