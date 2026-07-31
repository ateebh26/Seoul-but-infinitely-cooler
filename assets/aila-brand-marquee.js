class AilaBrandMarquee extends HTMLElement {
  connectedCallback() {
    this.viewport = this.querySelector('[data-brand-marquee-viewport]');
    this.track = this.querySelector('[data-brand-marquee-track]');
    this.sourceGroup = this.querySelector('[data-brand-marquee-group]:not([data-brand-marquee-copy])');
    this.motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');

    if (!this.viewport || !this.track || !this.sourceGroup) return;

    this.resizeObserver = new ResizeObserver(this.scheduleRefresh);
    this.resizeObserver.observe(this);
    this.motionPreference.addEventListener('change', this.scheduleRefresh);

    this.scheduleRefresh();
  }

  disconnectedCallback() {
    this.resizeObserver?.disconnect();
    this.motionPreference?.removeEventListener('change', this.scheduleRefresh);

    if (this.refreshFrame) {
      window.cancelAnimationFrame(this.refreshFrame);
    }
  }

  scheduleRefresh = () => {
    if (this.refreshFrame) {
      window.cancelAnimationFrame(this.refreshFrame);
    }

    this.refreshFrame = window.requestAnimationFrame(() => {
      this.refreshFrame = null;
      this.refresh();
    });
  };

  removeCopies() {
    this.track
      ?.querySelectorAll('[data-brand-marquee-copy]')
      .forEach((copy) => copy.remove());
  }

  refresh() {
    this.removeAttribute('data-ready');
    this.removeCopies();

    if (this.motionPreference.matches) {
      this.setAttribute('data-disabled', '');
      this.style.removeProperty('--brand-marquee-distance');
      this.style.removeProperty('--brand-marquee-duration');
      return;
    }

    this.removeAttribute('data-disabled');

    const gap = Number.parseFloat(window.getComputedStyle(this).getPropertyValue('--brand-marquee-gap')) || 0;
    const groupWidth = this.sourceGroup.getBoundingClientRect().width;
    const viewportWidth = this.viewport.getBoundingClientRect().width;

    if (!groupWidth || !viewportWidth) return;

    const distance = groupWidth + gap;
    const totalGroups = Math.max(2, Math.ceil((viewportWidth + distance + gap) / distance));

    for (let index = 1; index < totalGroups; index += 1) {
      const copy = this.sourceGroup.cloneNode(true);
      copy.setAttribute('data-brand-marquee-copy', '');
      copy.setAttribute('aria-hidden', 'true');
      copy.querySelectorAll('a, button, input, select, textarea, [tabindex]').forEach((element) => {
        element.setAttribute('tabindex', '-1');
      });
      this.track.appendChild(copy);
    }

    const pixelsPerSecond = Math.max(1, Number(this.dataset.speed) || 54);
    const duration = distance / pixelsPerSecond;

    this.style.setProperty('--brand-marquee-distance', `${distance}px`);
    this.style.setProperty('--brand-marquee-duration', `${duration}s`);

    window.requestAnimationFrame(() => {
      this.setAttribute('data-ready', '');
    });
  }
}

if (!customElements.get('aila-brand-marquee')) {
  customElements.define('aila-brand-marquee', AilaBrandMarquee);
}
