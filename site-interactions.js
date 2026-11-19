/* Shared progressive header and downward-opening select menus. */
(() => {
  const header = document.querySelector('.site-header, .content-header, .policy-header');
  let frame;
  function updateHeader() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      const p = Math.min(1, Math.max(0, scrollY / Math.max(600, innerHeight * .85)));
      header?.style.setProperty('--header-fill', String(p * p * (3 - 2 * p)));
      frame = 0;
    });
  }
  addEventListener('scroll', updateHeader, { passive: true });
  addEventListener('resize', updateHeader);
  updateHeader();

  // Keep the directory open on desktop and compact on smaller screens.
  // Native details preserve keyboard support and work without JavaScript.
  const footerGroups = document.querySelectorAll('.nw-footer-main > .nw-footer-group');
  const compactFooter = matchMedia('(max-width: 1100px)');
  function updateFooterGroups() {
    footerGroups.forEach(group => { group.open = !compactFooter.matches; });
  }
  compactFooter.addEventListener('change', updateFooterGroups);
  updateFooterGroups();

  document.querySelectorAll('.nw-hero, .content-hero, .policy-hero').forEach(hero => {
    const ribbon = document.createElement('span');
    ribbon.className = 'nw-left-ribbon';
    ribbon.setAttribute('aria-hidden', 'true');
    hero.prepend(ribbon);
  });

  let closeActive = () => {};
  document.querySelectorAll('select').forEach((select, index) => {
    if (select.multiple) return;
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'nw-select-trigger';
    trigger.setAttribute('role', 'combobox');
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    const label = select.getAttribute('aria-label') || select.labels?.[0]?.textContent.trim() || 'Choose an option';
    trigger.setAttribute('aria-label', label);
    const menu = document.createElement('div');
    menu.className = 'nw-select-menu';
    menu.id = `nw-options-${index}`;
    menu.setAttribute('role', 'listbox');
    menu.setAttribute('aria-label', label);
    menu.hidden = true;
    trigger.setAttribute('aria-controls', menu.id);
    select.classList.add('nw-native-select');
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');
    select.after(trigger);
    document.body.append(menu);
    let open = false, active = 0, search = '', searchTimer;
    const options = [...select.options];
    const items = options.map((option, i) => {
      const item = document.createElement('div');
      item.id = `${menu.id}-${i}`;
      item.setAttribute('role', 'option');
      item.textContent = option.textContent;
      item.setAttribute('aria-disabled', String(option.disabled));
      item.addEventListener('mousedown', event => event.preventDefault());
      item.addEventListener('click', () => choose(i));
      menu.append(item);
      return item;
    });
    function sync() {
      trigger.textContent = select.selectedOptions[0]?.textContent || 'Choose an option';
      trigger.disabled = select.disabled;
      items.forEach((item, i) => item.setAttribute('aria-selected', String(i === select.selectedIndex)));
    }
    function close() {
      open = false; menu.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      trigger.removeAttribute('aria-activedescendant');
    }
    function highlight(i) {
      active = i;
      items.forEach((item, n) => item.classList.toggle('active', n === i));
      trigger.setAttribute('aria-activedescendant', items[i].id);
      items[i].scrollIntoView({ block: 'nearest' });
    }
    function show() {
      closeActive(); closeActive = close;
      let rect = trigger.getBoundingClientRect();
      if (innerHeight - rect.bottom < 180) trigger.scrollIntoView({ block: 'center', behavior: 'instant' });
      rect = trigger.getBoundingClientRect();
      Object.assign(menu.style, { left: `${rect.left}px`, top: `${rect.bottom + 6}px`, width: `${rect.width}px`, maxHeight: `${Math.min(280, innerHeight - rect.bottom - 20)}px` });
      menu.hidden = false; open = true; trigger.setAttribute('aria-expanded', 'true');
      highlight(Math.max(0, select.selectedIndex));
    }
    function choose(i) {
      if (options[i].disabled) return;
      select.selectedIndex = i;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      sync(); close(); trigger.focus();
    }
    trigger.addEventListener('click', () => open ? close() : show());
    trigger.addEventListener('keydown', event => {
      if (event.key === 'Escape' || event.key === 'Tab') { close(); return; }
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault(); if (!open) show();
        const enabled = options.map((o, i) => o.disabled ? -1 : i).filter(i => i >= 0);
        const at = enabled.indexOf(active);
        highlight(event.key === 'Home' ? enabled[0] : event.key === 'End' ? enabled.at(-1) : enabled[Math.max(0, Math.min(enabled.length - 1, at + (event.key === 'ArrowDown' ? 1 : -1)))]);
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault(); open ? choose(active) : show();
      } else if (event.key.length === 1) {
        clearTimeout(searchTimer); search += event.key.toLowerCase();
        const i = options.findIndex(o => !o.disabled && o.textContent.toLowerCase().startsWith(search));
        if (i >= 0) { if (!open) show(); highlight(i); }
        searchTimer = setTimeout(() => { search = ''; }, 650);
      }
    });
    select.addEventListener('change', sync);
    select.addEventListener('invalid', event => { event.preventDefault(); trigger.focus(); trigger.setAttribute('aria-invalid', 'true'); show(); });
    select.addEventListener('change', () => trigger.removeAttribute('aria-invalid'));
    select.form?.addEventListener('reset', () => setTimeout(sync));
    document.addEventListener('pointerdown', event => { if (!trigger.contains(event.target) && !menu.contains(event.target)) close(); });
    addEventListener('scroll', event => { if (open && !menu.contains(event.target)) close(); }, true);
    addEventListener('resize', close);
    sync();
  });
})();
