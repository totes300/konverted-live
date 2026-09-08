import { Button, Card, Stack, Text } from "@sanity/ui";
import { useToast } from "@sanity/ui/toast";
import * as React from "react";
import type { ArrayOfObjectsInputProps } from "sanity";
import { sanityConfig } from "../config";

type RedeployResponse = {
  ok?: boolean;
  error?: string;
};

/**
 * The `redirects` array editor plus a "Redeploy site" button. Redirects are read at build time from
 * the host's own config, so edits only go live after a rebuild. The button posts to the host's
 * redeploy endpoint, which keeps the actual deploy trigger server-side.
 */
function RedirectsDeployInput(props: ArrayOfObjectsInputProps) {
  const toast = useToast();
  const [isRedeploying, setIsRedeploying] = React.useState(false);

  const handleRedeploy = async () => {
    setIsRedeploying(true);

    try {
      const res = await fetch(sanityConfig.endpoints.redeploy, { method: "POST" });
      const payload = (await res.json()) as RedeployResponse;

      if (!res.ok || !payload.ok) {
        throw new Error(payload.error || "Redeploy request failed.");
      }

      toast.push({
        status: "success",
        title: "Redeploy started",
        description: "The site is rebuilding. Redirect changes go live once the build finishes.",
      });
    } catch (error) {
      toast.push({
        status: "error",
        title: "Redeploy failed",
        description: error instanceof Error ? error.message : "Unknown error.",
      });
    } finally {
      setIsRedeploying(false);
    }
  };

  return (
    <Stack gap={3}>
      {props.renderDefault(props)}

      <Card border padding={3} radius={2} tone="transparent">
        <Stack gap={4}>
          <Stack gap={3}>
            <Text size={1} weight="medium">
              Apply redirect changes
            </Text>
            <Text size={1} muted>
              Redirects are baked in when the site builds, so edits above only take effect after a rebuild. Publish your changes
              first, then redeploy to apply them.
            </Text>
          </Stack>

          <Button
            text={isRedeploying ? "Starting..." : "Redeploy site"}
            tone="primary"
            disabled={isRedeploying}
            onClick={handleRedeploy}
          />
        </Stack>
      </Card>
    </Stack>
  );
}

export { RedirectsDeployInput };
