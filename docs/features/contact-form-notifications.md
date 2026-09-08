# Form Notifications

The site can send notification emails for form submissions using Resend.

## Behavior

- A form POSTs `FormData` to its own endpoint — `/api/contact-form` or `/api/lead-form` — and both share the validation plumbing, see [Forms](./forms.md).
- Submissions are persisted to Sanity first (`contactFormSubmission`, `leadFormSubmission`).
- Email notifications are best-effort and non-blocking.
- If email sending fails, the submission still succeeds and the error is logged server-side.

## Configuration

Set these environment variables in your deployment:

```env
RESEND_API_KEY=your-resend-api-key
RESEND_EMAIL_FROM=notifications@your-domain.com
```

Both are optional at runtime. If either is missing, no notification email is sent.

## Recipients in Sanity

Recipients are managed in the Settings singleton (**Settings → Email Notifications**), site-wide for every form:

- `siteSettings.contactFormNotificationEmails`

`sendSubmissionNotification` (`src/features/forms/notification.ts`) reads them after the submission is stored, and stays silent when Resend is unconfigured or nobody is listed.

## Implementation Notes

- Endpoints: `src/pages/api/contact-form.ts` and `src/pages/api/lead-form.ts` (field + spam validation, Sanity create with `SANITY_API_EDIT_TOKEN`, then `sendSubmissionNotification`)
- Field rules: `src/features/page-builder/sections/ContactFormSection/validate-contact-form.ts`, imported by both the custom element and the endpoint. The form is `novalidate` and the element reports these rules inline, so an empty or malformed field never reaches the endpoint; the endpoint re-runs them because a client can be bypassed.
- Form UI: `src/features/page-builder/sections/ContactFormSection/ContactFormSection.astro` + the `ContactFormElement` custom element colocated beside it (`ContactFormElement.ts`), which submits via fetch and adds the spam-prevention timing metadata; without JS the form still POSTs natively
- Uses a typed query + generated type from `sanity/types.ts`
