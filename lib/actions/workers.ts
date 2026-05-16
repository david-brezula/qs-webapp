"use server";

import { randomBytes } from "crypto";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/portal/session";
import { Role, Locale } from "@prisma/client";

const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,29}$/;

const createSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(USERNAME_RE, "3-30 chars: lowercase letters, digits, dot, underscore, hyphen"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  name: z.string().trim().min(1),
  role: z.enum(["ADMIN", "WORKER"]),
  language: z.enum(["EN", "SK"]),
  password: z.string().min(8),
});

export type ActionError = { ok: false; error: string; fieldErrors?: Record<string, string> };
export type ActionOk<T = unknown> = { ok: true; data?: T };
export type ActionResult<T = unknown> = ActionOk<T> | ActionError;

function zErrors(issues: z.ZodIssue[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const k = String(i.path[0] ?? "");
    if (!out[k]) out[k] = i.message;
  }
  return out;
}

export async function createWorkerAction(fd: FormData): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  const parsed = createSchema.safeParse({
    username: fd.get("username"),
    email: fd.get("email"),
    name: fd.get("name"),
    role: fd.get("role"),
    language: fd.get("language"),
    password: fd.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: "validation", fieldErrors: zErrors(parsed.error.issues) };
  }
  const existing = await prisma.user.findUnique({ where: { username: parsed.data.username } });
  if (existing) {
    return { ok: false, error: "validation", fieldErrors: { username: "Username already in use" } };
  }
  if (parsed.data.email) {
    const existingEmail = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (existingEmail) {
      return { ok: false, error: "validation", fieldErrors: { email: "Email already in use" } };
    }
  }
  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = await prisma.user.create({
    data: {
      username: parsed.data.username,
      email: parsed.data.email ?? null,
      name: parsed.data.name,
      role: parsed.data.role as Role,
      language: parsed.data.language as Locale,
      passwordHash,
      mustChangePassword: true,
    },
  });
  revalidatePath("/workers");
  return { ok: true, data: { id: user.id } };
}

const updateSchema = z.object({
  userId: z.string().min(1),
  name: z.string().trim().min(1),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  role: z.enum(["ADMIN", "WORKER"]),
  language: z.enum(["EN", "SK"]),
  active: z.coerce.boolean(),
});

export async function updateWorkerAction(fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = updateSchema.safeParse({
    userId: fd.get("userId"),
    name: fd.get("name"),
    email: fd.get("email"),
    role: fd.get("role"),
    language: fd.get("language"),
    active: fd.get("active") === "on" || fd.get("active") === "true",
  });
  if (!parsed.success) {
    return { ok: false, error: "validation", fieldErrors: zErrors(parsed.error.issues) };
  }
  await prisma.user.update({
    where: { id: parsed.data.userId },
    data: {
      name: parsed.data.name,
      email: parsed.data.email ?? null,
      role: parsed.data.role as Role,
      language: parsed.data.language as Locale,
      active: parsed.data.active,
    },
  });
  revalidatePath("/workers");
  revalidatePath(`/workers/${parsed.data.userId}`);
  return { ok: true };
}

export async function resetPasswordAction(fd: FormData): Promise<ActionResult<{ tempPassword: string }>> {
  await requireAdmin();
  const userId = String(fd.get("userId") ?? "");
  if (!userId) return { ok: false, error: "validation" };
  const tempPassword = `qs-${randomBytes(8).toString("hex")}`;
  const passwordHash = await bcrypt.hash(tempPassword, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, mustChangePassword: true },
  });
  revalidatePath(`/workers/${userId}`);
  return { ok: true, data: { tempPassword } };
}
