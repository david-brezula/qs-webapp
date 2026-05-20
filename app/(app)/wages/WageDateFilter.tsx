"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";

/**
 * Shared from/to filter used by every admin wage page. Reads the current
 * pathname so each page pushes back to its own route with updated search
 * params; the page server component re-runs and recomputes the ranged totals.
 * Optional `trailing` slot is rendered inline at the end of the filter row
 * (used by the project list page to host the Export CSV button next to the
 * Calculate button).
 */
export function WageDateFilter({
  from,
  to,
  trailing,
}: {
  from: string;
  to: string;
  trailing?: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const sp = useSearchParams();
  const t = useTranslations("wages");
  const [f, setF] = useState(from);
  const [tt, setTt] = useState(to);

  function apply() {
    const params = new URLSearchParams(sp);
    params.set("from", f);
    params.set("to", tt);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:items-end mb-4">
      <div className="w-full sm:w-auto">
        <label htmlFor="wage-from" className="text-xs text-muted block mb-1">
          {t("from")}
        </label>
        <input
          id="wage-from"
          type="date"
          value={f}
          onChange={(e) => setF(e.target.value)}
          className="w-full rounded-md border border-border-soft bg-surface px-3 py-2 text-sm"
        />
      </div>
      <div className="w-full sm:w-auto">
        <label htmlFor="wage-to" className="text-xs text-muted block mb-1">
          {t("to")}
        </label>
        <input
          id="wage-to"
          type="date"
          value={tt}
          onChange={(e) => setTt(e.target.value)}
          className="w-full rounded-md border border-border-soft bg-surface px-3 py-2 text-sm"
        />
      </div>
      <Button onClick={apply} variant="primary" className="w-full sm:w-auto">
        {t("calculate")}
      </Button>
      {trailing}
    </div>
  );
}
