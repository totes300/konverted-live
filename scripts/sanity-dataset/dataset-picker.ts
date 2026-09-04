/**
 * The dataset prompt shared by export, import and migrate, so "which dataset?" looks the same
 * everywhere: a spinner while the project's datasets load, a list to pick from, and a typed name
 * as the fallback (or the only option when the list cannot be read, for example when the Sanity
 * CLI is not logged in).
 */

import ora from "ora";
import { askSelect, askText } from "../lib/cli";
import { buildDatasetChoices, buildListArgs, captureSanityCommand, parseDatasetList, TYPE_DATASET_NAME } from "./lib";

/** Reads the project's datasets, returning an empty list when the CLI call fails or prints nothing usable. */
export function loadDatasets(): string[] {
  const spinner = ora("Loading datasets…").start();
  const result = captureSanityCommand(buildListArgs());

  if (!result.ok) {
    spinner.warn("Could not list datasets (is the Sanity CLI logged in?). Type the name instead.");
    return [];
  }

  const datasets = parseDatasetList(result.stdout);

  if (datasets.length === 0) {
    spinner.warn("No datasets returned. Type the name instead.");
    return datasets;
  }

  spinner.succeed(`Found ${datasets.length} dataset${datasets.length === 1 ? "" : "s"}`);

  return datasets;
}

/**
 * Asks for a dataset. `current` is highlighted as the `.env` default and listed first, and the
 * caller passes `datasets` so one lookup can serve several prompts in the same run.
 */
export async function askDataset(
  message: string,
  options: { datasets: string[]; current?: string; typeNameLabel?: string; typeNameMessage?: string }
): Promise<string> {
  const { datasets, current, typeNameLabel, typeNameMessage = "Dataset name" } = options;

  if (datasets.length === 0) {
    return askText(message, { initial: current, required: true });
  }

  const picked = await askSelect(message, buildDatasetChoices(datasets, { current, typeNameLabel }));

  if (picked === TYPE_DATASET_NAME) {
    return askText(typeNameMessage, { initial: current, required: true });
  }

  return picked;
}
