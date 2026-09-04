import type { LenisElement } from "~/components/Lenis/LenisElement";
import { prefersReducedMotion } from "~/lib/utils";

/** Matches the panel's exit transition in `Dialog.astro`; the dialog only closes once it has left the screen. */
const EXIT_MS = 300;

/**
 * A modal panel on the native `<dialog>`: `showModal()` makes the rest of the document inert, so
 * focus stays contained without a JS trap. This element owns what the platform leaves open: the
 * enter/exit transitions, Escape, the backdrop press, the page scroll lock, and return focus.
 */
export class DialogElement extends HTMLElement {
  /** Set by a host that turns closing into something else, such as a navigation; otherwise closing hides in place. */
  onCloseRequest: (() => void) | null = null;

  #dialog: HTMLDialogElement | null = null;
  #content: HTMLElement | null = null;
  #closeButton: HTMLButtonElement | null = null;
  #returnFocusTo: HTMLElement | null = null;
  #closeTimer = 0;
  #open = false;
  #pressedBackdrop = false;

  get isOpen(): boolean {
    return this.#open;
  }

  /** The scrolling region a host fills; empty until it does. */
  get content(): HTMLElement | null {
    return this.#content;
  }

  /** Where focus lands after the exit. Unset means focus stays wherever the browser left it. */
  set returnFocusTo(element: HTMLElement | null) {
    this.#returnFocusTo = element;
  }

  show() {
    const dialog = this.#dialog;

    if (!dialog) {
      return;
    }

    clearTimeout(this.#closeTimer);
    this.#open = true;

    if (!dialog.open) {
      dialog.showModal();
      this.#lockPageScroll(true);
    }

    this.#content?.scrollTo(0, 0);

    // Not left to the platform: `showModal()` would focus the first focusable child the host injected.
    this.#closeButton?.focus();

    // Next frame, so the entrance runs from the closed state instead of being skipped.
    requestAnimationFrame(() => {
      if (!this.#open) {
        return;
      }

      dialog.setAttribute("data-open", "");
      this.dispatchEvent(new CustomEvent("dialog:open"));
    });
  }

  hide() {
    const dialog = this.#dialog;

    this.#open = false;

    if (!dialog?.open) {
      return;
    }

    dialog.removeAttribute("data-open");

    // Unlocked before the exit: a close that is also a navigation has its scroll restored by the router now.
    this.#lockPageScroll(false);

    clearTimeout(this.#closeTimer);
    this.#closeTimer = window.setTimeout(() => dialog.close(), prefersReducedMotion() ? 0 : EXIT_MS);
  }

  /** The host, when it set a handler, decides what closing means. */
  requestClose() {
    if (!this.#open) {
      return;
    }

    if (this.onCloseRequest) {
      this.onCloseRequest();
      return;
    }

    this.hide();
  }

  // Escape reaches the dialog as `cancel`, which closes it outright; the exit needs to run first.
  #onCancel = (event: Event) => {
    event.preventDefault();
    this.requestClose();
  };

  // The one teardown: Chrome skips the cancellable `cancel` when Escape arrives with no user
  // activation, so a close can bypass hide() and would leave the page scroll locked.
  #onClose = () => {
    clearTimeout(this.#closeTimer);
    this.#open = false;
    this.#dialog?.removeAttribute("data-open");
    this.#lockPageScroll(false);

    // Focus can only be handed back once the dialog has left the top layer; until then the target is inert.
    this.#returnFocusTo?.focus();
    this.dispatchEvent(new CustomEvent("dialog:close"));
  };

  // Both ends of the click must land on the backdrop, so a selection dragged out of the panel and
  // released outside it does not close it.
  #onPointerDown = (event: PointerEvent) => {
    this.#pressedBackdrop = event.target === this.#dialog;
  };

  #onDialogClick = (event: MouseEvent) => {
    if (this.#pressedBackdrop && event.target === this.#dialog) {
      this.requestClose();
    }
  };

  #onCloseClick = () => {
    this.requestClose();
  };

  #lockPageScroll(locked: boolean) {
    const lenis = document.querySelector<LenisElement>("lenis-scroll");

    if (locked) {
      lenis?.stop();
      document.documentElement.style.overflow = "hidden";
      return;
    }

    lenis?.start();
    document.documentElement.style.removeProperty("overflow");
  }

  connectedCallback() {
    this.#dialog = this.querySelector<HTMLDialogElement>("[data-dialog]");
    this.#content = this.querySelector<HTMLElement>("[data-dialog-content]");
    this.#closeButton = this.querySelector<HTMLButtonElement>("[data-dialog-close]");

    this.#closeButton?.addEventListener("click", this.#onCloseClick);
    this.#dialog?.addEventListener("cancel", this.#onCancel);
    this.#dialog?.addEventListener("close", this.#onClose);
    this.#dialog?.addEventListener("pointerdown", this.#onPointerDown);
    this.#dialog?.addEventListener("click", this.#onDialogClick);
  }

  disconnectedCallback() {
    this.#closeButton?.removeEventListener("click", this.#onCloseClick);
    this.#dialog?.removeEventListener("cancel", this.#onCancel);
    this.#dialog?.removeEventListener("close", this.#onClose);
    this.#dialog?.removeEventListener("pointerdown", this.#onPointerDown);
    this.#dialog?.removeEventListener("click", this.#onDialogClick);

    clearTimeout(this.#closeTimer);

    // The lock is on <html>, which outlives this element.
    if (this.#open) {
      this.#lockPageScroll(false);
    }

    this.onCloseRequest = null;
    this.#open = false;
    this.#dialog = null;
    this.#content = null;
    this.#closeButton = null;
    this.#returnFocusTo = null;
  }
}

if (!customElements.get("modal-dialog")) {
  customElements.define("modal-dialog", DialogElement);
}
