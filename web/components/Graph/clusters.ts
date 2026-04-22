import type { EventSearch } from "@/lib/types";

// -----------------------------------------------------------------------------
// Graph data shapes
// -----------------------------------------------------------------------------

export type GraphNode = {
  id: string;
  kind: "cluster" | "event";
  label: string;
  sublabel?: string;
  count?: number;
  size: number;
  color: string;
  textColor?: string;
  clusterId?: string;
  eventSlug?: string;
  image?: string | null;
  genre?: string;
  fx?: number;
  fy?: number;
  pinned?: boolean;
};

export type GraphLink = {
  source: string;
  target: string;
  kind: "spoke" | "ring";
};

export type Axis = "genre" | "when" | "audience" | "price" | "length";

export type GraphView =
  | { kind: "root"; axis: Axis }
  | { kind: "cluster"; axis: Axis; clusterId: string };

// -----------------------------------------------------------------------------
// Brighton Fringe palette — genre colours carry over into every axis, so each
// event thumbnail is always tinted by its genre regardless of how we cluster.
// -----------------------------------------------------------------------------

export const GENRE_COLOURS: Record<string, string> = {
  Comedy: "#FF5B4A",
  Theatre: "#7F3F98",
  "Music & Nightlife": "#AB1DFE",
  "Cabaret & Variety": "#E26FB4",
  "Children & Young People": "#F4A72B",
  "Circus Dance & Physical Theatre": "#2C7A7B",
  "Literature & Spoken Word": "#5B8DEF",
  Workshops: "#8FB339",
  "Events & Films": "#D95D39",
  Tours: "#7A5C3A",
  Exhibitions: "#330968",
  Other: "#4A3F36",
};

export function genreColor(genre: string | null | undefined): string {
  if (!genre) return GENRE_COLOURS.Other;
  return GENRE_COLOURS[genre] || GENRE_COLOURS.Other;
}

// Axis-specific accent palettes for the cluster super-nodes themselves.
const PALETTE_WHEN = ["#7F3F98", "#AB1DFE", "#E26FB4", "#FF5B4A", "#F4A72B"];
const PALETTE_AUDIENCE = ["#F4A72B", "#D95D39", "#FF5B4A", "#E26FB4", "#7F3F98"];
const PALETTE_PRICE = ["#2C7A7B", "#8FB339", "#7F3F98", "#FF5B4A"];
const PALETTE_LENGTH = ["#F4A72B", "#7F3F98", "#1A1714", "#4A3F36"];

// -----------------------------------------------------------------------------
// Cluster definitions — order matters; it drives the palette and radial order.
// -----------------------------------------------------------------------------

export type ClusterDef = {
  id: string;
  label: string;
  sublabel?: string;
  match: (e: EventSearch) => boolean;
};

const ORDER_GENRES = [
  "Comedy",
  "Theatre",
  "Music & Nightlife",
  "Cabaret & Variety",
  "Children & Young People",
  "Circus Dance & Physical Theatre",
  "Literature & Spoken Word",
  "Workshops",
  "Events & Films",
  "Tours",
  "Exhibitions",
  "Other",
];

function inRange(iso: string, from: string, to: string): boolean {
  return iso >= from && iso <= to;
}

function eventHits(e: EventSearch, from: string, to: string): boolean {
  return e.date_list.some((d) => inRange(d, from, to));
}

export function axisClusters(axis: Axis): ClusterDef[] {
  if (axis === "genre") {
    return ORDER_GENRES.map((g) => ({
      id: `genre:${g}`,
      label: g,
      match: (e) => (e.genre || "Other") === g,
    }));
  }

  if (axis === "when") {
    return [
      {
        id: "when:opening",
        label: "Opening Weekend",
        sublabel: "1–4 May",
        match: (e) => eventHits(e, "2026-05-01", "2026-05-04"),
      },
      {
        id: "when:week1",
        label: "Week One",
        sublabel: "5–10 May",
        match: (e) => eventHits(e, "2026-05-05", "2026-05-10"),
      },
      {
        id: "when:midfest",
        label: "Mid-Fringe",
        sublabel: "11–17 May",
        match: (e) => eventHits(e, "2026-05-11", "2026-05-17"),
      },
      {
        id: "when:latemay",
        label: "Home Stretch",
        sublabel: "18–28 May",
        match: (e) => eventHits(e, "2026-05-18", "2026-05-28"),
      },
      {
        id: "when:closing",
        label: "Closing Weekend",
        sublabel: "29–31 May",
        match: (e) => eventHits(e, "2026-05-29", "2026-05-31"),
      },
    ];
  }

  if (axis === "audience") {
    return [
      {
        id: "aud:family",
        label: "Family",
        sublabel: "Any age welcome",
        match: (e) => e.age_bucket === "Family",
      },
      {
        id: "aud:kids",
        label: "Kids",
        sublabel: "6–11 year olds",
        match: (e) => e.age_bucket === "Kids",
      },
      {
        id: "aud:teen",
        label: "Teen",
        sublabel: "12–15",
        match: (e) => e.age_bucket === "Teen",
      },
      {
        id: "aud:16",
        label: "16+",
        sublabel: "Older teens & up",
        match: (e) => e.age_bucket === "16+",
      },
      {
        id: "aud:18",
        label: "Adults (18+)",
        sublabel: "Grown-up ground",
        match: (e) => e.age_bucket === "18+",
      },
    ];
  }

  if (axis === "price") {
    return [
      {
        id: "price:free",
        label: "Free",
        sublabel: "At least one free show",
        match: (e) => e.has_free_performance,
      },
      {
        id: "price:under10",
        label: "Under £10",
        sublabel: "Cheap thrills",
        match: (e) =>
          !e.has_free_performance && e.price_min !== null && e.price_min < 10,
      },
      {
        id: "price:10-20",
        label: "£10–20",
        sublabel: "Middle of the road",
        match: (e) =>
          !e.has_free_performance &&
          e.price_min !== null &&
          e.price_min >= 10 &&
          e.price_min < 20,
      },
      {
        id: "price:20plus",
        label: "£20+",
        sublabel: "Worth the splurge",
        match: (e) =>
          !e.has_free_performance && e.price_min !== null && e.price_min >= 20,
      },
    ];
  }

  // length
  return [
    {
      id: "len:short",
      label: "Quick (≤45 min)",
      sublabel: "In and out",
      match: (e) => e.duration_mins !== null && e.duration_mins <= 45,
    },
    {
      id: "len:hour",
      label: "About an hour",
      sublabel: "45–75 min",
      match: (e) =>
        e.duration_mins !== null && e.duration_mins > 45 && e.duration_mins <= 75,
    },
    {
      id: "len:long",
      label: "Long evening",
      sublabel: "75+ min",
      match: (e) => e.duration_mins !== null && e.duration_mins > 75,
    },
  ];
}

