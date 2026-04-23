import type { MetadataRoute } from "next";
import {
  events,
  summary,
  venues,
  getGenreDateCombosWithMinShows,
} from "@/lib/data";
import {
  ACCESSIBILITY_MARKERS,
  AUDIENCE_PAGES,
  GENRES,
  SITE_URL,
  paths,
} from "@/lib/seo";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date(summary.generated_at);
  const entry = (
    path: string,
    priority: number,
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] = "weekly",
  ): MetadataRoute.Sitemap[number] => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority,
  });

  const staticRoutes = [
    entry(paths.home(), 1.0, "daily"),
    entry(paths.browse(), 0.9, "daily"),
    entry("/calendar/", 0.7, "weekly"),
    entry("/explore/", 0.6, "monthly"),
    entry("/match/", 0.6, "monthly"),
    entry(paths.free(), 0.7, "weekly"),
  ];

  const eventRoutes = events.map((e) => entry(paths.event(e.slug), 0.8));
  const venueRoutes = venues.map((v) => entry(paths.venue(v.slug), 0.7));
  const genreRoutes = GENRES.map((g) => entry(paths.genre(g.slug), 0.8));
  const dateRoutes = summary.date_list.map((iso) => entry(paths.date(iso), 0.6));
  const comboRoutes = getGenreDateCombosWithMinShows(3).map((c) =>
    entry(paths.genreOnDate(c.slug, c.date), 0.5),
  );
  const accessibilityRoutes = ACCESSIBILITY_MARKERS.map((m) =>
    entry(paths.accessible(m.slug), 0.5, "monthly"),
  );
  const audienceRoutes = AUDIENCE_PAGES.map((a) =>
    entry(paths.audience(a.slug), 0.6, "weekly"),
  );

  return [
    ...staticRoutes,
    ...eventRoutes,
    ...venueRoutes,
    ...genreRoutes,
    ...dateRoutes,
    ...comboRoutes,
    ...accessibilityRoutes,
    ...audienceRoutes,
  ];
}
