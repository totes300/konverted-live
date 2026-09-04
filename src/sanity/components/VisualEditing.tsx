// The stock @sanity/astro component answers every Studio edit with window.location.reload(), and
// its .astro wrapper cannot take a `refresh` function across the island boundary. Rendering the
// React component directly (per its README) lets each edit re-render the page in place instead.
import { VisualEditingComponent } from "@sanity/astro/visual-editing/component";
import { reloadInPlace } from "~/lib/transitions/in-place";

export function VisualEditing() {
  return <VisualEditingComponent refresh={reloadInPlace} />;
}
