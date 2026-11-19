/* Keep complete cards and steps together when a chapter needs another screen.
   Original nodes are moved, never copied: form values, listeners and links survive. */
export function packScreenRows(heights, firstCapacity, nextCapacity, gap = 16) {
  const pages = [[]];
  let used = 0;
  let capacity = Math.max(0, firstCapacity);
  heights.forEach((height, index) => {
    const current = pages.at(-1);
    const space = current.length ? gap : 0;
    if (used + space + height > capacity + 1 && (current.length || pages.length === 1)) {
      pages.push([]);
      used = 0;
      capacity = Math.max(0, nextCapacity);
    }
    const page = pages.at(-1);
    used += (page.length ? gap : 0) + height;
    page.push(index);
  });
  // Avoid a nearly empty final screen containing only a disclaimer or last card.
  const usedBy = page => page.reduce((sum, index) => sum + heights[index], 0) + Math.max(0, page.length - 1) * gap;
  for (let i = pages.length - 1; i > 0; i -= 1) {
    const previous = pages[i - 1];
    const current = pages[i];
    while (previous.length > 1) {
      const height = heights[previous.at(-1)];
      const before = usedBy(previous);
      const after = usedBy(current);
      const moved = after + (current.length ? gap : 0) + height;
      if (moved > nextCapacity + 1 || Math.max(before - height - gap, moved) >= Math.max(before, after)) break;
      current.unshift(previous.pop());
    }
  }
  return pages;
}

