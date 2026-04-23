import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getEventsByGenre,
  priceRangeOf,
  summary,
  topVenuesAt,
} from "@/lib/data";
import { CollectionPage } from "@/components/CollectionPage";
import {
  clampDescription,
  FESTIVAL_LABEL,
  formatDateLong,
  GENRES,
  genreNameFromSlug,
  paths,
  SITE_NAME,
} from "@/lib/seo";
import { formatPriceRange } from "@/lib/search";

export function generateStaticParams() {
  return GENRES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const genre = genreNameFromSlug(slug);
  if (!genre) return { title: "Genre not found" };
  const list = getEventsByGenre(slug);
  const description = clampDescription(
    `${list.length} ${genre.toLowerCase()} shows at ${FESTIVAL_LABEL}. Browse every ${genre.toLowerCase()} performance, find dates, venues, and prices. Unofficial guide.`,
  );
  return {
    title: `${genre} at ${FESTIVAL_LABEL} — ${list.length} shows`,
    description,
    alternates: { canonical: paths.genre(slug) },
    openGraph: {
      title: `${genre} at ${FESTIVAL_LABEL}`,
      description,
      url: paths.genre(slug),
    },
  };
}

export default async function GenrePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const genre = genreNameFromSlug(slug);
  if (!genre) notFound();
  const list = getEventsByGenre(slug);
  const topVenues = topVenuesAt(list, 4);
  const { min, max, free } = priceRangeOf(list);
  const priceRange = formatPriceRange(min, max, free > 0);

  const intro = (
    <>
      <p>
        {list.length} {genre.toLowerCase()} {list.length === 1 ? "show" : "shows"} run at{" "}
        {FESTIVAL_LABEL} between {formatDateLong(summary.festival_start)} and{" "}
        {formatDateLong(summary.festival_end)}
        {priceRange ? `, priced ${priceRange}` : ""}.{" "}
        {free > 0 && (
          <>
            {free} {free === 1 ? "is" : "are"} free to attend.{" "}
          </>
        )}
        {topVenues.length > 0 && (
          <>
            Expect shows at {topVenues.join(", ")} and more.
          </>
        )}
      </p>
      <p className="mt-3 text-sm">
        {SITE_NAME} is an unofficial, fan-made guide — tickets are sold through
        the official Brighton Fringe box office.
      </p>
    </>
  );

  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Browse", path: paths.browse() },
    { name: genre, path: paths.genre(slug) },
  ];

  return (
    <CollectionPage
      eyebrow={FESTIVAL_LABEL}
      title={`${genre} at ${FESTIVAL_LABEL}`}
      intro={intro}
      events={list}
      path={paths.genre(slug)}
      crumbs={crumbs}
    />
  );
}
