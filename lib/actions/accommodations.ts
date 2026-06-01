"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/portal/session";
import { Currency } from "@prisma/client";

const schema = z.object({
  id: z.string().optional(),
  projectId: z.string().optional().nullable(),
  name: z.string().trim().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  totalCost: z.coerce.number().nonnegative(),
  currency: z.enum(["USD", "EUR"]),
  notes: z.string().optional(),
  sectionId: z.string().optional().nullable(),
  workerIds: z.array(z.string()).default([]),
});

export async function saveAccommodationAction(fd: FormData) {
  await requireAdmin();
  const parsed = schema.safeParse({
    id: fd.get("id") || undefined,
    projectId: fd.get("projectId") || null,
    name: fd.get("name"),
    startDate: fd.get("startDate"),
    endDate: fd.get("endDate"),
    totalCost: fd.get("totalCost"),
    currency: fd.get("currency") || "USD",
    notes: fd.get("notes") || undefined,
    sectionId: fd.get("sectionId") || null,
    workerIds: fd.getAll("workerIds").map(String),
  });
  if (!parsed.success) return { ok: false as const, error: "validation" };

  const sectionId = parsed.data.sectionId || null;
  if (sectionId) {
    const section = await prisma.section.findUnique({ where: { id: sectionId }, select: { projectId: true } });
    if (!section || section.projectId !== (parsed.data.projectId || null)) {
      return { ok: false as const, error: "validation" };
    }
  }

  const data = {
    projectId: parsed.data.projectId || null,
    name: parsed.data.name,
    startDate: new Date(parsed.data.startDate),
    endDate: new Date(parsed.data.endDate),
    totalCost: parsed.data.totalCost,
    currency: parsed.data.currency as Currency,
    notes: parsed.data.notes ?? null,
    sectionId,
  };

  let id = parsed.data.id;
  if (id) {
    await prisma.accommodation.update({ where: { id }, data });
    await prisma.accommodationWorker.deleteMany({ where: { accommodationId: id } });
  } else {
    const created = await prisma.accommodation.create({ data });
    id = created.id;
  }

  if (parsed.data.workerIds.length) {
    await prisma.accommodationWorker.createMany({
      data: parsed.data.workerIds.map((userId) => ({ accommodationId: id!, userId })),
      skipDuplicates: true,
    });
  }

  revalidatePath("/accommodations");
  revalidatePath(`/accommodations/${id}`);
  return { ok: true as const, data: { id } };
}

export async function deleteAccommodationAction(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get("id") ?? "");
  if (!id) return { ok: false as const, error: "validation" };
  await prisma.accommodation.delete({ where: { id } });
  revalidatePath("/accommodations");
  return { ok: true as const };
}
