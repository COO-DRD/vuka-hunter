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
    placeQuery: "law firm",
    osmTags: ['["office"="lawyer"]', '["office"="law_firm"]'],
  },
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
};

// Cities with enough premium business density to be worth scraping
export const PROTOCOL_CITIES = [
  { value: "Nairobi",  label: "Nairobi", premium_areas: ["Westlands", "Karen", "Kilimani", "Parklands", "Lavington", "Upperhill", "Gigiri", "Muthaiga", "Runda"] },
  { value: "Mombasa",  label: "Mombasa", premium_areas: ["Nyali", "Bamburi", "Shanzu", "Diani"] },
  { value: "Kisumu",   label: "Kisumu",  premium_areas: ["Milimani", "Riat Hills"] },
  { value: "Nakuru",   label: "Nakuru",  premium_areas: [] },
  { value: "Eldoret",  label: "Eldoret", premium_areas: [] },
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
