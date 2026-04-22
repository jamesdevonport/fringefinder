import Link from "next/link";
import Image from "next/image";
import type { EventSearch } from "@/lib/types";
import { formatDate, formatPriceRange } from "@/lib/search";
import { BookmarkButton } from "./BookmarkButton";

export function EventCard({ event }: { event: EventSearch }) {
  const nextDate = event.earliest_date ? formatDate(event.earliest_date) : null;
  const venue = event.venue_list[0];
  const price = formatPriceRange(event.price_min, event.price_max, event.has_free_performance);
  return (
    <Link
      href={`/events/${event.slug}/`}
      className="card card--link flex flex-col overflow-hidden h-full"
    >
      <div className="relative aspect-[4/3] bg-paper-deep overflow-hidden">
        {event.hero_image ? (
          <Image
            src={event.hero_image}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-ink/30 font-display text-3xl">
            ✦
          </div>
        )}
        {event.genre && (
          <span className="sticker absolute top-2 left-2 text-xs">{event.genre}</span>
        )}
        <div className="absolute top-2 right-2">
          <BookmarkButton slug={event.slug} size="sm" />
        </div>
      </div>
      <div className="p-4 flex-1 flex flex-col gap-1">
        <h3 className="font-display text-lg leading-tight line-clamp-2">{event.title}</h3>
        {event.company && (
          <p className="text-sm ink-soft line-clamp-1">{event.company}</p>
        )}
        <div className="mt-auto pt-2 flex flex-wrap gap-2 items-center text-xs ink-soft">
          {nextDate && <span>▷ {nextDate}</span>}
          {venue && <span>@ {venue}</span>}
        </div>
        <div className="flex items-center gap-2 pt-1 text-xs">
          {price && <span className="chip" data-active="true">{price}</span>}
          <span className="chip">{event.age_bucket}</span>
        </div>
      </div>
    </Link>
  );
}
