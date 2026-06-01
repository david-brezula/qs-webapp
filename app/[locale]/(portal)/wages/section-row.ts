import type { SectionWageRow } from "@/lib/portal/wages";

/** A section wage row plus this worker's invoiced status for that section. */
export type WorkerSectionRow = SectionWageRow & {
  invoiced: boolean;
  invoicedAt: string | null;
};
