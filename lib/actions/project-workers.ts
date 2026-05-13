"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/portal/session";

const assignSchema = z.object({
  projectId: z.string().min(1),
  userId: z.string().min(1),
  priceTie: z.coerce.number().nonnegative(),
  priceConnect: z.coerce.number().nonnegative(),
});

export async function assignWorkerAction(fd: FormData) {
  await requireAdmin();
  const parsed = assignSchema.safeParse({
    projectId: fd.get("projectId"),
    userId: fd.get("userId"),
    priceTie: fd.get("priceTie"),
    priceConnect: fd.get("priceConnect"),
  });
  if (!parsed.success) return { ok: false as const, error: "validation" };
  await prisma.projectWorker.upsert({
    where: { projectId_userId: { projectId: parsed.data.projectId, userId: parsed.data.userId } },
    update: { priceTie: parsed.data.priceTie, priceConnect: parsed.data.priceConnect },
    create: parsed.data,
  });
  revalidatePath(`/projects/${parsed.data.projectId}/edit`);
  return { ok: true as const };
}

export async function removeAssignmentAction(fd: FormData) {
  await requireAdmin();
  const projectId = String(fd.get("projectId") ?? "");
  const userId = String(fd.get("userId") ?? "");
  if (!projectId || !userId) return { ok: false as const, error: "validation" };
  await prisma.projectWorker.delete({
    where: { projectId_userId: { projectId, userId } },
  });
  revalidatePath(`/projects/${projectId}/edit`);
  return { ok: true as const };
}
