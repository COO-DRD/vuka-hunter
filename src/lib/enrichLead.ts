// ─── Enrichment v2: vertical-aware, social-intelligent ───────────────────────
// Every vertical gets tailored subpage crawling, signal detection, and social
// intelligence. The system adapts what it looks for based on the industry,
// not a single tech-agency lens.

export interface OrgProfile {
  use_case?: string | null;
  priority_signals?: string[] | null;
  target_description?: string | null;
  org_description?: string | null;
}

// ─── URL safety ──────────────────────────────────────────────────────────────

export function isSafeUrl(raw: string): boolean {
  let parsed: URL;
  try { parsed = new URL(raw); } catch { return false; }
  if (!["http:", "https:"].includes(parsed.protocol)) return false;
  const h = parsed.hostname.toLowerCase();
  if (/^(?:0x[0-9a-f]+|[0-9]+)$/i.test(h)) return false;
  if (/^\d+\.\d+$/.test(h) || /^\d+\.\d+\.\d+$/.test(h)) return false;
  if (["localhost", "0.0.0.0", "::1"].includes(h)) return false;
  if (/^127\./.test(h) || /^10\./.test(h)) return false;
  if (/^172\.(1[6-9]|2[0-9]|3[01])\./.test(h)) return false;
  if (/^192\.168\./.test(h) || /^169\.254\./.test(h)) return false;
  if (h === "metadata.google.internal") return false;
  if (h.endsWith(".local") || h.endsWith(".internal") || h.endsWith(".localhost")) return false;
  return true;
}

// ─── HTTP fetch ──────────────────────────────────────────────────────────────

async function fetchPage(url: string, signal: AbortSignal): Promise<string> {
  const res = await fetch(url, {
    signal,
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; 4UNTER-Enricher/2.0; +https://hunter.dullugroup.co.ke)",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9,sw;q=0.8",
    },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("text")) throw new Error("Non-text response");
  return res.text();
}

// ─── Vertical configuration ───────────────────────────────────────────────────
// Each vertical defines:
//  subpages   — additional URLs to crawl beyond homepage/contact/about
//  signals    — {label, regex} pairs for positive detection
//  gaps       — things that SHOULD exist but don't (pain signal when missing)
//  decisionTitles — role keywords for Gemini contact extraction

interface VerticalConfig {
  subpages: string[];
  signals: Array<{ label: string; re: RegExp }>;
  gaps: Array<{ label: string; present: RegExp }>;
  decisionTitles: string[];
}

const GENERIC: VerticalConfig = {
  subpages: [],
  signals: [],
  gaps: [],
  decisionTitles: ["owner", "director", "manager", "founder", "proprietor", "CEO"],
};

