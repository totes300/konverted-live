import gsap from "gsap";
import { SplitText } from "gsap/SplitText";

import { ScrollTrigger } from "~/lib/scroll-trigger";
import { isInPlaceNavigation } from "~/lib/transitions/in-place";
import { prefersReducedMotion } from "~/lib/utils";

gsap.registerPlugin(SplitText);

/**
 * GSAP's color parser predates `oklab()`, which is exactly what Tailwind emits for opacity
 * modifiers like `text-ink-soft/35` — fed in raw it tweens through garbage hues, which is what
 * turned the accent flash yellow. Handing the color to a canvas is not enough on its own:
 * `fillStyle` gives `oklab()` straight back. Relative color syntax is what forces the re-resolve
 * into sRGB channels, which are then rewritten as the `rgba()` GSAP understands.
 */
const colorContext = document.createElement("canvas").getContext("2d");

function normalizeColor(value: string): string {
  if (!colorContext) {
    return value;
  }

  colorContext.fillStyle = "#000";
  colorContext.fillStyle = `rgb(from ${value} r g b / alpha)`;

  let resolved = colorContext.fillStyle;

  // Either the color really is black, or relative syntax was rejected; resolving it raw covers both.
  if (resolved === "#000000") {
    colorContext.fillStyle = "#000";
    colorContext.fillStyle = value;
    resolved = colorContext.fillStyle;
  }

  const channels = resolved.startsWith("color(") ? resolved.match(/[\d.]+/g) : null;

  if (!channels || channels.length < 3) {
    return resolved;
  }

  const [r, g, b] = channels.slice(0, 3).map((channel) => Math.round(Number(channel) * 255));

  return `rgba(${r}, ${g}, ${b}, ${channels[3] ?? 1})`;
}

/**
 * Osmo's "Gradient Wave Text on Scroll", carried into the repo's custom-element pattern: the text
 * splits into characters that activate with the scroll position, each flashing through the wave
 * color on its way from the inactive color to its own final CSS color. The end color is captured
 * per character, so multi-tone text (the statement's ink + muted spans) keeps its tones.
 *
 * Attribute contract follows the resource (`data-gradient-wave-*`); the color defaults come from
 * the design tokens instead of hardcoded values.
 */
export class GradientWaveTextElement extends HTMLElement {
  #split: SplitText | null = null;

  connectedCallback() {
    // Draft mode keeps stega-encoded text intact for visual editing; reduced motion and in-place
    // navigation just keep the server-rendered colors.
    if (isInPlaceNavigation() || document.documentElement.hasAttribute("data-draft-mode") || prefersReducedMotion()) {
      return;
    }

    const target = this.querySelector<HTMLElement>("[data-gradient-wave-text]");

    if (!target) {
      return;
    }

    const styles = getComputedStyle(this);
    const accent = styles.getPropertyValue("--color-accent").trim();
    const inkSoft = styles.getPropertyValue("--color-ink-soft").trim();
    const [r, g, b] = gsap.utils.splitColor(inkSoft || "#360c06");

    const scrollStart = this.getAttribute("data-gradient-wave-scroll-start") || "top 90%";
    const scrollEnd = this.getAttribute("data-gradient-wave-scroll-end") || "center 40%";
    const startColor = normalizeColor(this.getAttribute("data-gradient-wave-color-start") || `rgba(${r}, ${g}, ${b}, 0.35)`);
    const waveColor = normalizeColor(this.getAttribute("data-gradient-wave-color-wave") || accent || "#ec5532");
    const waveDuration = Number.parseFloat(this.getAttribute("data-gradient-wave-duration") ?? "") || 0.4;
    const scrubValue = Number.parseFloat(this.getAttribute("data-gradient-wave-scrub") ?? "") || 0.1;

    this.#split = new SplitText(target, {
      type: "words, chars",
      autoSplit: true,
      onSplit: (self) => {
        const chars = self.chars as HTMLElement[];
        // Each character ends on the color it inherited from its own span, captured pre-activation.
        const endColors = chars.map((char) => normalizeColor(getComputedStyle(char).color));
        const activeChars = new Set<HTMLElement>();
        const progress = { value: 0 };
        let isReady = false;

        const syncChars = () => {
          const activeCount = Math.round(progress.value * chars.length);

          chars.forEach((char, index) => {
            const isActive = index < activeCount;
            gsap.killTweensOf(char);
            gsap.set(char, { color: isActive ? endColors[index] : startColor });

            if (isActive) {
              activeChars.add(char);
            } else {
              activeChars.delete(char);
            }
          });
        };

        const ctx = gsap.context(() => {
          gsap.set(chars, { color: startColor });

          gsap.to(progress, {
            value: 1,
            ease: "none",
            scrollTrigger: {
              trigger: target,
              start: scrollStart,
              end: scrollEnd,
              scrub: scrubValue,
              onRefresh: () => {
                isReady = false;
                syncChars();
                requestAnimationFrame(() => {
                  isReady = true;
                });
              },
            },
            onUpdate: () => {
              if (!isReady) {
                return;
              }

              const activeCount = Math.round(progress.value * chars.length);

              chars.forEach((char, index) => {
                const isActive = index < activeCount;

                if (isActive && !activeChars.has(char)) {
                  activeChars.add(char);
                  gsap.killTweensOf(char);

                  gsap
                    .timeline()
                    .to(char, { color: waveColor, duration: waveDuration * 0.3, ease: "power2.out" })
                    .to(char, { color: endColors[index], duration: waveDuration * 0.7, ease: "power2.in" });
                }

                if (!isActive && activeChars.has(char)) {
                  activeChars.delete(char);
                  gsap.killTweensOf(char);

                  gsap.to(char, { color: startColor, duration: waveDuration * 0.5, ease: "none" });
                }
              });
            },
          });
        }, target);

        return ctx;
      },
    });

    ScrollTrigger.refresh();
  }

  disconnectedCallback() {
    this.#split?.revert();
    this.#split = null;
  }
}

if (!customElements.get("gradient-wave-text")) {
  customElements.define("gradient-wave-text", GradientWaveTextElement);
}
