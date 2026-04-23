import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getVenue, getVenueEvents, venues, topGenresAt, priceRangeOf } from "@/lib/data";
import { EventCard } from "@/components/EventCard";
import { Squiggle } from "@/components/Squiggle";
import { JsonLd } from "@/components/JsonLd";
import { formatDate } from "@/lib/search";
import {
  FESTIVAL_LABEL,
  formatDateLong,
  paths,
  venueDescription,
  venueTitle,
} from "@/lib/seo";
import {
  breadcrumbSchema,
  collectionPageSchema,
  itemListSchema,
  venueSchema,
} from "@/lib/schema";
import type { Event } from "@/lib/types";
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
  if (!v) return { title: "Venue not found" };
  const venueEvents = getVenueEvents(slug);
  const topGenres = topGenresAt(venueEvents, 3);
  const { free } = priceRangeOf(venueEvents);
  const firstDate = firstDateAt(venueEvents, slug);
  const lastDate = lastDateAt(venueEvents, slug);
  const description = venueDescription({
    name: v.name,
    count: venueEvents.length,
    topGenres,
    freeCount: free,
    firstDate,
    lastDate,
  });
  return {
    title: venueTitle(v),
    description,
    alternates: { canonical: paths.venue(slug) },
    openGraph: {
      title: `${v.name} — ${FESTIVAL_LABEL}`,
      description,
      type: "website",
      url: paths.venue(slug),
    },
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

function firstDateAt(venueEvents: Event[], slug: string): string | null {
  const dates = venueEvents.flatMap((e) =>
    e.performances.filter((p) => p.venue_slug === slug).map((p) => p.date_iso),
  );
  return dates.length ? dates.sort()[0] : null;
}

function lastDateAt(venueEvents: Event[], slug: string): string | null {
  const dates = venueEvents.flatMap((e) =>
    e.performances.filter((p) => p.venue_slug === slug).map((p) => p.date_iso),
  );
  return dates.length ? dates.sort()[dates.length - 1] : null;
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

  const topGenres = topGenresAt(venueEvents, 3);
  const firstDate = firstDateAt(venueEvents, slug);
  const lastDate = lastDateAt(venueEvents, slug);
  const { free } = priceRangeOf(venueEvents);

  const intro = [
    `${v.name} hosts ${venueEvents.length} ${venueEvents.length === 1 ? "show" : "shows"} during ${FESTIVAL_LABEL}`,
    topGenres.length ? `, spanning ${topGenres.join(", ")}.` : ".",
  ].join("");
  const dateLine =
    firstDate && lastDate && firstDate !== lastDate
      ? `The first performance is ${formatDateLong(firstDate)}; the last is ${formatDateLong(lastDate)}.`
      : firstDate
        ? `Performances are on ${formatDateLong(firstDate)}.`
        : "";
  const freeLine = free > 0 ? ` ${free} ${free === 1 ? "show is" : "shows are"} free to attend.` : "";

  const nearbyVenues = pickNearbyVenues(slug, 6);

  const breadcrumbs = [
    { name: "Home", path: "/" },
    { name: "Venues", path: paths.browse() },
    { name: v.name, path: paths.venue(slug) },
  ];

  const schemas = [
    venueSchema(v),
    itemListSchema({
      name: `Shows at ${v.name} during ${FESTIVAL_LABEL}`,
      path: paths.venue(slug),
      events: venueEvents.map((e) => ({ slug: e.slug, title: e.title })),
    }),
    breadcrumbSchema(breadcrumbs),
    collectionPageSchema({
      name: venueTitle(v),
      description: `${venueEvents.length} shows at ${v.name} during ${FESTIVAL_LABEL}.`,
      path: paths.venue(slug),
    }),
  ];

  return (
    <article className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <JsonLd data={schemas} />
      <nav className="text-sm ink-soft mb-4" aria-label="Breadcrumb">
        <Link href={paths.browse()} className="wobble-underline">
          Browse
        </Link>{" "}
        / Venues / {v.name}
      </nav>
      <header className="mb-10">
        <span className="sticker sticker--teal">{venueEvents.length} shows here</span>
        <h1 className="font-display text-5xl mt-3 mb-2">{v.name}</h1>
        <Squiggle width={200} height={12} color="var(--color-teal)" />
        <p className="mt-4 ink-soft max-w-3xl leading-relaxed">
          {intro} {dateLine}
          {freeLine}
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
              <EventCard key={`${date}-${e.slug}`} event={e} dateSummary={{ iso: date }} />
            ))}
          </div>
        </section>
      ))}

      {nearbyVenues.length > 0 && (
        <section className="mt-16 pt-10 border-t-2 border-ink/10">
          <h2 className="font-display text-2xl mb-4">Other venues at {FESTIVAL_LABEL}</h2>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {nearbyVenues.map((n) => (
              <li key={n.slug}>
                <Link href={paths.venue(n.slug)} className="wobble-underline">
                  {n.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}

// Stable "nearby" pick — seeded shuffle by the slug so the set is consistent
// across renders but varies from venue to venue.
function pickNearbyVenues(currentSlug: string, n: number): { slug: string; name: string }[] {
  const others = venues.filter((v) => v.slug !== currentSlug);
  let seed = 0;
  for (let i = 0; i < currentSlug.length; i++) seed = (seed * 31 + currentSlug.charCodeAt(i)) | 0;
  const out = [...others];
  for (let i = out.length - 1; i > 0; i--) {
    seed = (seed * 1664525 + 1013904223) | 0;
    const j = Math.abs(seed) % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.slice(0, n).map((v) => ({ slug: v.slug, name: v.name }));
}
