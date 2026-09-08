import { defineQuery } from "groq";
import { Resend } from "resend";
import { RESEND_API_KEY, RESEND_EMAIL_FROM } from "~/lib/env";
import { SANITY_SINGLETON_SITE_SETTINGS_ID } from "~/sanity/constants";
import type { SiteNotificationEmailsQResult } from "~/sanity/types";
import { sanityEditClient } from "../../sanity/lib/client";

// Notification recipients are site-wide configuration, so every form reads the one `siteSettings` document.
const SiteNotificationEmailsQ = defineQuery(`*[_type == "${SANITY_SINGLETON_SITE_SETTINGS_ID}"][0]{
  contactFormNotificationEmails
}`);

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * The submission email every public form sends: the rows it was given, then the message body. Silent
 * when Resend is unconfigured or nobody is listed, so a submission is never lost to a missing recipient.
 */
export async function sendSubmissionNotification({
  subject,
  rows,
  message,
}: {
  subject: string;
  rows: [string, string][];
  message?: string;
}) {
  if (!RESEND_API_KEY || !RESEND_EMAIL_FROM) {
    return;
  }

  const site = await sanityEditClient.fetch<SiteNotificationEmailsQResult>(SiteNotificationEmailsQ);
  const recipients = site?.contactFormNotificationEmails?.filter(Boolean) ?? [];

  if (recipients.length === 0) {
    return;
  }

  const lines = rows
    .filter(([, value]) => value)
    .map(([label, value]) => `<strong>${escapeHtml(label)}</strong>: ${escapeHtml(value)}`)
    .join("<br />\n        ");

  const body = message
    ? `${lines}<br />\n        <strong>Message</strong>:<br />\n        ${escapeHtml(message).replace(/\n/g, "<br />")}`
    : lines;

  const resend = new Resend(RESEND_API_KEY);

  const { error } = await resend.emails.send({
    from: RESEND_EMAIL_FROM,
    to: recipients,
    subject: escapeHtml(subject),
    html: `
      <p>
        ${body}
      </p>
    `,
  });

  if (error) {
    console.error("Resend notification email failed:", error);
  }
}
