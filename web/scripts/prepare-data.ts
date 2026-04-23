import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Event, EventSearch, Performance, TimeOfDay } from "../lib/types";
import {
  ageBucket,
  buildCatalogLine,
  cleanGenre,
  comparePerformances,
  durationBucket,
  isWeekend,
  jaccard,
  parseDurationMins,
  pricesToRange,
  timeOfDay,
  tokenize,
  truncate,
  uniq,
  venueSlug,
} from "../lib/transform";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SOURCE = resolve(ROOT, "..", "results.json");
const OUT_DATA = resolve(ROOT, "data");
const OUT_PUBLIC = resolve(ROOT, "public");

// Brighton Fringe 2026 runs 1–31 May.  Only events with at least one
// performance on or after TODAY ship to the client — no point showing shows
// that have already been and gone.  Override with FRINGE_TODAY=YYYY-MM-DD
// if your clock is off (e.g. hobby laptop set to real-today).
const TODAY: string =
  (process.env.FRINGE_TODAY ?? "").trim() || new Date().toISOString().slice(0, 10);
const FESTIVAL_START = "2026-05-01";
const FESTIVAL_END = "2026-05-31";
// If today is before the festival even starts, don't filter — preview builds
// should still surface everything.
const CUTOFF = TODAY < FESTIVAL_START ? FESTIVAL_START : TODAY;

function ensureDir(path: string) {
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
}

function firstString(...vals: unknown[]): string | null {
  for (const v of vals) if (typeof v === "string" && v.trim()) return v.trim();
  return null;
}

type Raw = {
  url?: string;
  slug?: string;
  title?: string;
  description?: string;
  description_html?: string;
  hero_image?: string;
  gallery?: string[];
  genre?: string;
  duration?: string;
  company?: string;
  website?: string;
  socials?: Record<string, string>;
  age_suitability?: string;
  age?: { min_age?: number | null; type?: "Guideline" | "Restriction" | null; raw?: string };
  accessibility?: string[];
  content_warnings?: string[];
  performances?: Array<{
    date_iso?: string;
    date_text?: string;
    time_text?: string;
    venue_name?: string;
    venue_slug?: string;
    venue_url?: string;
    performance_id?: string;
    free?: boolean;
    prices?: Record<string, number>;
    price_raw?: string;
  }>;
};

function normaliseEvent(raw: Raw): Event | null {
  if (!raw.title || !raw.slug) return null;
  const performancesRaw = raw.performances || [];
  const performances: Performance[] = performancesRaw
    .filter(
      (p) =>
        typeof p?.date_iso === "string" &&
        p.date_iso >= CUTOFF &&
        p.date_iso <= FESTIVAL_END,
    )
    .map((p) => {
      const { min, max } = pricesToRange(p.prices);
      const isFree = !!p.free || (min === null && /free/i.test(p.price_raw || ""));
      return {
        date_iso: p.date_iso!,
        time_text: p.time_text?.trim() || null,
        venue_name: p.venue_name?.trim() || null,
        venue_slug: venueSlug({ slug: p.venue_slug, name: p.venue_name }),
        price_min: isFree ? 0 : min,
        price_max: isFree ? 0 : max,
        free: isFree,
        time_of_day: timeOfDay(p.time_text),
      };
    })
    .sort(comparePerformances);

  // Drop events that have no upcoming performances left after filtering
  if (performances.length === 0) return null;

  const venue_list = uniq(performances.map((p) => p.venue_name).filter((v): v is string => !!v));
  const venue_slug_list = uniq(
    performances.map((p) => p.venue_slug).filter((v): v is string => !!v),
  );
  const date_list = uniq(performances.map((p) => p.date_iso));
  const weekend_dates = date_list.filter(isWeekend);
  const earliest_date = date_list[0] || null;
  const latest_date = date_list[date_list.length - 1] || null;

  const pricePool = performances.flatMap((p) =>
    p.free ? [] : [p.price_min, p.price_max].filter((v): v is number => typeof v === "number"),
  );
  const price_min = pricePool.length ? Math.min(...pricePool) : null;
  const price_max = pricePool.length ? Math.max(...pricePool) : null;
  const has_free_performance = performances.some((p) => p.free);

  const time_of_day_set = uniq(
    performances.map((p) => p.time_of_day).filter((v): v is TimeOfDay => !!v),
  );

  const min_age = raw.age?.min_age ?? null;
  const duration_mins = parseDurationMins(raw.duration);

  const description = (raw.description || "").trim();

  return {
    slug: raw.slug,
    title: raw.title.trim(),
    description,
    description_html: raw.description_html || "",
    short_description: truncate(description, 200),
    genre: cleanGenre(raw.genre),
    company: firstString(raw.company),
    website: firstString(raw.website),
    duration_raw: firstString(raw.duration),
    duration_mins,
    duration_bucket: durationBucket(duration_mins),
    min_age: typeof min_age === "number" ? min_age : null,
    age_bucket: ageBucket(typeof min_age === "number" ? min_age : null),
    age_type: raw.age?.type || null,
    hero_image: firstString(raw.hero_image),
    gallery: Array.isArray(raw.gallery) ? raw.gallery.filter((s) => typeof s === "string") : [],
    content_warnings: Array.isArray(raw.content_warnings) ? raw.content_warnings : [],
    accessibility: Array.isArray(raw.accessibility) ? raw.accessibility : [],
    socials: raw.socials && typeof raw.socials === "object" ? raw.socials : {},
    url: firstString(raw.url),
    performances,
    venue_list,
    venue_slug_list,
    date_list,
    earliest_date,
    latest_date,
    price_min,
    price_max,
    has_free_performance,
    time_of_day_set,
    weekend_dates,
    similar: [],
  };
}