const VERTICAL_CONFIG: Record<string, VerticalConfig> = {
  dental: {
    subpages: ["/services", "/treatments", "/dentists", "/our-team", "/pricing"],
    signals: [
      { label: "implants",            re: /dental implant|implant[s]?\s+(?:available|clinic)/i },
      { label: "orthodontics",        re: /orthodontic|braces|invisalign|aligner/i },
      { label: "cosmetic dentistry",  re: /whitening|veneer|cosmetic dent/i },
      { label: "emergency dental",    re: /emergency|same.day|urgent\s+dent/i },
      { label: "multiple dentists",   re: /dr\.\s+\w+[^.]*dr\.\s+\w+/i },
      { label: "NHIF accredited",     re: /nhif|national\s+hospital\s+insurance/i },
      { label: "dental X-ray",        re: /x.ray|radiograph|panoramic|cbct/i },
    ],
    gaps: [
      { label: "no online booking",  present: /book\s+appointment|schedule\s+online|book\s+now|online\s+booking/i },
      { label: "no WhatsApp contact", present: /wa\.me|whatsapp/i },
    ],
    decisionTitles: ["Dr.", "Principal Dentist", "Practice Owner", "Clinic Director", "proprietor"],
  },

  clinic: {
    subpages: ["/services", "/specialists", "/doctors", "/departments", "/our-team"],
    signals: [
      { label: "specialisations",     re: /obs\s*&?\s*gyn|paediatric|surgery|internal medicine|dermatolog/i },
      { label: "lab services",        re: /laboratory|lab\s+test|blood\s+test|pathology/i },
      { label: "pharmacy on-site",    re: /pharmacy|dispensary/i },
      { label: "emergency unit",      re: /emergency|casualty|24.?hour/i },
      { label: "NHIF accredited",     re: /nhif|national\s+hospital/i },
      { label: "multiple doctors",    re: /dr\.\s+\w+[^.]*dr\.\s+\w+/i },
    ],
    gaps: [
      { label: "no online booking",  present: /book|appointment|schedule/i },
      { label: "no WhatsApp",        present: /wa\.me|whatsapp/i },
    ],
    decisionTitles: ["Dr.", "Medical Director", "Clinical Director", "Practice Owner", "Clinic Manager"],
  },

  hospital: {
    subpages: ["/departments", "/specialists", "/services", "/doctors", "/facilities"],
    signals: [
      { label: "ICU / critical care",  re: /icu|intensive\s+care|critical\s+care/i },
      { label: "maternity wing",       re: /maternity|labour|delivery\s+room|mother\s+&?\s+baby/i },
      { label: "radiology / imaging",  re: /radiology|mri|ct\s+scan|ultrasound|imaging/i },
      { label: "theatre / surgery",    re: /theatre|operating\s+room|surgery\s+unit/i },
      { label: "NHIF / insurance",     re: /nhif|insurance\s+accepted|medical\s+cover/i },
      { label: "ISO certified",        re: /iso\s*9001|iso\s*15189|accredited\s+hospital/i },
    ],
    gaps: [
      { label: "no appointment booking", present: /appointment|book|schedule/i },
    ],
    decisionTitles: ["CEO", "Medical Director", "COO", "Marketing Director", "Admin Manager"],
  },

  physio: {
    subpages: ["/services", "/treatments", "/team", "/therapists"],
    signals: [
      { label: "sports physio",      re: /sports\s+physio|athletic\s+rehab|sports\s+injury/i },
      { label: "post-op rehab",      re: /post.op|post.surgical|rehabilitation\s+after/i },
      { label: "home visits",        re: /home\s+visit|we\s+come\s+to\s+you|mobile\s+physio/i },
      { label: "hydrotherapy",       re: /hydro|pool\s+therapy|aqua\s+therapy/i },
      { label: "multiple therapists", re: /physiotherapist[s]?\s*[:·|]\s*\d+|team\s+of\s+\d+/i },
    ],
    gaps: [
      { label: "no online booking",  present: /book|appointment|schedule/i },
    ],
    decisionTitles: ["Physiotherapist", "Practice Owner", "Clinical Director", "Proprietor"],
  },

  hotel: {
    subpages: ["/rooms", "/facilities", "/events", "/restaurant", "/gallery", "/meetings"],
    signals: [
      { label: "conference facilities", re: /conference|meeting\s+room|boardroom|events\s+space/i },
      { label: "wedding venue",         re: /wedding|reception|bridal/i },
      { label: "pool / gym",            re: /swimming\s+pool|gym|fitness\s+centre/i },
      { label: "restaurant on-site",    re: /restaurant|dining|bar\s*&?\s*grill/i },
      { label: "OTA listed",            re: /booking\.com|expedia|hotels\.com|airbnb|trip\s*advisor/i },
      { label: "airport transfer",      re: /airport\s+transfer|shuttle|pickup/i },
    ],
    gaps: [
      { label: "no direct booking",  present: /book\s+now|reserve\s+room|check\s+availability|book\s+direct/i },
    ],
    decisionTitles: ["General Manager", "GM", "Revenue Manager", "Sales Manager", "Proprietor"],
  },

  restaurant: {
    subpages: ["/menu", "/delivery", "/reservations", "/catering", "/gallery"],
    signals: [
      { label: "delivery app listed",  re: /glovo|uber\s+eat|bolt\s+food|jumia\s+food/i },
      { label: "online menu",          re: /view\s+menu|see\s+menu|our\s+menu\s+online|pdf\s+menu/i },
      { label: "table reservations",   re: /reserv|table\s+booking|book\s+a\s+table/i },
      { label: "catering available",   re: /catering|events\s+catering|corporate\s+catering/i },
      { label: "alcohol license",      re: /bar|wine\s+list|cocktail|spirits|alcohol/i },
      { label: "outdoor seating",      re: /outdoor|alfresco|terrace|garden\s+seating/i },
    ],
    gaps: [
      { label: "no delivery",        present: /glovo|uber\s+eat|bolt\s+food|jumia|delivery/i },
      { label: "no online ordering", present: /order\s+online|online\s+order/i },
    ],
    decisionTitles: ["Owner", "Manager", "GM", "Proprietor", "Chef Owner"],
  },

  real_estate: {
    subpages: ["/listings", "/properties", "/agents", "/our-team", "/services"],
    signals: [
      { label: "property management",  re: /property\s+manag|landlord\s+service/i },
      { label: "off-plan sales",       re: /off.plan|pre.construction|under\s+construction|new\s+development/i },
      { label: "mortgage advice",      re: /mortgage|financing|bank\s+loan|home\s+loan/i },
      { label: "commercial property",  re: /commercial|office\s+space|retail\s+space|warehouse/i },
      { label: "multiple agents",      re: /our\s+agents|meet\s+the\s+team|sales\s+team/i },
      { label: "valuation services",   re: /valuation|property\s+value|market\s+appraisal/i },
    ],
    gaps: [
      { label: "no property listings", present: /bedroom|acres|sq\s*ft|sq\s*m|for\s+sale|for\s+rent/i },
    ],
    decisionTitles: ["Director", "CEO", "Principal Agent", "Sales Manager", "Proprietor"],
  },

  law_firm: {
    subpages: ["/practice-areas", "/areas-of-practice", "/team", "/advocates", "/services"],
    signals: [
      { label: "conveyancing / land", re: /conveyancing|land\s+law|property\s+law|title\s+deed/i },
      { label: "corporate law",       re: /corporate\s+law|company\s+incorporation|mergers|M&A/i },
      { label: "family law",          re: /family\s+law|divorce|custody|matrimonial/i },
      { label: "litigation",          re: /litigation|court\s+matters|dispute\s+resolution|arbitration/i },
      { label: "employment law",      re: /employment\s+law|labour\s+law|workplace/i },
      { label: "multiple advocates",  re: /partners|advocates.*partners|LLP/i },
    ],
    gaps: [
      { label: "no consultation booking", present: /consult|book|appointment|free\s+(?:initial|first)/i },
    ],
    decisionTitles: ["Advocate", "Partner", "Senior Partner", "Managing Partner", "Principal"],
  },

  accounting: {
    subpages: ["/services", "/our-team", "/about"],
    signals: [
      { label: "audit services",    re: /audit|statutory\s+audit|external\s+audit/i },
      { label: "tax advisory",      re: /tax\s+(?:advisory|compliance|planning|filing)|kra/i },
      { label: "payroll",           re: /payroll|paye|statutory\s+deductions/i },
      { label: "company secretary", re: /company\s+secretar|business\s+registration|incorporation/i },
      { label: "ICPAK member",      re: /icpak|cpak|certified\s+public\s+accountant/i },
      { label: "cloud accounting",  re: /quickbooks|xero|sage|cloud\s+accounting/i },
    ],
    gaps: [
      { label: "no online consultation", present: /book|consult|appointment|free\s+consultation/i },
    ],
    decisionTitles: ["CPA", "Partner", "Senior Manager", "Managing Director", "Proprietor"],
  },

  private_school: {
    subpages: ["/admissions", "/curriculum", "/facilities", "/our-team", "/fees"],
    signals: [
      { label: "CBC curriculum",      re: /cbc|competency\s+based|pp1|pp2/i },
      { label: "boarding school",     re: /boarding|dormitory|hostels/i },
      { label: "IGCSE / IB",          re: /igcse|ib\s+diploma|international\s+baccalaureate/i },
      { label: "school bus",          re: /school\s+bus|transport|pickup\s+route/i },
      { label: "online fees payment", re: /pay\s+fees|fee\s+payment\s+online|mpesa|bank\s+transfer/i },
      { label: "after-school clubs",  re: /clubs?\s+&?\s+activities|after\s+school|co.curricular/i },
    ],
    gaps: [
      { label: "no online admissions form", present: /apply\s+online|admission\s+form|enroll\s+online/i },
    ],
    decisionTitles: ["Principal", "Headmaster", "Headmistress", "Director", "Proprietor"],
  },

  gym: {
    subpages: ["/classes", "/membership", "/personal-training", "/schedule", "/trainers"],
    signals: [
      { label: "group classes",       re: /zumba|yoga|pilates|spin|hiit|crossfit|bootcamp/i },
      { label: "personal training",   re: /personal\s+train|PT\s+sessions|1.on.1|one.to.one/i },
      { label: "membership tiers",    re: /basic|premium|vip\s+member|monthly\s+plan|annual\s+plan/i },
      { label: "nutrition services",  re: /nutrition|diet\s+plan|meal\s+plan|nutritionist/i },
      { label: "sports physio on-site",re: /physio|sports\s+therapy|massage\s+therapy/i },
    ],
    gaps: [
      { label: "no online class booking", present: /book\s+class|reserve\s+spot|class\s+schedule\s+online/i },
      { label: "no WhatsApp inquiry",     present: /wa\.me|whatsapp/i },
    ],
    decisionTitles: ["Owner", "Manager", "General Manager", "Director", "Proprietor"],
  },

  salon: {
    subpages: ["/services", "/pricing", "/gallery", "/book", "/team"],
    signals: [
      { label: "hair services",      re: /relaxer|natural\s+hair|braids|weave|loc[ks]|colouring/i },
      { label: "nail services",      re: /manicure|pedicure|gel\s+nails|acrylic/i },
      { label: "spa treatments",     re: /facial|massage|body\s+scrub|waxing|threading/i },
      { label: "bridal packages",    re: /bridal|wedding\s+package|bride/i },
      { label: "home visits",        re: /home\s+service|mobile\s+salon|we\s+come\s+to\s+you/i },
    ],
    gaps: [
      { label: "no online booking",  present: /book|appointment|reserve/i },
    ],
    decisionTitles: ["Owner", "Proprietor", "Salon Manager", "Director"],
  },

  insurance: {
    subpages: ["/products", "/services", "/about", "/team", "/claims"],
    signals: [
      { label: "medical cover",       re: /medical\s+(?:insurance|cover)|group\s+(?:medical|life)/i },
      { label: "motor insurance",     re: /motor\s+(?:insurance|cover|vehicle)|comprehensive\s+cover/i },
      { label: "property insurance",  re: /property\s+(?:insurance|cover)|fire\s+&?\s+perils/i },
      { label: "life insurance",      re: /life\s+(?:insurance|assurance|cover)/i },
      { label: "IRA / AKI regulated", re: /ira\s+kenya|insurance\s+regulatory|aki|association\s+of\s+kenya\s+insur/i },
      { label: "online quote",        re: /get\s+a\s+quote|request\s+quote|instant\s+quote/i },
    ],
    gaps: [
      { label: "no online quote",     present: /quote|apply|get\s+started/i },
    ],
    decisionTitles: ["Agent", "Manager", "Director", "Principal Officer", "CEO"],
  },

  sacco: {
    subpages: ["/products", "/loans", "/savings", "/membership", "/about"],
    signals: [
      { label: "loan products",       re: /emergency\s+loan|development\s+loan|school\s+fees\s+loan|bosa|fosa/i },
      { label: "savings accounts",    re: /savings|deposit|shares|fixed\s+deposit/i },
      { label: "SASRA regulated",     re: /sasra|sacco\s+societies\s+regulatory/i },
      { label: "mobile banking",      re: /mobile\s+banking|m.pesa|app|ussd/i },
      { label: "dividend / interest", re: /dividend|interest\s+on\s+deposit|interest\s+rebate/i },
    ],
    gaps: [
      { label: "no member portal",    present: /member\s+portal|online\s+banking|self.service/i },
    ],
    decisionTitles: ["CEO", "Manager", "Chairman", "Secretary", "Credit Manager"],
  },

  it_company: {
    subpages: ["/services", "/portfolio", "/case-studies", "/team", "/clients"],
    signals: [
      { label: "web development",     re: /web\s+dev|website\s+design|web\s+app/i },
      { label: "mobile development",  re: /mobile\s+app|android|ios\s+app|flutter|react\s+native/i },
      { label: "cloud services",      re: /cloud|aws|azure|google\s+cloud|hosting/i },
      { label: "cybersecurity",       re: /cyber.?security|penetration\s+test|security\s+audit|firewall/i },
      { label: "ERP / POS systems",   re: /erp|pos\s+system|odoo|sage|navision|navision/i },
      { label: "ISO 27001",           re: /iso\s*27001|information\s+security\s+certified/i },
    ],
    gaps: [
      { label: "no portfolio",        present: /portfolio|our\s+work|case\s+stud|clients/i },
    ],
    decisionTitles: ["CEO", "Founder", "CTO", "MD", "Sales Director", "Director"],
  },

  digital_agency: {
    subpages: ["/services", "/portfolio", "/case-studies", "/team", "/work"],
    signals: [
      { label: "SEO services",        re: /seo|search\s+engine\s+optim/i },
      { label: "paid ads",            re: /google\s+ads|facebook\s+ads|meta\s+ads|ppc|sem/i },
      { label: "social media mgmt",   re: /social\s+media\s+manag|community\s+manag/i },
      { label: "branding / design",   re: /branding|brand\s+identity|logo\s+design|graphic\s+design/i },
      { label: "content marketing",   re: /content\s+marketing|blog|copywriting/i },
      { label: "certified agency",    re: /google\s+partner|meta\s+partner|certified\s+agency/i },
    ],
    gaps: [
      { label: "no case studies",     present: /case\s+stud|results|portfolio|our\s+work/i },
    ],
    decisionTitles: ["Director", "CEO", "Founder", "MD", "Creative Director"],
  },

  auto_workshop: {
    subpages: ["/services", "/about"],
    signals: [
      { label: "body & paint",          re: /body\s+(?:work|repair)|panel\s+beating|spray\s+paint/i },
      { label: "diagnostic services",   re: /diagnostic|computer\s+scan|engine\s+diagnostic/i },
      { label: "tyres & wheel",         re: /tyre|tire|wheel\s+alignment|wheel\s+balancing/i },
      { label: "electrical services",   re: /auto\s+electrical|car\s+electrical|wiring/i },
      { label: "warranty on repairs",   re: /warranty|guarantee\s+on\s+repair|workmanship\s+guarantee/i },
      { label: "mobile mechanic",       re: /mobile\s+mechanic|roadside|breakdown\s+service/i },
    ],
    gaps: [
      { label: "no service booking",   present: /book|service\s+appointment|bring\s+your\s+car\s+in/i },
    ],
    decisionTitles: ["Owner", "Proprietor", "Manager", "Master Technician"],
  },

  construction: {
    subpages: ["/projects", "/portfolio", "/services", "/team", "/certifications"],
    signals: [
      { label: "residential projects", re: /residential|bungalow|apartment|maisonette/i },
      { label: "commercial projects",  re: /commercial|office\s+block|shopping\s+mall|warehouse/i },
      { label: "NCA registered",       re: /nca|national\s+construction\s+authority|class\s+\d+/i },
      { label: "ISO 9001",             re: /iso\s*9001|quality\s+management/i },
      { label: "own equipment",        re: /crane|excavator|bulldozer|equipment\s+fleet/i },
      { label: "project portfolio",    re: /completed\s+projects|our\s+projects|portfolio/i },
    ],
    gaps: [
      { label: "no project portfolio", present: /project|portfolio|completed\s+work/i },
    ],
    decisionTitles: ["Director", "CEO", "Project Manager", "MD", "Site Manager"],
  },

  pharmacy: {
    subpages: ["/services", "/products", "/about"],
    signals: [
      { label: "prescription filling",  re: /prescription|prescription\s+fill/i },
      { label: "delivery service",      re: /delivery|free\s+delivery|deliver\s+to\s+you/i },
      { label: "compounding",           re: /compound|compounding\s+pharmacy/i },
      { label: "medical equipment",     re: /blood\s+pressure|glucometer|wheelchair|crutches|medical\s+equipment/i },
      { label: "MPDB licensed",         re: /pharmacy\s+and\s+poisons\s+board|ppb|licensed\s+pharmacy/i },
    ],
    gaps: [
      { label: "no online ordering",    present: /order\s+online|shop\s+online|buy\s+online|delivery/i },
    ],
    decisionTitles: ["Pharmacist", "Proprietor", "Owner", "Manager"],
  },

  driving_school: {
    subpages: ["/courses", "/pricing", "/about", "/instructors"],
    signals: [
      { label: "NTSA approved",         re: /ntsa|national\s+transport\s+&?\s+safety|approved\s+driving/i },
      { label: "online theory lessons", re: /online\s+lesson|e.learning|theory\s+online/i },
      { label: "automatic class",       re: /automatic|auto\s+transmission/i },
      { label: "motorcycle training",   re: /motorcycle|boda\s+boda|motorbike\s+class/i },
      { label: "refresher courses",     re: /refresher|experienced\s+driver|upgrade\s+class/i },
    ],
    gaps: [
      { label: "no online booking",     present: /enroll|book\s+lesson|register\s+online/i },
    ],
    decisionTitles: ["Owner", "Principal", "Manager", "Proprietor", "Director"],
  },

  security_firm: {
    subpages: ["/services", "/about", "/clients"],
    signals: [
      { label: "armed / manned guarding", re: /armed\s+guard|manned\s+guard|security\s+guard/i },
      { label: "CCTV / surveillance",     re: /cctv|surveillance|security\s+camera/i },
      { label: "alarm systems",           re: /alarm|intruder\s+alert|smart\s+security/i },
      { label: "event security",          re: /event\s+security|crowd\s+manag|venue\s+security/i },
      { label: "KPS licensed",            re: /private\s+security\s+regulatory\s+authority|psra|licensed\s+security/i },
      { label: "24hr rapid response",     re: /24.?hour\s+response|rapid\s+response|control\s+room/i },
    ],
    gaps: [
      { label: "no online quote",       present: /get\s+a\s+quote|request\s+quote|proposal/i },
    ],
    decisionTitles: ["Director", "CEO", "Operations Manager", "MD", "Proprietor"],
  },

  tutoring: {
    subpages: ["/subjects", "/programs", "/about", "/tutors", "/fees"],
    signals: [
      { label: "CBC curriculum",      re: /cbc|competency\s+based/i },
      { label: "IGCSE / A-Level",     re: /igcse|a.level|a levels|ib/i },
      { label: "online tutoring",     re: /online\s+tutor|zoom\s+lesson|virtual\s+class|e.learning/i },
      { label: "group classes",       re: /group\s+class|small\s+class|group\s+tutoring/i },
      { label: "university entrance", re: /kcse|a.?level|university\s+preparation|entrance\s+exam/i },
    ],
    gaps: [
      { label: "no enrollment form",  present: /enroll|register|sign\s+up|apply/i },
    ],
    decisionTitles: ["Director", "Principal Tutor", "Manager", "Owner", "Proprietor"],
  },

  event_venue: {
    subpages: ["/packages", "/gallery", "/catering", "/events", "/about", "/contact"],
    signals: [
      { label: "wedding venue",        re: /wedding|bridal|reception/i },
      { label: "conference / meetings",re: /conference|meeting\s+room|boardroom|seminar/i },
      { label: "catering included",    re: /catering\s+(?:available|included|provided)/i },
      { label: "capacity stated",      re: /capacity\s+of\s+\d+|seats?\s+\d+|guests?\s+\d+/i },
      { label: "AV / tech equipment",  re: /projector|screen|sound\s+system|av\s+equipment/i },
    ],
    gaps: [
      { label: "no booking form",     present: /book\s+venue|reserve|check\s+availability/i },
    ],
    decisionTitles: ["Events Manager", "GM", "Owner", "Proprietor", "Director"],
  },

  bakery: {
    subpages: ["/menu", "/products", "/order", "/gallery"],
    signals: [
      { label: "custom cakes",         re: /custom\s+cake|bespoke\s+cake|cake\s+order|wedding\s+cake/i },
      { label: "corporate orders",     re: /corporate\s+order|bulk\s+order|catering\s+order/i },
      { label: "delivery available",   re: /delivery|deliver\s+to\s+you|free\s+delivery/i },
      { label: "online ordering",      re: /order\s+online|shop\s+online|pre.order/i },
      { label: "halal certified",      re: /halal|certified\s+halal/i },
    ],
    gaps: [
      { label: "no online ordering",  present: /order\s+online|pre.order|buy\s+online/i },
    ],
    decisionTitles: ["Owner", "Proprietor", "Manager", "Head Baker"],
  },

  catering: {
    subpages: ["/services", "/menu", "/events", "/gallery", "/packages"],
    signals: [
      { label: "corporate catering",   re: /corporate\s+catering|office\s+catering|meeting\s+catering/i },
      { label: "wedding catering",     re: /wedding\s+catering|bridal\s+reception/i },
      { label: "outdoor catering",     re: /outdoor\s+catering|garden\s+party|outdoor\s+event/i },
      { label: "dietary options",      re: /vegan|vegetarian|halal|kosher|gluten.free/i },
      { label: "staffed service",      re: /wait\s+staff|service\s+staff|silver\s+service|buffet\s+service/i },
    ],
    gaps: [
      { label: "no online quote",     present: /quote|request|get\s+a\s+price|pricing/i },
    ],
    decisionTitles: ["Owner", "Proprietor", "Catering Manager", "Director"],
  },

  print_shop: {
    subpages: ["/services", "/products", "/portfolio", "/order"],
    signals: [
      { label: "large format printing", re: /large\s+format|wide\s+format|banner|billboard/i },
      { label: "branded merchandise",   re: /branded|t.shirt|corporate\s+gift|promotional/i },
      { label: "offset printing",       re: /offset\s+print|lithograph/i },
      { label: "design services",       re: /graphic\s+design|design\s+service|artwork/i },
      { label: "ISO / quality cert",    re: /iso\s*9001|quality\s+cert|certified\s+printer/i },
    ],
    gaps: [
      { label: "no online ordering",   present: /order\s+online|instant\s+quote|upload\s+artwork/i },
    ],
    decisionTitles: ["Owner", "Manager", "Production Manager", "Director"],
  },

  logistics: {
    subpages: ["/services", "/fleet", "/about", "/tracking"],
    signals: [
      { label: "last-mile delivery",    re: /last.mile|door.to.door|same.day\s+delivery/i },
      { label: "cold chain",            re: /cold\s+chain|refrigerated|temperature.controlled/i },
      { label: "cross-border",          re: /cross.border|regional|uganda|tanzania|rwanda|east\s+africa/i },
      { label: "tracking system",       re: /track|real.time\s+tracking|gps\s+track/i },
      { label: "warehousing",           re: /warehousing|warehouse|storage\s+facility/i },
    ],
    gaps: [
      { label: "no online booking",    present: /book\s+delivery|request\s+pickup|schedule\s+delivery/i },
    ],
    decisionTitles: ["Director", "Operations Manager", "CEO", "MD", "Logistics Manager"],
  },

  car_dealer: {
    subpages: ["/inventory", "/stock", "/cars", "/financing", "/about"],
    signals: [
      { label: "financing available",  re: /financing|hire\s+purchase|bank\s+finance|car\s+loan/i },
      { label: "trade-in accepted",    re: /trade.in|part.exchange|swap\s+your\s+car/i },
      { label: "import clearance",     re: /import|clearing|duty\s+paid|duty\s+free/i },
      { label: "warranty offered",     re: /warranty|guarantee|after.sales/i },
      { label: "dealership brands",    re: /toyota|nissan|mazda|subaru|honda|mitsubishi|isuzu/i },
    ],
    gaps: [
      { label: "no stock listing",    present: /view\s+stock|see\s+cars|available\s+cars|inventory/i },
    ],
    decisionTitles: ["Sales Manager", "Dealer Principal", "Owner", "Director"],
  },
};

