import { z } from "zod";
import { CONTACT_SCOPE_OPTIONS, EU_COUNTRIES } from "./content";

export const PROJECT_TYPES = [
  "Rooftop",
  "Ground-mount",
  "Carport / canopy",
  "Repower / service",
  "Other",
] as const;

export const contactSchema = z.object({
  company: z.string().trim().min(1, "Company is required"),
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Enter a valid email"),
  projectType: z.enum(PROJECT_TYPES, {
    message: "Choose a project type",
  }),
  sizeMW: z.coerce
    .number({ message: "Enter a number" })
    .positive("Size must be greater than 0"),
  country: z.enum(EU_COUNTRIES, { message: "Choose a country" }),
  startDate: z
    .string()
    .min(1, "Target start date is required")
    .refine((s) => !Number.isNaN(Date.parse(s)), "Enter a valid date"),
  scope: z
    .array(z.enum(CONTACT_SCOPE_OPTIONS))
    .min(1, "Pick at least one scope item"),
  notes: z.string().max(2000).optional(),
});

export type ContactPayload = z.infer<typeof contactSchema>;
