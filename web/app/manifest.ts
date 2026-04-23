import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fringe Finder — unofficial Brighton Fringe 2026 guide",
    short_name: "Fringe Finder",
    description:
      "A fan-made, interactive directory of Brighton Fringe 2026. Browse shows, venues, dates, and genres.",
    start_url: "/",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#7F3F98",
    icons: [
      { src: "/favicon.ico", sizes: "any", type: "image/x-icon" },
    ],
  };
}