if (typeof document !== 'undefined') {
  const collectionSelector = '.content-grid, .market-links, .platform-capabilities, .account-grid, .confidence-grid, .closing-steps, .account-roadmap, .process-list, .hero-summary-list, .instrument-list, .stat-list, .comparison-cards, .platform-access-gallery > .content-section-body';
  const chapterSelector = '.content-hero, .nw-section:not(.nw-live-markets), .nw-market-gateway, .nw-closing, .content-section, .policy-faq';
  const states = [];
  const viewport = document.createElement('div');
  viewport.className = 'screen-height-measure';
  viewport.setAttribute('aria-hidden', 'true');
  document.body.append(viewport);
  let busy = false;
  let timer;
  let lastWidth = 0;
  let lastHeight = 0;

  function remember(state, node) {
    if (!state.snapshots.some(item => item.node === node)) {
      state.snapshots.push({ node, children: [...node.childNodes] });
    }
  }

  function restore() {
    document.dispatchEvent(new CustomEvent('nw:screens-reset'));
    document.querySelectorAll('[data-screen-group]').forEach(group => group.classList.remove('screens-combined'));
    for (const state of states.splice(0)) {
      for (const snapshot of state.snapshots.reverse()) snapshot.node.replaceChildren(...snapshot.children);
      state.section.classList.remove('screen-sequence', 'screen-form-section');
      state.heading.classList.remove('screen-page-heading');
      state.form?.classList.remove('screen-form');
    }
  }

  function rowGroups(container) {
    const rows = [];
    for (const node of container.children) {
      if (!node.getClientRects().length || getComputedStyle(node).display === 'none') continue;
      const top = Math.round(node.getBoundingClientRect().top);
      const last = rows.at(-1);
      if (last && Math.abs(top - last.top) < 3) last.nodes.push(node);
      else rows.push({ top, nodes: [node] });
    }
    return rows;
  }

  function collect(state, node, blocks) {
    if (!node.getClientRects().length || getComputedStyle(node).display === 'none') return;
    if (node.matches('.hero-summary')) {
      const list = node.querySelector('.hero-summary-list');
      if (list) {
        const rows = [];
        collect(state, list, rows);
        rows.forEach(row => {
          const card = node.cloneNode(false);
          card.removeAttribute('id');
          card.append(row.element);
          blocks.push({ element: card, target: row.element, nodes: row.nodes });
        });
      } else blocks.push({ element: node });
    } else if (node.matches(collectionSelector)) {
      const rows = rowGroups(node);
      remember(state, node);
      for (const row of rows) {
        const shell = node.cloneNode(false);
        shell.removeAttribute('id');
        shell.classList.add('screen-row');
        shell.style.setProperty('--screen-columns', String(row.nodes.length));
        // Preserve numbered lists even when a later row starts a new screen.
        if (shell.tagName === 'OL') shell.start = [...node.children].indexOf(row.nodes[0]) + 1;
        if (shell.matches('.process-list')) shell.style.counterReset = `steps ${[...node.children].indexOf(row.nodes[0])}`;
        blocks.push({ element: shell, nodes: row.nodes });
      }
    } else if (node.matches('.content-section-body')) {
      remember(state, node);
      [...node.children].forEach(child => collect(state, child, blocks));
    } else {
      blocks.push({ element: node });
    }
  }

  function makePage(state, first = false) {
    const page = document.createElement('div');
    page.className = first ? 'screen-page screen-page-first' : 'screen-page';
    const heading = first ? state.heading : document.createElement('header');
    if (!first) {
      heading.className = 'screen-continuation';
      const title = document.createElement('h2');
      title.textContent = state.title;
      const accentedTitle = state.heading?.querySelector('.brand-name-accent')?.closest('h1,h2');
      if (accentedTitle?.textContent === state.title) {
        title.replaceChildren(...Array.from(accentedTitle.childNodes, node => node.cloneNode(true)));
      }
      heading.append(title);
    }
    heading?.classList.add('screen-page-heading');
    const body = document.createElement('div');
    body.className = 'screen-page-body' + (state.section.matches('.content-section') ? ' content-section-body' : '');
    if (heading) page.append(heading);
    page.append(body);
    (state.form || state.section).append(page);
    return { page, heading, body };
  }

  function paginate(section, budget) {
    if (section.hasAttribute('data-managed-screen')) return;
    const hero = section.matches('.content-hero');
    const firstBudget = hero ? viewport.getBoundingClientRect().height : budget;
    if (section.getBoundingClientRect().height <= firstBudget + 2) return;
    const root = section.querySelector('.workspace-real-preview') || section.querySelector(':scope > .nw-shell, :scope > .content-hero-shell') || section;
    const heading = root.querySelector(':scope > .content-section-heading, :scope > .nw-section-heading, :scope > h2, :scope > .closing-copy, :scope > .content-hero-copy, :scope > .workspace-copy');
    if (!heading) return;
    const state = { section, heading, title: heading.querySelector('h1,h2')?.textContent || heading.textContent, snapshots: [] };
    remember(state, section);
    remember(state, root);
    const blocks = [];
    const form = root.querySelector('[data-contact-form]');
    if (form) {
      state.form = form;
      remember(state, form);
      const intro = root.querySelector('.content-section-body > p');
      remember(state, form.parentElement);
      if (intro) blocks.push({ element: intro });
      // Separate contact details from the message while keeping one real form.
      const fields = [...form.children];
      const detailFields = fields.filter(node => node.matches('.form-field:not(.form-field-wide)'));
      const remaining = fields.filter(node => !detailFields.includes(node));
      const details = budget < 720 && innerWidth <= 600 ? [detailFields.slice(0, 3), detailFields.slice(3)] : [detailFields];
      const message = budget < 600 ? [remaining.filter(node => node.matches('.form-field')), remaining.filter(node => !node.matches('.form-field'))] : [remaining];
      for (const group of [...details, ...message]) {
        const shell = document.createElement('div');
        shell.className = 'screen-form-fields';
        blocks.push({ element: shell, nodes: group });
      }
    } else {
      [...root.children].filter(node => node !== heading).forEach(node => collect(state, node, blocks));
    }
    if (!blocks.length) return;
    states.push(state);
    // Materialise row wrappers only after all source row positions are measured.
    blocks.forEach(block => { if (block.nodes) (block.target || block.element).append(...block.nodes); });
    section.classList.add('screen-sequence');
    const decorations = [...section.children].filter(node => node.matches('.nw-left-ribbon'));
    section.replaceChildren(...decorations);
    if (form) {
      section.classList.add('screen-form-section');
      form.classList.add('screen-form');
      form.replaceChildren();
      section.append(form);
    }
    const first = makePage(state, true);
    blocks.forEach(block => first.body.append(block.element));
    const next = makePage(state);
    const style = getComputedStyle(first.page);
    const padding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    const gap = parseFloat(style.rowGap) || 16;
    const bodyGap = parseFloat(getComputedStyle(first.body).rowGap) || 16;
    const firstCapacity = firstBudget - padding - (first.heading?.getBoundingClientRect().height || 0) - gap;
    const nextStyle = getComputedStyle(next.page);
    const nextPadding = parseFloat(nextStyle.paddingTop) + parseFloat(nextStyle.paddingBottom);
    const nextCapacity = budget - nextPadding - next.heading.getBoundingClientRect().height - gap;
    // If a multi-column row is still too tall, give each card the full width.
    for (let i = 0; i < blocks.length; i += 1) {
      const block = blocks[i];
      if (!block.element.matches('.screen-row') || block.nodes?.length < 2 || block.element.getBoundingClientRect().height <= nextCapacity) continue;
      const individual = block.nodes.map(node => {
        const shell = block.element.cloneNode(false);
        shell.style.setProperty('--screen-columns', '1');
        shell.append(node);
        block.element.before(shell);
        return { element: shell, nodes: [node] };
      });
      block.element.remove();
      blocks.splice(i, 1, ...individual);
      i += individual.length - 1;
    }
    const heights = blocks.map(block => block.element.getBoundingClientRect().height);
    const groups = packScreenRows(heights, firstCapacity, nextCapacity, bodyGap);
    first.body.replaceChildren();
    next.page.remove();
    groups.forEach((group, i) => {
      const target = i === 0 ? first : makePage(state);
      group.forEach(index => target.body.append(blocks[index].element));
    });
  }

  function fitMarketSection(budget) {
    const section = document.querySelector('.nw-live-markets');
    const stage = section?.querySelector('.market-widget-stage');
    if (!stage || stage.getBoundingClientRect().height >= 300) return;
    const root = section.querySelector(':scope > .nw-shell');
    const heading = root.querySelector('.nw-section-heading');
    const widget = root.querySelector('.market-widget-shell');
    const note = root.querySelector('.market-footnote');
    const state = { section, heading, title: heading.querySelector('h2').textContent, snapshots: [] };
    remember(state, section);
    remember(state, root);
    states.push(state);
    section.classList.add('screen-sequence');
    section.replaceChildren();
    makePage(state, true).body.append(note);
    const chartPage = makePage(state);
    chartPage.page.classList.add('screen-live-chart');
    chartPage.body.append(widget);
  }

  function fitScreenGroups(budget) {
    document.querySelectorAll('[data-screen-group]').forEach(group => {
      // Measure the complete composition at its readable size before combining.
      // Smaller or shorter views keep the original complete-section pagination.
      if (innerWidth <= 700) return;
      group.classList.add('screens-combined');
      if (group.getBoundingClientRect().height > budget + 1 || group.scrollWidth > group.clientWidth + 1) {
        group.classList.remove('screens-combined');
      }
    });
  }

  function layout() {
    if (busy || matchMedia('print').matches) return;
    busy = true;
    const active = document.activeElement;
    const anchor = [...document.querySelectorAll('main h2, main h3, main .form-field')].find(node => {
      const r = node.getBoundingClientRect();
      return r.top >= 90 && r.top < innerHeight / 2;
    });
    const anchorTop = anchor?.getBoundingClientRect().top;
    restore();
    const height = viewport.getBoundingClientRect().height;
    const headerHeight = document.querySelector('.site-header,.content-header,.policy-header')?.getBoundingClientRect().height || 0;
    const budget = Math.max(240, height - headerHeight);
    document.documentElement.style.setProperty('--nw-screen-height', `${budget}px`);
    const gadgetRoom = fitHeroDevice(height);
    if (innerWidth <= 600 && gadgetRoom < 220) splitShortHero(budget);
    fitScreenGroups(budget);
    document.querySelectorAll(chapterSelector).forEach(section => paginate(section, budget));
    fitMarketSection(budget);
    if (active?.isConnected && active !== document.body) active.focus({ preventScroll: true });
    // Reapply the initial fragment after moving content into responsive screens.
    // Otherwise a direct enquiry link can stop at the section's old position.
    if (!lastWidth && location.hash) {
      const target = document.getElementById(location.hash.slice(1));
      const group = target?.closest('[data-screen-group]');
      const destination = group?.classList.contains('screens-combined') ? group : group ? target.closest('section') || group : target;
      destination?.scrollIntoView({ block: 'start', behavior: 'instant' });
    } else if (lastWidth && anchor?.isConnected && scrollY > height) {
      scrollBy(0, anchor.getBoundingClientRect().top - anchorTop);
    }
    lastWidth = innerWidth;
    lastHeight = height;
    document.documentElement.dataset.screensReady = 'true';
    busy = false;
    document.dispatchEvent(new CustomEvent('nw:screens-ready'));
  }

  function fitHeroDevice(height = viewport.getBoundingClientRect().height) {
    const grid = document.querySelector('.nw-hero-grid');
    const devices = grid?.querySelector('.hero-devices');
    if (!devices) return;
    const style = getComputedStyle(grid);
    const stacked = style.gridTemplateColumns.split(' ').length === 1;
    const copyHeight = stacked ? grid.querySelector('.nw-hero-copy').getBoundingClientRect().height + (parseFloat(style.rowGap) || 0) : 0;
    const controls = devices.querySelector('.hero-device-controls');
    const controlHeight = controls.getBoundingClientRect().height + parseFloat(getComputedStyle(controls).marginTop);
    const space = height - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom) - copyHeight - controlHeight;
    devices.style.setProperty('--hero-gadget-space', `${Math.max(100, space)}px`);
    return space;
  }

  function splitShortHero(budget) {
    const section = document.querySelector('.nw-hero');
    const root = section.querySelector('.nw-hero-grid');
    const heading = root.querySelector('.nw-hero-copy');
    const devices = root.querySelector('.hero-devices');
    const state = { section, heading, title: 'Explore live markets', snapshots: [] };
    remember(state, section);
    remember(state, root);
    states.push(state);
    const decorations = [...section.children].filter(node => node.matches('.nw-left-ribbon'));
    section.classList.add('screen-sequence');
    section.replaceChildren(...decorations);
    makePage(state, true);
    const devicePage = makePage(state);
    devicePage.page.classList.add('screen-device-page');
    devicePage.body.append(devices);
    const style = getComputedStyle(devicePage.page);
    const controls = devices.querySelector('.hero-device-controls');
    const space = budget - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom) - devicePage.heading.getBoundingClientRect().height - parseFloat(style.rowGap) - controls.getBoundingClientRect().height - parseFloat(getComputedStyle(controls).marginTop);
    devices.style.setProperty('--hero-gadget-space', `${Math.max(160, space)}px`);
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(layout, 100);
  }
  document.fonts.ready.then(layout);
  addEventListener('resize', () => {
    // Stable viewport units avoid repagination while mobile browser bars collapse.
    if (innerWidth !== lastWidth || Math.abs(viewport.getBoundingClientRect().height - lastHeight) > 2) schedule();
  });
  document.addEventListener('toggle', event => {
    if (event.target.matches('.faq-item')) schedule();
  }, true);
  addEventListener('beforeprint', restore);
  addEventListener('afterprint', layout);
}
