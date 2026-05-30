import { z } from "zod";
import { SERVICE_TYPES } from "@/lib/contact-schema";

// Reuses the trade slugs from the contact schema (solar/electrical/drywall/
// masonry/roofing/other) so the form renders localized labels from
// `services.<slug>.name`.
export const careersSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().max(40).optional(),
  trades: z
    .array(z.enum(SERVICE_TYPES))
    .min(1, "Select at least one trade")
    .max(SERVICE_TYPES.length),
  experienceYears: z.coerce.number().int().min(0).max(70).optional(),
  location: z.string().trim().max(200).optional(),
  willingToTravel: z.boolean().optional().default(false),
  availableFrom: z.string().trim().max(100).optional(),
  languages: z.string().trim().max(200).optional(),
  drivingLicence: z.boolean().optional().default(false),
  cvUrl: z.union([z.string().trim().url("Enter a valid URL"), z.literal("")]).optional(),
  message: z.string().trim().max(4000).optional(),
  gdprConsent: z.literal(true, { message: "Consent required" }),
  // Honeypot — humans never see/fill it; must be empty or absent.
  _hp: z.string().max(0).optional(),
});

export type CareersPayload = z.infer<typeof careersSchema>;