function getVerticalConfig(vertical: string | null | undefined): VerticalConfig {
  return VERTICAL_CONFIG[vertical ?? ""] ?? GENERIC;
}

export function getDecisionTitles(vertical: string | null | undefined): string[] {
  return getVerticalConfig(vertical).decisionTitles;
}

// ─── Core detection functions ─────────────────────────────────────────────────

function extractEmails(html: string): string[] {
  const all = html.match(/[a-zA-Z0-9._%+\-]{1,64}@[a-zA-Z0-9.\-]{1,64}\.[a-zA-Z]{2,}/g) ?? [];
  const blocked = ["@sentry", "@example", "@w3.org", "@schema", "@2x", ".png", ".jpg", ".gif", "@jquery", "@facebook", "noreply@", "support@google"];
  return [...new Set(all.filter((e) => !blocked.some((b) => e.toLowerCase().includes(b))))].slice(0, 6);
}

function extractPhones(html: string): string[] {
  const text = html.replace(/<[^>]+>/g, " ").replace(/[^\d\s+\-().]/g, " ");
  const seen = new Set<string>();
  const patterns: RegExp[] = [
    /\+254\s?[17]\d{8}/g,              // +254 7xx or +254 1xx
    /\b0[17]\d{8}\b/g,                  // 07xx or 01xx (10-digit Kenyan mobile)
    /\b020\s?\d{3}\s?\d{3,4}\b/g,       // Nairobi landline 020
    /\b04[12]\s?\d{3}\s?\d{3,4}\b/g,    // Mombasa / Kisumu
    /\b05[12]\s?\d{3}\s?\d{3,4}\b/g,    // Nakuru / Eldoret
  ];
  for (const re of patterns) {
    for (const m of text.match(re) ?? []) {
      const clean = m.replace(/\s/g, "");
      if (clean.length >= 9) seen.add(clean);
    }
  }
  return [...seen].slice(0, 6);
}

function normalisePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("254") && digits.length === 12) return "+" + digits;
  if (digits.startsWith("07") && digits.length === 10)  return "+254" + digits.slice(1);
  if (digits.startsWith("01") && digits.length === 10)  return "+254" + digits.slice(1);
  if (digits.startsWith("7")  && digits.length === 9)   return "+254" + digits;
  if (digits.startsWith("020") && digits.length >= 9)   return "+254" + digits.slice(1);
  return raw;
}

function extractWhatsAppNumber(html: string): string | null {
  const m = html.match(/wa\.me\/(\d{10,15})/i);
  if (!m) return null;
  return normalisePhone(m[1]);
}

function detectTechStack(html: string): string[] {
  const stack: string[] = [];
  const h = html.toLowerCase();
  const checks: [string, string[]][] = [
    ["WordPress",        ["wp-content", "wp-includes", "wp-json"]],
    ["Wix",              ["wix.com", "_wix_", "wixstatic.com"]],
    ["Squarespace",      ["squarespace.com", "squarespace-cdn", "sqsp.net"]],
    ["Shopify",          ["shopify.com", "cdn.shopify", "myshopify.com"]],
    ["Next.js",          ["_next/static", "__NEXT_DATA__"]],
    ["Webflow",          ["webflow.com", "js.webflow.com"]],
    ["Elementor",        ["elementor-", "/elementor/"]],
    ["Bootstrap",        ["bootstrap.min.css", "bootstrap.bundle"]],
    ["Google Analytics", ["gtag(", "google-analytics.com", "googletagmanager.com"]],
    ["Meta Pixel",       ["fbevents.js", "connect.facebook.net"]],
    ["Zoho CRM",         ["zohocrm", "zoho.com/crm"]],
    ["HubSpot",          ["hubspot.com", "hs-scripts.com", "hubspot-forms"]],
    ["WooCommerce",      ["woocommerce", "wc-cart", "add-to-cart"]],
    ["M-PESA / Daraja",  ["safaricom.co.ke/daraja", "mpesa_express", "stk_push"]],
  ];
  for (const [name, tokens] of checks) {
    if (tokens.some((t) => h.includes(t.toLowerCase()))) stack.push(name);
  }
  return stack;
}