export const AXIS_LABEL: Record<Axis, string> = {
  genre: "Genre",
  when: "When",
  audience: "Who for",
  price: "Price",
  length: "Length",
};

export const AXIS_HAND: Record<Axis, string> = {
  genre: "by genre",
  when: "by week",
  audience: "by audience",
  price: "by price",
  length: "by length",
};

function paletteForAxis(axis: Axis): string[] | null {
  if (axis === "when") return PALETTE_WHEN;
  if (axis === "audience") return PALETTE_AUDIENCE;
  if (axis === "price") return PALETTE_PRICE;
  if (axis === "length") return PALETTE_LENGTH;
  return null;
}

// -----------------------------------------------------------------------------
// Root graph — cluster super-nodes pinned radially
// -----------------------------------------------------------------------------

const ROOT_RADIUS = 320;

export function buildRootGraph(
  events: EventSearch[],
  axis: Axis,
): { nodes: GraphNode[]; links: GraphLink[]; layout: "radial" } {
  const clusters = axisClusters(axis);
  const palette = paletteForAxis(axis);

  const withCount = clusters.map((c) => ({
    def: c,
    count: events.reduce((n, e) => (c.match(e) ? n + 1 : n), 0),
  }));
  const nonEmpty = withCount.filter((c) => c.count > 0);
  const N = nonEmpty.length;

  const nodes: GraphNode[] = nonEmpty.map(({ def, count }, i) => {
    const angle = (i / N) * Math.PI * 2 - Math.PI / 2;
    const color =
      axis === "genre" ? genreColor(def.label) : palette![i % palette!.length];
    return {
      id: def.id,
      kind: "cluster",
      label: def.label,
      sublabel: def.sublabel,
      count,
      size: 46 + Math.sqrt(count) * 2.2,
      color,
      textColor: "#ffffff",
      clusterId: def.id,
      fx: Math.cos(angle) * ROOT_RADIUS,
      fy: Math.sin(angle) * ROOT_RADIUS,
      pinned: true,
    };
  });

  return { nodes, links: [], layout: "radial" };
}

// -----------------------------------------------------------------------------
// Cluster view — one cluster super-node (pinned at centre) + all matching
// events as thumbnails, attached with spokes. Force layout.
// -----------------------------------------------------------------------------

export function buildClusterGraph(
  events: EventSearch[],
  axis: Axis,
  clusterId: string,
): {
  nodes: GraphNode[];
  links: GraphLink[];
  layout: "force";
  cluster: ClusterDef | null;
  color: string;
  count: number;
} {
  const clusters = axisClusters(axis);
  const idx = clusters.findIndex((c) => c.id === clusterId);
  const cluster = idx === -1 ? null : clusters[idx];
  const palette = paletteForAxis(axis);
  const color = cluster
    ? axis === "genre"
      ? genreColor(cluster.label)
      : palette![idx % palette!.length]
    : "#1A1714";

  const matching = cluster ? events.filter(cluster.match) : [];
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];

  nodes.push({
    id: cluster?.id ?? "unknown",
    kind: "cluster",
    label: cluster?.label ?? "Unknown",
    sublabel: cluster?.sublabel,
    count: matching.length,
    size: 54,
    color,
    textColor: "#ffffff",
    clusterId,
    fx: 0,
    fy: 0,
    pinned: true,
  });

  for (const e of matching) {
    const eventColor = genreColor(e.genre);
    nodes.push({
      id: `event:${e.slug}`,
      kind: "event",
      label: e.title,
      sublabel: e.company ?? undefined,
      size: 20,
      color: eventColor,
      eventSlug: e.slug,
      image: e.hero_image,
      genre: e.genre || "Other",
    });
    links.push({
      source: cluster?.id ?? "unknown",
      target: `event:${e.slug}`,
      kind: "spoke",
    });
  }

  return {
    nodes,
    links,
    layout: "force",
    cluster,
    color,
    count: matching.length,
  };
}
