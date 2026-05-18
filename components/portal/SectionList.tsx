import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ProgressGraph } from "@/components/portal/ProgressGraph";

export type SectionSummary = {
  id: string;
  name: string;
  tied: number;
  connected: number;
  total: number;
};

/**
 * The section-row list for the project overview page. Each row links to that
 * section's page.
 */
export function SectionList({
  projectId,
  sections,
}: {
  projectId: string;
  sections: SectionSummary[];
}) {
  return (
    <div className="space-y-2">
      {sections.map((s) => (
        <Link
          key={s.id}
          href={`/projects/${projectId}/sections/${s.id}`}
          className="flex items-center gap-4 rounded-md border border-border-soft bg-surface px-4 py-3 hover:border-navy/40"
        >
          <span className="w-32 shrink-0 text-sm font-semibold text-navy">
            {s.name}
          </span>
          <div className="min-w-0 flex-1">
            <ProgressGraph
              variant="section"
              tied={s.tied}
              connected={s.connected}
              total={s.total}
            />
          </div>
          <ChevronRight size={18} className="shrink-0 text-muted" aria-hidden="true" />
        </Link>
      ))}
    </div>
  );
}
