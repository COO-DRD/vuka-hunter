/**
 * HUNTER SCRAPE PROTOCOL
 * Defines which businesses qualify for outreach.
 * Only leads that pass ALL checks enter the database.
 *
 * Rule: Target established local businesses with proven revenue signals.
 * Signal: Google rating + review count = social proof + customer volume = budget.
 */

export interface VerticalProtocol {
  key: string;
  label: string;
  tier: "A" | "B";
  minRating: number;
  minReviews: number;
  notes: string;
  // Keywords in business name that disqualify it (government, chains, NGOs)
  nameBlocklist: string[];
  // Google Places query terms to use
  placeQuery: string;
  // OSM tags to use
  osmTags: string[];
}

export const PROTOCOL: Record<string, VerticalProtocol> = {
  // ── Tier A — High LTV, direct decision maker ──────────────────────────────
  dental: {
    key: "dental",
    label: "Private Dental Clinic",
    tier: "A",
    minRating: 4.0,
    minReviews: 15,
    notes: "Private practices only. High LTV — implants, orthodontics, whitening.",
    nameBlocklist: ["government", "public", "nhif", "ministry", "county", "health centre", "dispensary"],
    placeQuery: "private dental clinic",
    osmTags: ['["amenity"="dentist"]', '["healthcare"="dentist"]'],
  },
  clinic: {
    key: "clinic",
    label: "Private Medical Clinic",
    tier: "A",
    minRating: 4.0,
    minReviews: 20,
    notes: "Private clinics and hospitals. Decision maker is practice owner or admin.",
    nameBlocklist: ["government", "public", "nhif", "ministry", "county", "health centre", "dispensary", "community"],
    placeQuery: "private medical clinic",
    osmTags: ['["amenity"="clinic"]', '["amenity"="doctors"]', '["healthcare"="clinic"]'],
  },
  hospital: {
    key: "hospital",
    label: "Private Hospital",
    tier: "A",
    minRating: 3.8,
    minReviews: 50,
    notes: "Full private hospitals. Large budgets, multiple decision makers. Target COO or marketing manager.",
    nameBlocklist: ["government", "public", "county", "national", "nhif", "knh"],
    placeQuery: "private hospital",
    osmTags: ['["amenity"="hospital"]'],
  },
  hotel: {
    key: "hotel",
    label: "Hotel (3-star+)",
    tier: "A",
    minRating: 4.0,
    minReviews: 50,
    notes: "Established hotels with volume. 50+ reviews = real occupancy = budget for marketing.",
    nameBlocklist: ["backpacker", "hostel", "budget", "camp", "dormitory"],
    placeQuery: "hotel",
    osmTags: ['["tourism"="hotel"]', '["tourism"="guest_house"]'],
  },
  real_estate: {
    key: "real_estate",
    label: "Real Estate Agency",
    tier: "A",
    minRating: 4.0,
    minReviews: 10,
    notes: "Agencies with listings + reviews = active, revenue-generating. Low review threshold is normal for the sector.",
    nameBlocklist: [],
    placeQuery: "real estate agency",
    osmTags: ['["office"="estate_agent"]', '["shop"="estate_agent"]'],
  },
  law_firm: {
    key: "law_firm",
    label: "Law Firm",
    tier: "A",
    minRating: 4.0,
    minReviews: 5,
    notes: "High LTV. Low review count is normal — lawyers don't chase reviews. Any reviews = real practice.",
    nameBlocklist: ["government", "public", "legal aid", "pro bono"],
    placeQuery: "law firm advocates",
    osmTags: ['["office"="lawyer"]', '["office"="law_firm"]'],
  },
  accounting: {
    key: "accounting",
    label: "Accounting / CPA Firm",
    tier: "A",
    minRating: 4.0,
    minReviews: 5,
    notes: "CPA firms, audit firms. High LTV — they manage client money = need reliable software and compliance tools.",
    nameBlocklist: ["government", "kra", "public"],
    placeQuery: "accounting firm CPA auditors",
    osmTags: ['["office"="accountant"]'],
  },
  private_school: {
    key: "private_school",
    label: "Private School / Academy",
    tier: "A",
    minRating: 4.0,
    minReviews: 20,
    notes: "Private schools with tuition revenue. Need management systems, communication tools, digital presence.",
    nameBlocklist: ["government", "public", "harambee", "county"],
    placeQuery: "private school academy",
    osmTags: ['["amenity"="school"]'],
  },
  travel_agency: {
    key: "travel_agency",
    label: "Travel Agency",
    tier: "A",
    minRating: 4.2,
    minReviews: 15,
    notes: "Active travel agencies. High transaction volume = need booking systems and digital marketing.",
    nameBlocklist: [],
    placeQuery: "travel agency tours",
    osmTags: ['["shop"="travel_agency"]', '["office"="travel_agent"]'],
  },
  // ── Tier B — Good volume, moderate LTV ────────────────────────────────────
  gym: {
    key: "gym",
    label: "Premium Gym / Fitness Studio",
    tier: "B",
    minRating: 4.3,
    minReviews: 30,
    notes: "Premium gyms only. High rating + reviews = loyal membership base = marketing budget.",
    nameBlocklist: [],
    placeQuery: "gym fitness studio",
    osmTags: ['["leisure"="fitness_centre"]', '["leisure"="sports_centre"]'],
  },
  restaurant: {
    key: "restaurant",
    label: "Upscale Restaurant",
    tier: "B",
    minRating: 4.5,
    minReviews: 100,
    notes: "Only high-rated, high-volume restaurants. 100+ reviews = real footfall = margin for digital.",
    nameBlocklist: ["kfc", "mcdonalds", "subway", "pizza hut", "dominos", "java", "chicken inn", "naivas", "quickmart"],
    placeQuery: "restaurant",
    osmTags: ['["amenity"="restaurant"]'],
  },
  pharmacy: {
    key: "pharmacy",
    label: "Private Pharmacy",
    tier: "B",
    minRating: 4.0,
    minReviews: 15,
    notes: "Independent pharmacies. Need POS, inventory management, digital presence. Avoid big chains.",
    nameBlocklist: ["goodlife", "haltons", "medisel", "naivas", "quickmart", "carrefour", "government", "county"],
    placeQuery: "pharmacy chemist",
    osmTags: ['["amenity"="pharmacy"]'],
  },
  salon: {
    key: "salon",
    label: "Upscale Salon / Spa",
    tier: "B",
    minRating: 4.3,
    minReviews: 30,
    notes: "Premium salons and spas. High repeat-client business = need booking systems and loyalty tools.",
    nameBlocklist: [],
    placeQuery: "beauty salon spa",
    osmTags: ['["shop"="hairdresser"]', '["shop"="beauty"]', '["leisure"="spa"]'],
  },
  event_venue: {
    key: "event_venue",
    label: "Event Venue / Conference Center",
    tier: "B",
    minRating: 4.2,
    minReviews: 30,
    notes: "Wedding and conference venues. High-value bookings = need management tools and online presence.",
    nameBlocklist: ["government", "county", "nssf", "nhif"],
    placeQuery: "event venue wedding venue conference hall",
    osmTags: ['["amenity"="events_venue"]', '["amenity"="conference_centre"]'],
  },
  optician: {
    key: "optician",
    label: "Eye Clinic / Optician",
    tier: "B",
    minRating: 4.0,
    minReviews: 10,
    notes: "Private eye clinics and optical shops. Need appointment systems and digital marketing.",
    nameBlocklist: ["government", "county", "nhif"],
    placeQuery: "eye clinic optician optical",
    osmTags: ['["healthcare"="optometrist"]', '["shop"="optician"]'],
  },
  vet: {
    key: "vet",
    label: "Veterinary Clinic",
    tier: "B",
    minRating: 4.0,
    minReviews: 10,
    notes: "Private vet clinics. Growing pet ownership in urban Kenya = consistent revenue = digital marketing need.",
    nameBlocklist: ["government", "county", "kvb"],
    placeQuery: "veterinary clinic vet",
    osmTags: ['["amenity"="veterinary"]'],
  },
  logistics: {
    key: "logistics",
    label: "Logistics / Courier Company",
    tier: "B",
    minRating: 3.8,
    minReviews: 20,
    notes: "Private courier and logistics firms. B2B contracts = high LTV. Need tracking systems and ops tools.",
    nameBlocklist: ["dhl", "fedex", "ups", "aramex", "g4s"],
    placeQuery: "courier logistics delivery company",
    osmTags: ['["office"="logistics"]', '["amenity"="post_office"]'],
  },
  car_dealer: {
    key: "car_dealer",
    label: "Car Dealership",
    tier: "B",
    minRating: 4.0,
    minReviews: 20,
    notes: "Private car dealerships. High-ticket sales = need CRM, digital ads, and website lead gen.",
    nameBlocklist: ["toyota", "toyota kenya", "cfao", "simba", "marshalls", "government"],
    placeQuery: "car dealership used cars auto dealer",
    osmTags: ['["shop"="car"]', '["shop"="car_dealer"]'],
  },
  minimart: {
    key: "minimart",
    label: "Mini-Mart / Duka / Convenience Store",
    tier: "B",
    minRating: 3.5,
    minReviews: 5,
    notes: "Independent mini-marts, convenience stores, and dukas with a Google presence. Any 5+ reviews = real regulars = budget. Block major chains — they have in-house tech teams.",
    nameBlocklist: [
      "naivas", "quickmart", "carrefour", "tuskys", "chandarana", "uchumi",
      "cleanshelf", "eastmatt", "mathai", "mulleys", "market", "government",
    ],
    placeQuery: "minimart convenience store mini supermarket",
    osmTags: ['["shop"="convenience"]', '["shop"="supermarket"]', '["shop"="general"]'],
  },

  // ── Tier A additions ──────────────────────────────────────────────────────
  it_company: {
    key: "it_company",
    label: "IT / Software Company",
    tier: "A",
    minRating: 4.0,
    minReviews: 5,
    notes: "Private IT firms and software houses. High LTV — they buy tools, outsource marketing, need lead gen.",
    nameBlocklist: ["microsoft", "google", "safaricom", "telkom", "airtel", "government", "county"],
    placeQuery: "IT company software developer technology firm",
    osmTags: ['["office"="it"]', '["office"="software"]'],
  },
  insurance: {
    key: "insurance",
    label: "Insurance Broker / Agency",
    tier: "A",
    minRating: 4.0,
    minReviews: 5,
    notes: "Independent insurance brokers and agencies. Commission-based revenue = strong incentive for better lead tools.",
    nameBlocklist: ["jubilee", "britam", "aar", "ken-re", "government", "county"],
    placeQuery: "insurance broker insurance agency",
    osmTags: ['["office"="insurance"]'],
  },
  architecture: {
    key: "architecture",
    label: "Architecture / Interior Design Firm",
    tier: "A",
    minRating: 4.0,
    minReviews: 5,
    notes: "Architecture and interior design firms. Project-based revenue = need a visible portfolio and steady client pipeline.",
    nameBlocklist: ["government", "county", "public works"],
    placeQuery: "architecture firm architects interior design",
    osmTags: ['["office"="architect"]'],
  },
  digital_agency: {
    key: "digital_agency",
    label: "Digital Marketing Agency",
    tier: "A",
    minRating: 4.0,
    minReviews: 5,
    notes: "Digital agencies are the meta-buyers — they need lead tools to serve clients AND to win new clients themselves.",
    nameBlocklist: ["government", "county"],
    placeQuery: "digital marketing agency social media agency branding",
    osmTags: ['["office"="advertising"]', '["office"="marketing"]'],
  },
  sacco: {
    key: "sacco",
    label: "SACCO / Microfinance Institution",
    tier: "A",
    minRating: 3.8,
    minReviews: 10,
    notes: "SACCOs and MFIs have large member bases and outreach budgets. Need communication and member acquisition tools.",
    nameBlocklist: ["commercial bank", "equity", "kcb", "cooperative bank", "ncba", "i&m"],
    placeQuery: "SACCO microfinance cooperative society",
    osmTags: ['["office"="financial"]', '["amenity"="bank"]'],
  },

  // ── Tier B additions ──────────────────────────────────────────────────────
  auto_workshop: {
    key: "auto_workshop",
    label: "Car Repair Workshop",
    tier: "B",
    minRating: 4.0,
    minReviews: 15,
    notes: "Independent auto workshops. Repeat customers + referrals = need digital visibility and booking tools.",
    nameBlocklist: ["toyota", "peugeot", "suzuki", "cfao", "government"],
    placeQuery: "car repair garage auto workshop mechanic",
    osmTags: ['["shop"="car_repair"]', '["amenity"="car_repair"]'],
  },
  car_wash: {
    key: "car_wash",
    label: "Car Wash / Auto Detailing",
    tier: "B",
    minRating: 4.2,
    minReviews: 20,
    notes: "Premium car wash and detailing. High frequency = loyalty marketing opportunity. Need booking and repeat-business tools.",
    nameBlocklist: [],
    placeQuery: "car wash auto detailing",
    osmTags: ['["amenity"="car_wash"]'],
  },
  driving_school: {
    key: "driving_school",
    label: "Driving School",
    tier: "B",
    minRating: 4.0,
    minReviews: 20,
    notes: "Private driving schools. Seasonal demand spikes = need structured lead capture and follow-up outside peak periods.",
    nameBlocklist: ["government", "county", "ntsa"],
    placeQuery: "driving school",
    osmTags: ['["amenity"="driving_school"]'],
  },
  physio: {
    key: "physio",
    label: "Physiotherapy / Rehab Clinic",
    tier: "B",
    minRating: 4.2,
    minReviews: 10,
    notes: "Private physio and rehab clinics. Growing sector, underserved by digital — any clinic with reviews is ahead of the curve.",
    nameBlocklist: ["government", "county", "nhif", "knh"],
    placeQuery: "physiotherapy rehabilitation clinic",
    osmTags: ['["healthcare"="physiotherapist"]'],
  },
  bakery: {
    key: "bakery",
    label: "Artisan Bakery / Pastry Shop",
    tier: "B",
    minRating: 4.3,
    minReviews: 25,
    notes: "Premium bakeries with a loyal customer base. Repeat orders + events = need pre-order systems and loyalty marketing.",
    nameBlocklist: ["supermarket", "naivas", "quickmart", "carrefour", "java"],
    placeQuery: "bakery pastry cake shop artisan",
    osmTags: ['["shop"="bakery"]'],
  },
  print_shop: {
    key: "print_shop",
    label: "Printing Company",
    tier: "B",
    minRating: 4.0,
    minReviews: 10,
    notes: "B2B printers serving corporates, events, schools. High-volume contracts = need better client pipeline management.",
    nameBlocklist: ["government", "county"],
    placeQuery: "printing company print shop digital printing",
    osmTags: ['["shop"="copyshop"]', '["craft"="printing"]'],
  },
  security_firm: {
    key: "security_firm",
    label: "Security Company",
    tier: "B",
    minRating: 3.8,
    minReviews: 10,
    notes: "Private security companies. B2B contracts = high LTV. Need digital visibility and proposal-ready pipeline.",
    nameBlocklist: ["kdf", "gsu", "administration police", "government"],
    placeQuery: "security company private security guard services",
    osmTags: ['["office"="security"]'],
  },
  electronics_shop: {
    key: "electronics_shop",
    label: "Electronics / Phone Shop",
    tier: "B",
    minRating: 4.0,
    minReviews: 20,
    notes: "Independent electronics retailers. High-ticket items + repair services = strong WhatsApp catalogue opportunity.",
    nameBlocklist: ["jumia", "masoko", "safaricom", "airtel", "government"],
    placeQuery: "electronics shop phone repair computers",
    osmTags: ['["shop"="electronics"]', '["shop"="mobile_phone"]'],
  },
  tutoring: {
    key: "tutoring",
    label: "Tutoring / Learning Centre",
    tier: "B",
    minRating: 4.2,
    minReviews: 15,
    notes: "Private tutoring centres. Seasonal demand = need structured parent communication and enrolment funnels.",
    nameBlocklist: ["government", "public", "county"],
    placeQuery: "tutoring centre learning centre tuition",
    osmTags: ['["amenity"="school"]', '["amenity"="tutoring"]'],
  },
  catering: {
    key: "catering",
    label: "Catering Company",
    tier: "B",
    minRating: 4.2,
    minReviews: 15,
    notes: "Event and corporate caterers. Seasonal spikes + corporate contracts = need proactive lead outreach outside event season.",
    nameBlocklist: ["government", "county", "java", "kfc"],
    placeQuery: "catering company event catering corporate catering",
    osmTags: ['["amenity"="catering"]', '["shop"="catering"]'],
  },
  construction: {
    key: "construction",
    label: "Construction / Building Contractor",
    tier: "B",
    minRating: 3.8,
    minReviews: 10,
    notes: "Private contractors. Project-based work = constant need for new client pipeline. Digital presence is rare = first-mover advantage.",
    nameBlocklist: ["government", "county", "national", "ministry", "public works"],
    placeQuery: "construction company building contractor",
    osmTags: ['["office"="construction"]', '["craft"="construction"]'],
  },
  mosque: {
    key: "mosque",
    label: "Mosque / Islamic Center",
    tier: "A",
    minRating: 3.5,
    minReviews: 5,
    notes: "Mosques and Islamic centers. Organise group travel (Umra, Hajj, ziyarah) and have large congregation networks — high LTV for travel agencies, visa processors, and Islamic finance.",
    nameBlocklist: ["government", "county", "national"],
    placeQuery: "mosque masjid islamic center muslim",
    osmTags: ['["amenity"="place_of_worship"]["religion"="muslim"]', '["amenity"="place_of_worship"]["name"~"mosque|masjid|islamic",i]'],
  },
  visa_agency: {
    key: "visa_agency",
    label: "Visa Agency / Immigration Consultant",
    tier: "A",
    minRating: 4.0,
    minReviews: 10,
    notes: "Visa processing and immigration consultancies. High-value transactions, repeat clients, referral-driven — need systematic lead generation and follow-up.",
    nameBlocklist: ["government", "embassy", "consulate", "immigration department"],
    placeQuery: "visa agency immigration consultant travel document",
    osmTags: ['["office"="travel_agent"]', '["office"="visa"]'],
  },
};

