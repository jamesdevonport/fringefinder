"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { EventSearch } from "@/lib/types";
import {
  buildMiniSearch,
  decodeFilters,
  encodeFilters,
  type FilterState,
  matchesFilters,
} from "@/lib/search";
import { EventCard } from "@/components/EventCard";
import { FilterBar, type Facets } from "@/components/Browse/FilterBar";

const PER_DAY_DEFAULT = 12;

export function CalendarClient({
  facets,
  festivalDates,
}: {
  facets: Facets;
  festivalDates: string[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [events, setEvents] = useState<EventSearch[] | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const filter = useMemo(
    () => decodeFilters(params ?? new URLSearchParams()),
    [params],
  );

  useEffect(() => {
    let cancelled = false;
    fetch("/events-search.json")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setEvents(data as EventSearch[]);
      })
      .catch((e) => {
        console.error("Failed to load events", e);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const mini = useMemo(() => (events ? buildMiniSearch(events) : null), [events]);

  const filteredEvents = useMemo(() => {
    if (!events) return null;
    let pool = events;
    if (filter.q && mini) {
      const hits = mini.search(filter.q, { combineWith: "AND" });
      const slugs = new Set(hits.map((h) => h.id as string));
      pool = pool.filter((e) => slugs.has(e.slug));
    }
    pool = pool.filter((e) => matchesFilters(e, filter));
    return pool;
  }, [events, filter, mini]);

  const byDate = useMemo(() => {
    if (!filteredEvents) return null;
    const map = new Map<string, EventSearch[]>();
    for (const date of festivalDates) map.set(date, []);
    for (const e of filteredEvents) {
      for (const d of e.date_list) {
        const bucket = map.get(d);
        if (bucket) bucket.push(e);
      }
    }
    for (const [, list] of map) {
      list.sort((a, b) => a.title.localeCompare(b.title));
    }
    return map;
  }, [filteredEvents, festivalDates]);

  useEffect(() => {
    setExpanded({});
  }, [filter]);

  function updateFilter(next: FilterState) {
    const sp = encodeFilters(next);
    const qs = sp.toString();
    router.replace(qs ? `/calendar/?${qs}` : "/calendar/", { scroll: false });
  }

  function reset() {
    router.replace("/calendar/", { scroll: false });
  }

  const totalMatching = filteredEvents?.length ?? 0;
  const resultText = events
    ? `${totalMatching} / ${events.length} shows`
    : "loading";

  return (
    <div>
      <header className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-4">
        <h1
          className="font-display text-4xl sm:text-5xl"
          style={{ fontWeight: 800, letterSpacing: "-0.03em" }}
        >
          Brighton Fringe, day by day
        </h1>
        <p className="ink-soft mt-1 text-sm">
          {(events?.length ?? 0).toLocaleString("en-GB")} shows pinned to a wall
          calendar. Filter, then scroll — or jump to a date.
        </p>
      </header>

      <FilterBar
        filter={filter}
        onChange={updateFilter}
        facets={facets}
        onReset={reset}
        resultText={resultText}
        totalCount={events?.length ?? 0}
        showSort={false}
        searchPlaceholder={`Search ${(events?.length ?? 0).toLocaleString("en-GB")} shows by title, company, genre…`}
      />

      <DayStrip dates={festivalDates} byDate={byDate} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-10">
        {!byDate && <LoadingBubbles />}
        {byDate && totalMatching === 0 && (
          <EmptyState onReset={reset} />
        )}
        {byDate && totalMatching > 0 && (
          <div className="flex flex-col gap-10">
            {festivalDates.map((date) => {
              const list = byDate.get(date) ?? [];
              return (
                <DaySection
                  key={date}
                  date={date}
                  events={list}
                  expanded={expanded[date] === true}
                  onToggle={() =>
                    setExpanded((s) => ({ ...s, [date]: !s[date] }))
                  }
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- day strip ---------- */

function DayStrip({
  dates,
  byDate,
}: {
  dates: string[];
  byDate: Map<string, EventSearch[]> | null;
}) {
  const stripRef = useRef<HTMLDivElement>(null);

  function jumpTo(date: string) {
    const el = document.getElementById(dayId(date));
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 180;
    window.scrollTo({ top: y, behavior: "smooth" });
  }

  return (
    <div
      className="border-b-2 border-ink"
      style={{ background: "var(--color-lilac-soft)" }}
    >
      <div
        ref={stripRef}
        className="max-w-7xl mx-auto px-4 sm:px-6 py-3 overflow-x-auto scrollbar-thin"
      >
        <div className="flex items-end gap-1.5 min-w-max">
          {dates.map((date) => {
            const count = byDate?.get(date)?.length ?? 0;
            const d = parseDate(date);
            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
            const empty = byDate !== null && count === 0;
            return (
              <button
                key={date}
                onClick={() => jumpTo(date)}
                disabled={empty}
                aria-label={`Jump to ${formatLongDate(date)}`}
                className="flex flex-col items-center justify-center rounded-xl border-2 border-ink shrink-0 px-2.5 py-1.5 transition-all leading-none"
                style={{
                  background: empty
                    ? "var(--color-paper)"
                    : isWeekend
                      ? "var(--color-coral)"
                      : "white",
                  color: empty
                    ? "var(--color-ink-soft)"
                    : isWeekend
                      ? "white"
                      : "var(--color-ink)",
                  opacity: empty ? 0.55 : 1,
                  cursor: empty ? "not-allowed" : "pointer",
                  boxShadow: empty ? "none" : "2px 2px 0 var(--color-ink)",
                  minWidth: 52,
                }}
              >
                <span
                  className="text-[10px] uppercase tracking-wider font-bold"
                  style={{ opacity: 0.8 }}
                >
                  {d.toLocaleDateString("en-GB", { weekday: "short" })}
                </span>
                <span
                  className="font-display tabular-nums mt-0.5"
                  style={{ fontSize: "1.35rem", fontWeight: 800, lineHeight: 1 }}
                >
                  {d.getDate()}
                </span>
                <span
                  className="text-[10px] font-bold tabular-nums mt-0.5"
                  style={{ opacity: 0.9 }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------- day section ---------- */

function DaySection({
  date,
  events,
  expanded,
  onToggle,
}: {
  date: string;
  events: EventSearch[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const d = parseDate(date);
  const weekday = d.toLocaleDateString("en-GB", { weekday: "long" });
  const dayNum = d.getDate();
  const month = d.toLocaleDateString("en-GB", { month: "long" });
  const isWeekend = d.getDay() === 0 || d.getDay() === 6;

  const shown = expanded ? events : events.slice(0, PER_DAY_DEFAULT);
  const hidden = events.length - shown.length;

  return (
    <section
      id={dayId(date)}
      className="scroll-mt-[180px]"
      aria-labelledby={`${dayId(date)}-heading`}
    >
      <header className="flex items-end flex-wrap gap-3 mb-4 border-b-2 border-dashed border-ink pb-3">
        <div className="flex items-end gap-3">
          <div
            className="flex flex-col items-center justify-center rounded-2xl border-2 border-ink shrink-0"
            style={{
              width: 72,
              height: 72,
              background: isWeekend ? "var(--color-coral)" : "var(--color-purple-hot)",
              color: "white",
              boxShadow: "3px 3px 0 var(--color-ink)",
            }}
            aria-hidden="true"
          >
            <span
              className="text-[10px] uppercase tracking-wider font-bold"
              style={{ opacity: 0.9 }}
            >
              {weekday.slice(0, 3)}
            </span>
            <span
              className="font-display tabular-nums"
              style={{ fontSize: "2rem", fontWeight: 800, lineHeight: 1 }}
            >
              {dayNum}
            </span>
          </div>
          <div>
            <h2
              id={`${dayId(date)}-heading`}
              className="font-display leading-none"
              style={{ fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.02em" }}
            >
              {weekday} {dayNum}{" "}
              <span className="ink-soft font-normal">{month}</span>
            </h2>
            <p className="ink-soft text-sm mt-1">
              {events.length === 0
                ? "Nothing matches today."
                : events.length === 1
                  ? "1 show"
                  : `${events.length} shows`}
              {isWeekend && events.length > 0 && (
                <span
                  className="ml-2 sticker sticker--coral text-[10px]"
                  style={{ padding: "0.1rem 0.5rem" }}
                >
                  weekend
                </span>
              )}
            </p>
          </div>
        </div>
      </header>

      {events.length === 0 ? (
        <p className="ink-soft text-sm italic pl-20">— dark day —</p>
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {shown.map((e) => (
              <EventCard key={e.slug} event={e} />
            ))}
          </div>
          {hidden > 0 && (
            <div className="mt-4 flex justify-center">
              <button onClick={onToggle} className="btn">
                Show {hidden} more on {weekday}
              </button>
            </div>
          )}
          {expanded && events.length > PER_DAY_DEFAULT && (
            <div className="mt-4 flex justify-center">
              <button onClick={onToggle} className="chip">
                ↑ Collapse
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

/* ---------- misc ---------- */

function LoadingBubbles() {
  return (
    <div className="flex items-center gap-3 text-ink-soft py-8">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-3 h-3 rounded-full wobble"
          style={{ background: "var(--color-purple)", animationDelay: `${i * 0.15}s` }}
        />
      ))}
      <span className="font-display text-lg italic" style={{ fontWeight: 600 }}>
        Flipping the calendar…
      </span>
    </div>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="card p-8 bg-paper text-center">
      <p className="text-5xl mb-3">📭</p>
      <h2 className="font-display text-2xl mb-2" style={{ fontWeight: 800 }}>
        Nothing in the calendar matches
      </h2>
      <p className="ink-soft mb-5">Try loosening a filter or two.</p>
      <div className="flex flex-wrap gap-2 justify-center">
        <button onClick={onReset} className="btn btn--purple">
          Clear filters
        </button>
        <Link href="/browse/" className="btn">
          Browse instead
        </Link>
      </div>
    </div>
  );
}

function parseDate(iso: string): Date {
  return new Date(iso + "T12:00:00");
}

function formatLongDate(iso: string): string {
  return parseDate(iso).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function dayId(iso: string): string {
  return `d-${iso}`;
}
