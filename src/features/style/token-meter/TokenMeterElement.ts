// Live badges for the style guide: viewport width, the measured gutter, and the rendered px of
// every type token. Everything is measured from the DOM (not recomputed from the clamp formulas),
// so what a badge says is what the page actually does.
export class TokenMeterElement extends HTMLElement {
  #update = () => {
    const viewport = this.querySelector("[data-viewport-w]");

    if (viewport) {
      viewport.textContent = String(window.innerWidth);
    }

    const gutter = this.querySelector("[data-gutter-px]");
    const probe = this.querySelector("[data-gutter-probe]");

    if (gutter && probe) {
      gutter.textContent = getComputedStyle(probe).paddingLeft;
    }

    for (const badge of this.querySelectorAll<HTMLElement>("[data-px-of]")) {
      const sample = this.querySelector(`[data-type-sample="${badge.dataset.pxOf}"]`);

      if (sample) {
        badge.textContent = `${Number.parseFloat(getComputedStyle(sample).fontSize).toFixed(1)}px`;
      }
    }
  };

  connectedCallback() {
    this.#update();
    window.addEventListener("resize", this.#update);
  }

  disconnectedCallback() {
    window.removeEventListener("resize", this.#update);
  }
}

if (!customElements.get("token-meter")) {
  customElements.define("token-meter", TokenMeterElement);
}
