import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getEventsByGenreAndDate,
  getGenreDateCombosWithMinShows,
  priceRangeOf,
  summary,
  topVenuesAt,
} from "@/lib/data";
import { CollectionPage } from "@/components/CollectionPage";
import { formatPriceRange } from "@/lib/search";
import {
  clampDescription,
  FESTIVAL_LABEL,
  formatDateLong,
  genreNameFromSlug,
  paths,
} from "@/lib/seo";

// Build-time enumeration of every genre × date combo that has ≥3 shows. Combos
// below that threshold are skipped entirely — stray URLs render a 404 via
// notFound(). Keeping the threshold prevents Google from classifying these as
// doorway/thin pages.
export function generateStaticParams() {
  return getGenreDateCombosWithMinShows(3).map((c) => ({
    slug: c.slug,
    date: c.date,
  }));
}

function neighbours(slug: string, date: string) {
  const allCombos = getGenreDateCombosWithMinShows(3);
  const sameGenre = allCombos
    .filter((c) => c.slug === slug)
    .map((c) => c.date)
    .sort();
  const idx = sameGenre.indexOf(date);
  const prevDate = idx > 0 ? sameGenre[idx - 1] : null;
  const nextDate =
    idx >= 0 && idx < sameGenre.length - 1 ? sameGenre[idx + 1] : null;

  const otherGenresSameDate = allCombos
    .filter((c) => c.date === date && c.slug !== slug)
    .map((c) => c.slug);

  return { prevDate, nextDate, otherGenresSameDate };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; date: string }>;
}): Promise<Metadata> {
  const { slug, date } = await params;
  const genre = genreNameFromSlug(slug);
  if (!genre || !summary.date_list.includes(date)) return { title: "Page not found" };
  const list = getEventsByGenreAndDate(slug, date);
  if (list.length < 3) return { title: "Page not found" };
  const long = formatDateLong(date);
  const description = clampDescription(
    `${list.length} ${genre.toLowerCase()} shows at ${FESTIVAL_LABEL} on ${long}. Dates, venues, and prices. Unofficial guide.`,
  );
  return {
    title: `${genre} at ${FESTIVAL_LABEL} — ${long}`,
    description,
    alternates: { canonical: paths.genreOnDate(slug, date) },
    openGraph: {
      title: `${genre} at ${FESTIVAL_LABEL} · ${long}`,
      description,
      url: paths.genreOnDate(slug, date),
    },
  };
}

export default async function GenreDatePage({
  params,
}: {
  params: Promise<{ slug: string; date: string }>;
}) {
  const { slug, date } = await params;
  const genre = genreNameFromSlug(slug);
  if (!genre || !summary.date_list.includes(date)) notFound();
  const list = getEventsByGenreAndDate(slug, date);
  if (list.length < 3) notFound();

  const long = formatDateLong(date);
  const venues = topVenuesAt(list, 3);
  const { min, max, free } = priceRangeOf(list);
  const priceRange = formatPriceRange(min, max, free > 0);

  const timeCounts = { matinee: 0, evening: 0, late: 0 };
  for (const e of list) {
    for (const p of e.performances) {
      if (p.date_iso !== date) continue;
      if (p.time_of_day === "Matinee") timeCounts.matinee++;
      else if (p.time_of_day === "Evening") timeCounts.evening++;
      else if (p.time_of_day === "Late night") timeCounts.late++;
    }
  }

  const timeBreakdown = [
    timeCounts.matinee && `${timeCounts.matinee} ${timeCounts.matinee === 1 ? "matinee" : "matinees"}`,
    timeCounts.evening && `${timeCounts.evening} evening ${timeCounts.evening === 1 ? "show" : "shows"}`,
    timeCounts.late && `${timeCounts.late} late-night ${timeCounts.late === 1 ? "slot" : "slots"}`,
  ]
    .filter(Boolean)
    .join(", ");

  const intro = (
    <>
      <p>
        {list.length} {genre.toLowerCase()} {list.length === 1 ? "show" : "shows"} at{" "}
        {FESTIVAL_LABEL} on {long}
        {priceRange ? `, ${priceRange}` : ""}.{" "}
        {venues.length > 0 && (
          <>Look out for slots at {venues.join(", ")}. </>
        )}
        {timeBreakdown && <>The day&apos;s schedule: {timeBreakdown}.</>}
      </p>
    </>
  );

  const { prevDate, nextDate, otherGenresSameDate } = neighbours(slug, date);

  const extra = (
    <section className="mt-16 pt-10 border-t-2 border-ink/10 grid gap-8 md:grid-cols-2">
      <div>
        <h2 className="font-display text-xl mb-3">More {genre.toLowerCase()} dates</h2>
        <ul className="space-y-1.5 text-sm">
          {prevDate && (
            <li>
              ← Previous:{" "}
              <Link href={paths.genreOnDate(slug, prevDate)} className="wobble-underline">
                {formatDateLong(prevDate)}
              </Link>
            </li>
          )}
          {nextDate && (
            <li>
              → Next:{" "}
              <Link href={paths.genreOnDate(slug, nextDate)} className="wobble-underline">
                {formatDateLong(nextDate)}
              </Link>
            </li>
          )}
          <li>
            See every{" "}
            <Link href={paths.genre(slug)} className="wobble-underline font-semibold">
              {genre.toLowerCase()} show →
            </Link>
          </li>
        </ul>
      </div>
      {otherGenresSameDate.length > 0 && (
        <div>
          <h2 className="font-display text-xl mb-3">Other genres on {long}</h2>
          <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
            {otherGenresSameDate.map((g) => {
              const name = genreNameFromSlug(g);
              if (!name) return null;
              return (
                <li key={g}>
                  <Link href={paths.genreOnDate(g, date)} className="wobble-underline">
                    {name}
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="text-sm mt-3">
            Or see{" "}
            <Link href={paths.date(date)} className="wobble-underline font-semibold">
              everything on {long} →
            </Link>
          </p>
        </div>
      )}
    </section>
  );

  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Browse", path: paths.browse() },
    { name: genre, path: paths.genre(slug) },
    { name: long, path: paths.genreOnDate(slug, date) },
  ];

  return (
    <CollectionPage
      eyebrow={FESTIVAL_LABEL}
      title={`${genre} on ${long}`}
      intro={intro}
      events={list}
      path={paths.genreOnDate(slug, date)}
      crumbs={crumbs}
      extra={extra}
    />
  );
}

