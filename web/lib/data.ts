import eventsJson from "@/data/events.json";
import venuesJson from "@/data/venues.json";
import summaryJson from "@/data/summary.json";
import type { AgeBucket, Event } from "./types";
import {
  ACCESSIBILITY_MARKERS,
  AUDIENCE_PAGES,
  GENRES,
  genreNameFromSlug,
} from "./seo";

export type Venue = { slug: string; name: string; eventSlugs: string[] };
export type Summary = {
  generated_at: string;
  cutoff_date: string;
  festival_start: string;
  festival_end: string;
  event_count: number;
  venue_count: number;
  performance_count: number;
  free_event_count: number;
  date_list: string[];
  genre_counts: Record<string, number>;
};

export const events = eventsJson as unknown as Event[];
export const venues = venuesJson as unknown as Venue[];
export const summary = summaryJson as unknown as Summary;

export const eventsBySlug: Map<string, Event> = new Map(events.map((e) => [e.slug, e]));
export const venuesBySlug: Map<string, Venue> = new Map(venues.map((v) => [v.slug, v]));

export function getEvent(slug: string): Event | undefined {
  return eventsBySlug.get(slug);
}

export function getVenue(slug: string): Venue | undefined {
  return venuesBySlug.get(slug);
}

export function getVenueEvents(slug: string): Event[] {
  const v = venuesBySlug.get(slug);
  if (!v) return [];
  return v.eventSlugs
    .map((s) => eventsBySlug.get(s))
    .filter((e): e is Event => !!e);
}

// ───────────────────────────────────────────────────────────── indexes
// Pre-computed at import time so programmatic page builds are fast.

const byGenreSlug = new Map<string, Event[]>();
for (const g of GENRES) byGenreSlug.set(g.slug, []);
for (const e of events) {
  if (!e.genre) continue;
  const g = GENRES.find((x) => x.name === e.genre);
  if (g) byGenreSlug.get(g.slug)!.push(e);
}

const byDate = new Map<string, Event[]>();
for (const iso of summary.date_list) byDate.set(iso, []);
for (const e of events) {
  const seen = new Set<string>();
  for (const p of e.performances) {
    if (seen.has(p.date_iso)) continue;
    seen.add(p.date_iso);
    const bucket = byDate.get(p.date_iso);
    if (bucket) bucket.push(e);
  }
}

const byGenreDate = new Map<string, Event[]>();
for (const g of GENRES) {
  const genreEvents = byGenreSlug.get(g.slug) ?? [];
  for (const iso of summary.date_list) {
    const key = `${g.slug}::${iso}`;
    const list = genreEvents.filter((e) =>
      e.performances.some((p) => p.date_iso === iso),
    );
    if (list.length > 0) byGenreDate.set(key, list);
  }
}

const byAccessibility = new Map<string, Event[]>();
for (const m of ACCESSIBILITY_MARKERS)
  byAccessibility.set(
    m.slug,
    events.filter((e) => e.accessibility.includes(m.match)),
  );

const byAudience = new Map<string, Event[]>();
for (const a of AUDIENCE_PAGES)
  byAudience.set(
    a.slug,
    events.filter((e) => e.age_bucket === a.bucket),
  );

const freeEvents = events.filter((e) => e.has_free_performance);

// ───────────────────────────────────────────────────────────── accessors

export function getEventsByGenre(slug: string): Event[] {
  return byGenreSlug.get(slug) ?? [];
}

export function getEventsOnDate(iso: string): Event[] {
  return byDate.get(iso) ?? [];
}

export function getEventsByGenreAndDate(slug: string, iso: string): Event[] {
  return byGenreDate.get(`${slug}::${iso}`) ?? [];
}

export function getGenreDateCombosWithMinShows(min = 3): { slug: string; date: string }[] {
  const out: { slug: string; date: string }[] = [];
  for (const [key, list] of byGenreDate.entries()) {
    if (list.length >= min) {
      const [slug, date] = key.split("::");
      out.push({ slug, date });
    }
  }
  return out;
}

export function getFreeEvents(): Event[] {
  return freeEvents;
}

export function getEventsByAccessibility(slug: string): Event[] {
  return byAccessibility.get(slug) ?? [];
}

export function getEventsByAgeBucket(slug: string): Event[] {
  return byAudience.get(slug) ?? [];
}

// ───────────────────────────────────────────────────────────── summaries
// Small helpers for body-copy generation on programmatic pages.

export function topGenresAt(eventsList: Event[], limit = 3): string[] {
  const counts = new Map<string, number>();
  for (const e of eventsList) {
    if (!e.genre) continue;
    counts.set(e.genre, (counts.get(e.genre) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([g]) => g);
}

export function topVenuesAt(eventsList: Event[], limit = 3): string[] {
  const counts = new Map<string, number>();
  for (const e of eventsList) {
    const v = e.venue_list[0];
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([v]) => v);
}

export function priceRangeOf(eventsList: Event[]): {
  min: number | null;
  max: number | null;
  free: number;
} {
  let min: number | null = null;
  let max: number | null = null;
  let free = 0;
  for (const e of eventsList) {
    if (e.has_free_performance) free++;
    if (e.price_min !== null) min = min === null ? e.price_min : Math.min(min, e.price_min);
    if (e.price_max !== null) max = max === null ? e.price_max : Math.max(max, e.price_max);
  }
  return { min, max, free };
}

export { genreNameFromSlug };
