export type EnrichmentMode =
  | "digital_agency"
  | "insurance_sales"
  | "fintech_lending"
  | "solar_energy"
  | "telecom_sales"
  | "healthcare_services"
  | "recruiter"
  | "general";

export interface ModeConfig {
  key: EnrichmentMode;
  label: string;
  description: string;
  targetTitles: string[];   // role keywords to prioritise in contact extraction
  scoringFrame: string;     // injected into Gemini scoring prompt
  outreachAngle: string;    // injected into Gemini opener prompt
  signalFocus: string[];    // labels shown in the UI as "what this mode looks for"
}

export const MODES: Record<EnrichmentMode, ModeConfig> = {
  digital_agency: {
    key:         "digital_agency",
    label:       "Digital / Agency Sales",
    description: "Selling web development, SEO, paid ads, or marketing software to SMBs",
    targetTitles: ["marketing manager", "digital lead", "IT manager", "director"],
    scoringFrame: "Score based on digital gaps: missing analytics, no booking system, no live chat, outdated tech stack, no Meta pixel. Higher score = more problems you can solve.",
    outreachAngle: "Reference the specific digital gap you found — missing booking system, no online presence, outdated website. Make the cost of inaction concrete (missed bookings, lost leads).",
    signalFocus: ["tech stack gaps", "no analytics", "no booking system", "no Meta pixel", "no live chat"],
  },

  insurance_sales: {
    key:         "insurance_sales",
    label:       "Insurance Sales",
    description: "Selling group medical, business property, motor fleet, or liability cover to SMBs",
    targetTitles: ["owner", "proprietor", "director", "HR manager", "admin manager"],
    scoringFrame: "Score based on: business maturity (established = budget for cover), staff count signals (any hiring/team language = group medical opportunity), fleet signals (delivery, logistics = motor cover), physical premises (premises = property cover need). Ignore tech stack.",
    outreachAngle: "Reference the specific risk exposure — staff without group cover, delivery fleet without comprehensive cover, physical premises without property insurance. Quantify the downside: one claim without cover wipes out months of profit.",
    signalFocus: ["business age", "staff count signals", "fleet/delivery", "physical premises", "expansion"],
  },

  fintech_lending: {
    key:         "fintech_lending",
    label:       "Fintech / Lending",
    description: "Selling business loans, invoice financing, equipment leasing, or trade credit",
    targetTitles: ["owner", "proprietor", "founder", "director", "CFO"],
    scoringFrame: "Score based on: growth signals (expanding = needs capital), business maturity (established 3+ years = creditworthy), high review volume (turnover proxy = repayment capacity), wholesale/bulk operations (working capital need). Strong candidate = growing, established, high-volume business.",
    outreachAngle: "Reference the specific growth signal — new branch opening, expansion, high order volume. Frame the offer as fuel for what they're already doing, not a lifeline. 'You're growing — here's the capital to do it faster.'",
    signalFocus: ["business age", "expansion signals", "revenue proxies", "wholesale volume", "growth language"],
  },

  solar_energy: {
    key:         "solar_energy",
    label:       "Solar / Clean Energy",
    description: "Selling commercial rooftop solar, backup power, or energy management systems",
    targetTitles: ["owner", "GM", "operations manager", "facilities manager", "director"],
    scoringFrame: "Score based on energy consumption proxies: restaurants (high consumption), hospitals/clinics (24h power need), hotels (large premises), manufacturers (industrial load), businesses that mention generator/inverter/load shedding (already feel the pain). High score = high electricity bill = strong solar ROI.",
    outreachAngle: "Lead with their specific energy consumption signal — large premises, 24-hour operation, or generator dependency. Convert their current electricity bill into a monthly saving figure. 'Businesses like yours cut their KPLC bill by 60–80% in year one.'",
    signalFocus: ["high consumption vertical", "24hr operation", "generator/inverter mention", "large premises", "industrial load"],
  },

  telecom_sales: {
    key:         "telecom_sales",
    label:       "Telecom / Connectivity",
    description: "Selling business fibre, cloud services, M-PESA Business, or VoIP to SMBs",
    targetTitles: ["IT manager", "operations manager", "owner", "office manager", "director"],
    scoringFrame: "Score based on connectivity gaps: no SSL on website (cheap hosting = cheap internet), slow/basic website (not on fibre), no cloud tools detected, no online payment system, multiple branches (multi-site connectivity opportunity). High score = clear upgrade opportunity.",
    outreachAngle: "Reference the specific connectivity signal — no SSL, basic hosting, no cloud payment. Frame as a productivity and reliability issue: 'Your competitors on fibre load their payment page in under 2 seconds. Yours takes 8.'",
    signalFocus: ["no SSL", "basic hosting provider", "no cloud tools", "multi-location", "no online payments"],
  },

  healthcare_services: {
    key:         "healthcare_services",
    label:       "Healthcare Services / Pharma",
    description: "Selling medical software, equipment, pharma products, or services to private health facilities",
    targetTitles: ["Dr.", "doctor", "clinical director", "practice owner", "practice manager", "proprietor"],
    scoringFrame: "Score based on: patient volume (high reviews = busy practice = revenue = budget), no booking system (major operational gap), specialisations listed (more services = more equipment/software needs), established practice (longer tenure = capital for upgrades). Ignore generic tech stack.",
    outreachAngle: "Reference the patient volume and the operational gap — high rating + no booking system = they're busy but losing appointments to no-shows and after-hours calls. 'Your 4.8★ tells me patients trust you. The gap is capturing all of them.'",
    signalFocus: ["patient volume", "no booking system", "specialisations listed", "established practice", "multiple practitioners"],
  },

  recruiter: {
    key:         "recruiter",
    label:       "Recruitment / Staffing",
    description: "Finding growing companies that need to hire or retain talent",
    targetTitles: ["HR manager", "people lead", "talent acquisition", "director of HR", "head of people", "CEO", "founder"],
    scoringFrame: "Score based on growth signals: active hiring posts, expansion/new location language, high review volume (busy = understaffed), established and growing (stable = can afford placements), multiple departments or specialisations listed (complex org = ongoing hiring need). Ignore tech stack entirely.",
    outreachAngle: "Reference the specific growth signal — new branch, job postings, or expansion. Frame the offer around speed-to-hire and quality: 'You're growing — the bottleneck is finding the right people quickly.'",
    signalFocus: ["active hiring signals", "expansion", "new locations", "team size signals", "multiple departments"],
  },

  general: {
    key:         "general",
    label:       "General B2B",
    description: "Generic B2B outreach — Hunter will use all available signals",
    targetTitles: ["owner", "director", "manager", "founder", "proprietor", "CEO"],
    scoringFrame: "Score holistically: reachability, business maturity, revenue signals, operational gaps, and digital presence. Balance all signals.",
    outreachAngle: "Lead with the most compelling single pain signal found — the one most likely to cost them money or customers every day.",
    signalFocus: ["all signals", "reachability", "business maturity", "operational gaps"],
  },
};

export const MODE_OPTIONS = Object.values(MODES).map(({ key, label, description }) => ({ key, label, description }));

export function getMode(key: string | null | undefined): ModeConfig {
  return MODES[(key as EnrichmentMode) ?? "general"] ?? MODES.general;
}
