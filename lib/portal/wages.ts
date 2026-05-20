export type Currency = "USD" | "EUR";

export interface WageInput {
  from: Date;
  to: Date;
  projectId?: string | null;
  sectionId?: string | null;
  workers: { id: string; name: string }[];
  prices: {
    projectId: string;
    userId: string;
    priceTie: number;
    priceConnect: number;
  }[];
  activity: {
    userId: string;
    projectId: string;
    sectionId?: string;
    action: "TIE" | "CONNECT";
    count: number;
    workDate: Date;
  }[];
  accommodations: {
    id: string;
    totalCost: number;
    currency: Currency;
    startDate: Date;
    endDate: Date;
    workerIds: string[];
    projectId: string | null;
  }[];
}

export interface WageRow {
  userId: string;
  name: string;
  earnings: number;
  accommodation: number;
  wage: number;
  breakdown: { tie: number; connect: number };
  warnings: string[];
}

export interface WageResult {
  rows: WageRow[];
  mixedCurrencies: boolean;
}

function overlaps(a: { start: Date; end: Date }, b: { start: Date; end: Date }) {
  return a.start <= b.end && a.end >= b.start;
}

export function computeWages(input: WageInput): WageResult {
  const range = { start: input.from, end: input.to };
  const projectFilter = input.projectId ?? null;
  const sectionFilter = input.sectionId ?? null;

  const priceLookup = new Map<string, { tie: number; connect: number }>();
  for (const p of input.prices) {
    priceLookup.set(`${p.userId}|${p.projectId}`, {
      tie: p.priceTie,
      connect: p.priceConnect,
    });
  }

  const rows: WageRow[] = input.workers.map((w) => ({
    userId: w.id,
    name: w.name,
    earnings: 0,
    accommodation: 0,
    wage: 0,
    breakdown: { tie: 0, connect: 0 },
    warnings: [],
  }));

  const rowById = new Map(rows.map((r) => [r.userId, r] as const));

  // Earnings
  for (const a of input.activity) {
    if (projectFilter && a.projectId !== projectFilter) continue;
    if (sectionFilter && a.sectionId !== sectionFilter) continue;
    if (a.workDate < range.start || a.workDate > range.end) continue;
    const row = rowById.get(a.userId);
    if (!row) continue;
    const price = priceLookup.get(`${a.userId}|${a.projectId}`);
    if (!price) {
      if (!row.warnings.includes("missing-price")) row.warnings.push("missing-price");
      continue;
    }
    const rate = a.action === "TIE" ? price.tie : price.connect;
    const amount = a.count * rate;
    row.earnings += amount;
    if (a.action === "TIE") row.breakdown.tie += amount;
    else row.breakdown.connect += amount;
  }

  // Accommodation
  const overlappingAccommodations = input.accommodations.filter((acc) => {
    if (projectFilter && acc.projectId !== projectFilter) return false;
    return overlaps(range, { start: acc.startDate, end: acc.endDate });
  });

  for (const acc of overlappingAccommodations) {
    const share = acc.workerIds.length === 0 ? 0 : acc.totalCost / acc.workerIds.length;
    for (const wid of acc.workerIds) {
      const row = rowById.get(wid);
      if (!row) continue;
      row.accommodation += share;
    }
  }

  for (const r of rows) r.wage = r.earnings - r.accommodation;

  const distinctCurrencies = new Set(overlappingAccommodations.map((a) => a.currency));
  const mixedCurrencies = distinctCurrencies.size > 1;

  return { rows, mixedCurrencies };
}

export interface ProjectWageBreakdown {
  projectId: string;
  projectName: string;
  earnings: number;
  accommodation: number;
  wage: number;
  breakdown: { tie: number; connect: number };
}

export interface WageByProjectResult {
  total: WageRow;
  byProject: ProjectWageBreakdown[];
  mixedCurrencies: boolean;
}

/**
 * For a single worker, computes overall wage totals plus one breakdown row per
 * project where the worker had earnings or an accommodation cost within the
 * range. Reuses `computeWages` — once for the totals, once per project — so the
 * wage rules stay in one place.
 *
 * `input.workers` is expected to contain exactly the one worker being viewed.
 */
export function computeWagesByProject(
  input: WageInput & { projects: { id: string; name: string }[] },
): WageByProjectResult {
  const overall = computeWages({ ...input, projectId: null });
  // workers is non-empty by contract; the fallback only satisfies the type checker
  const total: WageRow = overall.rows[0] ?? {
    userId: "",
    name: "",
    earnings: 0,
    accommodation: 0,
    wage: 0,
    breakdown: { tie: 0, connect: 0 },
    warnings: [],
  };

  const byProject: ProjectWageBreakdown[] = [];
  for (const project of input.projects) {
    const row = computeWages({ ...input, projectId: project.id }).rows[0];
    if (!row) continue;
    if (row.earnings === 0 && row.accommodation === 0) continue;
    byProject.push({
      projectId: project.id,
      projectName: project.name,
      earnings: row.earnings,
      accommodation: row.accommodation,
      wage: row.wage,
      breakdown: row.breakdown,
    });
  }

  return { total, byProject, mixedCurrencies: overall.mixedCurrencies };
}

export interface WageTotals {
  tie: number;
  connect: number;
  earnings: number;
  accommodation: number;
  wage: number;
  warnings: string[];
}

/**
 * Sums a list of WageRow into one combined total. Used by admin wage views
 * that aggregate across all workers for a project or section. Warnings are
 * deduplicated.
 */
export function sumWageRows(rows: WageRow[]): WageTotals {
  const totals: WageTotals = {
    tie: 0,
    connect: 0,
    earnings: 0,
    accommodation: 0,
    wage: 0,
    warnings: [],
  };
  for (const r of rows) {
    totals.tie += r.breakdown.tie;
    totals.connect += r.breakdown.connect;
    totals.earnings += r.earnings;
    totals.accommodation += r.accommodation;
    totals.wage += r.wage;
    for (const w of r.warnings) {
      if (!totals.warnings.includes(w)) totals.warnings.push(w);
    }
  }
  return totals;
}

export interface SectionWageRow {
  sectionId: string;
  sectionName: string;
  tie: number;
  connect: number;
  earnings: number;
}

/**
 * For a single worker, returns one earnings row per section that had activity
 * within the range. Sections with zero earnings are omitted.
 * Accommodation is not included — it is a project-level deduction.
 */
export function computeWagesBySection(
  input: WageInput & { sections: { id: string; name: string }[] },
): SectionWageRow[] {
  const results: SectionWageRow[] = [];
  for (const section of input.sections) {
    const row = computeWages({ ...input, sectionId: section.id, accommodations: [] }).rows[0];
    if (!row || row.earnings === 0) continue;
    results.push({
      sectionId: section.id,
      sectionName: section.name,
      tie: row.breakdown.tie,
      connect: row.breakdown.connect,
      earnings: row.earnings,
    });
  }
  return results;
}

/** Wide date range that effectively means "all time" — used by admin wage
 *  pages that want both an all-time total and a user-selected range total. */
export const ALL_TIME_FROM = new Date(0);
export const ALL_TIME_TO = new Date(9999, 0, 1);
