import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getVenue, getVenueEvents, venues } from "@/lib/data";
import { EventCard } from "@/components/EventCard";
import { Squiggle } from "@/components/Squiggle";
import { formatDate } from "@/lib/search";
import type { EventSearch } from "@/lib/types";

export function generateStaticParams() {
  return venues.map((v) => ({ slug: v.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const v = getVenue(slug);
  if (!v) return { title: "Venue not found · Fringe Finder" };
  return {
    title: `${v.name} at Brighton Fringe · Fringe Finder`,
    description: `Every show at ${v.name} during Brighton Fringe 2026.`,
  };
}

type DayGroup = { date: string; events: EventSearch[] };

function toSearch(e: ReturnType<typeof getVenueEvents>[number]): EventSearch {
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

export default async function VenuePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const v = getVenue(slug);
  if (!v) notFound();
  const venueEvents = getVenueEvents(slug);

  // Group by earliest date for each event at this venue
  const byDate = new Map<string, EventSearch[]>();
  for (const e of venueEvents) {
    const perfsHere = e.performances.filter((p) => p.venue_slug === slug);
    for (const p of perfsHere) {
      if (!byDate.has(p.date_iso)) byDate.set(p.date_iso, []);
      const bucket = byDate.get(p.date_iso)!;
      if (!bucket.some((x) => x.slug === e.slug)) bucket.push(toSearch(e));
    }
  }
  const days: DayGroup[] = Array.from(byDate.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, events]) => ({ date, events }));

  return (
    <article className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <nav className="text-sm ink-soft mb-4">
        <Link href="/browse/" className="wobble-underline">
          Browse
        </Link>{" "}
        / Venues / {v.name}
      </nav>
      <header className="mb-10">
        <span className="sticker sticker--teal">{venueEvents.length} shows here</span>
        <h1 className="font-display text-5xl mt-3 mb-2">{v.name}</h1>
        <Squiggle width={200} height={12} color="var(--color-teal)" />
        <p className="mt-3 ink-soft">
          Every show at this venue during Brighton Fringe 2026.
        </p>
      </header>

      {days.map(({ date, events }) => (
        <section key={date} className="mb-10">
          <h2 className="font-display text-2xl mb-4 flex items-baseline gap-3">
            {formatDate(date)}
            <span className="text-sm ink-soft font-sans">
              {events.length} {events.length === 1 ? "show" : "shows"}
            </span>
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((e) => (
              <EventCard key={`${date}-${e.slug}`} event={e} />
            ))}
          </div>
        </section>
      ))}
    </article>
  );
}
