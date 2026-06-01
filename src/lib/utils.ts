import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const VERTICALS = [
  // Tier A
  { value: "dental",        label: "Dental Clinic" },
  { value: "clinic",        label: "Medical Clinic" },
  { value: "hospital",      label: "Private Hospital" },
  { value: "hotel",         label: "Hotel / Hospitality" },
  { value: "real_estate",   label: "Real Estate Agency" },
  { value: "law_firm",      label: "Law Firm" },
  { value: "accounting",    label: "Accounting / CPA Firm" },
  { value: "private_school",label: "Private School" },
  { value: "travel_agency", label: "Travel Agency" },
  // Tier B
  { value: "gym",           label: "Gym / Fitness Studio" },
  { value: "restaurant",    label: "Restaurant" },
  { value: "pharmacy",      label: "Pharmacy" },
  { value: "salon",         label: "Salon / Spa" },
  { value: "event_venue",   label: "Event Venue" },
  { value: "optician",      label: "Eye Clinic / Optician" },
  { value: "vet",           label: "Veterinary Clinic" },
  { value: "logistics",     label: "Logistics / Courier" },
  { value: "car_dealer",    label: "Car Dealership" },
  { value: "minimart",      label: "Mini-Mart / Duka" },
  // Tier A additions
  { value: "it_company",      label: "IT / Software Company" },
  { value: "insurance",       label: "Insurance Broker" },
  { value: "architecture",    label: "Architecture / Interior Design" },
  { value: "digital_agency",  label: "Digital Marketing Agency" },
  { value: "sacco",           label: "SACCO / Microfinance" },
  // Tier B additions
  { value: "auto_workshop",   label: "Car Repair Workshop" },
  { value: "car_wash",        label: "Car Wash / Auto Detailing" },
  { value: "driving_school",  label: "Driving School" },
  { value: "physio",          label: "Physiotherapy Clinic" },
  { value: "bakery",          label: "Artisan Bakery" },
  { value: "print_shop",      label: "Printing Company" },
  { value: "security_firm",   label: "Security Company" },
  { value: "electronics_shop",label: "Electronics / Phone Shop" },
  { value: "tutoring",        label: "Tutoring / Learning Centre" },
  { value: "catering",        label: "Catering Company" },
  { value: "construction",    label: "Construction Contractor" },
  { value: "mosque",          label: "Mosque / Islamic Center" },
  { value: "visa_agency",     label: "Visa Agency / Immigration" },
];

export const CITIES = [
  // Kenya
  "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret",
  "Thika", "Nyeri", "Meru", "Machakos", "Kisii",
  "Kakamega", "Kitale", "Kericho", "Nanyuki",
  "Malindi", "Kilifi", "Lamu",
  "Garissa", "Isiolo",
  // Uganda
  "Kampala", "Entebbe", "Jinja",
  // Tanzania
  "Dar es Salaam", "Zanzibar", "Arusha", "Mwanza",
];

export const STAGES = [
  { value: "new",        label: "New",        color: "bg-zinc-500" },
  { value: "contacted",  label: "Contacted",  color: "bg-blue-500" },
  { value: "replied",    label: "Replied",    color: "bg-yellow-500" },
  { value: "qualified",  label: "Qualified",  color: "bg-purple-500" },
  { value: "won",        label: "Won",        color: "bg-green-500" },
  { value: "lost",       label: "Lost",       color: "bg-red-500" },
];

export const PLANS = {
  free:    { label: "Free",    credits: 50,   price: 0 },
  starter: { label: "Starter", credits: 250,  price: 29 },
  pro:     { label: "Pro",     credits: 1000, price: 79 },
  agency:  { label: "Agency",  credits: 5000, price: 199 },
};

export function scoreColor(score: number | null) {
  if (!score) return "text-zinc-400";
  if (score >= 70) return "text-green-400";
  if (score >= 40) return "text-yellow-400";
  return "text-red-400";
}

export function scoreBg(score: number | null) {
  if (!score) return "bg-zinc-800";
  if (score >= 70) return "bg-green-900/40 border-green-700";
  if (score >= 40) return "bg-yellow-900/40 border-yellow-700";
  return "bg-red-900/40 border-red-700";
}
