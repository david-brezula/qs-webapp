export const NAV_LINKS = [
  { label: "Capabilities", href: "#capabilities" },
  { label: "Process", href: "#process" },
  { label: "Projects", href: "#projects" },
  { label: "Coverage", href: "#coverage" },
  { label: "Certifications", href: "#certifications" },
] as const;

export const HERO = {
  eyebrow: "Solar construction subcontractor",
  headline: "Solar subcontracting at utility scale.",
  sub: "Quantum Sphere mobilizes experienced crews for general contractors and EPCs building utility, commercial, and industrial solar across the United States.",
  primaryCta: { label: "Request capacity", href: "/contact" },
  secondaryCta: { label: "Download capabilities deck", href: "#" },
};

export const STATS = [
  { value: "420+", label: "MW installed" },
  { value: "180+", label: "Projects completed" },
  { value: "12", label: "Field crews available" },
  { value: "0.78", label: "EMR (3-yr avg)" },
];

export const CAPABILITIES = [
  {
    icon: "Sun",
    title: "Rooftop solar",
    body: "Ballasted and penetration-mount systems on commercial and industrial roofs, from 100 kW to 5 MW.",
  },
  {
    icon: "LandPlot",
    title: "Ground-mount",
    body: "Pile-driven and concrete-foundation arrays for utility-scale and community solar.",
  },
  {
    icon: "Layers",
    title: "Racking & structural",
    body: "Tracker installs, fixed-tilt racking, canopy structures, and steel erection.",
  },
  {
    icon: "Zap",
    title: "Electrical & BOS",
    body: "DC field wiring, combiner boxes, inverter sets, MV/HV interconnect support.",
  },
  {
    icon: "CircuitBoard",
    title: "Commissioning",
    body: "Megger and IV-curve testing, performance verification, punch-list closeout.",
  },
  {
    icon: "Wrench",
    title: "O&M and rework",
    body: "Module swaps, repower, post-storm response, vegetation and washing.",
  },
] as const;

export const PROCESS_STEPS = [
  { n: "01", title: "Scope", body: "Review drawings, BOM, schedule. Hard quote with assumptions called out." },
  { n: "02", title: "Mobilize", body: "Crew assignment, equipment staging, site-specific safety plan." },
  { n: "03", title: "Install", body: "Daily production reporting, QA holds, drone progress for the GC." },
  { n: "04", title: "Commission", body: "Test plan execution, defect logging, performance sign-off." },
  { n: "05", title: "Handoff", body: "As-builts, warranty package, O&M binder, post-energization support." },
];

export const PROJECTS = [
  { size: "12.4 MWac", location: "West Texas, TX", scope: "Ground-mount", role: "Full EPC subcontract" },
  { size: "3.2 MWdc", location: "Fresno County, CA", scope: "Rooftop", role: "Mechanical + electrical" },
  { size: "48 MWdc", location: "Maricopa County, AZ", scope: "Tracker install", role: "Mechanical scope" },
  { size: "1.8 MWdc", location: "Hudson Valley, NY", scope: "Community solar", role: "Full EPC subcontract" },
  { size: "6.5 MWdc", location: "Polk County, IA", scope: "Ground-mount", role: "Racking + electrical" },
  { size: "950 kWdc", location: "Lehigh Valley, PA", scope: "Carport canopy", role: "Mechanical scope" },
];

export const CERTIFICATIONS = [
  { label: "NABCEP", value: "PV Installation Professional on every crew" },
  { label: "Safety", value: "OSHA-30 site supervision; OSHA-10 all field staff" },
  { label: "Licensing", value: "Electrical contractor licensed in 12 states" },
  { label: "EMR", value: "0.78 three-year average" },
  { label: "Insurance", value: "$10M general liability, $5M umbrella" },
];

export const COVERAGE_STATES = [
  "TX", "CA", "AZ", "NV", "NM", "CO", "IA", "IL", "NY", "NJ", "PA", "MA",
];

export const TESTIMONIAL = {
  quote:
    "Quantum Sphere has been our go-to subcontractor for the last four utility projects. They show up with the crews they promised and hit every commissioning milestone we set.",
  attribution: "VP of Construction, Tier-1 Solar EPC",
};

export const PARTNERS = [
  "Helios EPC", "Northwind Energy", "Ridgeline Power", "Solis Group", "Bright Acre", "Vector Renewables",
];

export const CONTACT_CTA = {
  headline: "Subcontract with us.",
  sub: "Send us a project. We'll respond within one business day with crew availability and a working estimate.",
  cta: { label: "Start an RFP", href: "/contact" },
};

export const FOOTER = {
  address: "1450 Industry Way, Suite 200 · Denver, CO 80202",
  phone: "(303) 555-0188",
  email: "rfp@quantumsphere.example",
  tagline: "Built for solar EPCs and general contractors.",
};

export const CONTACT_SCOPE_OPTIONS = [
  "Rooftop",
  "Ground-mount",
  "Racking & structural",
  "Electrical & BOS",
  "Commissioning",
  "O&M",
] as const;

export const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
] as const;
