type ModuleLoader = () => Promise<unknown>;

// Preload a little before the target reaches the viewport, so it is always hydrated before a tap can
// land on it.
const ROOT_MARGIN = "256px";

// Hold a component's module (and heavy deps like GSAP) out of the initial page load until its target
// nears the viewport, then load the chunk once and let every instance of the custom element upgrade in
// place. Visibility-based rather than hover/pointer intent so it behaves the same on touch, where the
// first tap would otherwise race the import. Re-observes after each view-transition swap; the module
// itself only executes once per session.
export function lazyCustomElement(
  hostSelector: string,
  load: ModuleLoader,
  resolveTarget: (host: Element) => Element | null = (host) => host
) {
  let loaded = false;

  const observer = new IntersectionObserver(
    (entries) => {
      if (loaded || !entries.some((entry) => entry.isIntersecting)) {
        return;
      }

      loaded = true;
      observer.disconnect();
      void load();
    },
    { rootMargin: ROOT_MARGIN }
  );

  const wire = () => {
    if (loaded) {
      return;
    }

    document.querySelectorAll(hostSelector).forEach((host) => {
      const target = resolveTarget(host);

      if (target) {
        observer.observe(target);
      }
    });
  };

  wire();
  document.addEventListener("astro:page-load", wire);
}
