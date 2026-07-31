const AILA_DEAL_TAG = 'aila-limited-deal';

if (!customElements.get(AILA_DEAL_TAG)) {
  class AilaLimitedDeal extends HTMLElement {
    #timer;
    #deadline;
    #currency;
    #locale;
    #discountPercent;
    #timeZone;

    connectedCallback() {
      this.#currency = this.dataset.currency || 'CAD';
      this.#locale = this.dataset.locale || 'en-CA';
      this.#discountPercent = Number(this.dataset.discountPercent) || 0;
      this.#timeZone = this.dataset.timeZone || 'America/Toronto';

      this.querySelectorAll('[data-deal-variant]').forEach((button) => {
        button.addEventListener('click', this.#selectVariant);
      });

      this.#deadline = this.#parseDeadline(this.dataset.endDate, this.dataset.endTime);
      this.#syncSelectedVariant();
      this.#tick();

      if (this.#deadline) {
        this.#timer = window.setInterval(() => this.#tick(), 1000);
      }
    }

    disconnectedCallback() {
      window.clearInterval(this.#timer);
      this.querySelectorAll('[data-deal-variant]').forEach((button) => {
        button.removeEventListener('click', this.#selectVariant);
      });
    }

    #selectVariant = (event) => {
      const button = event.currentTarget;
      if (!(button instanceof HTMLButtonElement)) return;

      this.querySelectorAll('[data-deal-variant]').forEach((variantButton) => {
        const selected = variantButton === button;
        variantButton.classList.toggle('is-selected', selected);
        variantButton.setAttribute('aria-pressed', selected ? 'true' : 'false');
      });

      const input = this.querySelector('[data-deal-variant-input]');
      if (input instanceof HTMLInputElement) {
        input.value = button.dataset.variantId || '';
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }

      this.#syncSelectedVariant(button);
    };

    #syncSelectedVariant(selectedButton) {
      const button =
        selectedButton ||
        this.querySelector('[data-deal-variant].is-selected') ||
        this.querySelector('[data-deal-variant]');

      if (!(button instanceof HTMLElement)) return;

      const price = Number(button.dataset.price) || 0;
      const available = button.dataset.available === 'true';
      const inventory = Number(button.dataset.inventory);
      const inventoryTracked = button.dataset.inventoryTracked === 'true';
      const showInventoryQuantity = this.dataset.showInventoryQuantity === 'true';

      const regularPrices = this.querySelectorAll('[data-deal-regular-price]');
      const salePrice = this.querySelector('[data-deal-sale-price]');
      const inventoryLabel = this.querySelector('[data-deal-inventory]');
      const addButton = this.querySelector('button[name="add"]');
      const paymentButton = this.querySelector('.aila-deal__buy-now');

      regularPrices.forEach((regularPrice) => {
        regularPrice.textContent = this.#formatMoney(price);
      });
      if (salePrice) salePrice.textContent = this.#formatMoney(this.#discountedPrice(price));

      if (inventoryLabel) {
        if (!available) {
          inventoryLabel.textContent = this.dataset.soldOutLabel || 'Sold out';
          inventoryLabel.classList.add('is-sold-out');
        } else {
          inventoryLabel.classList.remove('is-sold-out');
          inventoryLabel.textContent =
            showInventoryQuantity && inventoryTracked && inventory > 0
              ? `${inventory} ${this.dataset.inStockLabel || 'in stock'}`
              : this.dataset.inStockLabel || 'In stock';
        }
      }

      if (addButton instanceof HTMLButtonElement) {
        addButton.disabled = !available;
        addButton.setAttribute('aria-disabled', available ? 'false' : 'true');
        const label = addButton.querySelector('[data-deal-add-label]');
        if (label) {
          label.textContent = available
            ? this.dataset.addToCartLabel || 'Add to cart'
            : this.dataset.soldOutLabel || 'Sold out';
        }
      }

      if (paymentButton instanceof HTMLElement) {
        paymentButton.hidden = !available;
      }
    }

    #discountedPrice(price) {
      return Math.round(price * ((100 - this.#discountPercent) / 100));
    }

    #formatMoney(cents) {
      try {
        return new Intl.NumberFormat(this.#locale, {
          style: 'currency',
          currency: this.#currency,
        }).format(cents / 100);
      } catch (_error) {
        return `$${(cents / 100).toFixed(2)} ${this.#currency}`;
      }
    }

    #tick() {
      if (!this.#deadline) {
        this.#setState('unscheduled');
        return;
      }

      const remaining = this.#deadline.getTime() - Date.now();
      if (remaining <= 0) {
        window.clearInterval(this.#timer);
        this.#setState('expired');
        this.#updateCountdown(0);
        return;
      }

      this.#setState('active');
      this.#updateCountdown(remaining);
      this.#updateDeadlineLabel();
    }

    #setState(state) {
      this.classList.toggle('is-active', state === 'active');
      this.classList.toggle('is-expired', state === 'expired');
      this.classList.toggle('is-unscheduled', state === 'unscheduled');

      if (
        state === 'expired' &&
        this.dataset.expiryBehavior === 'hide' &&
        this.dataset.designMode !== 'true'
      ) {
        this.hidden = true;
      } else {
        this.hidden = false;
      }
    }

    #updateCountdown(milliseconds) {
      const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      this.#setCount('days', days);
      this.#setCount('hours', hours);
      this.#setCount('minutes', minutes);
      this.#setCount('seconds', seconds);

      const accessibleCountdown = this.querySelector('[data-deal-countdown-label]');
      if (accessibleCountdown) {
        accessibleCountdown.textContent =
          `${days} days, ${hours} hours, ${minutes} minutes, and ${seconds} seconds remaining`;
      }
    }

    #setCount(unit, value) {
      const element = this.querySelector(`[data-deal-${unit}]`);
      if (element) element.textContent = String(value).padStart(2, '0');
    }

    #updateDeadlineLabel() {
      const label = this.querySelector('[data-deal-deadline-label]');
      if (!label || !this.#deadline) return;

      try {
        label.textContent = new Intl.DateTimeFormat(this.#locale, {
          timeZone: this.#timeZone,
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          timeZoneName: 'short',
        }).format(this.#deadline);
      } catch (_error) {
        label.textContent = `${this.dataset.endDate} ${this.dataset.endTime}`;
      }
    }

    #parseDeadline(dateValue, timeValue) {
      const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue || '');
      const timeMatch = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(timeValue || '');
      if (!dateMatch || !timeMatch) return null;

      const desired = {
        year: Number(dateMatch[1]),
        month: Number(dateMatch[2]),
        day: Number(dateMatch[3]),
        hour: Number(timeMatch[1]),
        minute: Number(timeMatch[2]),
        second: Number(timeMatch[3] || 0),
      };

      if (
        desired.month < 1 ||
        desired.month > 12 ||
        desired.day < 1 ||
        desired.day > 31 ||
        desired.hour > 23 ||
        desired.minute > 59 ||
        desired.second > 59
      ) {
        return null;
      }

      const desiredAsUtc = Date.UTC(
        desired.year,
        desired.month - 1,
        desired.day,
        desired.hour,
        desired.minute,
        desired.second
      );
      let guess = desiredAsUtc;

      try {
        const formatter = new Intl.DateTimeFormat('en-CA', {
          timeZone: this.#timeZone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hourCycle: 'h23',
        });

        for (let iteration = 0; iteration < 3; iteration += 1) {
          const parts = Object.fromEntries(
            formatter
              .formatToParts(new Date(guess))
              .filter((part) => part.type !== 'literal')
              .map((part) => [part.type, Number(part.value)])
          );
          const renderedAsUtc = Date.UTC(
            parts.year,
            parts.month - 1,
            parts.day,
            parts.hour,
            parts.minute,
            parts.second
          );
          guess += desiredAsUtc - renderedAsUtc;
        }

        return new Date(guess);
      } catch (_error) {
        return null;
      }
    }
  }

  customElements.define(AILA_DEAL_TAG, AilaLimitedDeal);
}
