"use server";

import { prisma } from "@/lib/prisma";
import { requireClient } from "@/lib/portal/session";
import { createSignedUrl } from "@/lib/storage";

export type ClientFileResult = { ok: true; url: string } | { ok: false };

export async function getClientDocumentUrlAction(documentId: string): Promise<ClientFileResult> {
  const { clientId } = await requireClient();
  const doc = await prisma.projectDocument.findFirst({
    where: { id: documentId, project: { clientId } },
    select: { storageKey: true },
  });
  if (!doc) return { ok: false };
  return { ok: true, url: await createSignedUrl(doc.storageKey) };
}
