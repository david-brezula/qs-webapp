import { z } from "zod";

// The five trades plus a general option. Values match the service slugs so the
// form can render localized labels from the `services.<slug>.name` namespace.
export const SERVICE_TYPES = [
  "solar",
  "electrical",
  "drywall",
  "masonry",
  "roofing",
  "other",
] as const;

export type ServiceType = (typeof SERVICE_TYPES)[number];

export const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().max(40).optional(),
  company: z.string().trim().max(200).optional(),
  serviceType: z.enum(SERVICE_TYPES, { message: "Choose a service" }),
  message: z.string().trim().min(1, "Message is required").max(4000),
});

export type ContactPayload = z.infer<typeof contactSchema>;
