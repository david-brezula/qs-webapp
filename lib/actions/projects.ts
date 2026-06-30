"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/portal/session";
import { ProjectStatus } from "@prisma/client";
import { computeModules } from "@/lib/portal/modules";

const createSchema = z.object({
  name: z.string().trim().min(1),
  location: z.string().trim().optional(),
});

export async function createProjectAction(fd: FormData) {
  await requireAdmin();
  const parsed = createSchema.safeParse({
    name: fd.get("name"),
    location: fd.get("location") || undefined,
  });
  if (!parsed.success) return { ok: false as const, error: "validation" };
  const p = await prisma.project.create({
    data: { name: parsed.data.name, location: parsed.data.location ?? null },
  });
  revalidatePath("/projects");
  return { ok: true as const, data: { id: p.id } };
}

export async function updateProjectAction(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get("projectId") ?? "");
  const name = String(fd.get("name") ?? "").trim();
  const location = String(fd.get("location") ?? "").trim() || null;
  if (!id || !name) return { ok: false as const, error: "validation" };
  await prisma.project.update({ where: { id }, data: { name, location } });
  revalidatePath(`/projects/${id}`);
  revalidatePath(`/projects/${id}/edit`);
  return { ok: true as const };
}

const companyRateSchema = z.object({
  projectId: z.string().min(1),
  companyPriceTie: z.coerce.number().nonnegative(),
  companyPriceConnect: z.coerce.number().nonnegative(),
});

export async function updateProjectCompanyRateAction(fd: FormData) {
  await requireAdmin();
  const parsed = companyRateSchema.safeParse({
    projectId: fd.get("projectId"),
    companyPriceTie: fd.get("companyPriceTie"),
    companyPriceConnect: fd.get("companyPriceConnect"),
  });
  if (!parsed.success) return { ok: false as const, error: "validation" };
  await prisma.project.update({
    where: { id: parsed.data.projectId },
    data: {
      companyPriceTie: parsed.data.companyPriceTie,
      companyPriceConnect: parsed.data.companyPriceConnect,
    },
  });
  revalidatePath(`/projects/${parsed.data.projectId}/edit`);
  revalidatePath(`/wages/projects/${parsed.data.projectId}`);
  revalidatePath("/wages");
  return { ok: true as const };
}

export async function setProjectStatusAction(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get("projectId") ?? "");
  const status = String(fd.get("status") ?? "");
  if (!id || (status !== "ACTIVE" && status !== "CLOSED")) {
    return { ok: false as const, error: "validation" };
  }
  await prisma.project.update({
    where: { id },
    data: {
      status: status as ProjectStatus,
      closedAt: status === "CLOSED" ? new Date() : null,
    },
  });
  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
  return { ok: true as const };
}

const sectionSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().trim().min(1),
});

export async function createSectionAction(fd: FormData) {
  await requireAdmin();
  const parsed = sectionSchema.safeParse({
    projectId: fd.get("projectId"),
    name: fd.get("name"),
  });
  if (!parsed.success) return { ok: false as const, error: "validation" };
  const count = await prisma.section.count({ where: { projectId: parsed.data.projectId } });
  await prisma.section.create({
    data: {
      projectId: parsed.data.projectId,
      name: parsed.data.name,
      orderIndex: count,
    },
  });
  revalidatePath(`/projects/${parsed.data.projectId}/edit`);
  return { ok: true as const };
}

export async function deleteSectionAction(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get("sectionId") ?? "");
  const projectId = String(fd.get("projectId") ?? "");
  if (!id) return { ok: false as const, error: "validation" };
  await prisma.section.delete({ where: { id } });
  revalidatePath(`/projects/${projectId}/edit`);
  return { ok: true as const };
}

const tableSchema = z.object({
  sectionId: z.string().min(1),
  projectId: z.string().min(1),
  name: z.string().trim().min(1),
  rows: z.coerce.number().int().positive(),
  cols: z.coerce.number().int().positive(),
  skipped: z.coerce.number().int().min(0).default(0),
});

