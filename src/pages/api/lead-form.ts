import type { APIRoute } from "astro";
import { sendSubmissionNotification } from "~/features/forms/notification";
import { formFailed, formOk } from "~/features/forms/response";
import { LEAD_NEEDS, type LeadFormValues, leadForm } from "~/features/page-builder/sections/LeadFormSection/validate-lead-form";
import { HONEYPOT_FIELD_NAME, SUBMISSION_TIME_FIELD_NAME } from "~/features/spam-prevention/constants";
import { detectSpam } from "~/features/spam-prevention/utils";
import { API_ONLY_DOCUMENTS } from "~/sanity/constants";
import { sanityEditClient } from "../../sanity/lib/client";

// Public lead form submissions (page-builder lead form section); the form posts same-origin.
export const prerender = false;

/** What the endpoint stores and mails. The need is kept as its label, so a rename never rewrites history. */
function toSubmission({ consent, need, ...values }: LeadFormValues) {
  return {
    ...values,
    need: LEAD_NEEDS.find((option) => option.value === need)?.label ?? need,
    // The value is the checkbox's fixed "on"; what matters for the record is that it was given.
    consent: consent === "on",
  };
}

export const POST: APIRoute = async ({ request }) => {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return formFailed(400, { error: "Invalid form submission." });
  }

  const spamError = detectSpam({
    honeypotValue: formData.get(HONEYPOT_FIELD_NAME),
    submissionTime: formData.get(SUBMISSION_TIME_FIELD_NAME),
  });

  if (spamError) {
    return formFailed(400, { error: spamError });
  }

  // Same rules the form already ran; a bypassed client lands here instead of in the CMS.
  const validation = leadForm.check(formData);

  if (!validation.ok) {
    return formFailed(400, { fieldErrors: validation.fieldErrors, error: validation.formError });
  }

  try {
    const submission = toSubmission(validation.data);

    await sanityEditClient.create({ _type: API_ONLY_DOCUMENTS.leadFormSubmission, ...submission });

    try {
      await sendSubmissionNotification({
        subject: `New call request from ${submission.name}`,
        rows: [
          ["Name", submission.name],
          ["Email", submission.email],
          ["Company website", submission.companyUrl],
          ["Needs", submission.need],
        ],
        message: submission.message,
      });
    } catch (error) {
      console.error("Resend notification failed:", error);
    }

    return formOk();
  } catch (error) {
    console.error("Failed to submit lead form:", error);

    return formFailed(500, { error: "Failed to submit form. Please try again later." });
  }
};
