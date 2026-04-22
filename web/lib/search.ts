import MiniSearch from "minisearch";
import type { EventSearch, TimeOfDay } from "./types";

export type DatePreset =
  | "any"
  | "opening-weekend"
  | "may-day"
  | "final-weekend"
  | "this-weekend"
  | "tonight"
  | "custom";

export type PricePreset = "any" | "free" | "under-10" | "10-20" | "20-plus";
export type DurationPreset = "any" | "short" | "medium" | "long";

export type FilterState = {
  q: string;
  genres: string[];
  venues: string[];
  datePreset: DatePreset;
  dateFrom: string | null;
  dateTo: string | null;
  timeOfDay: TimeOfDay[];
  price: PricePreset;
  duration: DurationPreset;
  ageBuckets: string[];
  accessibility: string[];
  excludeWarnings: string[];
};

export const EMPTY_FILTER: FilterState = {
  q: "",
  genres: [],
  venues: [],
  datePreset: "any",
  dateFrom: null,
  dateTo: null,
  timeOfDay: [],
  price: "any",
  duration: "any",
  ageBuckets: [],
  accessibility: [],
  excludeWarnings: [],
};

// Brighton Fringe 2026 runs 1–31 May.
// 1 May 2026 = Friday, so the opening weekend is Fri–Sun and May Day BH is
// Sat–Mon.  The festival closes Sun 31 May after the Fri–Sun 29–31 weekend.
export const OPENING_WEEKEND: [string, string] = ["2026-05-01", "2026-05-03"];
export const MAY_DAY: [string, string] = ["2026-05-02", "2026-05-04"];
export const FINAL_WEEKEND: [string, string] = ["2026-05-29", "2026-05-31"];

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function thisWeekendRange(): [string, string] {
  const d = new Date();
  const dow = d.getDay();
  const daysToSat = (6 - dow + 7) % 7;
  const sat = new Date(d);
  sat.setDate(d.getDate() + daysToSat);
  const sun = new Date(sat);
  sun.setDate(sat.getDate() + 1);
  const iso = (x: Date) =>
    `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(
      x.getDate(),
    ).padStart(2, "0")}`;
  return [iso(sat), iso(sun)];
}

export function resolveDateRange(f: FilterState): [string, string] | null {
  if (f.datePreset === "any") return null;
  if (f.datePreset === "opening-weekend") return OPENING_WEEKEND;
  if (f.datePreset === "may-day") return MAY_DAY;
  if (f.datePreset === "final-weekend") return FINAL_WEEKEND;
  if (f.datePreset === "tonight") {
    const t = todayISO();
    return [t, t];
  }
  if (f.datePreset === "this-weekend") return thisWeekendRange();
  if (f.datePreset === "custom" && f.dateFrom && f.dateTo) return [f.dateFrom, f.dateTo];
  if (f.datePreset === "custom" && f.dateFrom) return [f.dateFrom, "2026-05-31"];
  if (f.datePreset === "custom" && f.dateTo) return ["2026-05-01", f.dateTo];
  return null;
}

function datesIntersect(eventDates: string[], range: [string, string]): boolean {
  const [from, to] = range;
  return eventDates.some((d) => d >= from && d <= to);
}

export function matchesFilters(e: EventSearch, f: FilterState): boolean {
  if (f.genres.length && (!e.genre || !f.genres.includes(e.genre))) return false;
  if (f.venues.length && !e.venue_slug_list.some((v) => f.venues.includes(v))) return false;
  const range = resolveDateRange(f);
  if (range && !datesIntersect(e.date_list, range)) return false;
  if (f.timeOfDay.length && !e.time_of_day_set.some((t) => f.timeOfDay.includes(t))) return false;
  if (f.price === "free" && !e.has_free_performance) return false;
  if (f.price === "under-10" && !(e.price_min !== null && e.price_min < 10)) return false;
  if (f.price === "10-20" && !(e.price_min !== null && e.price_min >= 10 && e.price_min < 20))
    return false;
  if (f.price === "20-plus" && !(e.price_min !== null && e.price_min >= 20)) return false;
  if (f.duration === "short" && !(e.duration_mins !== null && e.duration_mins <= 45)) return false;
  if (
    f.duration === "medium" &&
    !(e.duration_mins !== null && e.duration_mins > 45 && e.duration_mins <= 75)
  )
    return false;
  if (f.duration === "long" && !(e.duration_mins !== null && e.duration_mins > 75)) return false;
  if (f.ageBuckets.length && !f.ageBuckets.includes(e.age_bucket)) return false;
  if (f.accessibility.length && !f.accessibility.every((tag) => e.accessibility.includes(tag)))
    return false;
  if (f.excludeWarnings.length && f.excludeWarnings.some((w) => e.content_warnings.includes(w)))
    return false;
  return true;
}

