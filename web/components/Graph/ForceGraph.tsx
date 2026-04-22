"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { forceCollide } from "d3-force";
import { useRouter } from "next/navigation";
import type { EventSearch } from "@/lib/types";
import {
  AXIS_LABEL,
  type Axis,
  buildClusterGraph,
  buildRootGraph,
  GENRE_COLOURS,
  genreColor,
  type GraphLink,
  type GraphNode,
  type GraphView,
} from "./clusters";

const Force2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

type Force2DInstance = {
  d3Force: (name: string, forceObj?: unknown) => unknown;
  d3ReheatSimulation: () => void;
  zoomToFit: (ms?: number, padding?: number) => void;
  centerAt: (x: number, y: number, ms?: number) => void;
  zoom: (scale: number, ms?: number) => number;
  refresh?: () => void;
};

// Module-scoped image cache — preserved across re-renders and re-mounts
type CachedImg = { img: HTMLImageElement; ok: boolean; loaded: boolean };
const imageCache = new Map<string, CachedImg>();

function getCachedImage(url: string, onReady: () => void): CachedImg | null {
  if (!url) return null;
  const existing = imageCache.get(url);
  if (existing) return existing;
  const img = new Image();
  const entry: CachedImg = { img, ok: false, loaded: false };
  imageCache.set(url, entry);
  img.onload = () => {
    entry.ok = img.naturalWidth > 0;
    entry.loaded = true;
    onReady();
  };
  img.onerror = () => {
    entry.ok = false;
    entry.loaded = true;
    onReady();
  };
  img.src = url;
  return entry;
}

