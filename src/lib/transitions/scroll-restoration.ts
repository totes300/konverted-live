// Astro's <ClientRouter /> restores from history.state but only saves into it once scrolling fully
// stops (`scrollend`, or its polling fallback), and Lenis's easing tail keeps the position moving
// sub-pixel for well over a second after the scroll looks settled. A reload inside that window
// restores the previous resting position, so the state is stamped during the scroll instead.

// Cadence of the mid-scroll stamps. Chrome and Safari rate-limit history writes (~100 per 30s), so
// this stays well under while keeping the state at most half a second stale.
const SAVE_MS = 400;

// Quiet time before the trailing stamp records the exact resting position.
const TRAIL_MS = 150;

const save = () => {
  if (!history.state) {
    return;
  }

  history.replaceState({ ...history.state, scrollX: window.scrollX, scrollY: window.scrollY }, "");
};

let lastSave = 0;
let trailing = 0;

addEventListener(
  "scroll",
  () => {
    const index = history.state?.index;
    const now = performance.now();

    if (now - lastSave >= SAVE_MS) {
      lastSave = now;
      save();
    }

    clearTimeout(trailing);
    trailing = window.setTimeout(() => {
      // A client-side navigation landed in the meantime; its entry's scroll is Astro's to record.
      if (history.state?.index !== index) {
        return;
      }

      save();
    }, TRAIL_MS);
  },
  { passive: true }
);