function detectBookingSystem(html: string): boolean {
  const h = html.toLowerCase();
  const platforms = [
    "calendly.com", "cal.com", "acuityscheduling", "setmore", "simplybook",
    "booksy", "fresha.com", "appointy.com", "vagaro.com", "schedulicity",
    "mindbodyonline", "janeapp.com", "cliniko.com", "zoho.com/bookings",
    "square.site", "timely.is", "book.app",
  ];
  if (platforms.some((s) => h.includes(s))) return true;
  const phrases = ["book appointment", "book a consultation", "book online", "book now",
    "schedule appointment", "schedule a visit", "make a booking", "online booking"];
  return phrases.some((p) => h.includes(p));
}

function detectLiveChat(html: string): boolean {
  const h = html.toLowerCase();
  const platforms = ["intercom.io", "zendesk.com", "livechat.com", "tawk.to", "crisp.chat",
    "freshchat", "drift.com", "tidio.com", "smartsupp", "olark.com", "chatra.io"];
  if (platforms.some((s) => h.includes(s))) return true;
  if (/wa\.me\/\d{10,}/.test(html)) return true;
  if (h.includes("fb-customerchat") || h.includes("messenger.com/t/")) return true;
  return false;
}

function detectOnlinePayment(html: string): boolean {
  const h = html.toLowerCase();
  return (
    /mpesa|m.pesa|daraja|paybill|till\s+number/.test(h) ||
    /stripe\.com|paystack|flutterwave|pesapal|ipay\.co\.ke/.test(h) ||
    /paypal|paypal\.com/.test(h) ||
    /add.to.cart|checkout|buy.now|place.order/.test(h)
  );
}