export function ForceGraph({
  events,
  axis,
}: {
  events: EventSearch[];
  axis: Axis;
}) {
  const router = useRouter();
  const [view, setView] = useState<GraphView>({ kind: "root", axis });
  const [hover, setHover] = useState<GraphNode | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Force2DInstance | null>(null);
  const refreshRef = useRef<() => void>(() => {});

  // When the axis prop changes, reset to root for that axis
  useEffect(() => {
    setView({ kind: "root", axis });
  }, [axis]);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const obs = new ResizeObserver(update);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const { nodes, links, layout, subtitle, breadcrumb } = useMemo(() => {
    if (view.kind === "root") {
      const g = buildRootGraph(events, view.axis);
      return {
        ...g,
        subtitle:
          view.axis === "genre"
            ? "Click a genre blob to see its shows"
            : `Click a ${AXIS_LABEL[view.axis].toLowerCase()} blob to see its shows`,
        breadcrumb: [AXIS_LABEL[view.axis]] as string[],
      };
    }
    const g = buildClusterGraph(events, view.axis, view.clusterId);
    return {
      nodes: g.nodes,
      links: g.links,
      layout: g.layout,
      subtitle: `${g.count} show${g.count === 1 ? "" : "s"} — click a bubble to open`,
      breadcrumb: [
        AXIS_LABEL[view.axis],
        g.cluster?.label ?? "Unknown",
      ] as string[],
    };
  }, [events, view]);

  const data = useMemo(
    () => ({
      nodes: nodes.map((n) => ({ ...n })),
      links: links.map((l) => ({ ...l })),
    }),
    [nodes, links],
  );

  // Configure d3 forces + re-heat whenever the data changes
  useEffect(() => {
    if (!graphRef.current) return;
    const g = graphRef.current;

    const charge = g.d3Force("charge") as { strength?: (v: unknown) => unknown } | undefined;
    if (charge && typeof charge.strength === "function") {
      charge.strength((n: GraphNode) => -80 - n.size * 14);
    }

    const link = g.d3Force("link") as { distance?: (v: unknown) => unknown } | undefined;
    if (link && typeof link.distance === "function") {
      link.distance((l: { source: GraphNode; target: GraphNode }) => {
        const sSize = typeof l.source === "object" ? l.source.size : 10;
        const tSize = typeof l.target === "object" ? l.target.size : 10;
        return 60 + sSize + tSize;
      });
    }

    g.d3Force(
      "collide",
      forceCollide<GraphNode>().radius((n) => n.size * 1.6 + 6),
    );

    g.d3ReheatSimulation();

    // The force simulation spreads nodes out over several seconds. A single
    // early zoomToFit() camps the camera on the initial tight cluster, so the
    // user lands on what looks like an empty map. Fit multiple times as the
    // layout expands — plus one final snap on engine-stop (see onEngineStop
    // below) so the view always ends framed to every node.
    const fitAt = [250, 800, 1600, 2800];
    const timers = fitAt.map((ms) =>
      setTimeout(() => {
        try {
          g.zoomToFit(400, 60);
        } catch {
          /* ignore */
        }
      }, ms),
    );
    return () => timers.forEach(clearTimeout);
  }, [data]);

  // Stable refresh callback pointed at the graph (used by async image loads)
  useEffect(() => {
    refreshRef.current = () => {
      try {
        graphRef.current?.refresh?.();
      } catch {
        /* ignore */
      }
    };
  });

  // Preload images for every event node in the current view (browser cache
  // handles cross-view repetition for free)
  useEffect(() => {
    let scheduled = false;
    const onReady = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        refreshRef.current();
      });
    };
    for (const n of nodes) {
      if (n.kind === "event" && n.image) getCachedImage(n.image, onReady);
    }
  }, [nodes]);

  function handleClick(n: GraphNode) {
    if (n.kind === "cluster" && view.kind === "root") {
      setView({ kind: "cluster", axis: view.axis, clusterId: n.clusterId! });
      return;
    }
    if (n.kind === "cluster" && view.kind === "cluster") {
      // Clicking the centre super-node = collapse back to root
      setView({ kind: "root", axis: view.axis });
      return;
    }
    if (n.kind === "event" && n.eventSlug) {
      router.push(`/events/${n.eventSlug}/`);
      return;
    }
  }

  function back() {
    if (view.kind === "cluster") setView({ kind: "root", axis: view.axis });
  }

  const cursor = hover ? "cursor-pointer" : "cursor-grab";

  return (
    <div className={`relative w-full h-full ${cursor}`} ref={containerRef}>
      {size.w > 0 && size.h > 0 && (
        // @ts-expect-error - third-party typings are loose
        <Force2D
          ref={graphRef}
          graphData={data}
          width={size.w}
          height={size.h}
          backgroundColor="rgba(0,0,0,0)"
          cooldownTime={layout === "radial" ? 1500 : 5500}
          warmupTicks={30}
          onEngineStop={() => {
            try {
              graphRef.current?.zoomToFit(400, 60);
            } catch {
              /* ignore */
            }
          }}
          onNodeClick={handleClick}
          onNodeHover={(n: GraphNode | null) => setHover(n)}
          d3AlphaDecay={0.04}
          d3VelocityDecay={0.32}
          linkColor={() => "rgba(26, 23, 20, 0.14)"}
          linkWidth={(l: { source: GraphNode; target: GraphNode }) => {
            const hot =
              hover &&
              (sameId(l.source, hover) || sameId(l.target, hover));
            return hot ? 2.4 : 1.1;
          }}
          linkDirectionalParticles={() => 0}
          enableNodeDrag={true}
          nodeCanvasObjectMode={() => "replace"}
          nodeCanvasObject={(
            node: GraphNode & { x?: number; y?: number },
            ctx: CanvasRenderingContext2D,
            scale: number,
          ) => drawNode(node, ctx, scale, hover?.id === node.id)}
          nodePointerAreaPaint={(
            node: GraphNode & { x?: number; y?: number },
            color: string,
            ctx: CanvasRenderingContext2D,
          ) => {
            if (node.x === undefined || node.y === undefined) return;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(node.x, node.y, node.size + 6, 0, Math.PI * 2);
            ctx.fill();
          }}
        />
      )}

      {/* Breadcrumb */}
      <div className="absolute top-3 left-3 right-3 flex items-center gap-2 pointer-events-none flex-wrap">
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {breadcrumb.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-ink-soft">›</span>}
              {i < breadcrumb.length - 1 ? (
                <button onClick={back} className="sticker bg-white">
                  {crumb}
                </button>
              ) : (
                <span
                  className="sticker"
                  style={{
                    background: activeCrumbColour(view),
                    color: "white",
                  }}
                >
                  {crumb}
                </span>
              )}
            </span>
          ))}
        </div>
        <span className="ml-auto sticker bg-white pointer-events-none hidden sm:inline-flex">
          <span className="italic text-ink-soft">{subtitle}</span>
        </span>
      </div>

      {/* Controls — bottom-right, clear of the iPhone home indicator */}
      <div
        className="absolute right-3 flex flex-col gap-1 pointer-events-auto"
        style={{ bottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >
        {view.kind !== "root" && (
          <button onClick={back} className="btn btn--ink text-xs py-2 px-3 shadow-none">
            ← back
          </button>
        )}
        <button
          onClick={() => graphRef.current?.zoomToFit(400, 60)}
          className="btn text-xs py-2 px-3 shadow-none"
          title="Fit to screen"
        >
          ⤢ fit
        </button>
      </div>

      {/* Hover tooltip */}
      {hover && (
        <div
          className="absolute bottom-3 left-3 card p-3 max-w-xs pointer-events-none bg-white"
          aria-live="polite"
        >
          <div className="text-xs ink-soft uppercase tracking-wide">
            {hover.kind === "event"
              ? hover.genre ?? "Show"
              : view.kind === "root"
                ? AXIS_LABEL[view.axis]
                : AXIS_LABEL[view.axis]}
          </div>
          <div className="font-display text-lg leading-tight">{hover.label}</div>
          {hover.sublabel && (
            <div className="text-xs ink-soft mt-0.5">{hover.sublabel}</div>
          )}
          {typeof hover.count === "number" && (
            <div className="text-xs ink-soft mt-1">
              {hover.count} {hover.count === 1 ? "show" : "shows"}
            </div>
          )}
          <div
            className="text-xs mt-2 font-bold uppercase tracking-wider"
            style={{ color: "var(--color-purple)" }}
          >
            {hover.kind === "event" ? "Click to open →" : "Click to explore →"}
          </div>
        </div>
      )}

      {/* Root helper */}
      {!hover && view.kind === "root" && (
        <div
          className="absolute left-1/2 -translate-x-1/2 text-center pointer-events-none"
          style={{ bottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
        >
          <p className="text-[10px] sm:text-xs uppercase tracking-[0.22em] font-bold text-ink-soft">
            <span className="hidden sm:inline">drag to pan · scroll to zoom</span>
            <span className="sm:hidden">drag to pan · pinch to zoom</span>
          </p>
        </div>
      )}
    </div>
  );
}

function activeCrumbColour(view: GraphView): string {
  if (view.kind === "root") {
    return view.axis === "genre" ? GENRE_COLOURS.Comedy : "var(--color-purple)";
  }
  if (view.axis === "genre") {
    const genre = view.clusterId.replace(/^genre:/, "");
    return genreColor(genre);
  }
  return "var(--color-purple)";
}

function sameId(a: unknown, hover: GraphNode): boolean {
  if (!a) return false;
  if (typeof a === "object" && a !== null && "id" in a) {
    return (a as { id: string }).id === hover.id;
  }
  return a === hover.id;
}

function drawNode(
  node: GraphNode & { x?: number; y?: number },
  ctx: CanvasRenderingContext2D,
  scale: number,
  hovered: boolean,
) {
  if (node.x === undefined || node.y === undefined) return;
  const seed = hashStr(node.id);
  const wobble = 0.3 + (seed % 100) / 300;
  const r = node.size;

  ctx.save();
  ctx.translate(node.x, node.y);

  // Shadow only applied to fill
  ctx.shadowColor = "rgba(26, 23, 20, 0.25)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 3;

  const steps = Math.max(14, Math.floor(r * 0.6));
  const tracePath = () => {
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const theta = (i / steps) * Math.PI * 2;
      const wob = Math.sin(theta * 3 + seed * 0.1) * wobble;
      const x = Math.cos(theta) * (r + wob);
      const y = Math.sin(theta) * (r + wob);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  };

  tracePath();
  ctx.fillStyle = node.color;
  ctx.fill();

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  if (node.kind === "event" && node.image) {
    const cached = imageCache.get(node.image);
    if (cached && cached.ok && cached.img.naturalWidth > 0) {
      const img = cached.img;
      ctx.save();
      tracePath();
      ctx.clip();
      const ratio = img.naturalWidth / img.naturalHeight;
      let dw = r * 2;
      let dh = r * 2;
      if (ratio > 1) dw = dh * ratio;
      else dh = dw / ratio;
      ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
      ctx.restore();

      if (hovered) {
        ctx.save();
        tracePath();
        ctx.clip();
        ctx.fillStyle = "rgba(127, 63, 152, 0.18)";
        ctx.fill();
        ctx.restore();
      }
    } else {
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `700 ${r * 0.9}px "Bricolage Grotesque", system-ui, sans-serif`;
      const initial =
        (node.label || "?")
          .replace(/[^A-Za-z0-9]/g, "")
          .slice(0, 1)
          .toUpperCase() || "?";
      ctx.fillText(initial, 0, 0);
    }
  }

  // Outline
  if (node.kind === "event") {
    ctx.lineWidth = hovered ? 3.5 : 2.5;
    ctx.strokeStyle = node.color;
    tracePath();
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#1A1714";
    tracePath();
    ctx.stroke();
  } else {
    ctx.lineWidth = hovered ? 3 : 2;
    ctx.strokeStyle = "#1A1714";
    tracePath();
    ctx.stroke();
  }

  if (hovered) {
    ctx.beginPath();
    ctx.arc(0, 0, r + 7, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(127, 63, 152, 0.9)";
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  if (node.kind === "cluster") {
    drawInsideLabel(
      ctx,
      node.label,
      r,
      node.textColor ?? "#ffffff",
      node.count,
      node.sublabel,
    );
  } else if (hovered) {
    drawPillLabel(ctx, node.label, r, scale, true);
  }

  ctx.restore();
}

function drawInsideLabel(
  ctx: CanvasRenderingContext2D,
  label: string,
  r: number,
  color: string,
  count?: number,
  sublabel?: string,
) {
  const maxWidth = r * 1.7;
  const baseSize = Math.max(10, Math.min(18, r * 0.28));
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${baseSize}px "Bricolage Grotesque", system-ui, sans-serif`;

  const lines = wrapText(ctx, label, maxWidth, 3);
  const lineHeight = baseSize * 1.05;
  const sublabelHeight = sublabel ? baseSize * 0.78 : 0;
  const countHeight = typeof count === "number" ? baseSize * 0.72 : 0;
  const total = lines.length * lineHeight + sublabelHeight + countHeight;
  const startY = -total / 2 + lineHeight / 2;

  lines.forEach((ln, i) => {
    ctx.fillText(ln, 0, startY + i * lineHeight);
  });

  let y = startY + lines.length * lineHeight;

  if (sublabel) {
    ctx.font = `500 ${baseSize * 0.62}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fillText(sublabel, 0, y + baseSize * 0.35);
    y += sublabelHeight;
  }

  if (typeof count === "number") {
    ctx.font = `500 ${baseSize * 0.62}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText(
      `${count} show${count === 1 ? "" : "s"}`,
      0,
      y + baseSize * 0.35,
    );
  }
}

function drawPillLabel(
  ctx: CanvasRenderingContext2D,
  label: string,
  r: number,
  scale: number,
  accent: boolean,
) {
  const fontSize = 11 / Math.max(0.7, scale * 0.9);
  ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`;
  const text = label.length > 30 ? label.slice(0, 28) + "…" : label;
  const w = ctx.measureText(text).width + fontSize * 1.2;
  const h = fontSize * 1.9;
  const y = r + h * 0.9;

  ctx.fillStyle = accent ? "#1A1714" : "#F7F3FB";
  ctx.strokeStyle = "#1A1714";
  ctx.lineWidth = 1.2;
  roundedRect(ctx, -w / 2, y - h / 2, w, h, h / 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = accent ? "#F7F3FB" : "#1A1714";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 0, y);
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current);
      current = word;
      if (lines.length === maxLines - 1) break;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  if (lines.length === maxLines) {
    const last = lines[lines.length - 1];
    if (ctx.measureText(last).width > maxWidth) {
      let t = last;
      while (t.length > 0 && ctx.measureText(t + "…").width > maxWidth) t = t.slice(0, -1);
      lines[lines.length - 1] = t + "…";
    }
  }
  return lines;
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export { GENRE_COLOURS };
