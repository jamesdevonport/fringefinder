import { Suspense } from "react";
import type { Metadata } from "next";
import { events } from "@/lib/data";
import { buildFacets } from "@/lib/facets";
import { BrowseClient } from "@/components/Browse/BrowseClient";

export const metadata: Metadata = {
  title: "Browse every Brighton Fringe 2026 show",
  description:
    "Filter 800+ Brighton Fringe 2026 shows by venue, date, genre, price, audience, accessibility, and more. Unofficial guide.",
  alternates: { canonical: "/browse/" },
  openGraph: {
    title: "Browse every Brighton Fringe 2026 show",
    description:
      "Filter 800+ Brighton Fringe 2026 shows by venue, date, genre, price, audience, accessibility, and more.",
    url: "/browse/",
  },
};

export default function BrowsePage() {
  const facets = buildFacets(events);
  return (
    <Suspense fallback={<BrowseLoading />}>
      <BrowseClient facets={facets} />
    </Suspense>
  );
}

function BrowseLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      <p className="ink-soft">Rolling up the curtain…</p>
    </div>
  );
}
