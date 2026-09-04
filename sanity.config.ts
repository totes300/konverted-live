// This file is executed in the browser as part of the embedded Studio served by Astro at `/studio`
// (configured via `studioBasePath` in astro.config.mjs).

import { visionTool } from "@sanity/vision";
import { defineConfig } from "sanity";
import { defineDocuments, presentationTool } from "sanity/presentation";
import { structureTool } from "sanity/structure";
import { media, mediaAssetSource } from "sanity-plugin-media";
import { muxInput } from "sanity-plugin-mux-input";
import { createDocumentActions } from "./sanity/actions";
import { autoAltTextPlugin } from "./sanity/auto-alt-text";
import { sanityConfig } from "./sanity/config";
import { SINGLETON_IDS } from "./sanity/constants";
import { schemaTypes } from "./sanity/schemas";
import { buildStructure } from "./sanity/structure";
import { createDocumentTemplates } from "./sanity/templates";

const isDev = import.meta.env.DEV;

export default defineConfig({
  title: "The Content Architecture",
  projectId: sanityConfig.projectId,
  dataset: sanityConfig.dataset,
  basePath: sanityConfig.studioBasePath,
  schema: {
    types: schemaTypes,
    templates: createDocumentTemplates,
  },
  document: {
    actions: createDocumentActions,
  },
  form: {
    // Restrict image uploads to use the media browser.
    image: {
      assetSources: () => [mediaAssetSource],
    },
    // Don't use the media browser for anything that is not an image source.
    file: {
      assetSources: (prev) => prev.filter((source) => source !== mediaAssetSource),
    },
  },
  plugins: [
    structureTool({
      structure: buildStructure,
      title: "Content",
    }),
    media({
      maximumUploadSize: 10000000, // 10MB
      creditLine: { enabled: false },
      directUploads: false,
    }),
    muxInput({
      tool: { title: "Mux" },
      encoding_tier: "baseline",
      disableUploadConfig: true,
      max_resolution_tier: "2160p",
      allowedRolesForConfiguration: ["administrator"],
    }),
    autoAltTextPlugin(),
    // Live preview. previewUrl origin is omitted so it defaults to the embedded Studio's own (same) origin.
    presentationTool({
      resolve: {
        // Main documents are documents that map to a route on the website.
        // This enables Sanity to update the content side panel when navigating in preview mode.
        mainDocuments: defineDocuments([
          { route: `/`, filter: `_id == "${SINGLETON_IDS.homepage}"` },
          { route: `/:uri`, filter: (ctx) => `defined(uri.current) && uri.current == "${ctx.path}"` },
        ]),
      },
      previewUrl: {
        initial: "/",
        previewMode: {
          enable: sanityConfig.endpoints.draftModeEnable,
          disable: sanityConfig.endpoints.draftModeDisable,
        },
      },
    }),
    ...(isDev
      ? [
          visionTool({
            defaultApiVersion: sanityConfig.apiVersion,
          }),
        ]
      : []),
  ],
});
