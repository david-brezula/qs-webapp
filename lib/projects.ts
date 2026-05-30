import type { ServiceSlug } from "@/lib/services";

export type ProjectStatus = "completed" | "inProgress" | "planned";

export type FeaturedProject = {
  key: string; // matches home.featuredProjects.items.<key>
  trade: ServiceSlug; // trade icon + accent colour
  status: ProjectStatus; // drives the status badge + portfolio status concept
};

// Illustrative portfolio entries — replace with real projects + photos before
// launch (see memory: qs-web-legal-placeholders). Covers all five trades and
// all three statuses so the portfolio tabs + "in the works" state are populated.
export const FEATURED_PROJECTS: ReadonlyArray<FeaturedProject> = [
  { key: "solarFarm", trade: "solar", status: "completed" },
  { key: "officeFitout", trade: "drywall", status: "completed" },
  { key: "retailWiring", trade: "electrical", status: "completed" },
  { key: "industrialRoof", trade: "roofing", status: "inProgress" },
  { key: "brickFacade", trade: "masonry", status: "inProgress" },
  { key: "solarCarport", trade: "solar", status: "planned" },
];