export async function createTableAction(fd: FormData) {
  await requireAdmin();
  const parsed = tableSchema.safeParse({
    sectionId: fd.get("sectionId"),
    projectId: fd.get("projectId"),
    name: fd.get("name"),
    rows: fd.get("rows"),
    cols: fd.get("cols"),
    skipped: fd.get("skipped") || 0,
  });
  if (!parsed.success) return { ok: false as const, error: "validation" };
  try {
    computeModules({
      rows: parsed.data.rows,
      cols: parsed.data.cols,
      skipped: parsed.data.skipped,
    });
  } catch {
    return { ok: false as const, error: "validation" };
  }
  const count = await prisma.table.count({ where: { sectionId: parsed.data.sectionId } });
  await prisma.table.create({
    data: {
      sectionId: parsed.data.sectionId,
      name: parsed.data.name,
      rows: parsed.data.rows,
      cols: parsed.data.cols,
      skipped: parsed.data.skipped,
      orderIndex: count,
    },
  });
  revalidatePath(`/projects/${parsed.data.projectId}/edit`);
  return { ok: true as const };
}

const bulkTablesSchema = z.object({
  sectionId: z.string().min(1),
  projectId: z.string().min(1),
  namePrefix: z.string().default(""),
  startIndex: z.coerce.number().int().min(0).default(1),
  count: z.coerce.number().int().min(1).max(100),
  rows: z.coerce.number().int().min(0).default(0),
  cols: z.coerce.number().int().min(0).default(0),
  skipped: z.coerce.number().int().min(0).default(0),
});

export async function createTablesAction(fd: FormData) {
  await requireAdmin();
  const parsed = bulkTablesSchema.safeParse({
    sectionId: fd.get("sectionId"),
    projectId: fd.get("projectId"),
    namePrefix: fd.get("namePrefix") ?? "",
    startIndex: fd.get("startIndex") || 1,
    count: fd.get("count"),
    rows: fd.get("rows") || 0,
    cols: fd.get("cols") || 0,
    skipped: fd.get("skipped") || 0,
  });
  if (!parsed.success) return { ok: false as const, error: "validation" };

  const existing = await prisma.table.count({ where: { sectionId: parsed.data.sectionId } });
  const data = Array.from({ length: parsed.data.count }, (_, i) => ({
    sectionId: parsed.data.sectionId,
    name: `${parsed.data.namePrefix}${parsed.data.startIndex + i}`,
    rows: parsed.data.rows,
    cols: parsed.data.cols,
    skipped: parsed.data.skipped,
    orderIndex: existing + i,
  }));

  await prisma.table.createMany({ data });
  revalidatePath(`/projects/${parsed.data.projectId}/edit`);
  return { ok: true as const, created: data.length };
}

const updateTableSchema = z.object({
  tableId: z.string().min(1),
  projectId: z.string().min(1),
  rows: z.coerce.number().int().min(0),
  cols: z.coerce.number().int().min(0),
  skipped: z.coerce.number().int().min(0),
});

export async function updateTableAction(fd: FormData) {
  await requireAdmin();
  const parsed = updateTableSchema.safeParse({
    tableId: fd.get("tableId"),
    projectId: fd.get("projectId"),
    rows: fd.get("rows") || 0,
    cols: fd.get("cols") || 0,
    skipped: fd.get("skipped") || 0,
  });
  if (!parsed.success) return { ok: false as const, error: "validation" };
  await prisma.table.update({
    where: { id: parsed.data.tableId },
    data: {
      rows: parsed.data.rows,
      cols: parsed.data.cols,
      skipped: parsed.data.skipped,
    },
  });
  revalidatePath(`/projects/${parsed.data.projectId}/edit`);
  revalidatePath(`/projects/${parsed.data.projectId}`);
  return { ok: true as const };
}

export async function deleteTableAction(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get("tableId") ?? "");
  const projectId = String(fd.get("projectId") ?? "");
  if (!id) return { ok: false as const, error: "validation" };
  await prisma.table.delete({ where: { id } });
  revalidatePath(`/projects/${projectId}/edit`);
  return { ok: true as const };
}
