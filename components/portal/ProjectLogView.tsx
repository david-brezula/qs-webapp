import { getTranslations } from "next-intl/server";
import { computeProgress } from "@/lib/portal/progress";
import { ProgressGraph } from "@/components/portal/ProgressGraph";
import { SectionTables, type Table } from "@/components/portal/SectionTables";

type Section = {
  id: string;
  name: string;
  tables: Table[];
};

export async function ProjectLogView({
  project,
  assignedWorkers,
  allActiveWorkers,
  projectWorkerId,
  isAdmin,
  invoicedSectionIds = [],
}: {
  project: {
    id: string;
    name: string;
    location: string | null;
    status: "ACTIVE" | "CLOSED";
    sections: Section[];
  };
  assignedWorkers: { id: string; userId: string; name: string }[];
  allActiveWorkers: { id: string; name: string }[];
  projectWorkerId: string | null;
  isAdmin: boolean;
  invoicedSectionIds?: string[];
}) {
  const t = await getTranslations("log");
  const isClosed = project.status === "CLOSED";
  const projectProgress = computeProgress(
    project.sections.flatMap((s) => s.tables),
  );

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
      {project.sections.length === 0 && (
        <p className="text-sm text-muted">No sections yet.</p>
      )}
      {project.sections.map((s) => {
        const sectionProgress = computeProgress(s.tables);
        return (
          <section key={s.id} className="mb-6">
            <div className="mb-3 flex items-center gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-navy/60">
                {s.name}
              </h3>
              <div className="w-full max-w-[16rem]">
                <ProgressGraph
                  variant="section"
                  tied={sectionProgress.tied}
                  connected={sectionProgress.connected}
                  total={sectionProgress.total}
                />
              </div>
            </div>
            <SectionTables
              tables={s.tables}
              assignedWorkers={assignedWorkers}
              allActiveWorkers={allActiveWorkers}
              projectWorkerId={projectWorkerId}
              isAdmin={isAdmin}
              isClosed={isClosed}
              sectionInvoiced={invoicedSectionIds.includes(s.id)}
            />
          </section>
        );
      })}
    </>
  );
}
