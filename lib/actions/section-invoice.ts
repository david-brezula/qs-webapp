"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/portal/session";

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

  // Invoiced = invoicedAt set → toggle it off. Keep the row if a paid state
  // lives on it, otherwise delete it.
  if (existing?.invoicedAt) {
    if (existing.paidAt) {
      await prisma.sectionInvoice.update({ where: { id: existing.id }, data: { invoicedAt: null } });
    } else {
      await prisma.sectionInvoice.delete({ where: { id: existing.id } });
    }
    return { ok: true, invoiced: false, invoicedAt: null };
  }

  const now = new Date();
  const row = await prisma.sectionInvoice.upsert({
    where: { sectionId_projectWorkerId: { sectionId: section.id, projectWorkerId: pw.id } },
    update: { invoicedAt: now },
    create: { sectionId: section.id, projectWorkerId: pw.id, invoicedAt: now },
  });
  return { ok: true, invoiced: true, invoicedAt: row.invoicedAt ? row.invoicedAt.toISOString() : null };
}

const paidSchema = z.object({ sectionId: z.string().min(1), userId: z.string().min(1) });

export type TogglePaidResult =
  | { ok: true; paid: boolean; paidAt: string | null }
  | { ok: false; error: "validation" | "not-assigned" };

/**
 * Admin-only: toggles whether a worker has been PAID for one section. Stored as
 * `paidAt` on the (section, worker) SectionInvoice row, independent of the
 * worker-set `invoicedAt`. A payment can be recorded before the worker invoices
 * (the row is created with invoicedAt null). Never exposed to the worker portal.
 */
export async function toggleSectionPaidAction(fd: FormData): Promise<TogglePaidResult> {
  await requireAdmin();
  const parsed = paidSchema.safeParse({ sectionId: fd.get("sectionId"), userId: fd.get("userId") });
  if (!parsed.success) return { ok: false, error: "validation" };

  const section = await prisma.section.findUnique({
    where: { id: parsed.data.sectionId },
    select: { id: true, projectId: true },
  });
  if (!section) return { ok: false, error: "validation" };

  const pw = await prisma.projectWorker.findUnique({
    where: { projectId_userId: { projectId: section.projectId, userId: parsed.data.userId } },
    select: { id: true },
  });
  if (!pw) return { ok: false, error: "not-assigned" };

  const existing = await prisma.sectionInvoice.findUnique({
    where: { sectionId_projectWorkerId: { sectionId: section.id, projectWorkerId: pw.id } },
  });

  if (existing?.paidAt) {
    if (existing.invoicedAt) {
      await prisma.sectionInvoice.update({ where: { id: existing.id }, data: { paidAt: null } });
    } else {
      await prisma.sectionInvoice.delete({ where: { id: existing.id } });
    }
    return { ok: true, paid: false, paidAt: null };
  }

  const now = new Date();
  const row = await prisma.sectionInvoice.upsert({
    where: { sectionId_projectWorkerId: { sectionId: section.id, projectWorkerId: pw.id } },
    update: { paidAt: now },
    // Payment recorded before the worker invoices → keep invoicedAt null.
    create: { sectionId: section.id, projectWorkerId: pw.id, paidAt: now, invoicedAt: null },
  });
  return { ok: true, paid: true, paidAt: row.paidAt ? row.paidAt.toISOString() : null };
}
