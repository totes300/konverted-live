import { z } from "zod";
import { defineForm, optionValues } from "~/features/forms/validate";

const MAX_NAME_LENGTH = 100;
const MAX_COMPANY_URL_LENGTH = 200;
const MAX_MESSAGE_LENGTH = 1000;

export const LEAD_NEEDS = [
  { value: "website", label: "A new website" },
  { value: "brand", label: "A brand and messaging system" },
  { value: "webos", label: "WebOS for our team" },
  { value: "unsure", label: "Not sure yet, let's talk" },
] as const;

/**
 * The homepage form, kept to what a first reply actually needs: three answers and consent. Everything
 * else is optional on purpose: each extra required field is a share of the submissions that never
 * arrive, and anything missing is one question on the call.
 */
const LeadFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Your name is required")
    .max(MAX_NAME_LENGTH, `Name must be ${MAX_NAME_LENGTH} characters or fewer`),
  email: z.string().trim().min(1, "An email address is required").pipe(z.email("Invalid email address")),
  // Not `website`: that name is the honeypot every form on the site carries (spam-prevention constants).
  companyUrl: z.string().trim().max(MAX_COMPANY_URL_LENGTH, `Website must be ${MAX_COMPANY_URL_LENGTH} characters or fewer`),
  need: z.enum(optionValues(LEAD_NEEDS), "Tell us what you need"),
  message: z.string().trim().max(MAX_MESSAGE_LENGTH, `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer`),
  consent: z.literal("on", "Tick the box so we are allowed to reply"),
});

export type LeadFormValues = z.output<typeof LeadFormSchema>;

export const leadForm = defineForm(LeadFormSchema);
