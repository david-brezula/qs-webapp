import { computeModules } from "./modules";

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
  /**
   * Company (firm) rate billed to the client per module, per project, split by
   * action. Optional: only admin wage views pass it. When omitted, company
   * revenue/profit stay 0 and no company-price warnings are emitted — so the
   * worker portal (which never supplies it) is unaffected.
   */
  companyPrices?: {
    projectId: string;
    companyPriceTie: number;
    companyPriceConnect: number;
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
    sectionId?: string | null;
  }[];
}

export interface WageRow {
  userId: string;
  name: string;
  earnings: number;
  accommodation: number;
  wage: number;
  /**
   * Company revenue (companyRate × counts) and company profit
   * (companyEarnings − earnings). Both stay 0 unless `companyPrices` was
   * supplied — i.e. they are meaningful only in admin wage views.
   */
  companyEarnings: number;
  profit: number;
  /**
   * `tie` / `connect` are earnings (money) split by action. `tieCount` /
   * `connectCount` are the number of modules tied / connected — the raw work
   * volume, independent of price.
   */
  breakdown: { tie: number; connect: number; tieCount: number; connectCount: number };
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

  const companyPriceLookup = new Map<string, { tie: number; connect: number }>();
  for (const cp of input.companyPrices ?? []) {
    companyPriceLookup.set(cp.projectId, { tie: cp.companyPriceTie, connect: cp.companyPriceConnect });
  }
  const hasCompanyPrices = companyPriceLookup.size > 0;

  const rows: WageRow[] = input.workers.map((w) => ({
    userId: w.id,
    name: w.name,
    earnings: 0,
    accommodation: 0,
    wage: 0,
    companyEarnings: 0,
    profit: 0,
    breakdown: { tie: 0, connect: 0, tieCount: 0, connectCount: 0 },
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
    // Module counts reflect actual work and are accumulated even when no price
    // is set, so "modules done" is shown independently of the wage calculation.
    if (a.action === "TIE") row.breakdown.tieCount += a.count;
    else row.breakdown.connectCount += a.count;
    // Company revenue is independent of the worker's price (it is what the firm
    // bills the client). Computed only when company rates were supplied.
    if (hasCompanyPrices) {
      const cp = companyPriceLookup.get(a.projectId);
      if (!cp || (cp.tie === 0 && cp.connect === 0)) {
        if (!row.warnings.includes("missing-company-price")) row.warnings.push("missing-company-price");
      } else {
        row.companyEarnings += a.count * (a.action === "TIE" ? cp.tie : cp.connect);
      }
    }
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
    if (sectionFilter && acc.sectionId !== sectionFilter) return false;
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

  for (const r of rows) {
    r.wage = r.earnings - r.accommodation;
    r.profit = hasCompanyPrices ? r.companyEarnings - r.earnings : 0;
  }

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
  companyEarnings: number;
  profit: number;
  breakdown: { tie: number; connect: number; tieCount: number; connectCount: number };
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
    companyEarnings: 0,
    profit: 0,
    breakdown: { tie: 0, connect: 0, tieCount: 0, connectCount: 0 },
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
      companyEarnings: row.companyEarnings,
      profit: row.profit,
      breakdown: row.breakdown,
    });
  }

  return { total, byProject, mixedCurrencies: overall.mixedCurrencies };
}

/** Total module capacity (rows*cols-skipped) summed over a set of tables. */
export function sumCapacity(tables: { rows: number; cols: number; skipped: number }[]): number {
  let total = 0;
  for (const t of tables) total += computeModules(t);
  return total;
}

export interface WageTotals {
  tie: number;
  connect: number;
  tieCount: number;
  connectCount: number;
  earnings: number;
  accommodation: number;
  wage: number;
  companyEarnings: number;
  profit: number;
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
    tieCount: 0,
    connectCount: 0,
    earnings: 0,
    accommodation: 0,
    wage: 0,
    companyEarnings: 0,
    profit: 0,
    warnings: [],
  };
  for (const r of rows) {
    totals.tie += r.breakdown.tie;
    totals.connect += r.breakdown.connect;
    totals.tieCount += r.breakdown.tieCount;
    totals.connectCount += r.breakdown.connectCount;
    totals.earnings += r.earnings;
    totals.accommodation += r.accommodation;
    totals.wage += r.wage;
    totals.companyEarnings += r.companyEarnings;
    totals.profit += r.profit;
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
  tieCount: number;
  connectCount: number;
  earnings: number;
  accommodation: number;
  advance: number;
  wage: number;
  companyEarnings: number;
  profit: number;
}

/**
 * For a single worker, returns one row per section that had activity, an
 * accommodation cost, or a settled advance within the range. Sections with
 * zero earnings, zero accommodation, and zero advance are omitted. Each row
 * includes accommodation, settled-advance deduction, and net wage figures
 * filtered to that section. Accommodations without a `sectionId` are NOT
 * attributed to any section row — they appear in the project total only.
 */
export function computeWagesBySection(
  input: WageInput & {
    sections: { id: string; name: string }[];
    settledAdvances?: { sectionId: string; amount: number }[];
  },
): SectionWageRow[] {
  const advanceBySection = new Map<string, number>();
  for (const a of input.settledAdvances ?? []) {
    advanceBySection.set(a.sectionId, (advanceBySection.get(a.sectionId) ?? 0) + a.amount);
  }

  const results: SectionWageRow[] = [];
  for (const section of input.sections) {
    const row = computeWages({ ...input, sectionId: section.id }).rows[0];
    const advance = advanceBySection.get(section.id) ?? 0;
    if (!row) continue;
    if (row.earnings === 0 && row.accommodation === 0 && advance === 0) continue;
    results.push({
      sectionId: section.id,
      sectionName: section.name,
      tie: row.breakdown.tie,
      connect: row.breakdown.connect,
      tieCount: row.breakdown.tieCount,
      connectCount: row.breakdown.connectCount,
      earnings: row.earnings,
      accommodation: row.accommodation,
      advance,
      wage: row.wage - advance,
      companyEarnings: row.companyEarnings,
      profit: row.profit,
    });
  }
  return results;
}

/** Wide date range that effectively means "all time" — used by admin wage
 *  pages that want both an all-time total and a user-selected range total. */
export const ALL_TIME_FROM = new Date(0);
export const ALL_TIME_TO = new Date(9999, 0, 1);

/**
 * Sums the amount of OPEN advances (status PAID — paid to the worker but not yet
 * settled against a section). This is the worker's outstanding advance balance.
 * Only the "PAID" status counts; "SETTLED" and all other statuses are excluded.
 * Currency mixing is out of scope (amounts are summed as-is).
 */
export function sumOpenAdvances(advances: { amount: number; status: string }[]): number {
  let total = 0;
  for (const a of advances) {
    if (a.status === "PAID") total += a.amount;
  }
  return total;
}
