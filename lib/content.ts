export const NAV_LINKS = [
  { label: "Capabilities", href: "#capabilities" },
  { label: "Method", href: "#process" },
  { label: "Projects", href: "#projects" },
  { label: "Coverage", href: "#coverage" },
  { label: "Standards", href: "#certifications" },
] as const;

export const HERO = {
  eyebrow: "Solar EPC subcontractor · est. Slovakia",
  headline: "Quiet, exact solar construction — from the Alps to the Arctic.",
  sub: "Quantum Sphere mobilises trained European crews for general contractors and EPCs across Germany, Austria, Switzerland and the Nordics. Rooftop, ground‑mount, racking, BOS and commissioning.",
  primaryCta: { label: "Request crew capacity", href: "/contact" },
  secondaryCta: { label: "Download capability dossier", href: "#capabilities" },
};

export const STATS = [
  { value: "612", unit: "MWp", label: "Installed since 2017" },
  { value: "240", unit: "sites", label: "Projects delivered" },
  { value: "14", unit: "crews", label: "Across DACH · Nordics" },
  { value: "0.0", unit: "LTIFR", label: "Last 24 months" },
];

export const CAPABILITIES = [
  {
    icon: "Sun",
    title: "Rooftop systems",
    body:
      "Ballasted and penetrative mounts on industrial, logistics and commercial roofs — from 250 kWp to 8 MWp, with snow‑load engineering for alpine and Nordic regions.",
  },
  {
    icon: "LandPlot",
    title: "Ground‑mount fields",
    body:
      "Pile‑driven and screw‑foundation arrays for utility and community solar. Single‑axis tracker installation a recurring scope across DACH.",
  },
  {
    icon: "Layers",
    title: "Racking & structural",
    body:
      "Schüco, K2 and Schletter racking experience. Carport canopies, agri‑PV substructures, steel and aluminium erection.",
  },
  {
    icon: "Zap",
    title: "Electrical & BOS",
    body:
      "DC string and combiner work, central and string inverter sets, MV transformer support. Crews familiar with VDE 0126, EN 50549 and OVE compliance.",
  },
  {
    icon: "CircuitBoard",
    title: "Commissioning",
    body:
      "Insulation, IV‑curve and EL testing, thermography, performance verification, punch‑list closeout to client and grid‑operator standards.",
  },
  {
    icon: "Wrench",
    title: "Service & repower",
    body:
      "Module exchange, post‑hail response, repowering legacy fields, vegetation control and module cleaning under SLA.",
  },
] as const;

export const PROCESS_STEPS = [
  {
    n: "01",
    title: "Scope",
    body: "We review the layout, BOM and schedule. A fixed quote arrives with assumptions and risks written down.",
  },
  {
    n: "02",
    title: "Mobilise",
    body: "Crews assigned with named foremen, logistics staged, site‑specific safety and DGUV briefing prepared.",
  },
  {
    n: "03",
    title: "Install",
    body: "Daily production reports, photo logs and QA holds. Drone overflights for the GC on weekly intervals.",
  },
  {
    n: "04",
    title: "Commission",
    body: "Witness testing with the EPC. Defect tracking in our portal. Performance sign‑off to grid operator.",
  },
  {
    n: "05",
    title: "Handover",
    body: "As‑builts, warranty package, O&M binder. We stay on call for the first 90 days after energisation.",
  },
];

export const PROJECTS = [
  {
    size: "18.4 MWp",
    location: "Brandenburg, Germany",
    scope: "Ground‑mount",
    role: "Mechanical + DC scope",
  },
  {
    size: "4.2 MWp",
    location: "Styria, Austria",
    scope: "Industrial rooftop",
    role: "Full EPC subcontract",
  },
  {
    size: "26.0 MWp",
    location: "Skåne, Sweden",
    scope: "Tracker field",
    role: "Mechanical scope",
  },
  {
    size: "1.9 MWp",
    location: "Zürich Oberland, Switzerland",
    scope: "Carport canopy",
    role: "Structural + electrical",
  },
  {
    size: "8.7 MWp",
    location: "Jutland, Denmark",
    scope: "Ground‑mount",
    role: "Racking + BOS",
  },
  {
    size: "3.4 MWp",
    location: "Bratislava region, Slovakia",
    scope: "Logistics rooftop",
    role: "Full EPC subcontract",
  },
];

export const CERTIFICATIONS = [
  { label: "Quality", value: "ISO 9001:2015 certified — audited by TÜV SÜD" },
  { label: "Environment", value: "ISO 14001:2015 — carbon accounting on every site" },
  { label: "Safety", value: "ISO 45001 · DGUV qualified site supervisors on every crew" },
  { label: "Trade licence", value: "Electrical contractor in SK, CZ, DE, AT; reciprocity in CH, DK, SE, FI, NO" },
  { label: "Workers", value: "All field staff with Working at Heights and PV‑specific safety modules" },
  { label: "Insurance", value: "€10 M general liability · €5 M professional indemnity" },
];

export const COVERAGE_COUNTRIES = [
  { code: "SK", name: "Slovakia", note: "Headquarters · Bratislava" },
  { code: "DE", name: "Germany", note: "Continuous operations" },
  { code: "AT", name: "Austria", note: "Continuous operations" },
  { code: "CH", name: "Switzerland", note: "Continuous operations" },
  { code: "CZ", name: "Czechia", note: "Continuous operations" },
  { code: "SE", name: "Sweden", note: "Crews on rotation" },
  { code: "NO", name: "Norway", note: "Crews on rotation" },
  { code: "DK", name: "Denmark", note: "Crews on rotation" },
  { code: "FI", name: "Finland", note: "Project basis" },
] as const;

export const TESTIMONIAL = {
  quote:
    "Quantum Sphere arrived with the foremen they promised, kept clean tool‑boxes, and finished the commissioning a week ahead of plan. We hand them our next two German fields without rebidding.",
  attribution: "Construction Director · European EPC, 1 GW pipeline",
};

export const PARTNERS = [
  "Helios Energie",
  "Nordwind Power",
  "Alpenkamm EPC",
  "Solis Group",
  "Brightacre",
  "Vector Renewables",
];

export const CONTACT_CTA = {
  headline: "Send us a project.",
  sub: "Tender documents, a single‑line, even a rough scope — we reply within one business day with crew availability and an indicative price.",
  cta: { label: "Open a request", href: "/contact" },
};

export const FOOTER = {
  address: "Mlynské Nivy 5 · 821 09 Bratislava · Slovak Republic",
  phone: "+421 2 5556 0188",
  email: "rfp@quantumsphere.eu",
  tagline:
    "Solar construction subcontractor headquartered in Bratislava. Building for European EPCs since 2017.",
  vat: "VAT SK2120988117 · IBAN SK 48 1100 0000 0029 4502 1733",
};

export const CONTACT_SCOPE_OPTIONS = [
  "Rooftop",
  "Ground‑mount",
  "Racking & structural",
  "Electrical & BOS",
  "Commissioning",
  "Service & repower",
] as const;

export const EU_COUNTRIES = [
  "Slovakia",
  "Czechia",
  "Germany",
  "Austria",
  "Switzerland",
  "Poland",
  "Hungary",
  "Slovenia",
  "Croatia",
  "Italy",
  "France",
  "Netherlands",
  "Belgium",
  "Luxembourg",
  "Denmark",
  "Sweden",
  "Norway",
  "Finland",
  "Estonia",
  "Latvia",
  "Lithuania",
  "Ireland",
  "United Kingdom",
  "Spain",
  "Portugal",
  "Romania",
  "Bulgaria",
] as const;

