import { MAX_SUBMISSION_TIME, MIN_SUBMISSION_TIME } from "~/features/spam-prevention/constants";

export type SpamPayload = {
  honeypotValue?: unknown;
  submissionTime?: unknown;
};

export type DetectSpamOptions = {
  /**
   * Minimum time (in milliseconds) before a form submission is considered legitimate.
   * @default MIN_SUBMISSION_TIME
   */
  minSubmissionTime?: number;

  /**
   * Maximum time (in milliseconds) for a form submission to be considered valid.
   * @default MAX_SUBMISSION_TIME
   */
  maxSubmissionTime?: number;
};

/**
 * Server-side spam detection via honeypot value and submission timing.
 *
 * Both payload fields are optional; missing values are treated as "no signal" rather than
 * spam, so callers can run the check even when client metadata could not be collected.
 *
 * @returns Error message if spam is detected, null otherwise
 *
 * @example
 * ```ts
 * const spamError = detectSpam({
 *   honeypotValue: formData.get(HONEYPOT_FIELD_NAME),
 *   submissionTime: formData.get(SUBMISSION_TIME_FIELD_NAME),
 * });
 * ```
 */
export function detectSpam(payload: SpamPayload, options: DetectSpamOptions = {}): string | null {
  const { minSubmissionTime = MIN_SUBMISSION_TIME, maxSubmissionTime = MAX_SUBMISSION_TIME } = options;

  const { honeypotValue, submissionTime } = payload;

  if (typeof honeypotValue === "string" && honeypotValue.trim() !== "") {
    console.warn("Spam detected: Honeypot field filled", { honeypotValue });
    return "Invalid submission";
  }

  if (submissionTime !== undefined && submissionTime !== null && submissionTime !== "") {
    const timeTaken = Number(submissionTime);

    if (!Number.isNaN(timeTaken)) {
      if (timeTaken < minSubmissionTime) {
        console.warn("Spam detected: Form submitted too quickly", { timeTaken });
        return "Please take your time filling out the form";
      }

      if (timeTaken > maxSubmissionTime) {
        console.warn("Spam detected: Form submission expired", { timeTaken });
        return "Form session expired. Please refresh and try again";
      }
    }
  }

  return null;
}
