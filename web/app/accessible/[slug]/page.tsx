import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getEventsByAccessibility,
  topGenresAt,
  topVenuesAt,
} from "@/lib/data";
import { CollectionPage } from "@/components/CollectionPage";
import {
  ACCESSIBILITY_MARKERS,
  clampDescription,
  FESTIVAL_LABEL,
  paths,
} from "@/lib/seo";

export function generateStaticParams() {
  return ACCESSIBILITY_MARKERS.map((m) => ({ slug: m.slug }));
}

function findMarker(slug: string) {
  return ACCESSIBILITY_MARKERS.find((m) => m.slug === slug) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const marker = findMarker(slug);
  if (!marker) return { title: "Accessibility info not found" };
  const list = getEventsByAccessibility(slug);
  const description = clampDescription(
    `${list.length} ${marker.label.toLowerCase()} shows at ${FESTIVAL_LABEL}. Find accessible performances, venues, and dates. Unofficial guide.`,
  );
  return {
    title: `${marker.label} shows at ${FESTIVAL_LABEL}`,
    description,
    alternates: { canonical: paths.accessible(slug) },
    openGraph: {
      title: `${marker.label} shows at ${FESTIVAL_LABEL}`,
      description,
      url: paths.accessible(slug),
    },
  };
}

export default async function AccessiblePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const marker = findMarker(slug);
  if (!marker) notFound();
  const list = getEventsByAccessibility(slug);
  const genres = topGenresAt(list, 4);
  const venues = topVenuesAt(list, 4);

  const intro = (
    <>
      <p>
        {list.length} shows at {FESTIVAL_LABEL} have been flagged as{" "}
        <strong>{marker.label.toLowerCase()}</strong>.{" "}
        {genres.length > 0 && <>The mix includes {genres.join(", ")}. </>}
        {venues.length > 0 && <>Main venues: {venues.join(", ")}.</>}
      </p>
      <p className="mt-3 text-sm">
        Accessibility data comes from the show&apos;s brightonfringe.org
        listing. If you have specific access needs, confirm with the venue
        before booking.
      </p>
    </>
  );

  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Browse", path: paths.browse() },
    { name: marker.label, path: paths.accessible(slug) },
  ];

  return (
    <CollectionPage
      eyebrow={`Accessibility · ${FESTIVAL_LABEL}`}
      title={`${marker.label} at ${FESTIVAL_LABEL}`}
      intro={intro}
      events={list}
      path={paths.accessible(slug)}
      crumbs={crumbs}
    />
  );
}
