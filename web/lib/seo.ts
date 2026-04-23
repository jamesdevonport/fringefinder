// Shared SEO helpers: URL builders, slug ↔ genre mapping, title/description
// templates. Keep everything here so page metadata stays consistent.

import type { AgeBucket, Event } from "./types";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://fringefinder.co.uk";

export const SITE_NAME = "Fringe Finder";

// Festival window — mirrors data/summary.json for speed/safety at build time.
export const FESTIVAL_YEAR = 2026;
export const FESTIVAL_LABEL = `Brighton Fringe ${FESTIVAL_YEAR}`;

// The 11 genres currently in the catalogue. Keeping an explicit list (rather
// than deriving from events at import time) means we can generate static routes
// deterministically. `slug` → canonical display `name` both ways.
export const GENRES: { name: string; slug: string }[] = [
  { name: "Comedy", slug: "comedy" },
  { name: "Theatre", slug: "theatre" },
  { name: "Music & Nightlife", slug: "music-and-nightlife" },
  { name: "Cabaret & Variety", slug: "cabaret-and-variety" },
  { name: "Children & Young People", slug: "children-and-young-people" },
  { name: "Literature & Spoken Word", slug: "literature-and-spoken-word" },
  {
    name: "Circus Dance & Physical Theatre",
    slug: "circus-dance-and-physical-theatre",
  },
  { name: "Events & Films", slug: "events-and-films" },
  { name: "Workshops", slug: "workshops" },
  { name: "Tours", slug: "tours" },
  { name: "Exhibitions", slug: "exhibitions" },
];

const GENRE_NAME_BY_SLUG = new Map(GENRES.map((g) => [g.slug, g.name]));
const GENRE_SLUG_BY_NAME = new Map(GENRES.map((g) => [g.name, g.slug]));

export function genreNameFromSlug(slug: string): string | null {
  return GENRE_NAME_BY_SLUG.get(slug) ?? null;
}

export function genreSlugFromName(name: string | null | undefined): string | null {
  if (!name) return null;
  return GENRE_SLUG_BY_NAME.get(name) ?? null;
}

// Accessibility & age-bucket slugs. Kept narrow — we only emit the ones with a
// clear real-world query (no "assistance-dogs-welcome" page).
export const ACCESSIBILITY_MARKERS: { slug: string; label: string; match: string }[] = [
  { slug: "wheelchair-accessible", label: "Wheelchair-accessible", match: "Wheelchair Accessible" },
  { slug: "step-free-access", label: "Step-free access", match: "Step-free Access" },
  { slug: "accessible-toilet", label: "Accessible toilets", match: "Accessible Toilet" },
  { slug: "accessible-parking", label: "Accessible parking", match: "Accessible Parking" },
  { slug: "assistance-dogs-welcome", label: "Assistance dogs welcome", match: "Assistance Dogs Welcome" },
];

export const AUDIENCE_PAGES: { slug: string; bucket: AgeBucket; title: string; intro: string }[] = [
  {
    slug: "family",
    bucket: "Family",
    title: "Family-friendly",
    intro: "Shows suitable for all ages",
  },
  {
    slug: "kids",
    bucket: "Kids",
    title: "Shows for kids",
    intro: "Aimed squarely at younger audiences",
  },
];

// Long format used in titles: "Saturday 18 May 2026"
export function formatDateLong(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Sentence-fragment version: "Sat 18 May"
export function formatDateShort(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

// Clamp + strip for meta descriptions. Google truncates at ~155 chars anyway.
export function clampDescription(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).replace(/[.,;:\s]+$/, "") + "…";
}

// ───────────────────────────────────────────────────────────── titles & URLs

export function eventTitle(e: Event): string {
  const genre = e.genre ? `${e.genre} at ${FESTIVAL_LABEL}` : FESTIVAL_LABEL;
  return `${e.title} — ${genre}`;
}

export function eventDescription(e: Event): string {
  const core = e.short_description || e.description || "";
  const perfNoun = e.performances.length === 1 ? "performance" : "performances";
  const venue = e.venue_list[0];
  const dateRange =
    e.earliest_date && e.latest_date
      ? e.earliest_date === e.latest_date
        ? formatDateShort(e.earliest_date)
        : `${formatDateShort(e.earliest_date)}–${formatDateShort(e.latest_date)}`
      : null;

  const tail = [
    e.performances.length
      ? `${e.performances.length} ${perfNoun}${venue ? ` at ${venue}` : ""}`
      : null,
    dateRange,
    "Unofficial guide.",
  ]
    .filter(Boolean)
    .join(" · ");

  if (core.length >= 120) return clampDescription(core);
  return clampDescription(core ? `${core} ${tail}` : tail);
}

export function venueTitle(v: { name: string }): string {
  return `${v.name} — ${FESTIVAL_LABEL} shows`;
}

export function venueDescription(args: {
  name: string;
  count: number;
  topGenres: string[];
  freeCount: number;
  firstDate: string | null;
  lastDate: string | null;
}): string {
  const { name, count, topGenres, freeCount, firstDate, lastDate } = args;
  const genrePhrase = topGenres.length
    ? `spanning ${topGenres.slice(0, 3).join(", ")}`
    : "";
  const datePhrase =
    firstDate && lastDate && firstDate !== lastDate
      ? `from ${formatDateShort(firstDate)} to ${formatDateShort(lastDate)}`
      : firstDate
        ? `on ${formatDateShort(firstDate)}`
        : "";
  const freePhrase = freeCount > 0 ? `${freeCount} free to attend.` : "";
  return clampDescription(
    [
      `${count} ${count === 1 ? "show" : "shows"} at ${name} during ${FESTIVAL_LABEL}`,
      genrePhrase,
      datePhrase + ".",
      freePhrase,
      "Unofficial guide.",
    ]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+\./g, ".")
      .replace(/\s+/g, " "),
  );
}

// ───────────────────────────────────────────────────────────── paths

export const paths = {
  home: () => "/",
  browse: () => "/browse/",
  event: (slug: string) => `/events/${slug}/`,
  venue: (slug: string) => `/venues/${slug}/`,
  genre: (slug: string) => `/genre/${slug}/`,
  date: (iso: string) => `/on/${iso}/`,
  genreOnDate: (slug: string, iso: string) => `/genre/${slug}/on/${iso}/`,
  free: () => "/free/",
  accessible: (slug: string) => `/accessible/${slug}/`,
  audience: (slug: string) => `/for/${slug}/`,
};

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path}`;
}
