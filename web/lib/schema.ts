// Schema.org JSON-LD builders. Kept out of pages so the Google-facing payload
// shape is easy to audit in one place.

import type { Event, Performance } from "./types";
import { SITE_URL, absoluteUrl, paths } from "./seo";

// Convert "1:30 pm" / "10:45 am" to 24h "HH:MM". Brighton Fringe is in the UK
// across May so everything is BST (+01:00).
function to24h(timeText: string | null): string | null {
  if (!timeText) return null;
  const m = timeText.trim().toLowerCase().match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const mm = m[2];
  const ap = m[3];
  if (ap === "pm" && h < 12) h += 12;
  if (ap === "am" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${mm}`;
}

function performanceStart(p: Performance): string {
  const t = to24h(p.time_text) ?? "19:00";
  // Brighton is on British Summer Time (+01:00) throughout May.
  return `${p.date_iso}T${t}:00+01:00`;
}

export function eventSchema(e: Event) {
  const images = [e.hero_image, ...e.gallery].filter(Boolean) as string[];
  const primaryVenue = e.performances[0]?.venue_name ?? e.venue_list[0] ?? "Brighton";

  const subEvents = e.performances.map((p) => ({
    "@type": "Event",
    name: `${e.title} — ${p.date_iso}`,
    startDate: performanceStart(p),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: p.venue_name ?? primaryVenue,
      address: {
        "@type": "PostalAddress",
        addressLocality: "Brighton",
        addressRegion: "East Sussex",
        addressCountry: "GB",
      },
    },
    offers: {
      "@type": "Offer",
      url: e.url ?? absoluteUrl(paths.event(e.slug)),
      price: p.free ? 0 : (p.price_min ?? 0),
      priceCurrency: "GBP",
      availability: "https://schema.org/InStock",
    },
  }));

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: e.title,
    description: (e.short_description || e.description || "").replace(/\s+/g, " ").trim(),
    image: images.length ? images : undefined,
    startDate: e.earliest_date,
    endDate: e.latest_date,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: primaryVenue,
      address: {
        "@type": "PostalAddress",
        addressLocality: "Brighton",
        addressRegion: "East Sussex",
        addressCountry: "GB",
      },
    },
    performer: e.company
      ? { "@type": "PerformingGroup", name: e.company }
      : undefined,
    organizer: {
      "@type": "Organization",
      name: "Brighton Fringe",
      url: "https://www.brightonfringe.org",
    },
    offers:
      e.price_min !== null
        ? {
            "@type": "AggregateOffer",
            lowPrice: e.has_free_performance ? 0 : e.price_min,
            highPrice: e.price_max ?? e.price_min,
            priceCurrency: "GBP",
            availability: "https://schema.org/InStock",
            url: e.url ?? absoluteUrl(paths.event(e.slug)),
            offerCount: e.performances.length,
          }
        : undefined,
    typicalAgeRange: ageRangeFromBucket(e.age_bucket, e.min_age),
    contentRating: e.content_warnings.length ? e.content_warnings.join(", ") : undefined,
    url: absoluteUrl(paths.event(e.slug)),
    subEvent: subEvents,
  };
}

function ageRangeFromBucket(bucket: string, minAge: number | null): string | undefined {
  if (minAge !== null && minAge > 0) return `${minAge}+`;
  if (bucket === "Family") return "All ages";
  if (bucket === "Kids") return "3-11";
  if (bucket === "Teen") return "12-17";
  if (bucket === "16+") return "16+";
  if (bucket === "18+") return "18+";
  return undefined;
}

export function breadcrumbSchema(
  items: { name: string; path: string }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function venueSchema(v: { slug: string; name: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "Place",
    name: v.name,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Brighton",
      addressRegion: "East Sussex",
      addressCountry: "GB",
    },
    url: absoluteUrl(paths.venue(v.slug)),
  };
}

export function itemListSchema(args: {
  name: string;
  path: string;
  events: { slug: string; title: string }[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: args.name,
    url: absoluteUrl(args.path),
    numberOfItems: args.events.length,
    itemListElement: args.events.slice(0, 50).map((e, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: absoluteUrl(paths.event(e.slug)),
      name: e.title,
    })),
  };
}

export function collectionPageSchema(args: {
  name: string;
  description: string;
  path: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: args.name,
    description: args.description,
    url: absoluteUrl(args.path),
    isPartOf: {
      "@type": "WebSite",
      name: "Fringe Finder",
      url: SITE_URL,
    },
  };
}
