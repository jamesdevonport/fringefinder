import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getEventsByAgeBucket,
  topGenresAt,
  topVenuesAt,
} from "@/lib/data";
import { CollectionPage } from "@/components/CollectionPage";
import {
  AUDIENCE_PAGES,
  clampDescription,
  FESTIVAL_LABEL,
  paths,
} from "@/lib/seo";

export function generateStaticParams() {
  return AUDIENCE_PAGES.map((a) => ({ slug: a.slug }));
}

function findAudience(slug: string) {
  return AUDIENCE_PAGES.find((a) => a.slug === slug) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const audience = findAudience(slug);
  if (!audience) return { title: "Audience page not found" };
  const list = getEventsByAgeBucket(slug);
  const description = clampDescription(
    `${list.length} ${audience.title.toLowerCase()} shows at ${FESTIVAL_LABEL}. ${audience.intro}. Unofficial guide.`,
  );
  return {
    title: `${audience.title} shows at ${FESTIVAL_LABEL}`,
    description,
    alternates: { canonical: paths.audience(slug) },
    openGraph: {
      title: `${audience.title} shows at ${FESTIVAL_LABEL}`,
      description,
      url: paths.audience(slug),
    },
  };
}

export default async function AudiencePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const audience = findAudience(slug);
  if (!audience) notFound();
  const list = getEventsByAgeBucket(slug);
  const genres = topGenresAt(list, 4);
  const venues = topVenuesAt(list, 4);

  const intro = (
    <>
      <p>
        {list.length} {audience.title.toLowerCase()}{" "}
        {list.length === 1 ? "show" : "shows"} at {FESTIVAL_LABEL}. {audience.intro}.
      </p>
      {genres.length > 0 && (
        <p className="mt-3">
          The genre mix leans {genres.join(", ")}. Popular venues include{" "}
          {venues.join(", ")}.
        </p>
      )}
    </>
  );

  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Browse", path: paths.browse() },
    { name: audience.title, path: paths.audience(slug) },
  ];

  return (
    <CollectionPage
      eyebrow={FESTIVAL_LABEL}
      title={`${audience.title} at ${FESTIVAL_LABEL}`}
      intro={intro}
      events={list}
      path={paths.audience(slug)}
      crumbs={crumbs}
    />
  );
}
