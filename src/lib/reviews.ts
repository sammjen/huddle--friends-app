export type Review = {
  id: string;
  quote: string;
  name: string;
  location: string;
  stars: number;
};

const STORAGE_KEY = "huddle-user-reviews";

export const DEFAULT_REVIEWS: Review[] = [
  { id: "seed-1", quote: "I struggled to make friends after moving, but Huddle matched me with people who actually get me. Lifelong friends!", name: "Amanda", location: "San Francisco", stars: 5 },
  { id: "seed-2", quote: "Finally have a squad to play pickup basketball with. This app changed my weekends.", name: "Thomas", location: "Cleveland", stars: 5 },
  { id: "seed-3", quote: "The 24-hour drops keep it exciting. Every day feels like a new opportunity.", name: "LeBron", location: "Los Angeles", stars: 5 },
  { id: "seed-4", quote: "I feel like I finally have a real support group. Not just online friends — real ones.", name: "Alice", location: "Dallas", stars: 4 },
  { id: "seed-5", quote: "Found gym bros who actually show up. We've been consistent for 3 months now.", name: "Greg", location: "Provo", stars: 5 },
  { id: "seed-6", quote: "Reconnected with an old friend by total chance. This app is magic.", name: "Ryan", location: "Austin", stars: 5 },
  { id: "seed-7", quote: "As someone naturally introverted, this app gave me the confidence to join groups without the awkwardness. Best decision ever.", name: "Michael", location: "Boston", stars: 5 },
];

export function loadUserReviews(): Review[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r): r is Review =>
        r != null &&
        typeof r === "object" &&
        typeof (r as Review).id === "string" &&
        typeof (r as Review).quote === "string" &&
        typeof (r as Review).name === "string" &&
        typeof (r as Review).location === "string" &&
        typeof (r as Review).stars === "number" &&
        (r as Review).stars >= 1 &&
        (r as Review).stars <= 5,
    );
  } catch {
    return [];
  }
}

export function saveUserReviews(reviews: Review[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
}
