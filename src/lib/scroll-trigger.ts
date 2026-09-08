import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// A phone's address bar sliding away resizes the viewport, and a refresh on that would re-measure
// every pinned section mid-scroll. Only a width change, an orientation, is a real resize there.
ScrollTrigger.config({ ignoreMobileResize: true });

// A swap upgrades an element while the page above it is still filling in, and ScrollTrigger keeps
// that short document's positions for good, so every trigger re-measures once the page is whole.
document.addEventListener("astro:page-load", () => {
  ScrollTrigger.refresh();
});

// Fonts settle line breaks after that, and only a document load gets ScrollTrigger's own refresh.
void document.fonts.ready.then(() => ScrollTrigger.refresh());

export { ScrollTrigger };