// Cities with enough premium business density to be worth scraping
export const PROTOCOL_CITIES = [
  // ── Tier 1 — Major metros ──────────────────────────────────────────────────
  { value: "Nairobi",  label: "Nairobi",  premium_areas: ["Westlands", "Karen", "Kilimani", "Parklands", "Lavington", "Upperhill", "Gigiri", "Muthaiga", "Runda", "Hurlingham", "South B", "South C", "Langata"] },
  { value: "Mombasa",  label: "Mombasa",  premium_areas: ["Nyali", "Bamburi", "Shanzu", "Diani", "Tudor", "Mikindani"] },
  { value: "Kisumu",   label: "Kisumu",   premium_areas: ["Milimani", "Riat Hills", "Mamboleo", "Lolwe"] },
  { value: "Nakuru",   label: "Nakuru",   premium_areas: ["Milimani", "Section 58", "London"] },
  { value: "Eldoret",  label: "Eldoret",  premium_areas: ["Elgon View", "Langas", "Annex"] },
  // ── Tier 2 — Secondary cities ─────────────────────────────────────────────
  { value: "Thika",    label: "Thika",    premium_areas: ["Blue Post", "Thika Road"] },
  { value: "Nyeri",    label: "Nyeri",    premium_areas: ["King'ong'o", "Othaya"] },
  { value: "Meru",     label: "Meru",     premium_areas: ["Kenyatta", "Maua"] },
  { value: "Machakos", label: "Machakos", premium_areas: ["Mulundi", "Maendeleo"] },
  { value: "Kisii",    label: "Kisii",    premium_areas: ["Hospital Hill", "Daraja Mbili"] },
  { value: "Kakamega", label: "Kakamega", premium_areas: ["Milimani", "Bukhungu"] },
  { value: "Kitale",   label: "Kitale",   premium_areas: [] },
  { value: "Kericho",  label: "Kericho",  premium_areas: [] },
  { value: "Nanyuki",  label: "Nanyuki",  premium_areas: [] },
  // ── Coastal ───────────────────────────────────────────────────────────────
  { value: "Malindi",  label: "Malindi",  premium_areas: ["Silversands", "Watamu"] },
  { value: "Kilifi",   label: "Kilifi",   premium_areas: [] },
  { value: "Lamu",     label: "Lamu",     premium_areas: [] },
  // ── Emerging ──────────────────────────────────────────────────────────────
  { value: "Garissa",       label: "Garissa",       premium_areas: [] },
  { value: "Isiolo",        label: "Isiolo",        premium_areas: [] },
  // ── Uganda ────────────────────────────────────────────────────────────────
  { value: "Kampala",       label: "Kampala",       premium_areas: ["Kololo", "Nakasero", "Bugolobi", "Ntinda", "Muyenga", "Naguru"] },
  { value: "Entebbe",       label: "Entebbe",       premium_areas: [] },
  { value: "Jinja",         label: "Jinja",         premium_areas: [] },
  // ── Tanzania ──────────────────────────────────────────────────────────────
  { value: "Dar es Salaam", label: "Dar es Salaam", premium_areas: ["Masaki", "Oyster Bay", "Upanga", "Mikocheni", "Msasani"] },
  { value: "Zanzibar",      label: "Zanzibar",      premium_areas: ["Stone Town", "Nungwi", "Kendwa"] },
  { value: "Arusha",        label: "Arusha",        premium_areas: ["Njiro", "Sakina"] },
  { value: "Mwanza",        label: "Mwanza",        premium_areas: [] },
];

