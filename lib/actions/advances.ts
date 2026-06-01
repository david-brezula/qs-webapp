"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/portal/session";
import { Currency } from "@prisma/client";

export type AdvanceResult = { ok: true } | { ok: false; error: "validation" | "forbidden" | "bad-state" };

const requestSchema = z.object({
  amount: z.coerce.number().positive(),
  currency: z.enum(["USD", "EUR"]),
  note: z.string().trim().max(500).optional(),
});

/** Worker creates an advance request in REQUESTED state. */
export async function requestAdvanceAction(fd: FormData): Promise<AdvanceResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "forbidden" };
  if (session.user.role !== "WORKER") return { ok: false, error: "forbidden" };

  const parsed = requestSchema.safeParse({
    amount: fd.get("amount"),
    currency: fd.get("currency") || "EUR",
    note: fd.get("note") || undefined,
  });
  if (!parsed.success) return { ok: false, error: "validation" };

  await prisma.advanceRequest.create({
    data: {
      userId: session.user.id,
      amount: parsed.data.amount,
      currency: parsed.data.currency as Currency,
      note: parsed.data.note ?? null,
    },
  });
  return { ok: true };
}

/** Worker cancels their own request, only while still REQUESTED. */
export async function cancelAdvanceAction(fd: FormData): Promise<AdvanceResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "forbidden" };
  const id = String(fd.get("id") ?? "");
  if (!id) return { ok: false, error: "validation" };

  const adv = await prisma.advanceRequest.findUnique({ where: { id } });
  if (!adv || adv.userId !== session.user.id) return { ok: false, error: "forbidden" };
  if (adv.status !== "REQUESTED") return { ok: false, error: "bad-state" };

  await prisma.advanceRequest.delete({ where: { id } });
  return { ok: true };
}

const decideSchema = z.object({
  id: z.string().min(1),
  decision: z.enum(["approve", "reject"]),
});

/** Admin approves or rejects a REQUESTED advance. */
export async function decideAdvanceAction(fd: FormData): Promise<AdvanceResult> {
  await requireAdmin();
  const parsed = decideSchema.safeParse({ id: fd.get("id"), decision: fd.get("decision") });
  if (!parsed.success) return { ok: false, error: "validation" };

  const adv = await prisma.advanceRequest.findUnique({ where: { id: parsed.data.id } });
  if (!adv) return { ok: false, error: "validation" };
  if (adv.status !== "REQUESTED") return { ok: false, error: "bad-state" };

  await prisma.advanceRequest.update({
    where: { id: parsed.data.id },
    data: {
      status: parsed.data.decision === "approve" ? "APPROVED" : "REJECTED",
      decidedAt: new Date(),
    },
  });
  return { ok: true };
}

/** Admin marks an APPROVED advance as PAID. */
export async function markAdvancePaidAction(fd: FormData): Promise<AdvanceResult> {
  await requireAdmin();
  const id = String(fd.get("id") ?? "");
  if (!id) return { ok: false, error: "validation" };

  const adv = await prisma.advanceRequest.findUnique({ where: { id } });
  if (!adv) return { ok: false, error: "validation" };
  if (adv.status !== "APPROVED") return { ok: false, error: "bad-state" };

  await prisma.advanceRequest.update({
    where: { id },
    data: { status: "PAID", paidAt: new Date() },
  });
  return { ok: true };
}

const settleSchema = z.object({
  id: z.string().min(1),
  sectionId: z.string().min(1),
});

/** Admin settles an open (PAID) advance against a section the worker is assigned to. */
export async function settleAdvanceAction(fd: FormData): Promise<AdvanceResult> {
  await requireAdmin();
  const parsed = settleSchema.safeParse({ id: fd.get("id"), sectionId: fd.get("sectionId") });
  if (!parsed.success) return { ok: false, error: "validation" };

  const adv = await prisma.advanceRequest.findUnique({ where: { id: parsed.data.id } });
  if (!adv) return { ok: false, error: "validation" };
  if (adv.status !== "PAID") return { ok: false, error: "bad-state" };

  const section = await prisma.section.findUnique({
    where: { id: parsed.data.sectionId },
    select: { projectId: true },
  });
  if (!section) return { ok: false, error: "validation" };

  const pw = await prisma.projectWorker.findUnique({
    where: { projectId_userId: { projectId: section.projectId, userId: adv.userId } },
    select: { id: true },
  });
  if (!pw) return { ok: false, error: "validation" };

  await prisma.advanceRequest.update({
    where: { id: parsed.data.id },
    data: { status: "SETTLED", sectionId: parsed.data.sectionId, settledAt: new Date() },
  });
  return { ok: true };
}

/** Admin reopens a SETTLED advance back to open (postpone / move to another section). */
export async function reopenAdvanceAction(fd: FormData): Promise<AdvanceResult> {
  await requireAdmin();
  const id = String(fd.get("id") ?? "");
  if (!id) return { ok: false, error: "validation" };

  const adv = await prisma.advanceRequest.findUnique({ where: { id } });
  if (!adv) return { ok: false, error: "validation" };
  if (adv.status !== "SETTLED") return { ok: false, error: "bad-state" };

  await prisma.advanceRequest.update({
    where: { id },
    data: { status: "PAID", sectionId: null, settledAt: null },
  });
  return { ok: true };
}
