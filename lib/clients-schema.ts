import { z } from "zod";

const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,29}$/;

export const createClientSchema = z.object({
  name: z.string().trim().min(1),
  company: z.string().trim().optional().or(z.literal("").transform(() => undefined)),
  email: z.string().trim().toLowerCase().email().optional().or(z.literal("").transform(() => undefined)),
  username: z.string().trim().toLowerCase().regex(USERNAME_RE, "3-30 chars: lowercase letters, digits, dot, underscore, hyphen"),
  password: z.string().min(8),
});

export function parseCreateClient(input: unknown) {
  return createClientSchema.safeParse(input);
}

export const updateClientSchema = z.object({
  clientId: z.string().min(1),
  name: z.string().trim().min(1),
  company: z.string().trim().optional().or(z.literal("").transform(() => undefined)),
  email: z.string().trim().toLowerCase().email().optional().or(z.literal("").transform(() => undefined)),
  active: z.coerce.boolean(),
});
