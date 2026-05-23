import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const VERTICALS = [
  { value: "real_estate",  label: "Real Estate Agency" },
  { value: "dental",       label: "Dental Clinic" },
  { value: "hotel",        label: "Hotel / Hospitality" },
  { value: "clinic",       label: "Medical Clinic" },
  { value: "logistics",    label: "Logistics / Courier" },
  { value: "restaurant",   label: "Restaurant / Food" },
  { value: "school",       label: "School / Education" },
  { value: "law_firm",     label: "Law Firm" },
  { value: "gym",          label: "Gym / Fitness" },
  { value: "salon",        label: "Salon / Beauty" },
  { value: "pharmacy",     label: "Pharmacy" },
  { value: "auto",         label: "Auto / Garage" },
];

export const CITIES = [
  "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret",
  "Thika", "Machakos", "Nyeri", "Meru", "Kilifi",
  // Extend freely
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