export function buildMiniSearch(events: EventSearch[]): MiniSearch<EventSearch> {
  const ms = new MiniSearch<EventSearch>({
    fields: ["title", "company", "short_description", "genre"],
    storeFields: ["slug"],
    idField: "slug",
    searchOptions: {
      boost: { title: 3, company: 1.5, genre: 1.2 },
      prefix: true,
      fuzzy: 0.2,
    },
  });
  ms.addAll(events);
  return ms;
}

export type SortKey = "next" | "title" | "price" | "performances";

export function sortEvents(events: EventSearch[], sort: SortKey): EventSearch[] {
  const arr = [...events];
  if (sort === "title") arr.sort((a, b) => a.title.localeCompare(b.title));
  else if (sort === "price") {
    arr.sort((a, b) => (a.price_min ?? 9e9) - (b.price_min ?? 9e9));
  } else if (sort === "performances") {
    arr.sort((a, b) => b.date_list.length - a.date_list.length);
  } else {
    arr.sort((a, b) => (a.earliest_date ?? "9999").localeCompare(b.earliest_date ?? "9999"));
  }
  return arr;
}

const KEY_MAP: Record<keyof FilterState, string> = {
  q: "q",
  genres: "g",
  venues: "v",
  datePreset: "d",
  dateFrom: "df",
  dateTo: "dt",
  timeOfDay: "t",
  price: "p",
  duration: "dur",
  ageBuckets: "a",
  accessibility: "acc",
  excludeWarnings: "w",
};

export function encodeFilters(f: FilterState): URLSearchParams {
  const sp = new URLSearchParams();
  if (f.q) sp.set(KEY_MAP.q, f.q);
  if (f.genres.length) sp.set(KEY_MAP.genres, f.genres.join(","));
  if (f.venues.length) sp.set(KEY_MAP.venues, f.venues.join(","));
  if (f.datePreset !== "any") sp.set(KEY_MAP.datePreset, f.datePreset);
  if (f.dateFrom) sp.set(KEY_MAP.dateFrom, f.dateFrom);
  if (f.dateTo) sp.set(KEY_MAP.dateTo, f.dateTo);
  if (f.timeOfDay.length) sp.set(KEY_MAP.timeOfDay, f.timeOfDay.join(","));
  if (f.price !== "any") sp.set(KEY_MAP.price, f.price);
  if (f.duration !== "any") sp.set(KEY_MAP.duration, f.duration);
  if (f.ageBuckets.length) sp.set(KEY_MAP.ageBuckets, f.ageBuckets.join(","));
  if (f.accessibility.length) sp.set(KEY_MAP.accessibility, f.accessibility.join(","));
  if (f.excludeWarnings.length) sp.set(KEY_MAP.excludeWarnings, f.excludeWarnings.join(","));
  return sp;
}

export function decodeFilters(sp: URLSearchParams | ReadonlyURLSearchParamsLike): FilterState {
  const get = (k: string) => sp.get(k) ?? "";
  const list = (k: string) => {
    const v = get(k);
    return v ? v.split(",").filter(Boolean) : [];
  };
  return {
    q: get(KEY_MAP.q),
    genres: list(KEY_MAP.genres),
    venues: list(KEY_MAP.venues),
    datePreset: (get(KEY_MAP.datePreset) as DatePreset) || "any",
    dateFrom: get(KEY_MAP.dateFrom) || null,
    dateTo: get(KEY_MAP.dateTo) || null,
    timeOfDay: list(KEY_MAP.timeOfDay) as TimeOfDay[],
    price: (get(KEY_MAP.price) as PricePreset) || "any",
    duration: (get(KEY_MAP.duration) as DurationPreset) || "any",
    ageBuckets: list(KEY_MAP.ageBuckets),
    accessibility: list(KEY_MAP.accessibility),
    excludeWarnings: list(KEY_MAP.excludeWarnings),
  };
}

type ReadonlyURLSearchParamsLike = { get: (key: string) => string | null };

export function countActive(f: FilterState): number {
  let n = 0;
  if (f.q) n++;
  n += f.genres.length;
  n += f.venues.length;
  if (f.datePreset !== "any") n++;
  n += f.timeOfDay.length;
  if (f.price !== "any") n++;
  if (f.duration !== "any") n++;
  n += f.ageBuckets.length;
  n += f.accessibility.length;
  n += f.excludeWarnings.length;
  return n;
}

export function formatPriceRange(min: number | null, max: number | null, free: boolean): string {
  if (free && (!min || min === 0)) return "Free";
  if (min === null) return "";
  if (max === null || min === max) return `£${min.toFixed(min % 1 ? 2 : 0)}`;
  return `£${min.toFixed(min % 1 ? 2 : 0)}–£${max.toFixed(max % 1 ? 2 : 0)}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}
