import { Box, Button, Card, Flex, Switch, Text } from "@sanity/ui";
import * as React from "react";
import { type ObjectItemProps, set } from "sanity";

type GridImageValue = { width?: string; showInCard?: boolean };

/** Both per-frame settings sit on the row itself, so setting a dropped batch never opens a dialog. */
function ImageGridItemInput(props: ObjectItemProps) {
  // An array item exposes its object's callbacks through `inputProps`, not on the item props itself.
  const { onChange } = props.inputProps;
  const { readOnly } = props;
  const value = props.value as GridImageValue | undefined;

  const isHalf = value?.width === "half";
  const showInCard = value?.showInCard === true;

  const setWidth = React.useCallback((next: "full" | "half") => onChange(set(next, ["width"])), [onChange]);
  const toggleCard = React.useCallback(() => onChange(set(!showInCard, ["showInCard"])), [onChange, showInCard]);

  return (
    <Flex direction="column" gap={1}>
      {props.renderDefault(props)}
      <Card padding={2} radius={2} tone="transparent">
        <Flex align="center" gap={2}>
          <Button
            text="Full row"
            fontSize={1}
            padding={2}
            mode={isHalf ? "bleed" : "default"}
            tone={isHalf ? "default" : "primary"}
            disabled={readOnly}
            onClick={() => setWidth("full")}
          />
          <Button
            text="Half row"
            fontSize={1}
            padding={2}
            mode={isHalf ? "default" : "bleed"}
            tone={isHalf ? "primary" : "default"}
            disabled={readOnly}
            onClick={() => setWidth("half")}
          />
          <Box flex={1} />
          <Text size={1} muted>
            On card
          </Text>
          <Switch checked={showInCard} disabled={readOnly} onChange={toggleCard} />
        </Flex>
      </Card>
    </Flex>
  );
}

export { ImageGridItemInput };
