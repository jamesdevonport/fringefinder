import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getEventsOnDate,
  priceRangeOf,
  summary,
  topGenresAt,
  topVenuesAt,
} from "@/lib/data";
import { CollectionPage } from "@/components/CollectionPage";
import {
  clampDescription,
  FESTIVAL_LABEL,
  formatDateLong,
  paths,
} from "@/lib/seo";

export function generateStaticParams() {
  return summary.date_list.map((date) => ({ date }));
}

function isValidDate(iso: string): boolean {
  return summary.date_list.includes(iso);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ date: string }>;
}): Promise<Metadata> {
  const { date } = await params;
  if (!isValidDate(date)) return { title: "Date not found" };
  const list = getEventsOnDate(date);
  const long = formatDateLong(date);
  const description = clampDescription(
    `${list.length} shows at ${FESTIVAL_LABEL} on ${long}. See what's on, where, and how much — unofficial guide.`,
  );
  return {
    title: `What's on at ${FESTIVAL_LABEL} — ${long}`,
    description,
    alternates: { canonical: paths.date(date) },
    openGraph: {
      title: `${FESTIVAL_LABEL} — ${long}`,
      description,
      url: paths.date(date),
    },
  };
}

export default async function DatePage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  if (!isValidDate(date)) notFound();
  const list = getEventsOnDate(date);
  const long = formatDateLong(date);
  const genres = topGenresAt(list, 4);
  const venues = topVenuesAt(list, 4);
  const { free } = priceRangeOf(list);

  const intro = (
    <p>
      {list.length} {list.length === 1 ? "show is" : "shows are"} on at{" "}
      {FESTIVAL_LABEL} on {long}.{" "}
      {genres.length > 0 && <>Expect {genres.join(", ")}. </>}
      {venues.length > 0 && <>Featured venues include {venues.join(", ")}. </>}
      {free > 0 && (
        <>{free} {free === 1 ? "show is" : "shows are"} free to attend.</>
      )}
    </p>
  );

  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Browse", path: paths.browse() },
    { name: long, path: paths.date(date) },
  ];

  return (
    <CollectionPage
      eyebrow={FESTIVAL_LABEL}
      title={`What's on · ${long}`}
      intro={intro}
      events={list}
      path={paths.date(date)}
      crumbs={crumbs}
    />
  );
}
