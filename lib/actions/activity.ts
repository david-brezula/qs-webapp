"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { checkOverCap } from "@/lib/portal/over-cap";
import { computeModules } from "@/lib/portal/modules";
import { canEditLog } from "@/lib/portal/log-edit";

const logSchema = z.object({
  tableId: z.string().min(1),
  action: z.enum(["TIE", "CONNECT"]),
  count: z.coerce.number().int().positive(),
  workDate: z.string().min(1),
  notes: z.string().optional(),
});

export type LogResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | "validation"
        | "over-cap"
        | "not-assigned"
        | "not-claimed"
        | "closed"
        | "has-activity"
        | "locked";
      remaining?: number;
    };

/** True if the worker has invoiced the given section (lock for self-edits). */
async function isSectionInvoiced(sectionId: string, projectWorkerId: string): Promise<boolean> {
  const inv = await prisma.sectionInvoice.findUnique({
    where: { sectionId_projectWorkerId: { sectionId, projectWorkerId } },
    select: { id: true },
  });
  return inv !== null;
}

export async function claimTableAction(fd: FormData): Promise<LogResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "validation" };
  const tableId = String(fd.get("tableId") ?? "");
  if (!tableId) return { ok: false, error: "validation" };
  const onBehalfOfPwId = String(fd.get("projectWorkerId") ?? "");
  const onBehalfOfUserId = String(fd.get("userId") ?? "");

  const table = await prisma.table.findUnique({
    where: { id: tableId },
    include: { section: { include: { project: true } } },
  });
  if (!table) return { ok: false, error: "validation" };
  if (table.section.project.status === "CLOSED") return { ok: false, error: "closed" };
  const projectId = table.section.projectId;

  let targetPwId: string;
  if (onBehalfOfPwId || onBehalfOfUserId) {
    if (session.user.role !== "ADMIN") return { ok: false, error: "validation" };
    if (onBehalfOfPwId) {
      const target = await prisma.projectWorker.findUnique({ where: { id: onBehalfOfPwId } });
      if (!target || target.projectId !== projectId) return { ok: false, error: "validation" };
      targetPwId = target.id;
    } else {
      const targetUser = await prisma.user.findUnique({ where: { id: onBehalfOfUserId } });
      if (!targetUser || !targetUser.active) return { ok: false, error: "validation" };
      const pw = await prisma.projectWorker.upsert({
        where: { projectId_userId: { projectId, userId: onBehalfOfUserId } },
        update: {},
        create: {
          projectId,
          userId: onBehalfOfUserId,
          priceTie: targetUser.defaultPriceTie,
          priceConnect: targetUser.defaultPriceConnect,
        },
      });
      targetPwId = pw.id;
    }
  } else {
    const pw = await prisma.projectWorker.findUnique({
      where: { projectId_userId: { projectId, userId: session.user.id } },
    });
    if (!pw) return { ok: false, error: "not-assigned" };
    targetPwId = pw.id;
  }

  await prisma.tableClaim.upsert({
    where: { tableId_projectWorkerId: { tableId, projectWorkerId: targetPwId } },
    update: {},
    create: { tableId, projectWorkerId: targetPwId },
  });

  revalidatePath(`/projects/${projectId}/log`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/dashboard`);
  return { ok: true };
}

export async function releaseClaimAction(fd: FormData): Promise<LogResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "validation" };
  const claimId = String(fd.get("claimId") ?? "");
  if (!claimId) return { ok: false, error: "validation" };

  const claim = await prisma.tableClaim.findUnique({
    where: { id: claimId },
    include: {
      projectWorker: true,
      table: { include: { section: true, activityLogs: true } },
    },
  });
  if (!claim) return { ok: false, error: "validation" };

  const isOwn = claim.projectWorker.userId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isOwn && !isAdmin) return { ok: false, error: "validation" };

  const hasOwnActivity = claim.table.activityLogs.some(
    (l) => l.projectWorkerId === claim.projectWorkerId,
  );
  if (isOwn && !isAdmin && hasOwnActivity) {
    return { ok: false, error: "has-activity" };
  }

  await prisma.tableClaim.delete({ where: { id: claimId } });

  revalidatePath(`/projects/${claim.table.section.projectId}/log`);
  revalidatePath(`/projects/${claim.table.section.projectId}`);
  return { ok: true };
}

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

  // Optional admin "log on behalf of" target.
  const onBehalfOfPwId = String(fd.get("projectWorkerId") ?? "");
  const onBehalfOfUserId = String(fd.get("userId") ?? "");
  const onBehalf = Boolean(onBehalfOfPwId || onBehalfOfUserId);

  const table = await prisma.table.findUnique({
    where: { id: parsed.data.tableId },
    include: {
      section: { include: { project: true } },
      activityLogs: { where: { action: parsed.data.action } },
    },
  });
  if (!table) return { ok: false, error: "validation" };
  if (table.section.project.status === "CLOSED") return { ok: false, error: "closed" };
  const projectId = table.section.projectId;

  // Resolve the ProjectWorker the entry is logged against.
  let targetPwId: string;
  if (onBehalf) {
    if (session.user.role !== "ADMIN") return { ok: false, error: "validation" };
    if (onBehalfOfPwId) {
      const target = await prisma.projectWorker.findUnique({ where: { id: onBehalfOfPwId } });
      if (!target || target.projectId !== projectId) return { ok: false, error: "validation" };
      targetPwId = target.id;
    } else {
      const targetUser = await prisma.user.findUnique({ where: { id: onBehalfOfUserId } });
      if (!targetUser || !targetUser.active) return { ok: false, error: "validation" };
      const pw = await prisma.projectWorker.upsert({
        where: { projectId_userId: { projectId, userId: onBehalfOfUserId } },
        update: {},
        create: {
          projectId,
          userId: onBehalfOfUserId,
          priceTie: targetUser.defaultPriceTie,
          priceConnect: targetUser.defaultPriceConnect,
        },
      });
      targetPwId = pw.id;
    }
    // Make the worker show as a participant on the table.
    await prisma.tableClaim.upsert({
      where: { tableId_projectWorkerId: { tableId: parsed.data.tableId, projectWorkerId: targetPwId } },
      update: {},
      create: { tableId: parsed.data.tableId, projectWorkerId: targetPwId },
    });
  } else {
    const pw = await prisma.projectWorker.findUnique({
      where: { projectId_userId: { projectId, userId: session.user.id } },
    });
    if (!pw) return { ok: false, error: "not-assigned" };
    const claim = await prisma.tableClaim.findUnique({
      where: { tableId_projectWorkerId: { tableId: parsed.data.tableId, projectWorkerId: pw.id } },
    });
    if (!claim) return { ok: false, error: "not-claimed" };
    targetPwId = pw.id;
  }

  const totalModules = computeModules({ rows: table.rows, cols: table.cols, skipped: table.skipped });
  const existing = table.activityLogs.reduce((a, b) => a + b.count, 0);

  // Over-cap is enforced for everyone, admins included.
  const check = checkOverCap({
    totalModules,
    existing,
    requested: parsed.data.count,
    action: parsed.data.action,
  });
  if (!check.ok) {
    return { ok: false, error: "over-cap", remaining: check.remaining };
  }

  await prisma.$transaction(async (tx) => {
    const created = await tx.activityLog.create({
      data: {
        projectWorkerId: targetPwId,
        tableId: parsed.data.tableId,
        action: parsed.data.action,
        count: parsed.data.count,
        workDate: new Date(parsed.data.workDate),
        notes: parsed.data.notes ?? null,
      },
    });
    await tx.activityLogAudit.create({
      data: {
        activityLogId: created.id,
        projectWorkerId: targetPwId,
        tableId: parsed.data.tableId,
        action: parsed.data.action,
        change: "CREATE",
        oldCount: null,
        newCount: parsed.data.count,
        workDate: created.workDate,
        changedById: session.user.id,
        changedByRole: session.user.role,
      },
    });
  });

  revalidatePath(`/projects/${projectId}/log`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/sections/${table.sectionId}`);
  revalidatePath(`/wages`);
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
  const sectionInvoiced = await isSectionInvoiced(log.table.sectionId, log.projectWorkerId);
  if (!canEditLog({ isAdmin, isOwn, sectionInvoiced })) {
    return { ok: false, error: "locked" };
  }

  const total = computeModules({ rows: log.table.rows, cols: log.table.cols, skipped: log.table.skipped });
  const otherCount = log.table.activityLogs
    .filter((l) => l.action === log.action && l.id !== log.id)
    .reduce((a, b) => a + b.count, 0);

  if (otherCount + parsed.data.count > total) {
    return { ok: false, error: "over-cap", remaining: Math.max(0, total - otherCount) };
  }

  const oldCount = log.count;
  await prisma.$transaction(async (tx) => {
    await tx.activityLog.update({
      where: { id: parsed.data.logId },
      data: { count: parsed.data.count },
    });
    await tx.activityLogAudit.create({
      data: {
        activityLogId: log.id,
        projectWorkerId: log.projectWorkerId,
        tableId: log.tableId,
        action: log.action,
        change: "UPDATE",
        oldCount,
        newCount: parsed.data.count,
        workDate: log.workDate,
        changedById: session.user.id,
        changedByRole: session.user.role,
      },
    });
  });

  revalidatePath(`/projects/${log.table.section.projectId}/log`);
  revalidatePath(`/projects/${log.table.section.projectId}/sections/${log.table.sectionId}`);
  revalidatePath(`/workers/${log.projectWorker.userId}`);
  revalidatePath(`/wages`);
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
  const sectionInvoiced = await isSectionInvoiced(log.table.sectionId, log.projectWorkerId);
  if (!canEditLog({ isAdmin, isOwn, sectionInvoiced })) {
    return { ok: false, error: "locked" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.activityLogAudit.create({
      data: {
        activityLogId: log.id,
        projectWorkerId: log.projectWorkerId,
        tableId: log.tableId,
        action: log.action,
        change: "DELETE",
        oldCount: log.count,
        newCount: null,
        workDate: log.workDate,
        changedById: session.user.id,
        changedByRole: session.user.role,
      },
    });
    await tx.activityLog.delete({ where: { id: logId } });
  });

  revalidatePath(`/projects/${log.table.section.projectId}/log`);
  revalidatePath(`/projects/${log.table.section.projectId}/sections/${log.table.sectionId}`);
  revalidatePath(`/workers/${log.projectWorker.userId}`);
  revalidatePath(`/wages`);
  return { ok: true };
}