export const TIER_A_KEYS = Object.values(PROTOCOL).filter((v) => v.tier === "A").map((v) => v.key);
export const TIER_B_KEYS = Object.values(PROTOCOL).filter((v) => v.tier === "B").map((v) => v.key);

export interface ProtocolOverrides {
  minRating?: number;
  minReviews?: number;
}

/**
 * Returns true if a scraped lead passes the protocol for its vertical.
 * Optional overrides let callers relax/tighten thresholds per-job without
 * touching the global defaults stored in PROTOCOL.
 */
export function passesProtocol(lead: {
  name: string;
  google_rating?: number | null;
  google_review_count?: number | null;
  vertical?: string | null;
}, overrides?: ProtocolOverrides): { pass: boolean; reason?: string } {
  const vp = PROTOCOL[lead.vertical ?? ""];
  if (!vp) return { pass: false, reason: `Vertical "${lead.vertical}" not in protocol` };

  const minRating  = overrides?.minRating  ?? vp.minRating;
  const minReviews = overrides?.minReviews ?? vp.minReviews;
  const rating     = lead.google_rating ?? 0;
  const reviews    = lead.google_review_count ?? 0;
  const name       = lead.name.toLowerCase();

  if (rating < minRating) {
    return { pass: false, reason: `Rating ${rating} below minimum ${minRating} for ${vp.label}` };
  }
  if (reviews < minReviews) {
    return { pass: false, reason: `${reviews} reviews below minimum ${minReviews} for ${vp.label}` };
  }
  for (const blocked of vp.nameBlocklist) {
    if (name.includes(blocked.toLowerCase())) {
      return { pass: false, reason: `Name contains blocked term "${blocked}"` };
    }
  }

  return { pass: true };
}

/**
 * Filter an array of leads, returning only those that pass protocol.
 * Logs rejections for transparency.
 */
export function applyProtocol<T extends {
  name: string;
  google_rating?: number | null;
  google_review_count?: number | null;
  vertical?: string | null;
}>(leads: T[], overrides?: ProtocolOverrides): { accepted: T[]; rejected: { lead: T; reason: string }[] } {
  const accepted: T[] = [];
  const rejected: { lead: T; reason: string }[] = [];

  for (const lead of leads) {
    const { pass, reason } = passesProtocol(lead, overrides);
    if (pass) accepted.push(lead);
    else rejected.push({ lead, reason: reason! });
  }

  return { accepted, rejected };
}
