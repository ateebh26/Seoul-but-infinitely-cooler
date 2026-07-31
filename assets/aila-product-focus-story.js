import { getScrollEventTarget } from '@theme/scroll-container';

class AilaProductFocusStory extends HTMLElement {
  constructor() {
    super();

    this._animationFrame = 0;
    this._isAnimated = false;
    this._onScroll = this._onScroll.bind(this);
    this._onModeChange = this._onModeChange.bind(this);
  }

  connectedCallback() {
    this.stage = this.querySelector('[data-story-stage]');
    this.heroCopy = this.querySelector('[data-story-hero-copy]');
    this.productPanel = this.querySelector('[data-story-product-panel]');
    this.productCards = [...this.querySelectorAll('[data-story-product-card]')];
    this.desktopQuery = window.matchMedia('(min-width: 990px)');
    this.motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.zoomAmount = Math.max(0, Number(this.dataset.zoomAmount) || 18) / 100;
    this.finalMediaWidth = Math.min(58, Math.max(40, Number(this.dataset.finalMediaWidth) || 48));

    this.desktopQuery.addEventListener('change', this._onModeChange);
    this.motionQuery.addEventListener('change', this._onModeChange);
    this._onModeChange();
  }

  disconnectedCallback() {
    this.desktopQuery?.removeEventListener('change', this._onModeChange);
    this.motionQuery?.removeEventListener('change', this._onModeChange);
    this._disableAnimation();
  }

  _onModeChange() {
    const shouldAnimate = this.desktopQuery.matches && !this.motionQuery.matches;

    if (shouldAnimate) {
      this._enableAnimation();
    } else {
      this._disableAnimation();
      this._setStaticState();
    }
  }

  _enableAnimation() {
    if (this._isAnimated) return;

    this._isAnimated = true;
    this.scrollTarget = getScrollEventTarget();
    this.setAttribute('data-animated', '');
    this.scrollTarget?.addEventListener('scroll', this._onScroll, { passive: true });
    window.addEventListener('resize', this._onScroll, { passive: true });
    this._onScroll();
  }

  _disableAnimation() {
    if (!this._isAnimated) return;

    this._isAnimated = false;
    this.removeAttribute('data-animated');
    this.scrollTarget?.removeEventListener('scroll', this._onScroll);
    window.removeEventListener('resize', this._onScroll);
    window.cancelAnimationFrame(this._animationFrame);
    this._animationFrame = 0;
  }

  _onScroll() {
    if (this._animationFrame) return;

    this._animationFrame = window.requestAnimationFrame(() => {
      this._animationFrame = 0;
      this._updateProgress();
    });
  }

  _updateProgress() {
    if (!this._isAnimated || !this.stage) return;

    const rect = this.getBoundingClientRect();
    const scrollDistance = Math.max(1, rect.height - window.innerHeight);
    const progress = this._clamp(-rect.top / scrollDistance);
    const splitProgress = this._smoothstep(0.12, 0.52, progress);
    const heroOpacity = 1 - this._smoothstep(0.06, 0.3, progress);
    const panelOpacity = this._smoothstep(0.28, 0.54, progress);
    const finalRightInset = 98 - this.finalMediaWidth;
    const mediaRightInset = 2 + (finalRightInset - 2) * splitProgress;
    const mediaScale = 1 + this.zoomAmount * splitProgress;

    this.style.setProperty('--story-progress', progress.toFixed(4));
    this.style.setProperty('--story-media-right', `${mediaRightInset.toFixed(3)}%`);
    this.style.setProperty('--story-media-scale', mediaScale.toFixed(4));
    this.style.setProperty('--story-hero-opacity', heroOpacity.toFixed(4));
    this.style.setProperty('--story-hero-shift', `${(-26 * splitProgress).toFixed(2)}px`);
    this.style.setProperty('--story-panel-opacity', panelOpacity.toFixed(4));
    this.style.setProperty('--story-panel-shift', `${(42 * (1 - panelOpacity)).toFixed(2)}px`);

    this.productCards.forEach((card, index) => {
      const start = 0.38 + index * 0.075;
      const reveal = this._smoothstep(start, start + 0.16, progress);

      card.style.setProperty('--story-card-reveal', reveal.toFixed(4));
      card.style.setProperty('--story-card-shift', `${(32 * (1 - reveal)).toFixed(2)}px`);
    });

    if (this.productPanel) {
      this.productPanel.toggleAttribute('inert', panelOpacity < 0.35);
    }

    if (this.heroCopy) {
      this.heroCopy.toggleAttribute('inert', heroOpacity < 0.15);
    }
  }

  _setStaticState() {
    this.style.setProperty('--story-progress', '1');
    this.style.setProperty('--story-media-right', `${98 - this.finalMediaWidth}%`);
    this.style.setProperty('--story-media-scale', `${1 + this.zoomAmount}`);
    this.style.setProperty('--story-hero-opacity', '0');
    this.style.setProperty('--story-hero-shift', '-26px');
    this.style.setProperty('--story-panel-opacity', '1');
    this.style.setProperty('--story-panel-shift', '0px');
    this.productPanel?.removeAttribute('inert');

    if (this.desktopQuery?.matches) {
      this.heroCopy?.setAttribute('inert', '');
    } else {
      this.heroCopy?.removeAttribute('inert');
    }

    this.productCards.forEach((card) => {
      card.style.setProperty('--story-card-reveal', '1');
      card.style.setProperty('--story-card-shift', '0px');
    });
  }

  _clamp(value) {
    return Math.min(1, Math.max(0, value));
  }

  _smoothstep(start, end, value) {
    const progress = this._clamp((value - start) / (end - start));

    return progress * progress * (3 - 2 * progress);
  }
}

if (!customElements.get('aila-product-focus-story')) {
  customElements.define('aila-product-focus-story', AilaProductFocusStory);
}
