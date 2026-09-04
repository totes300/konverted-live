// Gate for in-page intro animations (e.g. AnimatedText): closed while a page transition runs,
// open once the entering fade has finished, so content animates in after the cross-fade. On the
// initial (non-swap) load there is no transition, so the gate is open immediately.
//
// page-transitions.ts drives it: closeContentGate() before a navigation, openContentGate() once
// the "in" phase resolves.

let pending: { promise: Promise<void>; resolve: () => void } | null = null;

export function closeContentGate() {
  if (pending) {
    return;
  }

  let resolve = () => {};
  const promise = new Promise<void>((r) => {
    resolve = r;
  });

  pending = { promise, resolve };
}

export function openContentGate() {
  pending?.resolve();
  pending = null;
}

/** Resolves once the current page's entering transition (if any) has finished. */
export function whenContentReady(): Promise<void> {
  return pending?.promise ?? Promise.resolve();
}
