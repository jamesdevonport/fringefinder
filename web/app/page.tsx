import Link from "next/link";
import { events, summary } from "@/lib/data";
import { EventCard } from "@/components/EventCard";
import { HeroMosaic } from "@/components/HeroMosaic";
import { Squiggle, Star } from "@/components/Squiggle";
import type { EventSearch } from "@/lib/types";
import { genreSlugFromName, paths } from "@/lib/seo";

const topGenresOrder = [
  "Comedy",
  "Theatre",
  "Cabaret & Variety",
  "Music & Nightlife",
  "Children & Young People",
  "Circus Dance & Physical Theatre",
  "Literature & Spoken Word",
];

function eventToSearch(e: (typeof events)[number]): EventSearch {
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

// Stable pseudo-random shuffle using a fixed seed so SSR and CSR match.
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) | 0;
    const j = Math.abs(s) % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export default function Home() {
  const candidates = events.filter(
    (e) => e.hero_image && e.description && e.earliest_date,
  );

  const mosaicImages = seededShuffle(
    candidates.map((e) => e.hero_image!).filter(Boolean),
    42,
  ).slice(0, 48);

  const featured = seededShuffle(candidates, 7).slice(0, 6).map(eventToSearch);

  const nextWeekend = events.filter((e) =>
    e.weekend_dates.some((d) => d >= summary.cutoff_date),
  ).length;
  const freeCount = summary.free_event_count;

  const topGenres = topGenresOrder
    .map((g) => ({ genre: g, count: summary.genre_counts[g] ?? 0 }))
    .filter((x) => x.count > 0)
    .slice(0, 6);

  return (
    <div>
      {/* ============== HERO ============== */}
      <section
        className="relative overflow-hidden border-b-2 border-ink"
        style={{ minHeight: "min(80vh, 760px)" }}
      >
        <HeroMosaic images={mosaicImages} rows={4} />

        {/* Deep purple gradient veil */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(51, 9, 104, 0.78) 0%, rgba(51, 9, 104, 0.92) 45%, rgba(26, 23, 20, 0.95) 100%)",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 20% 15%, rgba(255, 91, 74, 0.25) 0%, transparent 40%), radial-gradient(circle at 82% 82%, rgba(171, 29, 254, 0.30) 0%, transparent 45%)",
          }}
        />

        {/* Confetti particles (pure CSS decorative) */}
        <DecorLayer />

        {/* ============== Hero content ============== */}
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center">
          <p className="mb-6 text-xs sm:text-sm uppercase tracking-[0.32em] font-semibold text-white/75 flex items-center justify-center gap-3">
            <Star size={14} color="var(--color-purple-hot)" className="star-blink" />
            Brighton Fringe · 1–31 May 2026
            <Star size={14} color="var(--color-purple-hot)" className="star-blink" />
          </p>

          <h1
            className="font-display text-white leading-[0.88]"
            style={{
              fontSize: "clamp(3.25rem, 11vw, 9rem)",
              fontWeight: 800,
              letterSpacing: "-0.045em",
            }}
          >
            <span className="block">Find your</span>
            <span
              className="block mt-1 sm:mt-2"
              style={{ color: "var(--color-purple-hot)", fontStyle: "italic", fontWeight: 700 }}
            >
              perfect fringe.
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg mt-8 mb-9 text-white/85">
            <span className="font-semibold text-white">{summary.event_count.toLocaleString("en-GB")} shows</span>{" "}
            still to come at Brighton Fringe 2026. Tell our AI your mood, filter the catalogue,
            or wander the bubble map — we&apos;ll pull your perfect night out of the chaos.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/match"
              className="btn"
              style={{ background: "var(--color-purple-hot)", color: "white" }}
            >
              ✦ Match me with a show
            </Link>
            <Link
              href="/browse"
              className="btn"
              style={{ background: "white", color: "var(--color-ink)" }}
            >
              Browse all {summary.event_count}
            </Link>
            <Link
              href="/explore"
              className="btn"
              style={{ background: "var(--color-purple)", color: "white" }}
            >
              Wander the map
            </Link>
          </div>

          {/* ============== Floating stat stickers ============== */}
          <FloatingStat
            label="venues"
            value={summary.venue_count}
            className="absolute left-3 sm:left-6 top-8 -rotate-6"
            tone="purple-hot"
          />
          <FloatingStat
            label="showings"
            value={summary.performance_count}
            className="absolute right-3 sm:right-8 top-10 rotate-3"
            tone="white"
          />
          <FloatingStat
            label="weekend shows"
            value={nextWeekend}
            className="absolute left-4 sm:left-16 bottom-6 -rotate-3"
            tone="teal"
            small
          />
          <FloatingStat
            label="free"
            value={freeCount}
            className="absolute right-4 sm:right-12 bottom-8 rotate-6"
            tone="lilac"
            small
          />
        </div>
      </section>

      {/* ============== Top genres strip ============== */}
      <section
        className="border-b-2 border-ink"
        style={{ background: "var(--color-lilac-soft)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-wrap items-center gap-x-6 gap-y-2">
          <span
            className="text-xs uppercase tracking-[0.22em] font-bold"
            style={{ color: "var(--color-purple-deep)" }}
          >
            Lineup at a glance →
          </span>
          {topGenres.map((g) => {
            const slug = genreSlugFromName(g.genre);
            const href = slug ? paths.genre(slug) : `/browse/?g=${encodeURIComponent(g.genre)}`;
            return (
              <Link
                key={g.genre}
                href={href}
                className="inline-flex items-center gap-2 text-sm hover:underline"
              >
                <span
                  className="w-3 h-3 rounded-full border-2 border-ink"
                  style={{ background: genreSwatch(g.genre) }}
                />
                <span className="font-medium">{g.genre}</span>
                <span className="ink-soft tabular-nums">{g.count}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ============== Featured ============== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
        <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
          <div>
            <h2 className="font-display text-3xl">A handful of curious shows</h2>
            <p className="ink-soft text-sm mt-1">
              Six picks from the pile.{" "}
              <Link href="/browse" className="wobble-underline">
                See them all
              </Link>
              .
            </p>
          </div>
          <span
            className="text-sm font-semibold inline-flex items-center gap-2"
            style={{ color: "var(--color-teal-ink)" }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: "var(--color-teal)" }}
            />
            {nextWeekend} shows on weekends
          </span>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((e) => (
            <EventCard key={e.slug} event={e} />
          ))}
        </div>
      </section>

      {/* ============== Four paths ============== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
        <h2 className="font-display text-3xl mb-2">Four ways in</h2>
        <p className="ink-soft mb-8">Pick your own chaos.</p>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <PathCard
            href="/match"
            title="Match"
            tone="purple"
            hand="Pssst — chat with the AI"
            body="Tell the matchmaker the vibe and get a hand-picked shortlist with a reason each."
          />
          <PathCard
            href="/browse"
            title="Browse"
            tone="ink"
            hand="The classic approach"
            body="Filter by venue, date, price, age, accessibility. Exclude content warnings. Search by title."
          />
          <PathCard
            href="/calendar"
            title="Calendar"
            tone="teal"
            hand="See what's on, day by day"
            body="Every show pinned to a May wall calendar. Filter, then jump to a date to see the lineup."
          />
          <PathCard
            href="/explore"
            title="Wander"
            tone="coral"
            hand="A bubble map for dreamers"
            body="Start at a genre, explode it into a constellation of shows, drift between related venues."
          />
        </div>
      </section>
    </div>
  );
}

function DecorLayer() {
  // Scattered hand-drawn shapes — star, squiggle, dot — to break up the gradient
  return (
    <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
      <svg
        className="absolute left-[6%] top-[22%] float-gentle opacity-80"
        width="26"
        height="26"
        viewBox="0 0 24 24"
        style={{ ["--rot" as string]: "-8deg" }}
      >
        <path
          d="M12 2l2.6 6.1 6.6.6-5 4.4 1.5 6.4L12 16.5l-5.7 3 1.5-6.4-5-4.4 6.6-.6L12 2z"
          fill="var(--color-purple-hot)"
          stroke="#1A1714"
          strokeWidth="1.2"
        />
      </svg>
      <svg
        className="absolute right-[10%] top-[28%] float-gentle opacity-80"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        style={{ ["--rot" as string]: "12deg", animationDelay: "1s" }}
      >
        <path
          d="M12 2l2.6 6.1 6.6.6-5 4.4 1.5 6.4L12 16.5l-5.7 3 1.5-6.4-5-4.4 6.6-.6L12 2z"
          fill="var(--color-lilac)"
          stroke="#1A1714"
          strokeWidth="1.2"
        />
      </svg>
      <svg
        className="absolute left-[12%] bottom-[18%] opacity-85"
        width="100"
        height="14"
        viewBox="0 0 160 14"
        style={{ transform: "rotate(-4deg)" }}
      >
        <path
          d="M0 7 Q20 0 40 7 T80 7 T120 7 T160 7"
          fill="none"
          stroke="var(--color-purple-hot)"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      </svg>
      <svg
        className="absolute right-[8%] bottom-[22%] opacity-85"
        width="100"
        height="14"
        viewBox="0 0 160 14"
        style={{ transform: "rotate(6deg)" }}
      >
        <path
          d="M0 7 Q20 0 40 7 T80 7 T120 7 T160 7"
          fill="none"
          stroke="var(--color-lilac)"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

function FloatingStat({
  label,
  value,
  className = "",
  tone,
  small = false,
}: {
  label: string;
  value: number;
  className?: string;
  tone: "purple" | "purple-hot" | "lilac" | "teal" | "white";
  small?: boolean;
}) {
  const bg =
    tone === "purple"
      ? "var(--color-purple)"
      : tone === "purple-hot"
        ? "var(--color-purple-hot)"
        : tone === "lilac"
          ? "var(--color-lilac)"
          : tone === "teal"
            ? "var(--color-teal)"
            : "white";
  const color =
    tone === "lilac" || tone === "white" ? "var(--color-purple-deep)" : "white";
  return (
    <div
      aria-hidden="true"
      className={`hidden md:flex flex-col items-center border-2 border-ink rounded-2xl text-center ${className} float-gentle`}
      style={{
        background: bg,
        color,
        padding: small ? "0.5rem 0.8rem" : "0.7rem 1rem",
        boxShadow: "3px 3px 0 rgba(0,0,0,0.4)",
        minWidth: small ? 90 : 120,
      }}
    >
      <span
        className="font-display leading-none tabular-nums"
        style={{ fontSize: small ? "1.5rem" : "2rem", fontWeight: 700 }}
      >
        {value}
      </span>
      <span
        className="text-[11px] uppercase tracking-wider mt-1 font-semibold"
        style={{ opacity: 0.9 }}
      >
        {label}
      </span>
    </div>
  );
}

// Inline genre colours (keeps the home page independent of the graph module)
function genreSwatch(genre: string): string {
  const map: Record<string, string> = {
    Comedy: "#FF5B4A",
    Theatre: "#7F3F98",
    "Music & Nightlife": "#AB1DFE",
    "Cabaret & Variety": "#E26FB4",
    "Children & Young People": "#F4A72B",
    "Circus Dance & Physical Theatre": "#2C7A7B",
    "Literature & Spoken Word": "#5B8DEF",
  };
  return map[genre] || "var(--color-purple)";
}

function PathCard({
  href,
  title,
  tone,
  hand,
  body,
}: {
  href: string;
  title: string;
  tone: "coral" | "ink" | "teal" | "purple";
  hand: string;
  body: string;
}) {
  const toneClass =
    tone === "purple"
      ? "card--purple"
      : tone === "coral"
        ? "card--coral"
        : tone === "teal"
          ? "card--teal"
          : "card--ink";
  return (
    <Link href={href} className={`card card--link p-6 ${toneClass}`}>
      <p className="text-xs uppercase tracking-[0.2em] font-bold mb-3 opacity-85">
        {hand}
      </p>
      <h3 className="font-display text-3xl mb-2" style={{ fontWeight: 800 }}>
        {title}
      </h3>
      <p className="text-sm opacity-90">{body}</p>
      <p className="text-sm mt-4 font-bold">Go →</p>
    </Link>
  );
}
