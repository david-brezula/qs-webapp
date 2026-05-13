"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { checkOverCap } from "@/lib/portal/over-cap";
import { computeModules } from "@/lib/portal/modules";

const logSchema = z.object({
  tableId: z.string().min(1),
  action: z.enum(["TIE", "CONNECT"]),
  count: z.coerce.number().int().positive(),
  workDate: z.string().min(1),
  notes: z.string().optional(),
});

export type LogResult =
  | { ok: true }
  | { ok: false; error: "validation" | "over-cap" | "not-assigned" | "closed"; remaining?: number };

export async function logActivityAction(fd: FormData): Promise<LogResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "validation" };

  const parsed = logSchema.safeParse({
    tableId: fd.get("tableId"),
    action: fd.get("action"),
    count: fd.get("count"),
    workDate: fd.get("workDate"),
    notes: fd.get("notes") || undefined,
  });
  if (!parsed.success) return { ok: false, error: "validation" };

  const table = await prisma.table.findUnique({
    where: { id: parsed.data.tableId },
    include: {
      section: { include: { project: true } },
      activityLogs: { where: { action: parsed.data.action } },
    },
  });
  if (!table) return { ok: false, error: "validation" };
  if (table.section.project.status === "CLOSED") return { ok: false, error: "closed" };

  const pw = await prisma.projectWorker.findUnique({
    where: {
      projectId_userId: {
        projectId: table.section.projectId,
        userId: session.user.id,
      },
    },
  });
  if (!pw) return { ok: false, error: "not-assigned" };

  const totalModules = computeModules({ rows: table.rows, cols: table.cols, skipped: table.skipped });
  const existing = table.activityLogs.reduce((a, b) => a + b.count, 0);

  const check = checkOverCap({
    totalModules,
    existing,
    requested: parsed.data.count,
    action: parsed.data.action,
  });
  if (!check.ok) {
    return { ok: false, error: "over-cap", remaining: check.remaining };
  }

  await prisma.activityLog.create({
    data: {
      projectWorkerId: pw.id,
      tableId: parsed.data.tableId,
      action: parsed.data.action,
      count: parsed.data.count,
      workDate: new Date(parsed.data.workDate),
      notes: parsed.data.notes ?? null,
    },
  });

  revalidatePath(`/projects/${table.section.projectId}/log`);
  revalidatePath(`/projects/${table.section.projectId}`);
  return { ok: true };
}

const updateSchema = z.object({
  logId: z.string().min(1),
  count: z.coerce.number().int().positive(),
});

export async function updateLogAction(fd: FormData): Promise<LogResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "validation" };
  const parsed = updateSchema.safeParse({ logId: fd.get("logId"), count: fd.get("count") });
  if (!parsed.success) return { ok: false, error: "validation" };

  const log = await prisma.activityLog.findUnique({
    where: { id: parsed.data.logId },
    include: {
      table: {
        include: {
          section: { include: { project: true } },
          activityLogs: true,
        },
      },
      projectWorker: true,
    },
  });
  if (!log) return { ok: false, error: "validation" };

  const isOwn = log.projectWorker.userId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  const ageMs = Date.now() - log.createdAt.getTime();
  const withinWindow = ageMs < 24 * 60 * 60 * 1000;
  if (!isAdmin && !(isOwn && withinWindow)) return { ok: false, error: "validation" };

  const total = computeModules({ rows: log.table.rows, cols: log.table.cols, skipped: log.table.skipped });
  const otherCount = log.table.activityLogs
    .filter((l) => l.action === log.action && l.id !== log.id)
    .reduce((a, b) => a + b.count, 0);

  if (otherCount + parsed.data.count > total) {
    return { ok: false, error: "over-cap", remaining: Math.max(0, total - otherCount) };
  }

  await prisma.activityLog.update({
    where: { id: parsed.data.logId },
    data: { count: parsed.data.count },
  });
  revalidatePath(`/projects/${log.table.section.projectId}/log`);
  return { ok: true };
}

export async function deleteLogAction(fd: FormData): Promise<LogResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "validation" };
  const logId = String(fd.get("logId") ?? "");
  const log = await prisma.activityLog.findUnique({
    where: { id: logId },
    include: { projectWorker: true, table: { include: { section: true } } },
  });
  if (!log) return { ok: false, error: "validation" };
  const isOwn = log.projectWorker.userId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  const withinWindow = Date.now() - log.createdAt.getTime() < 24 * 60 * 60 * 1000;
  if (!isAdmin && !(isOwn && withinWindow)) return { ok: false, error: "validation" };

  await prisma.activityLog.delete({ where: { id: logId } });
  revalidatePath(`/projects/${log.table.section.projectId}/log`);
  return { ok: true };
}
