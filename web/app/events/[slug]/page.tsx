import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { events, getEvent } from "@/lib/data";
import { formatDate, formatPriceRange } from "@/lib/search";
import { EventCard } from "@/components/EventCard";
import { Squiggle } from "@/components/Squiggle";
import { BookmarkToggleButton } from "@/components/BookmarkToggleButton";
import type { EventSearch } from "@/lib/types";

export function generateStaticParams() {
  return events.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const e = getEvent(slug);
  if (!e) return { title: "Show not found · Fringe Finder" };
  return {
    title: `${e.title} · Fringe Finder`,
    description: e.short_description || undefined,
  };
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const e = getEvent(slug);
  if (!e) notFound();

  const similar = e.similar
    .map((s) => events.find((ev) => ev.slug === s))
    .filter((ev): ev is NonNullable<typeof ev> => !!ev)
    .map<EventSearch>((ev) => ({
      slug: ev.slug,
      title: ev.title,
      company: ev.company,
      genre: ev.genre,
      short_description: ev.short_description,
      hero_image: ev.hero_image,
      venue_list: ev.venue_list,
      venue_slug_list: ev.venue_slug_list,
      date_list: ev.date_list,
      earliest_date: ev.earliest_date,
      price_min: ev.price_min,
      price_max: ev.price_max,
      has_free_performance: ev.has_free_performance,
      min_age: ev.min_age,
      age_bucket: ev.age_bucket,
      duration_mins: ev.duration_mins,
      duration_bucket: ev.duration_bucket,
      content_warnings: ev.content_warnings,
      accessibility: ev.accessibility,
      time_of_day_set: ev.time_of_day_set,
      weekend_dates: ev.weekend_dates,
    }));

  const price = formatPriceRange(e.price_min, e.price_max, e.has_free_performance);
  const runMinutes = e.duration_mins ? `${e.duration_mins} min` : null;

  return (
    <article>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8">
        <nav className="text-sm ink-soft mb-4 flex gap-2 items-center">
          <Link href="/browse/" className="wobble-underline">Browse</Link>
          <span>/</span>
          {e.genre && (
            <>
              <Link href={`/browse/?g=${encodeURIComponent(e.genre)}`} className="wobble-underline">
                {e.genre}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="truncate">{e.title}</span>
        </nav>
      </div>

      <header className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="grid gap-8 md:grid-cols-[1.2fr_1fr] items-start">
          <div className="relative card overflow-hidden">
            <div className="relative aspect-[4/3] bg-paper-deep">
              {e.hero_image ? (
                <Image
                  src={e.hero_image}
                  alt={e.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 60vw"
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="absolute inset-0 grid place-items-center text-ink/30 font-display text-6xl">
                  ✦
                </div>
              )}
            </div>
          </div>

          <div>
            {e.genre && (
              <span className="sticker sticker--purple text-sm mb-3">{e.genre}</span>
            )}
            <h1 className="font-display text-4xl sm:text-5xl leading-tight mb-3">
              {e.title}
            </h1>
            <Squiggle width={180} height={10} />
            {e.company && (
              <p
                className="text-sm mt-4 font-semibold uppercase tracking-widest"
                style={{ color: "var(--color-purple-deep)" }}
              >
                by {e.company}
              </p>
            )}

            <dl className="grid grid-cols-2 gap-3 mt-5">
              {runMinutes && <InfoStat label="Length" value={runMinutes} />}
              {price && <InfoStat label="Price" value={price} />}
              <InfoStat label="Audience" value={e.age_bucket} />
              <InfoStat
                label="Showings"
                value={`${e.performances.length} × ${e.date_list.length === 1 ? "date" : "dates"}`}
              />
            </dl>

            <div className="mt-6 flex flex-wrap gap-2">
              {e.url && (
                <a
                  href={e.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn--purple"
                >
                  Book on Brighton Fringe →
                </a>
              )}
              <BookmarkToggleButton slug={e.slug} />
              {e.website && (
                <a
                  href={e.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn"
                >
                  Show website
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-12 grid gap-12 md:grid-cols-[1.5fr_1fr]">
        <section>
          <h2 className="font-display text-2xl mb-3">The pitch</h2>
          <div className="prose max-w-none text-ink-soft leading-relaxed whitespace-pre-line">
            {e.description}
          </div>

          {e.content_warnings.length > 0 && (
            <section className="mt-10">
              <h3 className="font-display text-xl mb-3">A heads-up</h3>
              <div className="flex flex-wrap gap-2">
                {e.content_warnings.map((w) => (
                  <span key={w} className="sticker bg-coral text-white -rotate-1">
                    ⚠ {w}
                  </span>
                ))}
              </div>
            </section>
          )}

          {e.accessibility.length > 0 && (
            <section className="mt-8">
              <h3 className="font-display text-xl mb-3">Accessibility</h3>
              <div className="flex flex-wrap gap-2">
                {e.accessibility.map((a) => (
                  <span key={a} className="sticker sticker--teal">
                    ✓ {a}
                  </span>
                ))}
              </div>
            </section>
          )}
        </section>

        <section className="card p-5 bg-paper h-fit sticky top-4">
          <h2 className="font-display text-xl mb-3">Showings</h2>
          <ul className="space-y-2">
            {e.performances.map((p, i) => (
              <li
                key={i}
                className="flex items-center gap-3 py-2 border-b border-ink/20 last:border-b-0"
              >
                <div className="font-display text-2xl leading-none tabular-nums">
                  {new Date(p.date_iso + "T12:00").getDate()}
                </div>
                <div className="text-xs ink-soft">
                  {new Date(p.date_iso + "T12:00").toLocaleDateString("en-GB", {
                    weekday: "short",
                    month: "short",
                  })}
                </div>
                <div className="ml-auto text-right">
                  <div className="text-sm font-medium">{p.time_text ?? "—"}</div>
                  {p.venue_name && (
                    <Link
                      href={`/venues/${p.venue_slug}/`}
                      className="text-xs ink-soft wobble-underline"
                    >
                      {p.venue_name}
                    </Link>
                  )}
                </div>
                <span className="chip text-xs">
                  {p.free
                    ? "Free"
                    : formatPriceRange(p.price_min, p.price_max, false) || "—"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {similar.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-16">
          <h2 className="font-display text-2xl mb-5">You might also like</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((s) => (
              <EventCard key={s.slug} event={s} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

function InfoStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-3">
      <div className="text-xs ink-soft uppercase tracking-wide">{label}</div>
      <div className="font-display text-lg">{value}</div>
    </div>
  );
}
