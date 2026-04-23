"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { EventSearch, Performance } from "@/lib/types";
import { useBookmarks } from "@/lib/bookmarks";
import { Squiggle } from "@/components/Squiggle";
import { BookmarkButton } from "@/components/BookmarkButton";
import { formatPriceRange } from "@/lib/search";
import { parseTime } from "@/lib/transform";

type PerformanceMap = Record<string, Performance[]>;

type Slot = {
  event: EventSearch;
  performance: Performance;
  minutes: number | null;
};

type DayGroup = {
  date: string;
  slots: Slot[];
};

export function BookmarksClient() {
  const { bookmarks, count, clear } = useBookmarks();
  const [events, setEvents] = useState<EventSearch[] | null>(null);
  const [performances, setPerformances] = useState<PerformanceMap | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let cancelled = false;
    Promise.all([
      fetch("/events-search.json").then((r) => r.json()),
      fetch("/events-performances.json").then((r) => r.json()),
    ])
      .then(([searchData, perfData]) => {
        if (cancelled) return;
        setEvents(searchData as EventSearch[]);
        setPerformances(perfData as PerformanceMap);
      })
      .catch((e) => {
        console.error("Failed to load bookmarks data", e);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loaded = events !== null && performances !== null;

  const days = useMemo<DayGroup[] | null>(() => {
    if (!events || !performances) return null;
    const bySlug = new Map<string, EventSearch>();
    for (const e of events) bySlug.set(e.slug, e);
    const byDate = new Map<string, Slot[]>();
    for (const slug of bookmarks) {
      const event = bySlug.get(slug);
      const perfs = performances[slug];
      if (!event || !perfs) continue;
      for (const p of perfs) {
        const slot: Slot = {
          event,
          performance: p,
          minutes: parseTime(p.time_text),
        };
        if (!byDate.has(p.date_iso)) byDate.set(p.date_iso, []);
        byDate.get(p.date_iso)!.push(slot);
      }
    }
    const groups: DayGroup[] = Array.from(byDate.entries())
      .map(([date, slots]) => {
        slots.sort((a, b) => {
          const am = a.minutes ?? 9999;
          const bm = b.minutes ?? 9999;
          if (am !== bm) return am - bm;
          return a.event.title.localeCompare(b.event.title);
        });
        return { date, slots };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
    return groups;
  }, [events, performances, bookmarks]);

  const missingCount = useMemo(() => {
    if (!events || !performances) return 0;
    const have = new Set(events.map((e) => e.slug));
    let n = 0;
    for (const slug of bookmarks) if (!have.has(slug) || !performances[slug]) n++;
    return n;
  }, [events, performances, bookmarks]);

  function handleClear() {
    if (count === 0) return;
    const ok = window.confirm(
      `Remove all ${count} bookmark${count === 1 ? "" : "s"}?`,
    );
    if (ok) clear();
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p
            className="text-xs uppercase tracking-[0.28em] font-bold"
            style={{ color: "var(--color-coral)" }}
          >
            Your shortlist
          </p>
          <h1
            className="font-display text-4xl sm:text-5xl mt-2"
            style={{ fontWeight: 800, letterSpacing: "-0.035em" }}
          >
            Bookmarked shows
          </h1>
          <div className="mt-3">
            <Squiggle width={180} height={12} color="var(--color-coral)" />
          </div>
          {mounted && (
            <p className="ink-soft text-sm mt-3 max-w-xl">
              {count === 0
                ? "Nothing saved yet. Hit the ♡ on any show to keep a list — it's stored on this device only."
                : `${count} show${count === 1 ? "" : "s"} saved to this device, laid out by day so you can plan your Fringe. No account, no tracking.`}
            </p>
          )}
        </div>

        {mounted && count > 0 && (
          <button onClick={handleClear} className="btn">
            Clear all
          </button>
        )}
      </header>

      {!mounted && <Placeholder />}

      {mounted && count === 0 && <EmptyState />}

      {mounted && count > 0 && !loaded && <Placeholder />}

      {mounted && loaded && days && days.length > 0 && <Planner days={days} />}

      {mounted && loaded && days && days.length === 0 && count > 0 && (
        <div className="card p-8 bg-paper text-center">
          <p className="ink-soft">
            Your bookmarked shows don&apos;t have any performances left in the
            catalogue.
          </p>
        </div>
      )}

      {mounted && loaded && missingCount > 0 && (
        <p className="text-xs ink-soft mt-6 italic">
          {missingCount} bookmarked show
          {missingCount === 1 ? " is" : "s are"} no longer in the catalogue and
          has been hidden.
        </p>
      )}
    </div>
  );
}

function Planner({ days }: { days: DayGroup[] }) {
  return (
    <div className="flex flex-col gap-8">
      {days.map((day) => (
        <DaySection key={day.date} day={day} />
      ))}
    </div>
  );
}

function DaySection({ day }: { day: DayGroup }) {
  const d = new Date(day.date + "T12:00:00");
  const weekday = d.toLocaleDateString("en-GB", { weekday: "long" });
  const dayNum = d.getDate();
  const monthName = d.toLocaleDateString("en-GB", { month: "long" });
  return (
    <section>
      <header className="flex items-baseline gap-3 mb-3">
        <span
          className="font-display text-3xl tabular-nums"
          style={{ fontWeight: 800, color: "var(--color-coral)" }}
        >
          {dayNum}
        </span>
        <div>
          <h2
            className="font-display text-xl leading-none"
            style={{ fontWeight: 800 }}
          >
            {weekday}
          </h2>
          <p className="text-xs ink-soft mt-1">{monthName}</p>
        </div>
        <span className="ml-auto text-xs ink-soft">
          {day.slots.length} {day.slots.length === 1 ? "slot" : "slots"}
        </span>
      </header>
      <ul className="card bg-paper divide-y divide-ink/10 overflow-hidden">
        {day.slots.map((slot, i) => (
          <SlotRow
            key={`${slot.event.slug}-${slot.performance.date_iso}-${i}`}
            slot={slot}
          />
        ))}
      </ul>
    </section>
  );
}

function SlotRow({ slot }: { slot: Slot }) {
  const { event, performance } = slot;
  const price = performance.free
    ? "Free"
    : formatPriceRange(performance.price_min, performance.price_max, false);
  return (
    <li className="flex items-stretch gap-3 p-3 sm:p-4">
      <div className="w-16 sm:w-20 shrink-0 flex flex-col items-center justify-center text-center">
        <div
          className="font-display text-lg sm:text-xl leading-none tabular-nums"
          style={{ fontWeight: 700 }}
        >
          {performance.time_text ?? "—"}
        </div>
        {performance.time_of_day && (
          <div className="text-[10px] uppercase tracking-wider ink-soft mt-1">
            {performance.time_of_day}
          </div>
        )}
      </div>
      <Link
        href={`/events/${event.slug}/`}
        className="relative w-20 sm:w-24 shrink-0 aspect-[4/3] rounded-md overflow-hidden bg-paper-deep"
      >
        {event.hero_image ? (
          <Image
            src={event.hero_image}
            alt=""
            fill
            sizes="96px"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-ink/30 font-display text-2xl">
            ✦
          </div>
        )}
      </Link>
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <Link
          href={`/events/${event.slug}/`}
          className="font-display text-base sm:text-lg leading-tight line-clamp-2 wobble-underline"
          style={{ fontWeight: 700 }}
        >
          {event.title}
        </Link>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs ink-soft mt-1">
          {performance.venue_name && <span>@ {performance.venue_name}</span>}
          {event.duration_mins && <span>{event.duration_mins} min</span>}
          {event.genre && <span>{event.genre}</span>}
        </div>
        {price && (
          <div className="mt-1">
            <span className="chip text-xs" data-active="true">
              {price}
            </span>
          </div>
        )}
      </div>
      <div className="shrink-0 self-start">
        <BookmarkButton slug={event.slug} size="sm" />
      </div>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="card p-10 bg-paper text-center">
      <p className="text-5xl mb-3">♡</p>
      <h2 className="font-display text-2xl mb-2" style={{ fontWeight: 800 }}>
        No bookmarks yet
      </h2>
      <p className="ink-soft mb-6 max-w-md mx-auto">
        Browse the catalogue and tap the little heart on any show you&apos;re
        curious about. It&apos;ll show up here, sorted into a day-by-day plan.
      </p>
      <div className="flex flex-wrap gap-2 justify-center">
        <Link href="/browse/" className="btn btn--purple">
          Browse all shows
        </Link>
        <Link href="/match/" className="btn">
          Or chat with the matchmaker
        </Link>
      </div>
    </div>
  );
}

function Placeholder() {
  return (
    <div className="flex items-center gap-3 text-ink-soft py-8">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-3 h-3 rounded-full wobble"
          style={{ background: "var(--color-coral)", animationDelay: `${i * 0.15}s` }}
        />
      ))}
      <span className="font-display text-lg italic" style={{ fontWeight: 600 }}>
        Finding your shortlist…
      </span>
    </div>
  );
}
