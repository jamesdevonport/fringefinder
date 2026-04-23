// Shared layout for programmatic SEO landings (genre, date, free,
// accessibility, audience, genre × date). Keeps each route file short and
// guarantees a consistent on-page structure for both crawlers and humans.

import Link from "next/link";
import type { ReactNode } from "react";
import { EventCard } from "@/components/EventCard";
import { Squiggle } from "@/components/Squiggle";
import { JsonLd } from "@/components/JsonLd";
import type { EventSearch } from "@/lib/types";
import type { Event } from "@/lib/types";
import { breadcrumbSchema, collectionPageSchema, itemListSchema } from "@/lib/schema";
import { paths } from "@/lib/seo";

export type CollectionCrumb = { name: string; path: string };

export function eventToSearch(e: Event): EventSearch {
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

export function CollectionPage({
  eyebrow,
  title,
  intro,
  events,
  path,
  crumbs,
  ctas,
  extra,
}: {
  eyebrow?: string;
  title: string;
  intro: ReactNode;
  events: Event[];
  path: string;
  crumbs: CollectionCrumb[];
  ctas?: ReactNode;
  extra?: ReactNode;
}) {
  const schemas = [
    collectionPageSchema({
      name: title,
      description: typeof intro === "string" ? intro : title,
      path,
    }),
    itemListSchema({
      name: title,
      path,
      events: events.map((e) => ({ slug: e.slug, title: e.title })),
    }),
    breadcrumbSchema(crumbs),
  ];

  return (
    <article className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <JsonLd data={schemas} />
      <nav className="text-sm ink-soft mb-4" aria-label="Breadcrumb">
        {crumbs.map((c, i) => (
          <span key={c.path}>
            {i < crumbs.length - 1 ? (
              <Link href={c.path} className="wobble-underline">
                {c.name}
              </Link>
            ) : (
              <span className="text-ink">{c.name}</span>
            )}
            {i < crumbs.length - 1 ? " / " : null}
          </span>
        ))}
      </nav>
      <header className="mb-10 max-w-3xl">
        {eyebrow && (
          <p
            className="text-xs uppercase tracking-[0.24em] font-semibold mb-3"
            style={{ color: "var(--color-purple-deep)" }}
          >
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-5xl leading-tight mb-3">{title}</h1>
        <Squiggle width={220} height={12} />
        <div className="mt-4 ink-soft leading-relaxed">{intro}</div>
        {ctas && <div className="mt-5 flex flex-wrap gap-2">{ctas}</div>}
      </header>

      {events.length === 0 ? (
        <p className="ink-soft">No matching shows. Try{" "}
          <Link href={paths.browse()} className="wobble-underline">
            browsing all shows
          </Link>
          .
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => (
            <EventCard key={e.slug} event={eventToSearch(e)} />
          ))}
        </div>
      )}

      {extra}
    </article>
  );
}
