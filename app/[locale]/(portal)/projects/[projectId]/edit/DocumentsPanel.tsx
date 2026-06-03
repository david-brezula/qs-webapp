"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { uploadDocumentAction, deleteDocumentAction } from "@/lib/actions/project-files";

type Doc = { id: string; title: string };

export function DocumentsPanel({ projectId, documents, labels }: { projectId: string; documents: Doc[]; labels: Record<string, string> }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function upload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("projectId", projectId);
    start(async () => {
      const r = await uploadDocumentAction(fd);
      if (r.ok) formRef.current?.reset();
      router.refresh();
    });
  }
  function remove(documentId: string) {
    const fd = new FormData();
    fd.set("documentId", documentId);
    start(async () => {
      await deleteDocumentAction(fd);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <form ref={formRef} onSubmit={upload} className="flex flex-wrap items-end gap-2">
        <input type="text" name="title" placeholder={labels.title} required className="rounded-md border border-border-soft bg-surface px-3 py-2 text-sm" />
        <input type="file" name="file" required className="text-sm" />
        <Button type="submit" variant="primary" disabled={pending}>{labels.upload}</Button>
      </form>
      <ul className="divide-y divide-border-soft rounded-md border border-border-soft bg-surface">
        {documents.map((d) => (
          <li key={d.id} className="flex items-center justify-between px-4 py-2 text-sm">
            <span className="text-navy">{d.title}</span>
            <button onClick={() => remove(d.id)} disabled={pending} className="text-xs text-red-600 hover:underline">{labels.delete}</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
