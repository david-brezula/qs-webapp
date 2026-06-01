"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

const schema = z.object({ sectionId: z.string().min(1) });

export type ToggleInvoiceResult =
  | { ok: true; invoiced: boolean; invoicedAt: string | null }
  | { ok: false; error: "validation" | "not-assigned" };

/**
 * Worker self-service: toggles whether the current worker has invoiced their
 * own earnings for one section. Creates the SectionInvoice row if missing,
 * deletes it if present. Scoped to the worker's own ProjectWorker.
 */
export async function toggleSectionInvoiceAction(fd: FormData): Promise<ToggleInvoiceResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "validation" };

  const parsed = schema.safeParse({ sectionId: fd.get("sectionId") });
  if (!parsed.success) return { ok: false, error: "validation" };

  const section = await prisma.section.findUnique({
    where: { id: parsed.data.sectionId },
    select: { id: true, projectId: true },
  });
  if (!section) return { ok: false, error: "validation" };

  const pw = await prisma.projectWorker.findUnique({
    where: { projectId_userId: { projectId: section.projectId, userId: session.user.id } },
    select: { id: true },
  });
  if (!pw) return { ok: false, error: "not-assigned" };

  const existing = await prisma.sectionInvoice.findUnique({
    where: { sectionId_projectWorkerId: { sectionId: section.id, projectWorkerId: pw.id } },
  });

  if (existing) {
    await prisma.sectionInvoice.delete({ where: { id: existing.id } });
    return { ok: true, invoiced: false, invoicedAt: null };
  }

  const created = await prisma.sectionInvoice.create({
    data: { sectionId: section.id, projectWorkerId: pw.id },
  });
  return { ok: true, invoiced: true, invoicedAt: created.invoicedAt.toISOString() };
}