function detectSsl(url: string): boolean {
  return url.startsWith("https://");
}

function extractYearEstablished(html: string): number | null {
  const text = html.replace(/<[^>]+>/g, " ");
  const m = text.match(/(?:since|est\.?|established|founded|incorporated|serving\s+(?:you\s+)?since)\s*((?:19|20)\d{2})/i);
  if (!m) return null;
  const yr = parseInt(m[1]);
  return yr >= 1950 && yr <= new Date().getFullYear() ? yr : null;
}

function extractLocationCount(html: string): number {
  const text = html.replace(/<[^>]+>/g, " ").toLowerCase();
  const m = text.match(/(\d+)\s+(?:branches|locations|outlets|showrooms|offices)/i);
  if (m && parseInt(m[1]) <= 50) return parseInt(m[1]);
  if (/multiple\s+(?:branches|locations)|several\s+(?:branches|locations)/.test(text)) return 3;
  if (/branch\s*2|second\s+branch|second\s+location|new\s+branch/.test(text)) return 2;
  return 1;
}

function extractStaffSignal(html: string): string | null {
  const text = html.replace(/<[^>]+>/g, " ").toLowerCase();
  if (/\b(100|150|200|250|300|\d{3,})\+?\s*(?:employees|staff|team\s+members)/i.test(text)) return "100+ employees";
  if (/\b(50|60|70|80|90)\+?\s*(?:employees|staff|team\s+members)/i.test(text)) return "50-99 employees";
  if (/\b(20|25|30|35|40|45)\+?\s*(?:employees|staff|team\s+members)/i.test(text)) return "20-49 employees";
  if (/\b(10|12|15)\+?\s*(?:employees|staff|team\s+members)/i.test(text)) return "10-19 employees";
  if (/\b[2-9]\+?\s*(?:employees|staff|team\s+members)/i.test(text)) return "2-9 employees";
  if (/\bsolo\s+(?:practitioner|operator|entrepreneur)\b|\bone.person\s+show/.test(text)) return "solo";
  return null;
}

function detectCertifications(html: string): string[] {
  const certs: string[] = [];
  const h = html.toLowerCase();
  const checks: [string, RegExp][] = [
    ["ISO 9001",        /iso\s*9001/i],
    ["ISO 27001",       /iso\s*27001/i],
    ["ISO 15189",       /iso\s*15189/i],
    ["KEBS",            /kenya\s+bureau\s+of\s+standards|kebs\s+(?:certified|mark)/i],
    ["NHIF accredited", /nhif\s+accredited|accredited\s+by\s+nhif/i],
    ["NCA",             /national\s+construction\s+authority|nca\s+class/i],
    ["ICPAK",           /icpak\s+member|institute\s+of\s+certified\s+public/i],
    ["LSK",             /law\s+society\s+of\s+kenya|lsk\s+member/i],
    ["KMPDC",           /kmpdc|kenya\s+medical\s+practitioners/i],
    ["NTSA approved",   /ntsa\s+(?:approved|certified|registered)/i],
    ["SASRA",           /sasra\s+(?:licensed|regulated)/i],
    ["IRA licensed",    /insurance\s+regulatory\s+authority|ira\s+(?:licensed|regulated)/i],
    ["Google Partner",  /google\s+partner|google\s+certified\s+partner/i],
    ["Meta Partner",    /meta\s+business\s+partner|facebook\s+marketing\s+partner/i],
    ["PSRA",            /private\s+security\s+regulatory/i],
    ["HACCP",           /haccp\s+certified/i],
    ["Halal cert",      /halal\s+(?:certified|certificate)/i],
    ["PPB licensed",    /pharmacy\s+and\s+poisons\s+board|ppb\s+licens/i],
  ];
  for (const [label, re] of checks) {
    if (re.test(h)) certs.push(label);
  }
  return certs;
}

function detectVerticalSignals(html: string, vertical: string): string[] {
  const config = getVerticalConfig(vertical);
  const found: string[] = [];
  for (const s of config.signals) {
    if (s.re.test(html)) found.push(s.label);
  }
  for (const g of config.gaps) {
    if (!g.present.test(html)) found.push(`gap: ${g.label}`);
  }
  return [...new Set(found)];
}

