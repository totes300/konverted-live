import EmbedSnippet from "@calcom/embed-snippet";

// Cal.com's own loader, which injects app.cal.com/embed/embed.js on first call and queues everything
// until it answers. One booker per namespace, so a second mount of the same namespace is skipped
// rather than stacking a second iframe on a view-transition swap.
const mounted = new Set<string>();

/** The booker's accent, read off the theme so the brand colour has one definition (colors.css). */
function brandColor(element: Element) {
  return getComputedStyle(element).getPropertyValue("--color-accent").trim() || "#000";
}

export class CalEmbedElement extends HTMLElement {
  connectedCallback() {
    const target = this.querySelector<HTMLElement>("[data-cal-target]");
    const fallback = this.querySelector<HTMLElement>("[data-cal-fallback]");
    const calLink = this.dataset.calLink;
    const namespace = this.dataset.calNamespace ?? "";

    if (!target || !calLink || mounted.has(namespace)) {
      return;
    }

    mounted.add(namespace);

    const cal = EmbedSnippet();

    cal("init", namespace, { origin: "https://app.cal.com" });

    const booker = cal.ns[namespace] ?? cal;

    booker("inline", {
      calLink,
      elementOrSelector: target,
      config: { layout: "month_view", useSlotsViewOnSmallScreen: "true" },
    });

    booker("ui", {
      hideEventTypeDetails: false,
      layout: "month_view",
      theme: "light",
      cssVarsPerTheme: { light: { "cal-brand": brandColor(this) }, dark: { "cal-brand": brandColor(this) } },
    });

    if (fallback) {
      fallback.hidden = true;
    }
  }
}

if (!customElements.get("cal-embed")) {
  customElements.define("cal-embed", CalEmbedElement);
}
