import gsap from "gsap";
import { ScrollTrigger } from "~/lib/scroll-trigger";
import { desktopQuery, prefersReducedMotion } from "~/lib/utils";

/** Fallback when the CMS field is absent; the editor sets the real value (`data-swap-ms`). */
const DEFAULT_SWAP_MS = 1500;

/** Seconds one logo takes to leave while the next one arrives. */
const SWAP_DURATION = 0.9;

/** The incoming logo starts a beat after the outgoing one leaves, so the slot is never crowded. */
const SWAP_OFFSET = 0.1;

function shuffle(values: number[]) {
  const shuffled = [...values];

  for (let index = shuffled.length - 1; index > 0; index--) {
    const swapWith = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapWith]] = [shuffled[swapWith] as number, shuffled[index] as number];
  }

  return shuffled;
}

// The wall holds every logo in the editor's order but only shows a slotful of them: the rest are
// rendered hidden and rotate in one slot at a time, so a long client list stays a calm grid. Which
// slot changes next is shuffled: the content order is the editor's, the sweep order is not, and a
// left-to-right march would read as a machine. CSS owns how many slots are on the wall (the extra
// column appears at `lg`), so the element reads that back rather than mirroring the breakpoint.
export class LogoWallElement extends HTMLElement {
  #items: HTMLElement[] = [];
  #sources: HTMLElement[] = [];
  #slots: HTMLElement[] = [];
  #pool: HTMLElement[] = [];
  #order: number[] = [];
  #orderIndex = 0;
  #timeline: gsap.core.Timeline | null = null;
  #trigger: ScrollTrigger | null = null;
  #tweens = new Set<gsap.core.Tween>();
  #desktop: MediaQueryList | null = null;

  connectedCallback() {
    if (prefersReducedMotion()) {
      return;
    }

    const list = this.querySelector<HTMLElement>("[data-logo-wall-list]") ?? this;
    this.#items = [...list.querySelectorAll<HTMLElement>("[data-logo-wall-item]")];
    // The prototypes every clone comes from, detached from the wall and kept in editor order.
    this.#sources = this.#items
      .map((item) => item.querySelector<HTMLElement>("[data-logo-wall-target]"))
      .filter((target): target is HTMLElement => target !== null)
      .map((target) => target.cloneNode(true) as HTMLElement);

    this.#setup();

    this.#trigger = ScrollTrigger.create({
      trigger: this,
      start: "top bottom",
      end: "bottom top",
      onToggle: ({ isActive }) => this.#toggle(isActive),
    });

    this.#desktop = desktopQuery();
    this.#desktop.addEventListener("change", this.#onBreakpointChange);
    document.addEventListener("visibilitychange", this.#onVisibilityChange);
  }

  disconnectedCallback() {
    this.#timeline?.kill();
    this.#timeline = null;
    this.#trigger?.kill();
    this.#trigger = null;
    this.#killTweens();
    this.#desktop?.removeEventListener("change", this.#onBreakpointChange);
    this.#desktop = null;
    document.removeEventListener("visibilitychange", this.#onVisibilityChange);
  }

  #swapMs() {
    const value = Number.parseFloat(this.dataset.swapMs ?? "");

    return Number.isFinite(value) && value > 0 ? value : DEFAULT_SWAP_MS;
  }

  #killTweens() {
    for (const tween of this.#tweens) {
      tween.kill();
    }

    this.#tweens.clear();
  }

  /** Holds a tween only while it runs, so a wall left cycling for an hour keeps no history. */
  #track(tween: gsap.core.Tween, onDone?: () => void) {
    this.#tweens.add(tween);
    tween.eventCallback("onComplete", () => {
      this.#tweens.delete(tween);
      onDone?.();
    });
  }

  /** Fills the slots the wall currently shows and arms the loop. Re-run whenever that count changes. */
  #setup() {
    this.#timeline?.kill();
    this.#killTweens();

    this.#slots = this.#items.filter((item) => getComputedStyle(item).display !== "none");
    this.#pool = this.#sources.map((source) => source.cloneNode(true) as HTMLElement);
    this.#order = shuffle(this.#slots.map((_, index) => index));
    this.#orderIndex = 0;

    for (const item of this.#items) {
      item.replaceChildren();
    }

    for (const slot of this.#slots) {
      const logo = this.#pool.shift();

      if (logo) {
        slot.append(logo);
      }
    }

    // A zero-length timeline: every repeat waits out the delay, then swaps one logo.
    this.#timeline = gsap.timeline({ repeat: -1, repeatDelay: this.#swapMs() / 1000 });
    this.#timeline.call(this.#swapNext);
  }

  #toggle(play: boolean) {
    if (play && !document.hidden) {
      this.#timeline?.play();
    } else {
      this.#timeline?.pause();
    }
  }

  #onBreakpointChange = () => {
    this.#setup();
    this.#toggle(this.#trigger?.isActive ?? true);
  };

  #onVisibilityChange = () => this.#toggle(this.#trigger?.isActive ?? true);

  #swapNext = () => {
    const slot = this.#slots[this.#order[this.#orderIndex % this.#order.length] ?? 0];

    if (!slot) {
      return;
    }

    // Nothing waiting means the wall is showing every logo there is; it simply stays put.
    const incoming = this.#pool.shift();

    if (!incoming) {
      return;
    }

    this.#orderIndex++;

    const outgoing = slot.querySelector<HTMLElement>("[data-logo-wall-target]");

    gsap.set(incoming, { yPercent: 50, autoAlpha: 0 });
    slot.append(incoming);

    if (outgoing) {
      this.#track(gsap.to(outgoing, { yPercent: -50, autoAlpha: 0, duration: SWAP_DURATION, ease: "expo.inOut" }), () => {
        outgoing.remove();
        // Back to the end of the queue, so the wall works through the whole list before repeating.
        this.#pool.push(outgoing);
      });
    }

    this.#track(
      gsap.to(incoming, { yPercent: 0, autoAlpha: 1, duration: SWAP_DURATION, delay: SWAP_OFFSET, ease: "expo.inOut" })
    );
  };
}

if (!customElements.get("logo-wall")) {
  customElements.define("logo-wall", LogoWallElement);
}