function extractSocialLinks(html: string): Record<string, string> {
  const links: Record<string, string> = {};
  const patterns: [string, RegExp][] = [
    ["facebook",  /https?:\/\/(?:www\.)?(?:facebook|fb)\.com\/(?!sharer|share|login)[^\s"'>?#]{3,}/i],
    ["instagram", /https?:\/\/(?:www\.)?instagram\.com\/[^\s"'>?#]{2,}/i],
    ["twitter",   /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[^\s"'>?#]{2,}/i],
    ["linkedin",  /https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/[^\s"'>?#]+/i],
    ["youtube",   /https?:\/\/(?:www\.)?youtube\.com\/(?:@|channel\/|c\/)[^\s"'>?#]+/i],
    ["tiktok",    /https?:\/\/(?:www\.)?tiktok\.com\/@[^\s"'>?#]+/i],
    ["whatsapp",  /https?:\/\/wa\.me\/\d{10,}/i],
  ];
  for (const [name, re] of patterns) {
    const m = html.match(re);
    if (m) links[name] = m[0];
  }
  return links;
}

// ─── Social profile intelligence ──────────────────────────────────────────────

export interface SocialProfile {
  url: string;
  followers?: number;
  posts?: number;
  bio?: string;
  activityLevel: "active" | "moderate" | "low" | "unknown";
}

function parseFollowerCount(raw: string): number | undefined {
  if (!raw) return undefined;
  const s = raw.replace(/,/g, "").toLowerCase().trim();
  if (s.endsWith("m")) return Math.round(parseFloat(s) * 1_000_000);
  if (s.endsWith("k")) return Math.round(parseFloat(s) * 1_000);
  const n = parseInt(s);
  return isNaN(n) ? undefined : n;
}

function socialActivityLevel(followers?: number, posts?: number): SocialProfile["activityLevel"] {
  if (!followers && !posts) return "unknown";
  if ((followers && followers >= 1000) || (posts && posts >= 50)) return "active";
  if ((followers && followers >= 200)  || (posts && posts >= 15)) return "moderate";
  return "low";
}

async function fetchSocialProfile(url: string, signal: AbortSignal): Promise<SocialProfile> {
  const base: SocialProfile = { url, activityLevel: "unknown" };
  try {
    const html = await fetchPage(url, signal);
    const ogDesc  = html.match(/<meta[^>]+(?:property="og:description"|name="description")[^>]+content="([^"]+)"/i)?.[1]
                 ?? html.match(/<meta[^>]+content="([^"]+)"[^>]+(?:property="og:description"|name="description")/i)?.[1]
                 ?? "";
    const decoded = ogDesc.replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#39;/g, "'").trim();

    // Instagram: "1,234 Followers · 56 Following · 789 Posts · See Instagram photos and videos"
    const igFollowersM = decoded.match(/([\d,\.]+[KkMm]?)\s*[Ff]ollowers/);
    const igPostsM     = decoded.match(/([\d,]+)\s*[Pp]osts/);
    // Facebook: "X people follow this" or "X likes · Y talking about this"
    const fbFollowersM = decoded.match(/([\d,]+[KkMm]?)\s*(?:people\s+)?(?:follow|likes?)/i);
    // TikTok: "X Followers · Y Following · Z Likes"
    const ttFollowersM = decoded.match(/([\d,\.]+[KkMm]?)\s*Followers/i);
    // YouTube: "X subscribers"
    const ytSubsM      = decoded.match(/([\d,\.]+[KkMm]?)\s*[Ss]ubscribers/);

    const followersRaw = igFollowersM?.[1] ?? ttFollowersM?.[1] ?? fbFollowersM?.[1] ?? ytSubsM?.[1];
    const postsRaw     = igPostsM?.[1];

    const followers = followersRaw ? parseFollowerCount(followersRaw) : undefined;
    const posts     = postsRaw     ? parseInt(postsRaw.replace(/,/g, "")) : undefined;

    return {
      url,
      followers,
      posts,
      bio: decoded.slice(0, 300) || undefined,
      activityLevel: socialActivityLevel(followers, posts),
    };
  } catch { return base; }
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

function computeDigitalReadinessScore(
  result: Pick<EnrichResult, "techStack" | "hasBookingSystem" | "hasLiveChat" | "hasOnlinePayment" | "hasSsl" | "socialLinks" | "emails">
): number {
  let s = 0;
  if (result.hasSsl)                                                    s += 10;
  if (result.techStack.length > 0)                                      s += 10;
  if (result.techStack.some((t) => ["Google Analytics", "Meta Pixel", "HubSpot"].includes(t))) s += 15;
  if (result.hasBookingSystem)                                           s += 20;
  if (result.hasLiveChat)                                                s += 10;
  if (result.hasOnlinePayment)                                          s += 10;
  if (result.socialLinks.linkedin)                                       s += 8;
  if (result.socialLinks.instagram)                                      s += 6;
  if (result.socialLinks.facebook)                                       s += 5;
  if (result.socialLinks.whatsapp || result.socialLinks.tiktok)         s += 4;
  if (result.emails.length > 0)                                         s += 2;
  return Math.min(100, s);
}

export function computeReachabilityScore(
  emails: string[], phones: string[], whatsapp: string | null, socialLinks: Record<string, string>
): number {
  let s = 0;
  if (emails.length > 0)      s += 25;
  if (phones.length > 0)      s += 25;
  if (whatsapp)                s += 30;
  if (socialLinks.linkedin)   s += 10;
  if (socialLinks.facebook)   s += 5;
  if (socialLinks.instagram)  s += 5;
  return Math.min(100, s);
}

function computeOpportunityScore(result: EnrichResult): number {
  let s = 0;
  // Reachability
  s += Math.round(result.reachabilityScore * 0.3);
  // Pain/gap signals
  const gapCount = result.verticalSignals.filter((x) => x.startsWith("gap:")).length;
  s += Math.min(30, gapCount * 10);
  // Social activity
  const bestSocial = Object.values(result.socialProfiles)
    .find((p) => p.activityLevel === "active" || p.activityLevel === "moderate");
  if (bestSocial?.activityLevel === "active")   s += 20;
  if (bestSocial?.activityLevel === "moderate") s += 10;
  // Business maturity
  if (result.yearEstablished && result.yearEstablished < new Date().getFullYear() - 3) s += 10;
  if (result.locationCount > 1)  s += 5;
  if (result.certifications.length > 0)         s += 5;
  return Math.min(100, s);
}

// ─── Main enrichment result ───────────────────────────────────────────────────

export interface EnrichResult {
  // Contact
  emails:               string[];
  phones:               string[];
  whatsappNumber:       string | null;

  // Digital presence
  techStack:            string[];
  hasBookingSystem:     boolean;
  hasLiveChat:          boolean;
  hasOnlinePayment:     boolean;
  hasSsl:               boolean;

  // Social
  socialLinks:          Record<string, string>;
  socialProfiles:       Record<string, SocialProfile>;

  // Business intelligence
  yearEstablished:      number | null;
  locationCount:        number;
  staffSignal:          string | null;
  certifications:       string[];

  // Vertical-specific
  verticalSignals:      string[];
  customSignals:        string[];  // keep for backward compat

  // Raw html (for contact extraction)
  aboutPageHtml:        string;
  instagramBio:         string;

  // Scores
  digitalReadinessScore: number;
  reachabilityScore:    number;
  opportunityScore:     number;
}

// ─── Subpage strategy ────────────────────────────────────────────────────────

const CONTACT_PATHS  = ["/contact", "/contact-us", "/reach-us", "/get-in-touch"];
const ABOUT_PATHS    = ["/about", "/about-us", "/our-team", "/team", "/staff", "/management",
                        "/doctors", "/our-doctors", "/lawyers", "/partners", "/people", "/leadership"];
const SERVICES_PATHS = ["/services", "/what-we-do", "/solutions", "/products", "/offerings"];

// ─── Main export ─────────────────────────────────────────────────────────────

export async function enrichWebsite(url: string, vertical?: string | null, org?: OrgProfile): Promise<EnrichResult> {
  const controller = new AbortController();
  const mainTimeout = setTimeout(() => controller.abort(), 25000);

  const config = getVerticalConfig(vertical);
  const hasSsl = detectSsl(url);
  const base   = new URL(url).origin;

  let html           = "";
  let contactHtml    = "";
  let aboutPageHtml  = "";
  let servicesHtml   = "";

  // ── Phase 1: Main page + priority subpages in parallel ───────────────────
  try {
    const [mainResult, ...subResults] = await Promise.allSettled([
      fetchPage(url, controller.signal),
      // Vertical-specific priority page first
      ...(config.subpages.slice(0, 1).map((p) => fetchPage(base + p, controller.signal))),
    ]);

    if (mainResult.status === "fulfilled") html = mainResult.value;

    // Vertical-specific subpage
    if (subResults[0]?.status === "fulfilled") servicesHtml = subResults[0].value;
  } finally {
    // keep controller alive for phase 2
  }

  // ── Phase 2: About + contact pages ────────────────────────────────────────
  try {
    for (const path of CONTACT_PATHS) {
      try {
        const r = await fetchPage(base + path, controller.signal);
        if (r.length > 300) { contactHtml = r; break; }
      } catch { /* skip */ }
    }
    for (const path of ABOUT_PATHS) {
      try {
        const r = await fetchPage(base + path, controller.signal);
        if (r.length > 300) { aboutPageHtml = r; break; }
      } catch { /* skip */ }
    }
    // Secondary vertical subpages
    if (!servicesHtml && SERVICES_PATHS) {
      for (const path of SERVICES_PATHS) {
        try {
          const r = await fetchPage(base + path, controller.signal);
          if (r.length > 300) { servicesHtml = r; break; }
        } catch { /* skip */ }
      }
    }
  } finally {
    clearTimeout(mainTimeout);
  }

  const combined = [html, contactHtml, aboutPageHtml, servicesHtml].join(" ");

  // ── Social links (from all pages) ─────────────────────────────────────────
  const socialLinks = extractSocialLinks(combined);

  // ── Phase 3: Social intelligence + Instagram bio (parallel, short timeout) ─
  const socialProfiles: Record<string, SocialProfile> = {};
  const instagramBio = await (async () => {
    if (!socialLinks.instagram || !isSafeUrl(socialLinks.instagram)) return "";
    const igCtrl    = new AbortController();
    const igTimeout = setTimeout(() => igCtrl.abort(), 6000);
    try {
      const profile = await fetchSocialProfile(socialLinks.instagram, igCtrl.signal);
      socialProfiles["instagram"] = profile;
      return profile.bio ?? "";
    } catch { return ""; }
    finally { clearTimeout(igTimeout); }
  })();

  // Facebook + TikTok + YouTube in parallel (best-effort, 6s timeout each)
  await Promise.allSettled([
    ...(socialLinks.facebook && isSafeUrl(socialLinks.facebook) ? [
      (async () => {
        const c = new AbortController();
        setTimeout(() => c.abort(), 6000);
        socialProfiles["facebook"] = await fetchSocialProfile(socialLinks.facebook, c.signal);
      })()
    ] : []),
    ...(socialLinks.tiktok && isSafeUrl(socialLinks.tiktok) ? [
      (async () => {
        const c = new AbortController();
        setTimeout(() => c.abort(), 6000);
        socialProfiles["tiktok"] = await fetchSocialProfile(socialLinks.tiktok, c.signal);
      })()
    ] : []),
    ...(socialLinks.youtube && isSafeUrl(socialLinks.youtube) ? [
      (async () => {
        const c = new AbortController();
        setTimeout(() => c.abort(), 6000);
        socialProfiles["youtube"] = await fetchSocialProfile(socialLinks.youtube, c.signal);
      })()
    ] : []),
  ]);

  // ── Extract all signals ───────────────────────────────────────────────────
  const emails          = extractEmails(combined);
  const phones          = extractPhones(combined);
  const whatsappNumber  = extractWhatsAppNumber(combined);
  const techStack       = detectTechStack(combined);
  const hasBookingSystem = detectBookingSystem(combined);
  const hasLiveChat     = detectLiveChat(combined);
  const hasOnlinePayment = detectOnlinePayment(combined);
  const verticalSignals = detectVerticalSignals(combined, vertical ?? "");
  const certifications  = detectCertifications(combined);
  const yearEstablished = extractYearEstablished(combined);
  const locationCount   = extractLocationCount(combined);
  const staffSignal     = extractStaffSignal(combined);

  // Legacy custom signals (org-profile aware — keep for backward compat)
  const customSignals = org ? detectLegacyCustomSignals(combined, org) : [];

  // ── Scores ─────────────────────────────────────────────────────────────────
  const partialForScoring = { techStack, hasBookingSystem, hasLiveChat, hasOnlinePayment, hasSsl, socialLinks, emails };
  const digitalReadinessScore = computeDigitalReadinessScore(partialForScoring);
  const reachabilityScore     = computeReachabilityScore(emails, phones, whatsappNumber, socialLinks);

  const result: EnrichResult = {
    emails,
    phones,
    whatsappNumber,
    techStack,
    hasBookingSystem,
    hasLiveChat,
    hasOnlinePayment,
    hasSsl,
    socialLinks,
    socialProfiles,
    yearEstablished,
    locationCount,
    staffSignal,
    certifications,
    verticalSignals,
    customSignals,
    aboutPageHtml,
    instagramBio,
    digitalReadinessScore,
    reachabilityScore,
    opportunityScore: 0,  // computed below
  };

  result.opportunityScore = computeOpportunityScore(result);
  return result;
}

// ─── Legacy custom signal detection (org-profile aware) ──────────────────────
// Kept for backward compatibility with existing enrichment modes.

function detectLegacyCustomSignals(html: string, org: OrgProfile): string[] {
  const found: string[] = [];
  const h = html.toLowerCase();
  const priorities = new Set(org.priority_signals ?? []);
  const useCase = (org.use_case ?? "").toLowerCase();

  if (/(?:since|est\.?|established|founded)\s*(?:19|20)\d{2}/.test(h) ||
      /\b(?:1[0-9]|20)\+?\s*years?\s+(?:of\s+)?(?:experience|service)/.test(h)) {
    const m = h.match(/(?:since|est\.?|established|founded)\s*((?:19|20)\d{2})/);
    found.push(m ? `established ${m[1]}` : "established business");
  }
  if (/new\s+(?:branch|location|outlet)|expanding|opening\s+soon/.test(h)) found.push("expanding/growing");
  if (/wholesale|bulk\s+order|minimum\s+order|\bmoq\b/.test(h))            found.push("wholesale/bulk supplier");
  if (/nationwide|all\s+counties|across\s+kenya/.test(h))                  found.push("nationwide reach");

  if (priorities.has("no_digital") || priorities.has("gap")) {
    if (!/gtag\(|google-analytics|googletagmanager/.test(h)) found.push("no web analytics detected");
    if (!/hubspot|salesforce|zoho\s+crm|pipedrive/.test(h))  found.push("no CRM detected");
  }
  if (priorities.has("reachable") && /wa\.me\/\d{10,}/.test(html)) found.push("WhatsApp contact found");

  if (useCase.includes("recruit") || useCase.includes("staffing") || priorities.has("growing")) {
    if (/careers|vacancies|job\s+opening|we(?:'re|\s+are)\s+hiring/.test(h)) found.push("active hiring");
  }
  if (useCase.includes("agency") || useCase.includes("digital") || useCase.includes("tech")) {
    if (!/gtag\(|googletagmanager/.test(h)) found.push("no analytics — acquisition gap");
    if (!/fbevents\.js|connect\.facebook\.net/.test(h)) found.push("no meta pixel");
  }
  if (useCase.includes("financ") || useCase.includes("insur") || useCase.includes("lend")) {
    if (/loan|credit|financing|insurance\s+cover/.test(h)) found.push("financial products listed");
    if (/licensed|regulated|cma|ira kenya/.test(h))        found.push("regulated/licensed");
  }

  return [...new Set(found)];
}
