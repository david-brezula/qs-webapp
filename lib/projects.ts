import type { ServiceSlug } from "@/lib/services";

export type FeaturedProject = {
  key: string;        // matches home.featuredProjects.items.<key>
  trade: ServiceSlug; // for the trade icon via getService(trade).icon
};

export const FEATURED_PROJECTS: ReadonlyArray<FeaturedProject> = [
  { key: "solarFarm", trade: "solar" },
  { key: "officeFitout", trade: "drywall" },
  { key: "industrialRoof", trade: "roofing" },
  { key: "retailWiring", trade: "electrical" },
];
