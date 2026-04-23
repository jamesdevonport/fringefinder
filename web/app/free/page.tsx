import type { Metadata } from "next";
import { getFreeEvents, topGenresAt, topVenuesAt } from "@/lib/data";
import { CollectionPage } from "@/components/CollectionPage";
import {
  clampDescription,
  FESTIVAL_LABEL,
  paths,
} from "@/lib/seo";

export const metadata: Metadata = (() => {
  const list = getFreeEvents();
  const description = clampDescription(
    `${list.length} free shows at ${FESTIVAL_LABEL}. Every pay-what-you-can, free-entry, and donation-based performance in one place. Unofficial guide.`,
  );
  return {
    title: `Free shows at ${FESTIVAL_LABEL} — ${list.length} performances`,
    description,
    alternates: { canonical: paths.free() },
    openGraph: {
      title: `Free shows at ${FESTIVAL_LABEL}`,
      description,
      url: paths.free(),
    },
  };
})();

export default function FreePage() {
  const list = getFreeEvents();
  const genres = topGenresAt(list, 4);
  const venues = topVenuesAt(list, 4);

  const intro = (
    <>
      <p>
        {list.length} {FESTIVAL_LABEL} shows have at least one free performance —
        a mix of pay-what-you-can gigs, donation-bucket comedy, and free
        exhibitions.
      </p>
      {genres.length > 0 && (
        <p className="mt-3">
          Most are {genres.join(", ")}. Popular venues include{" "}
          {venues.join(", ")}.
        </p>
      )}
      <p className="mt-3 text-sm">
        Tickets and donations are handled directly by the venues — this is an
        unofficial guide scraped from brightonfringe.org.
      </p>
    </>
  );

  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Browse", path: paths.browse() },
    { name: "Free shows", path: paths.free() },
  ];

  return (
    <CollectionPage
      eyebrow={FESTIVAL_LABEL}
      title={`Free at ${FESTIVAL_LABEL}`}
      intro={intro}
      events={list}
      path={paths.free()}
      crumbs={crumbs}
    />
  );
}
