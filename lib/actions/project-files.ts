"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/portal/session";
import { uploadProjectFile, deleteProjectFile } from "@/lib/storage";

export type ActionResult = { ok: true } | { ok: false; error: string };

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
}

export async function uploadPhotoAction(fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  const projectId = String(fd.get("projectId") ?? "");
  const caption = String(fd.get("caption") ?? "").trim() || null;
  const file = fd.get("file");
  if (!projectId || !(file instanceof File) || file.size === 0) return { ok: false, error: "validation" };

  const key = `projects/${projectId}/photos/${randomUUID()}-${safeName(file.name)}`;
  const buf = Buffer.from(await file.arrayBuffer());
  await uploadProjectFile(key, buf, file.type || "application/octet-stream");
  await prisma.projectPhoto.create({ data: { projectId, storageKey: key, caption } });
  revalidatePath(`/projects/${projectId}/edit`);
  return { ok: true };
}

export async function deletePhotoAction(fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = String(fd.get("photoId") ?? "");
  if (!id) return { ok: false, error: "validation" };
  const photo = await prisma.projectPhoto.findUnique({ where: { id } });
  if (!photo) return { ok: false, error: "not-found" };
  await deleteProjectFile(photo.storageKey).catch(() => {});
  await prisma.projectPhoto.delete({ where: { id } });
  revalidatePath(`/projects/${photo.projectId}/edit`);
  return { ok: true };
}

export async function uploadDocumentAction(fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  const projectId = String(fd.get("projectId") ?? "");
  const title = String(fd.get("title") ?? "").trim();
  const file = fd.get("file");
  if (!projectId || !title || !(file instanceof File) || file.size === 0) return { ok: false, error: "validation" };

  const key = `projects/${projectId}/documents/${randomUUID()}-${safeName(file.name)}`;
  const buf = Buffer.from(await file.arrayBuffer());
  await uploadProjectFile(key, buf, file.type || "application/octet-stream");
  await prisma.projectDocument.create({
    data: { projectId, storageKey: key, title, mimeType: file.type || null, sizeBytes: file.size },
  });
  revalidatePath(`/projects/${projectId}/edit`);
  return { ok: true };
}

export async function deleteDocumentAction(fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = String(fd.get("documentId") ?? "");
  if (!id) return { ok: false, error: "validation" };
  const doc = await prisma.projectDocument.findUnique({ where: { id } });
  if (!doc) return { ok: false, error: "not-found" };
  await deleteProjectFile(doc.storageKey).catch(() => {});
  await prisma.projectDocument.delete({ where: { id } });
  revalidatePath(`/projects/${doc.projectId}/edit`);
  return { ok: true };
}
