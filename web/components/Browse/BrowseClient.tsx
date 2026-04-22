"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { EventSearch, TimeOfDay } from "@/lib/types";
import {
  buildMiniSearch,
  decodeFilters,
  encodeFilters,
  getDisplayDateSummary,
  type FilterState,
  matchesFilters,
  resolveDateRange,
  sortEvents,
  type SortKey,
} from "@/lib/search";
import { EventCard } from "@/components/EventCard";
import { FilterBar, type Facets } from "./FilterBar";

const PAGE_SIZE = 60;

export function BrowseClient({ facets }: { facets: Facets }) {
  const router = useRouter();
  const params = useSearchParams();
  const [events, setEvents] = useState<EventSearch[] | null>(null);
  const [sort, setSort] = useState<SortKey>("next");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const filter = useMemo(() => decodeFilters(params ?? new URLSearchParams()), [params]);
  const dateRange = useMemo(() => resolveDateRange(filter), [filter]);

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

  const results = useMemo(() => {
    if (!events) return null;
    let pool = events;
    if (filter.q && mini) {
      const hits = mini.search(filter.q, { combineWith: "AND" });
      const slugs = new Set(hits.map((h) => h.id as string));
      pool = pool.filter((e) => slugs.has(e.slug));
    }
    pool = pool.filter((e) => matchesFilters(e, filter));
    return sortEvents(pool, sort, dateRange);
  }, [dateRange, events, filter, mini, sort]);

  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [filter, sort]);

  function updateFilter(next: FilterState) {
    const sp = encodeFilters(next);
    const qs = sp.toString();
    router.replace(qs ? `/browse/?${qs}` : "/browse/", { scroll: false });
  }

  function reset() {
    router.replace("/browse/", { scroll: false });
  }

  const resultText = results
    ? `${results.length} / ${events?.length ?? 0} shows`
    : "loading";

  return (
    <div>
      <header className="max-w-7xl mx-auto px-3 sm:px-6 pt-5 sm:pt-8 pb-3 sm:pb-4">
        <h1
          className="font-display text-[2rem] sm:text-5xl leading-[1.05]"
          style={{ fontWeight: 800, letterSpacing: "-0.03em" }}
        >
          Browse every show
        </h1>
        <p className="ink-soft mt-1 text-xs sm:text-sm">
          {(events?.length ?? 0).toLocaleString("en-GB")} shows at Brighton Fringe 2026.
          Search or filter to find yours.
        </p>
      </header>

      <FilterBar
        filter={filter}
        onChange={updateFilter}
        facets={facets}
        sort={sort}
        onSort={setSort}
        onReset={reset}
        resultText={resultText}
        totalCount={events?.length ?? 0}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-10">

        {!results && <LoadingBubbles />}
        {results && results.length === 0 && (
          <EmptyState filter={filter} onReset={reset} onEdit={updateFilter} />
        )}
        {results && results.length > 0 && (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {results.slice(0, visible).map((e) => (
                <EventCard
                  key={e.slug}
                  event={e}
                  dateSummary={dateRange ? getDisplayDateSummary(e, dateRange) : null}
                />
              ))}
            </div>
            {visible < results.length && (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={() => setVisible((v) => v + PAGE_SIZE)}
                  className="btn btn--ink"
                >
                  Show {Math.min(PAGE_SIZE, results.length - visible)} more
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

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
        Pulling the curtain back…
      </span>
    </div>
  );
}

function EmptyState({
  filter,
  onReset,
  onEdit,
}: {
  filter: FilterState;
  onReset: () => void;
  onEdit: (f: FilterState) => void;
}) {
  return (
    <div className="card p-8 bg-paper text-center">
      <p className="text-5xl mb-3">🎭</p>
      <h2
        className="font-display text-2xl mb-2"
        style={{ fontWeight: 800 }}
      >
        Nothing matches right now
      </h2>
      <p className="ink-soft mb-5">Try loosening a filter or two.</p>
      <div className="flex flex-wrap gap-2 justify-center">
        {filter.q && (
          <button className="chip" onClick={() => onEdit({ ...filter, q: "" })}>
            × search &ldquo;{filter.q}&rdquo;
          </button>
        )}
        {filter.genres.length > 0 && (
          <button className="chip" onClick={() => onEdit({ ...filter, genres: [] })}>
            × {filter.genres.length} genre{filter.genres.length > 1 ? "s" : ""}
          </button>
        )}
        {filter.venues.length > 0 && (
          <button className="chip" onClick={() => onEdit({ ...filter, venues: [] })}>
            × {filter.venues.length} venue{filter.venues.length > 1 ? "s" : ""}
          </button>
        )}
        {filter.datePreset !== "any" && (
          <button
            className="chip"
            onClick={() =>
              onEdit({ ...filter, datePreset: "any", dateFrom: null, dateTo: null })
            }
          >
            × date
          </button>
        )}
        {filter.timeOfDay.length > 0 && (
          <button
            className="chip"
            onClick={() => onEdit({ ...filter, timeOfDay: [] as TimeOfDay[] })}
          >
            × time of day
          </button>
        )}
        {filter.price !== "any" && (
          <button className="chip" onClick={() => onEdit({ ...filter, price: "any" })}>
            × price
          </button>
        )}
        {filter.duration !== "any" && (
          <button className="chip" onClick={() => onEdit({ ...filter, duration: "any" })}>
            × duration
          </button>
        )}
        {filter.ageBuckets.length > 0 && (
          <button className="chip" onClick={() => onEdit({ ...filter, ageBuckets: [] })}>
            × audience
          </button>
        )}
        {filter.accessibility.length > 0 && (
          <button className="chip" onClick={() => onEdit({ ...filter, accessibility: [] })}>
            × accessibility
          </button>
        )}
        {filter.excludeWarnings.length > 0 && (
          <button className="chip" onClick={() => onEdit({ ...filter, excludeWarnings: [] })}>
            × exclusions
          </button>
        )}
        <button className="btn btn--purple" onClick={onReset}>
          Clear everything
        </button>
      </div>
      <p className="mt-6 text-sm text-ink-soft">
        Or{" "}
        <Link href="/explore/" className="wobble-underline font-semibold">
          wander the bubble map
        </Link>{" "}
        instead.
      </p>
    </div>
  );
}
