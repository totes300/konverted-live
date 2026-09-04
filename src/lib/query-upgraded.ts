// Typed lookup for a custom element nested inside another one. After a <ClientRouter /> swap the
// incoming document upgrades in tree order, so while an ancestor's `connectedCallback` runs a
// descendant custom element is still a plain HTMLElement and fails `instanceof`; on a fresh load
// import order happens to hide this. Upgrading the match first makes the check answer the same in
// both worlds, and taking the class as an argument guarantees the tag is defined at all: importing
// the element module is what defines it.

type ElementClass<T extends HTMLElement> = abstract new () => T;

export function queryUpgraded<T extends HTMLElement>(
  scope: ParentNode,
  selector: string,
  elementClass: ElementClass<T>
): T | null {
  const found = scope.querySelector(selector);

  if (!(found instanceof HTMLElement)) {
    return null;
  }

  customElements.upgrade(found);

  return found instanceof elementClass ? found : null;
}

export function queryAllUpgraded<T extends HTMLElement>(scope: ParentNode, selector: string, elementClass: ElementClass<T>): T[] {
  const upgraded: T[] = [];

  for (const found of scope.querySelectorAll(selector)) {
    if (found instanceof HTMLElement) {
      customElements.upgrade(found);
    }

    if (found instanceof elementClass) {
      upgraded.push(found);
    }
  }

  return upgraded;
}
