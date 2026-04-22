import type { Event } from "./types";
import type { Facets } from "@/components/Browse/FilterBar";

export function buildFacets(events: Event[]): Facets {
  const genreCounts = new Map<string, number>();
  const venueCounts = new Map<string, { slug: string; name: string; count: number }>();
  const warnCounts = new Map<string, number>();
  const accCounts = new Map<string, number>();

  for (const e of events) {
    if (e.genre) genreCounts.set(e.genre, (genreCounts.get(e.genre) ?? 0) + 1);
    for (let i = 0; i < e.venue_slug_list.length; i++) {
      const slug = e.venue_slug_list[i];
      const name = e.venue_list[i] || slug;
      const cur = venueCounts.get(slug) ?? { slug, name, count: 0 };
      cur.count++;
      venueCounts.set(slug, cur);
    }
    for (const w of e.content_warnings)
      warnCounts.set(w, (warnCounts.get(w) ?? 0) + 1);
    for (const a of e.accessibility)
      accCounts.set(a, (accCounts.get(a) ?? 0) + 1);
  }

  return {
    genres: Array.from(genreCounts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count),
    venues: Array.from(venueCounts.values()).sort((a, b) => b.count - a.count),
    contentWarnings: Array.from(warnCounts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count),
    accessibility: Array.from(accCounts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count),
  };
}
