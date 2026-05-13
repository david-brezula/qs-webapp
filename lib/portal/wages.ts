export type Currency = "USD" | "EUR";

export interface WageInput {
  from: Date;
  to: Date;
  projectId?: string | null;
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
