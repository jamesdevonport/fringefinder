import eventsJson from "@/data/events.json";
import venuesJson from "@/data/venues.json";
import summaryJson from "@/data/summary.json";
import type { Event } from "./types";

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
