import type { ServiceSlug } from "@/lib/services";

// Single source of truth for real marketing photography. Files live in
// /public/images/marketing (license-clean Pexels photos — see CREDITS.md). A
// slot is `null` when no suitable photo has been sourced; components then fall
// back to the branded TradeImagePlaceholder. Flip a slot to null to revert it
// to the placeholder.

const BASE = "/images/marketing";

export const HERO_IMAGE: string | null = `${BASE}/hero.jpg`;

export const TRADE_IMAGE: Record<ServiceSlug, string | null> = {
  solar: `${BASE}/trade-solar.jpg`,
  electrical: `${BASE}/trade-electrical.jpg`,
  drywall: `${BASE}/trade-drywall.jpg`,
  masonry: `${BASE}/trade-masonry.jpg`,
  roofing: `${BASE}/trade-roofing.jpg`,
};

export const PROJECT_IMAGE: Record<string, string | null> = {
  solarFarm: `${BASE}/project-solarFarm.jpg`,
  officeFitout: `${BASE}/project-officeFitout.jpg`,
  retailWiring: `${BASE}/project-retailWiring.jpg`,
  industrialRoof: `${BASE}/project-industrialRoof.jpg`,
  brickFacade: `${BASE}/project-brickFacade.jpg`,
  solarCarport: `${BASE}/project-solarCarport.jpg`,
};
