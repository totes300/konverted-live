import { useToast } from "@sanity/ui/toast";
import * as React from "react";
import { definePlugin, type LayoutProps, useClient } from "sanity";
import { sanityConfig } from "./config";

/** Assets with no alternative text. Patching one drops it out of this set, so no event loop. */
const PENDING_ASSETS_QUERY = `*[_type == "sanity.imageAsset" && !defined(altText)]`;

type DescribeResponse = {
  status?: "described" | "skipped" | "failed";
  altText?: string;
  reason?: string;
  error?: string;
};

/**
 * Describes images as they are uploaded, by listening to the dataset from the open Studio.
 *
 * This replaces an upload webhook, and can, because uploads are pinned to the media browser
 * (`assetSources: () => [mediaAssetSource]`, `directUploads: false` in `sanity.config.ts`): an image
 * cannot arrive without a Studio being open. Keeping the trigger here means it is versioned with the
 * code and needs no dashboard step and no shared secret. Uploads from outside the Studio (a dataset
 * import, the CLI) are the backfill panel's job, not this one.
 *
 * The Site toggle is not read here. The route is the single authority on whether to spend credits,
 * so a stale Studio tab cannot act on a setting that has since been turned off.
 */
function useAutoAltText() {
  const client = useClient({ apiVersion: sanityConfig.apiVersion });
  const toast = useToast();

  React.useEffect(() => {
    // Assets this tab has already acted on. Guards against the several mutation events one upload
    // produces as the media plugin fills in metadata.
    const claimed = new Set<string>();
    const queue: string[] = [];

    let isDraining = false;
    let isCancelled = false;

    const describe = async (assetId: string) => {
      const res = await fetch(sanityConfig.endpoints.imageAltText, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: assetId }),
      });

      return (await res.json()) as DescribeResponse;
    };

    // One at a time: dropping ten images into the media browser must not fire ten concurrent
    // Agent Actions, which are rate limited and metered.
    const drain = async () => {
      if (isDraining) {
        return;
      }

      isDraining = true;

      try {
        while (queue.length > 0 && !isCancelled) {
          const assetId = queue.shift();

          if (!assetId) {
            break;
          }

          try {
            const payload = await describe(assetId);

            if (payload.status === "described" && payload.altText) {
              toast.push({
                status: "success",
                title: "Alt text added",
                description: payload.altText,
              });
            }

            if (payload.status === "failed") {
              toast.push({
                status: "warning",
                title: "Could not describe an image",
                description: `${payload.reason ?? "Unknown error."} Use Backfill in Site settings to retry.`,
              });
            }
          } catch {
            // A dropped request should not kill the queue: the backfill panel is the retry path.
          }
        }
      } finally {
        isDraining = false;
      }
    };

    const subscription = client
      .listen(PENDING_ASSETS_QUERY, {}, { visibility: "query", events: ["mutation"], includeResult: false })
      .subscribe((event) => {
        if (event.type !== "mutation" || event.transition !== "appear") {
          return;
        }

        if (claimed.has(event.documentId)) {
          return;
        }

        claimed.add(event.documentId);
        queue.push(event.documentId);
        void drain();
      });

    return () => {
      isCancelled = true;
      subscription.unsubscribe();
    };
  }, [client, toast]);
}

function AutoAltTextLayout(props: LayoutProps) {
  useAutoAltText();

  return props.renderDefault(props);
}

/** Mounts the upload listener once per Studio, above whichever tool is open. */
export const autoAltTextPlugin = definePlugin({
  name: "auto-alt-text",
  studio: {
    components: {
      layout: AutoAltTextLayout,
    },
  },
});
