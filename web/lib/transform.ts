import type {
  AgeBucket,
  DurationBucket,
  Event,
  Performance,
  PriceBucket,
  TimeOfDay,
} from "./types";

const GENRE_FIXES: Record<string, string | null> = {
  "Events & Films This event has an interval.": "Events & Films",
  "Story Improv (Website)": "Comedy",
};

export function cleanGenre(genre: unknown): string | null {
  if (typeof genre !== "string") return null;
  const trimmed = genre.trim();
  if (!trimmed) return null;
  if (trimmed in GENRE_FIXES) return GENRE_FIXES[trimmed];
  return trimmed;
}

const DURATION_RE = /(\d+)\s*(h(?:r|ours?)?|m(?:in(?:ute)?s?)?)?/gi;

export function parseDurationMins(raw: unknown): number | null {
  if (typeof raw !== "string") return null;
  const s = raw.toLowerCase();
  let hours = 0;
  let mins = 0;
  let matched = false;
  const hrMatch = s.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)/);
  if (hrMatch) {
    hours = parseFloat(hrMatch[1]);
    matched = true;
  }
  const minMatch = s.match(/(\d+)\s*(?:m|min|mins|minute|minutes)/);
  if (minMatch) {
    mins = parseInt(minMatch[1], 10);
    matched = true;
  }
  if (!matched) {
    const bare = s.match(/^\s*(\d+)\s*$/);
    if (bare) {
      const n = parseInt(bare[1], 10);
      return n > 0 && n < 600 ? n : null;
    }
    return null;
  }
  const total = Math.round(hours * 60 + mins);
  return total > 0 ? total : null;
}

export function durationBucket(mins: number | null): DurationBucket | null {
  if (mins === null) return null;
  if (mins <= 45) return "≤45 min";
  if (mins <= 75) return "45–75 min";
  return "75+ min";
}

export function ageBucket(minAge: number | null): AgeBucket {
  if (minAge === null || minAge <= 5) return "Family";
  if (minAge <= 11) return "Kids";
  if (minAge <= 15) return "Teen";
  if (minAge <= 17) return "16+";
  return "18+";
}

export function parseTime(timeText: string | null | undefined): number | null {
  if (!timeText) return null;
  const m = timeText.trim().toLowerCase().match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const mins = m[2] ? parseInt(m[2], 10) : 0;
  const ap = m[3];
  if (ap === "pm" && h < 12) h += 12;
  if (ap === "am" && h === 12) h = 0;
  return h * 60 + mins;
}

export function timeOfDay(timeText: string | null | undefined): TimeOfDay | null {
  const mins = parseTime(timeText);
  if (mins === null) return null;
  if (mins < 17 * 60) return "Matinee";
  if (mins < 21 * 60) return "Evening";
  return "Late night";
}

export function priceBucket(minPrice: number | null, hasFree: boolean): PriceBucket {
  if (hasFree) return "Free";
  if (minPrice === null) return "£20+";
  if (minPrice < 10) return "Under £10";
  if (minPrice < 20) return "£10–20";
  return "£20+";
}

export function isWeekend(isoDate: string): boolean {
  const day = new Date(isoDate + "T12:00:00Z").getUTCDay();
  return day === 0 || day === 6;
}

export function pricesToRange(
  prices: Record<string, unknown> | null | undefined,
): { min: number | null; max: number | null } {
  if (!prices || typeof prices !== "object") return { min: null, max: null };
  const vals: number[] = [];
  for (const v of Object.values(prices)) {
    if (typeof v === "number" && v > 0) vals.push(v);
  }
  if (!vals.length) return { min: null, max: null };
  return { min: Math.min(...vals), max: Math.max(...vals) };
}

export function truncate(text: string, max: number): string {
  if (!text) return "";
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut) + "…";
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function venueSlug(raw: { slug?: unknown; name?: unknown }): string | null {
  if (typeof raw.slug === "string" && raw.slug.trim()) return raw.slug.trim();
  if (typeof raw.name === "string" && raw.name.trim()) return slugify(raw.name);
  return null;
}

export function uniq<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

export function jaccard(a: string[], b: string[]): number {
  if (!a.length && !b.length) return 0;
  const A = new Set(a);
  const B = new Set(b);
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

export function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

export function buildCatalogLine(e: Event): string {
  const age = e.age_bucket;
  const dur = e.duration_mins ? `${e.duration_mins}min` : "—";
  const next = e.earliest_date || "—";
  const venue = e.venue_list[0] || "—";
  const desc = truncate(e.description || "", 160);
  const free = e.has_free_performance ? " (free perfs)" : "";
  return `[${e.slug}] ${e.title} | ${e.genre || "Other"} | ${age} | ${dur} | ${desc} | ${next} @ ${venue}${free}`;
}

export function comparePerformances(a: Performance, b: Performance): number {
  if (a.date_iso !== b.date_iso) return a.date_iso.localeCompare(b.date_iso);
  return (parseTime(a.time_text) ?? 99999) - (parseTime(b.time_text) ?? 99999);
}
