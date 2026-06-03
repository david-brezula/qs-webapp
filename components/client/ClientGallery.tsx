"use client";

import { useTranslations } from "next-intl";
import type { ClientPhoto } from "@/lib/portal/client-projects";

export function ClientGallery({ photos }: { photos: ClientPhoto[] }) {
  const t = useTranslations("clientPortal");
  if (photos.length === 0) return <p className="text-sm text-muted">{t("noPhotos")}</p>;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {photos.map((p) => (
        <figure key={p.id} className="overflow-hidden rounded-lg border border-border-soft bg-surface">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.signedUrl} alt={p.caption ?? ""} className="h-40 w-full object-cover" loading="lazy" />
          {p.caption && <figcaption className="p-2 text-xs text-slate-ink">{p.caption}</figcaption>}
        </figure>
      ))}
    </div>
  );
}
