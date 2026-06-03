"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { uploadPhotoAction, deletePhotoAction } from "@/lib/actions/project-files";

type Photo = { id: string; caption: string | null };

export function PhotosPanel({ projectId, photos, labels }: { projectId: string; photos: Photo[]; labels: Record<string, string> }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function upload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("projectId", projectId);
    start(async () => {
      const r = await uploadPhotoAction(fd);
      if (r.ok) formRef.current?.reset();
      router.refresh();
    });
  }
  function remove(photoId: string) {
    const fd = new FormData();
    fd.set("photoId", photoId);
    start(async () => {
      await deletePhotoAction(fd);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <form ref={formRef} onSubmit={upload} className="flex flex-wrap items-end gap-2">
        <input type="file" name="file" accept="image/*" required className="text-sm" />
        <input type="text" name="caption" placeholder={labels.caption} className="rounded-md border border-border-soft bg-surface px-3 py-2 text-sm" />
        <Button type="submit" variant="primary" disabled={pending}>{labels.upload}</Button>
      </form>
      <ul className="divide-y divide-border-soft rounded-md border border-border-soft bg-surface">
        {photos.map((p) => (
          <li key={p.id} className="flex items-center justify-between px-4 py-2 text-sm">
            <span className="text-slate-ink">{p.caption ?? p.id}</span>
            <button onClick={() => remove(p.id)} disabled={pending} className="text-xs text-red-600 hover:underline">{labels.delete}</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
