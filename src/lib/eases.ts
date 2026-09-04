import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";

gsap.registerPlugin(CustomEase);

// Shared cubic-bezier eases, registered once so every tween references them by name: CSS `ease`
// for the page fade, and AnimatedText's reveal and exit beziers.
export const CSS_EASE = CustomEase.create("css-ease", "0.25, 0.1, 0.25, 1");
export const REVEAL_EASE = CustomEase.create("text-reveal", "0.23, 1, 0.32, 1");
export const EXIT_EASE = CustomEase.create("text-exit", "0.7, 0, 0.84, 0");
