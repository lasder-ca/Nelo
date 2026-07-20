const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const heroLines = [...document.querySelectorAll('.hero-code .code-line')];
const ownedIndexes = [1, 6, 7];
heroLines.forEach((line, index) => line.classList.toggle('ownership-line', ownedIndexes.includes(index)));
const state = document.querySelector('.editor-state');
let ownershipStep = 0;
let ownershipTimer;
if (state && !reducedMotion) {
  const states = JSON.parse(decodeURIComponent(state.dataset.states || '%5B%5D'));
  const label = state.querySelector('span');
  const advance = () => {
    heroLines.forEach((line) => line.classList.remove('owned-focus'));
    const line = heroLines[ownedIndexes[ownershipStep % ownedIndexes.length]];
    line?.classList.add('owned-focus');
    state.classList.add('switch');
    setTimeout(() => {
      if (label) label.textContent = states[ownershipStep % states.length] || '';
      state.classList.remove('switch');
    }, 150);
    ownershipStep += 1;
  };
  advance();
  ownershipTimer = setInterval(advance, 1850);
}

const workbench = document.querySelector('.workbench');
const tabButtons = [...document.querySelectorAll('[data-tab]')];
let tabIndex = 0;
let tabTimer;
const resetTabProgress = () => {
  const progress = document.querySelector('.tab-timer');
  if (!progress) return;
  progress.style.animation = 'none';
  requestAnimationFrame(() => {
    progress.style.animation = '';
  });
};
const selectTab = (index) => {
  tabIndex = index % tabButtons.length;
  tabButtons[tabIndex]?.click();
  resetTabProgress();
};
const startTabs = () => {
  if (reducedMotion || tabTimer || tabButtons.length < 2) return;
  tabTimer = setInterval(() => selectTab(tabIndex + 1), 5800);
};
const stopTabs = () => {
  clearInterval(tabTimer);
  tabTimer = undefined;
};
tabButtons.forEach((button, index) => button.addEventListener('click', () => {
  tabIndex = index;
  resetTabProgress();
}));
workbench?.addEventListener('pointerenter', () => { stopTabs(); workbench.classList.add('paused'); });
workbench?.addEventListener('pointerleave', () => { workbench.classList.remove('paused'); startTabs(); });
workbench?.addEventListener('focusin', () => { stopTabs(); workbench.classList.add('paused'); });
workbench?.addEventListener('focusout', () => { workbench.classList.remove('paused'); startTabs(); });
startTabs();

if (!reducedMotion) {
  document.querySelectorAll('.card').forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - .5;
      const y = (event.clientY - rect.top) / rect.height - .5;
      card.style.setProperty('--card-ry', `${x * 2.2}deg`);
      card.style.setProperty('--card-rx', `${y * -2.2}deg`);
    });
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--card-ry', '0deg');
      card.style.setProperty('--card-rx', '0deg');
    });
  });

  document.querySelectorAll('.magnetic').forEach((element) => {
    element.addEventListener('pointermove', (event) => {
      const rect = element.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;
      element.style.transform = `translate(${x * .08}px, ${y * .08}px)`;
    });
    element.addEventListener('pointerleave', () => { element.style.transform = ''; });
  });

  const cursor = document.querySelector('.motion-cursor');
  addEventListener('pointermove', (event) => {
    if (!cursor) return;
    cursor.classList.add('on');
    cursor.style.left = `${event.clientX}px`;
    cursor.style.top = `${event.clientY}px`;
    cursor.classList.toggle('link', Boolean(event.target.closest('a,button')));
  }, { passive: true });

  let ticking = false;
  addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      document.documentElement.style.setProperty('--parallax-y', `${scrollY}px`);
      ticking = false;
    });
  }, { passive: true });
}

const runtimeRows = [...document.querySelectorAll('.runtime-row:not(.runtime-head)')];
const rowObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const index = runtimeRows.indexOf(entry.target);
    setTimeout(() => entry.target.classList.add('row-visible'), reducedMotion ? 0 : index * 90);
    rowObserver.unobserve(entry.target);
  });
}, { threshold: .2 });
runtimeRows.forEach((row) => rowObserver.observe(row));

addEventListener('beforeunload', () => {
  clearInterval(ownershipTimer);
  clearInterval(tabTimer);
});
