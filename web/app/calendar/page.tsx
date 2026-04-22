import { Suspense } from "react";
import type { Metadata } from "next";
import { events, summary } from "@/lib/data";
import { buildFacets } from "@/lib/facets";
import { CalendarClient } from "@/components/Calendar/CalendarClient";

export const metadata: Metadata = {
  title: "Brighton Fringe 2026 calendar · Fringe Finder",
  description:
    "Every Brighton Fringe 2026 show laid out day by day. Filter by genre, venue, price, audience, and more — then see what's on tonight, this weekend, or any date in May.",
};

export default function CalendarPage() {
  const facets = buildFacets(events);
  return (
    <Suspense fallback={<CalendarLoading />}>
      <CalendarClient facets={facets} festivalDates={summary.date_list} />
    </Suspense>
  );
}

function CalendarLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      <p className="ink-soft">Pinning up the wall calendar…</p>
    </div>
  );
}
