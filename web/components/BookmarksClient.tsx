"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { EventSearch } from "@/lib/types";
import { useBookmarks } from "@/lib/bookmarks";
import { EventCard } from "@/components/EventCard";
import { Squiggle } from "@/components/Squiggle";

export function BookmarksClient() {
  const { bookmarks, count, clear } = useBookmarks();
  const [events, setEvents] = useState<EventSearch[] | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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

  const bookmarked = useMemo(() => {
    if (!events) return null;
    const list = events.filter((e) => bookmarks.has(e.slug));
    list.sort((a, b) =>
      (a.earliest_date ?? "9999").localeCompare(b.earliest_date ?? "9999"),
    );
    return list;
  }, [events, bookmarks]);

  function handleClear() {
    if (count === 0) return;
    const ok = window.confirm(
      `Remove all ${count} bookmark${count === 1 ? "" : "s"}?`,
    );
    if (ok) clear();
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
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
                : `${count} show${count === 1 ? "" : "s"} saved to this device. No account, no tracking.`}
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

      {mounted && count > 0 && !bookmarked && <Placeholder />}

      {mounted && bookmarked && bookmarked.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {bookmarked.map((e) => (
            <EventCard key={e.slug} event={e} />
          ))}
        </div>
      )}

      {mounted && bookmarked && count > 0 && bookmarked.length < count && (
        <p className="text-xs ink-soft mt-6 italic">
          {count - bookmarked.length} bookmarked show
          {count - bookmarked.length === 1 ? " is" : "s are"} no longer in the
          catalogue and has been hidden.
        </p>
      )}
    </div>
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
        curious about. It&apos;ll show up here.
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
