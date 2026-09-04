import { Card, Flex, Grid, Stack, Text } from "@sanity/ui";
import { defineField, PatchEvent, type StringInputProps, set, unset } from "sanity";
import { BRAND_COLORS, findBrandColor } from "../../colors";

// A named swatch per brand token rather than a free colour input: content should never introduce a
// colour the design system does not have. What gets stored is the token's name, so the value stays in
// the app's stylesheet (see `sanity/colors.ts`); the hex is shown so the choice is not a guess.
function BrandColorInput({ onChange, value, elementProps }: StringInputProps) {
  const selected = findBrandColor(value);

  return (
    <Grid {...elementProps} gap={2} style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
      {BRAND_COLORS.map((color) => {
        const isSelected = color.name === selected?.name;

        return (
          <Card
            key={color.name}
            as="button"
            type="button"
            padding={2}
            radius={2}
            border
            pressed={isSelected}
            tone={isSelected ? "primary" : "default"}
            aria-pressed={isSelected}
            // Clicking the selected swatch clears the field: the annotation stays, uncoloured.
            onClick={() => onChange(PatchEvent.from(isSelected ? unset() : set(color.name)))}
            style={{ cursor: "pointer", textAlign: "left" }}
          >
            <Flex align="center" gap={3}>
              {/* Bordered: white and off-white would otherwise vanish into the card behind them. */}
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  flexShrink: 0,
                  borderRadius: "3px",
                  background: color.swatch,
                  border: "1px solid rgba(128,128,128,0.4)",
                }}
              />
              <Stack gap={2}>
                <Text size={1} weight="medium">
                  {color.title}
                </Text>
                <Text size={0} muted>
                  {color.swatch}
                </Text>
              </Stack>
            </Flex>
          </Card>
        );
      })}
    </Grid>
  );
}

export const appColor = defineField({
  name: "appColor",
  title: "Color",
  description: "Pick one of the brand colors. Click the selected one to clear it.",
  type: "string",
  icon: () => <>🎨</>,
  components: {
    input: BrandColorInput,
  },
  validation: (R) =>
    R.custom((value) => {
      if (typeof value !== "string" || findBrandColor(value)) {
        return true;
      }

      return `"${value}" is not a brand color. Pick one of: ${BRAND_COLORS.map(({ name }) => name).join(", ")}.`;
    }),
});
