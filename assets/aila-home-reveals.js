const pendingClass = 'aila-home-reveals-pending';
const readyClass = 'aila-home-reveals-ready';

const revealSelectors = [
  '.seoul-perfume-hero__media',
  '.seoul-perfume-hero__content > *',
  '.seoul-perfume-hero__side-note',
  '.seoul-perfume-hero__progress',
  '.seoul-section-heading > *',
  '.scent-navigation__item',
  '.section-resource-list__header',
  '.resource-list__item',
  '.aila-focus-story__media-frame',
  '.aila-focus-story__hero-copy > *',
];

const mediaSelectors = '.seoul-perfume-hero__media, .aila-focus-story__media-frame';
const cardSelectors = '.scent-navigation__item, .resource-list__item';

function releasePendingState() {
  document.documentElement.classList.remove(pendingClass);
}

function prepareSection(section) {
  const items = [...section.querySelectorAll(revealSelectors.join(','))];

  section.classList.add('aila-home-reveal-section');

  items.forEach((item, index) => {
    item.classList.add('aila-home-reveal-item');
    item.style.setProperty('--aila-home-reveal-delay', `${Math.min(index, 6) * 65}ms`);

    if (item.matches(mediaSelectors)) {
      item.classList.add('aila-home-reveal-item--media');
    } else if (item.matches(cardSelectors)) {
      item.classList.add('aila-home-reveal-item--card');
    }
  });

  return items;
}

function getObserverRoot() {
  const pageWrapper = document.querySelector('.page-wrapper');

  if (!pageWrapper) return null;

  const overflowY = window.getComputedStyle(pageWrapper).overflowY;
  return /^(auto|scroll|overlay)$/.test(overflowY) ? pageWrapper : null;
}

function initializeHomeReveals() {
  const root = document.documentElement;
  const main = document.querySelector('#MainContent[data-template^="index"]');
  const cutoff = main?.querySelector('[data-aila-home-reveal-cutoff]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  window.clearTimeout(window.__ailaHomeRevealWatchdog);

  if (root.classList.contains('aila-home-reveals-skipped')) {
    releasePendingState();
    return;
  }

  if (!main || !cutoff || reducedMotion || !('IntersectionObserver' in window)) {
    releasePendingState();
    return;
  }

  const cutoffSection = cutoff.closest('.shopify-section');
  const homepageSections = [...main.children].filter((element) => element.matches('.shopify-section'));
  const cutoffIndex = homepageSections.indexOf(cutoffSection);

  if (cutoffIndex < 0) {
    releasePendingState();
    return;
  }

  const revealSections = homepageSections.slice(0, cutoffIndex + 1);
  const revealItems = revealSections.flatMap(prepareSection);

  root.classList.add(readyClass);
  releasePendingState();

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        entry.target.classList.add('is-aila-home-revealed');
        observer.unobserve(entry.target);
      });
    },
    {
      root: getObserverRoot(),
      threshold: 0.14,
      rootMargin: '0px 0px -6% 0px',
    }
  );

  /*
   * Allow the prepared opacity/transform state to paint before observation.
   * This makes elements already in view on first load animate instead of
   * reaching their final state in the same rendering frame.
   */
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      revealItems.forEach((item) => observer.observe(item));
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeHomeReveals, { once: true });
} else {
  initializeHomeReveals();
}
