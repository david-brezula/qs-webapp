import type { ServiceSlug } from "@/lib/services";

export type ProjectStatus = "completed" | "inProgress" | "planned";

export type FeaturedProject = {
  key: string; // matches projects.items.<key> + PROJECT_IMAGE[key]
  slug: string; // URL slug — STABLE across locales (only the /projects prefix is localized)
  trade: ServiceSlug; // trade icon + accent colour
  status: ProjectStatus; // drives the status badge + case-study tense
  year?: string; // illustrative completion / target year
};

// Illustrative portfolio entries — replace with real projects + photos before
// launch (see memory: qs-web-legal-placeholders). Covers all five trades and
// all three statuses so the portfolio tabs + "in the works" state are populated.
// The case studies in messages.projects.items are representative — they are NOT
// records of specific signed contracts and deliberately carry no client names,
// quotes, certifications-as-fact or audited figures. Swap in genuine project
// details, scope and photography before launch.
export const FEATURED_PROJECTS: ReadonlyArray<FeaturedProject> = [
  // Completed case studies (representative; replace with real projects).
  { key: "solarFarm", slug: "rooftop-solar-power-plant", trade: "solar", status: "completed", year: "2024" },
  { key: "groundMountSolar", slug: "ground-mounted-solar-park", trade: "solar", status: "completed", year: "2024" },
  { key: "retailWiring", slug: "retail-electrical-fit-out", trade: "electrical", status: "completed", year: "2023" },
  { key: "evChargingHub", slug: "ev-charging-hub", trade: "electrical", status: "completed", year: "2024" },
  { key: "warehousePower", slug: "warehouse-power-and-lighting", trade: "electrical", status: "completed", year: "2025" },
  { key: "officeFitout", slug: "office-drywall-fit-out", trade: "drywall", status: "completed", year: "2023" },
  { key: "clinicFitout", slug: "outpatient-clinic-fit-out", trade: "drywall", status: "completed", year: "2024" },
  { key: "apartmentReroof", slug: "apartment-block-reroof", trade: "roofing", status: "completed", year: "2025" },
  { key: "retainingWall", slug: "reinforced-retaining-wall", trade: "masonry", status: "completed", year: "2023" },
  // Live + upcoming work.
  { key: "industrialRoof", slug: "industrial-hall-reroofing", trade: "roofing", status: "inProgress", year: "2026" },
  { key: "brickFacade", slug: "brick-facade-and-masonry", trade: "masonry", status: "inProgress", year: "2026" },
  { key: "solarCarport", slug: "solar-carport-with-ev-charging", trade: "solar", status: "planned", year: "2026" },
];

export const PROJECT_SLUGS: ReadonlyArray<string> = FEATURED_PROJECTS.map(
  (p) => p.slug,
);

export function getProjectBySlug(slug: string): FeaturedProject | undefined {
  return FEATURED_PROJECTS.find((p) => p.slug === slug);
}

// Up to `limit` other projects sharing the trade (falls back to any trade so the
// "related" rail is never near-empty).
export function relatedProjects(
  project: FeaturedProject,
  limit = 3,
): FeaturedProject[] {
  const others = FEATURED_PROJECTS.filter((p) => p.key !== project.key);
  const sameTrade = others.filter((p) => p.trade === project.trade);
  const rest = others.filter((p) => p.trade !== project.trade);
  return [...sameTrade, ...rest].slice(0, limit);
}
