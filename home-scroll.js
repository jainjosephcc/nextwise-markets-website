// Hold each complete screen before moving, then settle before the next chapter.
export function transitionProgress(position, start, end) {
  if (end <= start) return position >= end ? 1 : 0;
  const progress = Math.min(1, Math.max(0, ((position - start) / (end - start) - .2) / .7));
  return progress * progress * (3 - 2 * progress);
}

export function settleScrollPosition(current, target, elapsed) {
  if (Math.abs(target - current) < .25) return target;
  const weight = 1 - Math.exp(-Math.min(64, Math.max(0, elapsed)) / 100);
  return current + (target - current) * weight;
}

export function chapterAt(position, offsets) {
  if (!offsets.length) return { index: -1, progress: 0 };
  const index = Math.max(0, offsets.findLastIndex(offset => offset <= position));
  return {
    index,
    progress: index < offsets.length - 1 ? transitionProgress(position, offsets[index], offsets[index + 1]) : 0,
  };
}

const journey = typeof document !== 'undefined' && document.querySelector('[data-home-scroll]');

if (journey) {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let panels = [];
  let restoringHash = true;
  let resume = null;
  let currentPanel = null;
  let layoutWidth = 0;
  let layoutHeight = 0;
  let pointerFocus = false;
  let animationFrame = 0;
  const frame = journey.querySelector(':scope > .home-scroll-stage');
  let origin = 0;
  let position = 0;
  let lastFrameTime = 0;
  let inTransition = false;
  const transitions = {
    'client-portal': 'overlay',
    platform: 'split',
    accounts: 'left',
    markets: 'right',
    features: 'centre',
  };
  const headerHeight = () => document.querySelector('.site-header')?.getBoundingClientRect().height || 0;
  const screenHeight = () => document.querySelector('.screen-height-measure')?.getBoundingClientRect().height || innerHeight;
  const chapterTop = item => origin + item.offset;

  function reset() {
    cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    lastFrameTime = 0;
    const current = currentPanel;
    if (current) {
      resume = {
        section: current.section,
        page: panels.filter(item => item.section === current.section).indexOf(current),
        panel: current.panel,
        content: current.panel.contains(document.activeElement) ? document.activeElement
          : current.panel.querySelector('.account-card, .confidence-card, .market-link, .platform-capabilities article'),
      };
    }
    journey.classList.remove('is-pinned');
    for (const { panel, splitStage } of panels) {
      splitStage?.remove();
      panel.classList.remove('home-scroll-panel', 'is-visible', 'is-transitioning');
      panel.style.removeProperty('--home-panel-order');
      panel.style.removeProperty('--home-panel-transform');
      panel.style.removeProperty('--home-panel-clip');
      panel.style.removeProperty('--home-split-shift');
      delete panel.dataset.homeTransition;
    }
    journey.style.removeProperty('--home-track-height');
    panels = [];
    currentPanel = null;
    inTransition = false;
  }

  function reveal(item) {
    if (item) {
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      lastFrameTime = 0;
      position = item.offset;
      scrollTo({ top: chapterTop(item), behavior: 'instant' });
      paint();
    }
  }

  function makeSplitStage(item, previous) {
    // Only the static portal preview is copied. Live charts and form controls
    // always remain single, original nodes with their existing listeners.
    if (previous.section.id !== 'client-portal'
      || previous.panel.querySelector('iframe, canvas, video, form, input, select, textarea')) return false;
    const stage = document.createElement('div');
    stage.className = 'home-scroll-split';
    stage.setAttribute('aria-hidden', 'true');
    stage.hidden = true;
    for (const side of ['left', 'right']) {
      const half = document.createElement('div');
      half.className = `home-scroll-split-half home-scroll-split-${side}`;
      const context = document.createElement('div');
      context.className = `${previous.section.className} home-scroll-split-context`;
      context.classList.remove('home-scroll-panel', 'is-visible', 'is-transitioning');
      const copy = previous.panel.cloneNode(true);
      copy.classList.remove('home-scroll-panel', 'is-visible', 'is-transitioning');
      copy.classList.add('home-scroll-split-copy');
      copy.inert = true;
      copy.style.removeProperty('--home-panel-order');
      delete copy.dataset.homeTransition;
      for (const element of [copy, ...copy.querySelectorAll('*')]) {
        element.removeAttribute('id');
        element.removeAttribute('aria-labelledby');
        element.removeAttribute('aria-describedby');
        if (element.matches('a, button, [tabindex]')) element.setAttribute('tabindex', '-1');
        if (element.matches('img')) element.loading = 'eager';
      }
      context.append(copy);
      half.append(context);
      stage.append(half);
    }
    item.panel.append(stage);
    item.splitStage = stage;
    return true;
  }

  function paint() {
    if (!panels.length) return;
    const scene = chapterAt(position, panels.map(item => item.offset));
    const next = scene.index + 1;
    const progress = scene.progress;
    inTransition = progress > 0 && progress < 1;
    for (let index = 0; index < panels.length; index += 1) {
      const item = panels[index];
      const active = index === next && inTransition;
      const visible = (index === scene.index && progress < 1) || (index === next && progress > 0);
      item.panel.classList.toggle('is-visible', visible);
      item.panel.classList.toggle('is-transitioning', active);
      if (item.splitStage) item.splitStage.hidden = !active;
      if (!active) {
        item.panel.style.removeProperty('--home-panel-transform');
        item.panel.style.removeProperty('--home-panel-clip');
        continue;
      }
      const remaining = 1 - progress;
      let x = 0;
      let y = 0;
      let clip = 'none';
      if (item.effect === 'overlay') y = remaining * 100;
      if (item.effect === 'left') x = -100 * remaining;
      if (item.effect === 'right') x = 100 * remaining;
      if (item.effect === 'centre') clip = `inset(${remaining * 50}% ${remaining * 50}% round ${remaining * 2}rem)`;
      if (item.effect === 'split') item.panel.style.setProperty('--home-split-shift', `${progress * 50}%`);
      item.panel.style.setProperty('--home-panel-transform', `translate3d(${x}%, ${y}%, 0)`);
      item.panel.style.setProperty('--home-panel-clip', clip);
    }
    const current = panels[progress > .5 ? next : scene.index];
    currentPanel = scrollY >= origin - 2 && scrollY < origin + panels.at(-1).offset + layoutHeight ? current : null;
  }

  function renderTransitions(time) {
    animationFrame = 0;
    if (!journey.classList.contains('is-pinned') || innerWidth !== layoutWidth || Math.abs(screenHeight() - layoutHeight) > 2) return;
    const end = panels.at(-1).offset;
    const target = Math.min(end, Math.max(0, scrollY - origin));
    // Page jumps and the story boundaries should land directly, not race
    // through intermediate screens or leave a partial panel at the footer.
    if (target === 0 || target === end || Math.abs(target - position) > layoutHeight * 2.5) position = target;
    else position = settleScrollPosition(position, target, lastFrameTime ? time - lastFrameTime : 16.7);
    lastFrameTime = time;
    paint();
    if (position !== target) animationFrame = requestAnimationFrame(renderTransitions);
    else lastFrameTime = 0;
  }

  function scheduleTransitions() {
    if (journey.classList.contains('is-pinned') && !animationFrame) animationFrame = requestAnimationFrame(renderTransitions);
  }

  function findPanel(target) {
    return panels.find(item => item.panel === target || item.panel.contains(target))
      || panels.find(item => item.section === target || item.section.contains(target));
  }

  function revealHash() {
    if (!location.hash || !panels.length) return;
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    const target = document.getElementById(id);
    if (target) reveal(findPanel(target));
  }

  function setup() {
    reset();
    if (!frame) return;
    if (reducedMotion.matches || matchMedia('print').matches) {
      if (resume && !matchMedia('print').matches) {
        (resume.panel.isConnected ? resume.panel : resume.section).scrollIntoView({ block: 'start', behavior: 'instant' });
        resume = null;
      }
      return;
    }
    for (const section of [...frame.children]) {
      const screens = section.classList.contains('screen-sequence')
        ? [...section.querySelectorAll(':scope > .screen-page')]
        : [section];
      for (const panel of screens) {
        panels.push({ panel, section, height: panel.getBoundingClientRect().height });
      }
    }
    const budget = screenHeight() - headerHeight();
    if (!panels.length || panels.some(item => item.height > budget + 2)) {
      // Enlarged text and oversized cards keep the complete normal-flow page.
      panels = [];
      if (resume) {
        (resume.panel.isConnected ? resume.panel : resume.section).scrollIntoView({ block: 'start', behavior: 'instant' });
        resume = null;
      }
      return;
    }
    layoutWidth = innerWidth;
    layoutHeight = screenHeight();
    let offset = 0;
    for (let index = 0; index < panels.length; index += 1) {
      const item = panels[index];
      if (index) offset += budget * (panels[index - 1].section === item.section ? 1.1 : 1.8);
      item.offset = offset;
      item.panel.classList.add('home-scroll-panel');
      item.panel.style.setProperty('--home-panel-order', String(index + 1));
    }
    journey.style.setProperty('--home-track-height', `${offset + budget * 1.25}px`);
    journey.classList.add('is-pinned');
    origin = journey.getBoundingClientRect().top + scrollY - headerHeight();
    for (let index = 1; index < panels.length; index += 1) {
      const item = panels[index];
      const previous = panels[index - 1];
      item.effect = previous.section === item.section ? 'overlay' : transitions[item.section.id] || 'overlay';
      if (item.effect === 'split' && !makeSplitStage(item, previous)) item.effect = 'centre';
      item.panel.dataset.homeTransition = item.effect;
    }
    if (resume) {
      const sectionPanels = panels.filter(item => item.section === resume.section);
      reveal(sectionPanels.find(item => resume.content && item.panel.contains(resume.content))
        || sectionPanels[Math.min(resume.page, sectionPanels.length - 1)]);
      resume = null;
    } else if (restoringHash) {
      restoringHash = false;
      revealHash();
    }
    position = Math.min(offset, Math.max(0, scrollY - origin));
    paint();
  }

  document.addEventListener('nw:screens-reset', reset);
  document.addEventListener('nw:screens-ready', setup);
  reducedMotion.addEventListener('change', setup);
  addEventListener('hashchange', revealHash);
  addEventListener('scroll', scheduleTransitions, { passive: true });
  document.addEventListener('pointerdown', () => { pointerFocus = true; }, true);
  document.addEventListener('pointerup', () => { pointerFocus = false; }, true);
  document.addEventListener('pointercancel', () => { pointerFocus = false; }, true);
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href]');
    if (!link || link.target === '_blank' || link.hasAttribute('download')) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname || url.search !== location.search || !url.hash) return;
    let id;
    try { id = decodeURIComponent(url.hash.slice(1)); } catch { return; }
    const target = document.getElementById(id);
    const item = target && findPanel(target);
    if (!item) return;
    event.preventDefault();
    if (location.hash !== url.hash) history.pushState(null, '', url.hash);
    reveal(item);
    if (event.detail === 0) {
      const heading = item.panel.querySelector('h2') || item.panel;
      if (!heading.hasAttribute('tabindex')) {
        heading.setAttribute('tabindex', '-1');
        heading.addEventListener('blur', () => heading.removeAttribute('tabindex'), { once: true });
      }
      heading.focus({ preventScroll: true });
    }
  });
  journey.addEventListener('focusin', event => {
    if (pointerFocus) return;
    const item = findPanel(event.target);
    if (!item) return;
    if (item !== currentPanel || inTransition) reveal(item);
  });
  if (document.documentElement.dataset.screensReady === 'true') setup();
}
