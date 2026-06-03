"use server";

import { randomBytes } from "crypto";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/portal/session";
import { createClientSchema, updateClientSchema } from "@/lib/clients-schema";

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

export async function createClientAction(fd: FormData): Promise<ActionResult<{ clientId: string }>> {
  await requireAdmin();
  const parsed = createClientSchema.safeParse({
    name: fd.get("name"),
    company: fd.get("company"),
    email: fd.get("email"),
    username: fd.get("username"),
    password: fd.get("password"),
  });
  if (!parsed.success) return { ok: false, error: "validation", fieldErrors: zErrors(parsed.error.issues) };

  const existing = await prisma.user.findUnique({ where: { username: parsed.data.username } });
  if (existing) return { ok: false, error: "validation", fieldErrors: { username: "Username already in use" } };
  if (parsed.data.email) {
    const e = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (e) return { ok: false, error: "validation", fieldErrors: { email: "Email already in use" } };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const client = await prisma.client.create({
    data: {
      name: parsed.data.name,
      company: parsed.data.company ?? null,
      email: parsed.data.email ?? null,
      users: {
        create: {
          username: parsed.data.username,
          email: parsed.data.email ?? null,
          name: parsed.data.name,
          role: "CLIENT",
          language: "SK",
          passwordHash,
          mustChangePassword: true,
        },
      },
    },
  });
  revalidatePath("/clients");
  return { ok: true, data: { clientId: client.id } };
}

export async function updateClientAction(fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = updateClientSchema.safeParse({
    clientId: fd.get("clientId"),
    name: fd.get("name"),
    company: fd.get("company"),
    email: fd.get("email"),
    active: fd.get("active") === "on" || fd.get("active") === "true",
  });
  if (!parsed.success) return { ok: false, error: "validation", fieldErrors: zErrors(parsed.error.issues) };
  await prisma.client.update({
    where: { id: parsed.data.clientId },
    data: {
      name: parsed.data.name,
      company: parsed.data.company ?? null,
      email: parsed.data.email ?? null,
      active: parsed.data.active,
    },
  });
  await prisma.user.updateMany({ where: { clientId: parsed.data.clientId }, data: { active: parsed.data.active } });
  revalidatePath("/clients");
  revalidatePath(`/clients/${parsed.data.clientId}`);
  return { ok: true };
}

export async function assignProjectToClientAction(fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  const clientId = String(fd.get("clientId") ?? "");
  const projectId = String(fd.get("projectId") ?? "");
  if (!clientId || !projectId) return { ok: false, error: "validation" };
  await prisma.project.update({ where: { id: projectId }, data: { clientId } });
  revalidatePath(`/clients/${clientId}`);
  revalidatePath(`/projects/${projectId}/edit`);
  return { ok: true };
}

export async function unassignProjectAction(fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  const projectId = String(fd.get("projectId") ?? "");
  if (!projectId) return { ok: false, error: "validation" };
  await prisma.project.update({ where: { id: projectId }, data: { clientId: null } });
  revalidatePath(`/projects/${projectId}/edit`);
  revalidatePath(`/clients`);
  return { ok: true };
}

export async function resetClientPasswordAction(fd: FormData): Promise<ActionResult<{ tempPassword: string }>> {
  await requireAdmin();
  const clientId = String(fd.get("clientId") ?? "");
  if (!clientId) return { ok: false, error: "validation" };
  const login = await prisma.user.findFirst({ where: { clientId }, orderBy: { createdAt: "asc" } });
  if (!login) return { ok: false, error: "no-login" };
  const tempPassword = `qs-${randomBytes(8).toString("hex")}`;
  await prisma.user.update({
    where: { id: login.id },
    data: { passwordHash: await bcrypt.hash(tempPassword, 10), mustChangePassword: true },
  });
  revalidatePath(`/clients/${clientId}`);
  return { ok: true, data: { tempPassword } };
}
