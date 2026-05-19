import { getTranslations } from "next-intl/server";
import { ProgressGraph } from "@/components/portal/ProgressGraph";
import { SectionList } from "@/components/portal/SectionList";
import { computeProgress } from "@/lib/portal/progress";
import { getTableAggregates } from "@/lib/portal/activity-aggregates";

type SectionInput = {
  id: string;
  name: string;
  tables: { id: string; rows: number; cols: number; skipped: number }[];
};

/**
 * Fetches table aggregates, computes per-section and project progress, and
 * renders the project progress block plus the section list. Shared by the
 * project overview page and the log page.
 */
export async function ProjectSectionList({
  projectId,
  sections,
}: {
  projectId: string;
  sections: SectionInput[];
}) {
  const t = await getTranslations("log");

  const tableIds = sections.flatMap((s) => s.tables.map((tbl) => tbl.id));
  const aggregates = await getTableAggregates(tableIds);

  const toProgressInput = (tbl: {
    rows: number;
    cols: number;
    skipped: number;
    id: string;
  }) => {
    const agg = aggregates.get(tbl.id) ?? { totalTied: 0, totalConnected: 0 };
    return {
      rows: tbl.rows,
      cols: tbl.cols,
      skipped: tbl.skipped,
      totalTied: agg.totalTied,
      totalConnected: agg.totalConnected,
    };
  };

  const sectionSummaries = sections.map((s) => {
    const p = computeProgress(s.tables.map(toProgressInput));
    return {
      id: s.id,
      name: s.name,
      tied: p.tied,
      connected: p.connected,
      total: p.total,
    };
  });

  const projectProgress = {
    tied: sectionSummaries.reduce((sum, s) => sum + s.tied, 0),
    connected: sectionSummaries.reduce((sum, s) => sum + s.connected, 0),
    total: sectionSummaries.reduce((sum, s) => sum + s.total, 0),
  };

  return (
    <>
      <ProgressGraph
        variant="project"
        tied={projectProgress.tied}
        connected={projectProgress.connected}
        total={projectProgress.total}
        labels={{
          heading: t("progressHeading"),
          tied: t("progressTied"),
          connected: t("progressConnected"),
        }}
      />
      {sectionSummaries.length === 0 ? (
        <p className="text-sm text-muted">No sections yet.</p>
      ) : (
        <SectionList projectId={projectId} sections={sectionSummaries} />
      )}
    </>
  );
}
