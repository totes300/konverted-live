import type { APIRoute } from "astro";
import { sendSubmissionNotification } from "~/features/forms/notification";
import { formFailed, formOk } from "~/features/forms/response";
import { type ContactFormValues, contactForm } from "~/features/page-builder/sections/ContactFormSection/validate-contact-form";
import { HONEYPOT_FIELD_NAME, SUBMISSION_TIME_FIELD_NAME } from "~/features/spam-prevention/constants";
import { detectSpam } from "~/features/spam-prevention/utils";
import { API_ONLY_DOCUMENTS } from "~/sanity/constants";
import { sanityEditClient } from "../../sanity/lib/client";

// Public contact form submissions (page-builder contact form section); the form posts same-origin.
export const prerender = false;

/** What the endpoint stores and mails: the parsed values, with the two phone fields joined back up. */
function toSubmission({ phoneDialCode, phone, consent, ...values }: ContactFormValues) {
  return {
    ...values,
    phone: phone ? `${phoneDialCode} ${phone}` : "",
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
  const validation = contactForm.check(formData);

  if (!validation.ok) {
    return formFailed(400, { fieldErrors: validation.fieldErrors, error: validation.formError });
  }

  try {
    const submission = toSubmission(validation.data);

    await sanityEditClient.create(
      { _type: API_ONLY_DOCUMENTS.contactFormSubmission, ...submission },
      { autoGenerateArrayKeys: true }
    );

    try {
      await sendSubmissionNotification({
        subject: `New contact form submission from ${submission.firstName} ${submission.lastName}`,
        rows: [
          ["Name", `${submission.firstName} ${submission.lastName}`],
          ["Email", submission.email],
          ["Phone", submission.phone],
          ["Topic", submission.topic],
          ["Preferred start date", submission.startDate],
          ["Budget", submission.budget],
          ["Services", submission.services.join(", ")],
        ],
        message: submission.message,
      });
    } catch (error) {
      console.error("Resend notification failed:", error);
    }

    return formOk();
  } catch (error) {
    console.error("Failed to submit contact form:", error);

    return formFailed(500, { error: "Failed to submit form. Please try again later." });
  }
};
