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
  { value: "Garissa",  label: "Garissa",  premium_areas: [] },
  { value: "Isiolo",   label: "Isiolo",   premium_areas: [] },
];

export const TIER_A_KEYS = Object.values(PROTOCOL).filter((v) => v.tier === "A").map((v) => v.key);
export const TIER_B_KEYS = Object.values(PROTOCOL).filter((v) => v.tier === "B").map((v) => v.key);

/**
 * Returns true if a scraped lead passes the protocol for its vertical.
 * This runs on every lead before it enters the DB.
 */
export function passesProtocol(lead: {
  name: string;
  google_rating?: number | null;
  google_review_count?: number | null;
  vertical?: string | null;
}): { pass: boolean; reason?: string } {
  const vp = PROTOCOL[lead.vertical ?? ""];
  if (!vp) return { pass: false, reason: `Vertical "${lead.vertical}" not in protocol` };

  const rating  = lead.google_rating ?? 0;
  const reviews = lead.google_review_count ?? 0;
  const name    = lead.name.toLowerCase();

  if (rating < vp.minRating) {
    return { pass: false, reason: `Rating ${rating} below minimum ${vp.minRating} for ${vp.label}` };
  }
  if (reviews < vp.minReviews) {
    return { pass: false, reason: `${reviews} reviews below minimum ${vp.minReviews} for ${vp.label}` };
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
}>(leads: T[]): { accepted: T[]; rejected: { lead: T; reason: string }[] } {
  const accepted: T[] = [];
  const rejected: { lead: T; reason: string }[] = [];

  for (const lead of leads) {
    const { pass, reason } = passesProtocol(lead);
    if (pass) accepted.push(lead);
    else rejected.push({ lead, reason: reason! });
  }

  return { accepted, rejected };
}