function computeSimilar(events: Event[]): void {
  const byGenre = new Map<string, Event[]>();
  for (const e of events) {
    const g = e.genre || "__none";
    if (!byGenre.has(g)) byGenre.set(g, []);
    byGenre.get(g)!.push(e);
  }
  const titleTokens = new Map<string, string[]>();
  for (const e of events) titleTokens.set(e.slug, tokenize(e.title));

  for (const e of events) {
    const pool = byGenre.get(e.genre || "__none") || [];
    const scored = pool
      .filter((c) => c.slug !== e.slug)
      .map((c) => {
        const venueScore = jaccard(e.venue_slug_list, c.venue_slug_list);
        const titleScore = jaccard(titleTokens.get(e.slug)!, titleTokens.get(c.slug)!);
        return { slug: c.slug, score: venueScore * 0.6 + titleScore * 0.4 };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    e.similar = scored.map((s) => s.slug);
  }
}

function toSearch(e: Event): EventSearch {
  return {
    slug: e.slug,
    title: e.title,
    company: e.company,
    genre: e.genre,
    short_description: e.short_description,
    hero_image: e.hero_image,
    venue_list: e.venue_list,
    venue_slug_list: e.venue_slug_list,
    date_list: e.date_list,
    earliest_date: e.earliest_date,
    price_min: e.price_min,
    price_max: e.price_max,
    has_free_performance: e.has_free_performance,
    min_age: e.min_age,
    age_bucket: e.age_bucket,
    duration_mins: e.duration_mins,
    duration_bucket: e.duration_bucket,
    content_warnings: e.content_warnings,
    accessibility: e.accessibility,
    time_of_day_set: e.time_of_day_set,
    weekend_dates: e.weekend_dates,
  };
}

function main() {
  if (!existsSync(SOURCE)) {
    console.error(`results.json not found at ${SOURCE}`);
    process.exit(1);
  }
  const raw: Raw[] = JSON.parse(readFileSync(SOURCE, "utf8"));
  const events = raw
    .map(normaliseEvent)
    .filter((e): e is Event => !!e);

  console.log(
    `Filtering window ${CUTOFF} → ${FESTIVAL_END} (today=${TODAY}).  ` +
      `Kept ${events.length} / ${raw.length} events with at least one upcoming performance.`,
  );

  computeSimilar(events);

  ensureDir(OUT_DATA);
  ensureDir(OUT_PUBLIC);

  // Full catalog for the match function
  writeFileSync(resolve(OUT_DATA, "events.json"), JSON.stringify(events));

  // Trimmed for the client
  const search = events.map(toSearch);
  writeFileSync(resolve(OUT_PUBLIC, "events-search.json"), JSON.stringify(search));

  // Per-event performance list, keyed by slug. Used by /bookmarks to show a
  // time-ordered day-planner view. Loaded only on that page — kept out of the
  // main search bundle because most pages don't need times/venues per showing.
  const perfMap: Record<string, Performance[]> = {};
  for (const e of events) perfMap[e.slug] = e.performances;
  writeFileSync(
    resolve(OUT_PUBLIC, "events-performances.json"),
    JSON.stringify(perfMap),
  );

  // Venue map for browse + venue pages
  const venueMap = new Map<string, { slug: string; name: string; eventSlugs: string[] }>();
  for (const e of events) {
    for (let i = 0; i < e.venue_slug_list.length; i++) {
      const vslug = e.venue_slug_list[i];
      const vname = e.venue_list[i] || vslug;
      if (!venueMap.has(vslug)) venueMap.set(vslug, { slug: vslug, name: vname, eventSlugs: [] });
      venueMap.get(vslug)!.eventSlugs.push(e.slug);
    }
  }
  const venues = Array.from(venueMap.values()).sort((a, b) => b.eventSlugs.length - a.eventSlugs.length);
  writeFileSync(resolve(OUT_DATA, "venues.json"), JSON.stringify(venues));

  // Catalog prompt for Kimi — emit both text (for eyeballing) and JSON (for import)
  const catalogLines = events.map(buildCatalogLine).join("\n");
  writeFileSync(resolve(OUT_DATA, "catalog-prompt.txt"), catalogLines);
  writeFileSync(
    resolve(OUT_DATA, "catalog-prompt.json"),
    JSON.stringify({ text: catalogLines }),
  );

  // Compact per-event lookup used by the match function for hydration
  const matchIndex = events.map((e) => ({
    slug: e.slug,
    title: e.title,
    company: e.company,
    genre: e.genre,
    short_description: e.short_description,
    hero_image: e.hero_image,
    venue_list: e.venue_list,
    date_list: e.date_list,
    earliest_date: e.earliest_date,
    price_min: e.price_min,
    price_max: e.price_max,
    has_free_performance: e.has_free_performance,
    min_age: e.min_age,
    age_bucket: e.age_bucket,
    duration_mins: e.duration_mins,
    duration_bucket: e.duration_bucket,
    content_warnings: e.content_warnings,
    time_of_day_set: e.time_of_day_set,
    weekend_dates: e.weekend_dates,
    next_performance: e.performances[0] || null,
  }));
  writeFileSync(resolve(OUT_DATA, "match-index.json"), JSON.stringify(matchIndex));

  // Small summary for the homepage / sanity
  const summary = {
    generated_at: new Date().toISOString(),
    cutoff_date: CUTOFF,
    festival_start: FESTIVAL_START,
    festival_end: FESTIVAL_END,
    event_count: events.length,
    venue_count: venues.length,
    performance_count: events.reduce((n, e) => n + e.performances.length, 0),
    free_event_count: events.filter((e) => e.has_free_performance).length,
    date_list: uniq(events.flatMap((e) => e.date_list)).sort(),
    genre_counts: Object.fromEntries(
      Object.entries(
        events.reduce<Record<string, number>>((acc, e) => {
          const g = e.genre || "Other";
          acc[g] = (acc[g] || 0) + 1;
          return acc;
        }, {}),
      ).sort((a, b) => b[1] - a[1]),
    ),
  };
  writeFileSync(resolve(OUT_DATA, "summary.json"), JSON.stringify(summary, null, 2));

  console.log(
    `Wrote data/events.json (${events.length}), public/events-search.json, data/venues.json (${venues.length}), data/catalog-prompt.txt (${catalogLines.length} chars).`,
  );
}

main();
