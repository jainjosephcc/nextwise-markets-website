// Validate one continuous form without replacing inputs or hiding any fields.
if (typeof document !== 'undefined') {
  const form = document.querySelector('.enquiry-section [data-contact-form]');
  if (form) {
    form.noValidate = true;
    const controls = [...form.querySelectorAll('input, select, textarea')];
    const visibleControl = field => field?.classList.contains('nw-native-select')
      ? field.parentElement.querySelector('.nw-select-trigger') : field;

    function clearError(field) {
      field.parentElement.querySelector('.enquiry-error')?.remove();
      [field, visibleControl(field)].forEach(control => {
        control?.removeAttribute('aria-invalid');
        control?.removeAttribute('aria-describedby');
      });
    }

    function showError(field) {
      clearError(field);
      const error = document.createElement('p');
      error.className = 'enquiry-error';
      error.id = `${field.id}-error`;
      error.textContent = field.validity.valueMissing
        ? (field.tagName === 'SELECT' ? 'Choose your country.' : 'Required field.')
        : field.validity.typeMismatch ? 'Enter a valid email.' : field.validationMessage;
      field.parentElement.append(error);
      [field, visibleControl(field)].forEach(control => {
        control?.setAttribute('aria-invalid', 'true');
        control?.setAttribute('aria-describedby', error.id);
      });
      visibleControl(field)?.focus({ preventScroll: true });
    }

    form.addEventListener('input', event => { if (event.target.matches('input, textarea')) clearError(event.target); });
    form.addEventListener('change', event => { if (event.target.matches('select')) clearError(event.target); });
    form.addEventListener('submit', event => {
      const invalid = controls.find(field => !field.validity.valid);
      if (invalid) {
        event.preventDefault();
        event.stopImmediatePropagation();
        showError(invalid);
      }
      // Valid submissions continue to the existing mailto handler in content.js.
    }, true);
  }

  const intro = document.querySelector('.enquiry-intro');
  if (intro && typeof matchMedia === 'function') {
    const compact = matchMedia('(max-width: 640px) and (max-height: 740px)');
    let frame;
    function positionChat() {
      frame = null;
      const bounds = intro.getBoundingClientRect();
      const headerHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nw-header-height')) || 74;
      const besideTitle = compact.matches && bounds.top >= headerHeight - 2 && bounds.bottom < innerHeight - 48;
      document.body.classList.toggle('enquiry-chat-at-heading', besideTitle);
      if (besideTitle) document.body.style.setProperty('--enquiry-chat-top', `${bounds.top}px`);
    }
    const scheduleChat = () => { if (!frame) frame = requestAnimationFrame(positionChat); };
    addEventListener('scroll', scheduleChat, { passive: true });
    addEventListener('resize', scheduleChat);
    positionChat();
  }
}
