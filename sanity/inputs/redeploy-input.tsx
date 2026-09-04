import { Button, Card, Stack, Text } from "@sanity/ui";
import { useToast } from "@sanity/ui/toast";
import type { ArrayOfObjectsInputProps } from "sanity";

/**
 * The `redirects` array editor plus a placeholder "Redeploy site" button. Redirects are read at
 * build time from the host's own config, so edits only go live after a rebuild. How that rebuild is
 * triggered differs per project (a Vercel deploy hook, a GitHub Actions dispatch, etc.), so it is
 * intentionally left unimplemented: clicking logs and toasts a reminder. Wire it up in `handleRedeploy`.
 */
function RedirectsDeployInput(props: ArrayOfObjectsInputProps) {
  const toast = useToast();

  const handleRedeploy = () => {
    // TODO: attach this project's redeploy trigger (Vercel deploy hook, GitHub Actions workflow
    // dispatch, etc.). Until then this is a no-op that only notifies the editor.
    console.warn("[redeploy] Not wired up yet. Attach a deploy trigger in RedirectsDeployInput.handleRedeploy.");
    toast.push({
      status: "warning",
      title: "Redeploy not wired up",
      description:
        "This button needs a deploy trigger attached (e.g. a Vercel deploy hook or a GitHub Actions dispatch). See RedirectsDeployInput.handleRedeploy.",
    });
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

          <Button text="Redeploy site" tone="primary" onClick={handleRedeploy} />
        </Stack>
      </Card>
    </Stack>
  );
}

export { RedirectsDeployInput };
