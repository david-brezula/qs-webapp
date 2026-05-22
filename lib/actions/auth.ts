"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { signIn } from "@/auth";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1)
    .transform((s) => s.toLowerCase()),
  password: z.string().min(1),
});

export type LoginResult =
  | { ok: true; locale?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function loginAction(formData: FormData): Promise<LoginResult> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "validation", fieldErrors };
  }

  try {
    await signIn("credentials", {
      username: parsed.data.username,
      password: parsed.data.password,
      redirect: false,
    });

    // Best-effort: read the user's preferred locale so the client can land them
    // on it. Swallows errors if the `locale` column isn't migrated yet.
    let locale: string | undefined;
    try {
      const u = await prisma.user.findUnique({
        where: { username: parsed.data.username },
        select: { locale: true },
      });
      locale = u?.locale ?? undefined;
    } catch {
      // locale column not migrated — fall back to cookie/default locale.
    }

    return { ok: true, locale };
  } catch {
    return { ok: false, error: "invalid" };
  }
}

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(1),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match",
  });

export type ChangePasswordResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function changePasswordAction(
  formData: FormData,
): Promise<ChangePasswordResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "unauthorized" };

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "validation", fieldErrors };
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return { ok: false, error: "unauthorized" };

  const currentOk = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!currentOk) {
    return {
      ok: false,
      error: "validation",
      fieldErrors: { currentPassword: "Incorrect current password" },
    };
  }

  const newHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash, mustChangePassword: false },
  });

  revalidatePath("/dashboard");
  return { ok: true };
}
