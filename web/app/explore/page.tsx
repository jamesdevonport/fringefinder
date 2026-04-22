"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { EventSearch } from "@/lib/types";
import { ForceGraph } from "@/components/Graph/ForceGraph";
import { AxisIcon } from "@/components/Graph/AxisIcons";
import { Squiggle } from "@/components/Squiggle";
import { type Axis } from "@/components/Graph/clusters";

type AxisMeta = {
  id: Axis;
  label: string;        // chip label
  prompt: string;       // user-facing question this axis answers
  blobIs: string;       // what each super-node represents
};

const AXES: AxisMeta[] = [
  {
    id: "genre",
    label: "Genre",
    prompt: "What kind of show are you after?",
    blobIs: "genre",
  },
  {
    id: "when",
    label: "Date",
    prompt: "What week are you free?",
    blobIs: "chunk of the festival",
  },
  {
    id: "audience",
    label: "Audience",
    prompt: "Who are you bringing?",
    blobIs: "age group",
  },
  {
    id: "price",
    label: "Price",
    prompt: "How much are you spending?",
    blobIs: "price band",
  },
  {
    id: "length",
    label: "Length",
    prompt: "How long can you sit still?",
    blobIs: "show length",
  },
];

export default function ExplorePage() {
  const [events, setEvents] = useState<EventSearch[] | null>(null);
  const [axis, setAxis] = useState<Axis>("genre");

  useEffect(() => {
    let cancelled = false;
    fetch("/events-search.json")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setEvents(data as EventSearch[]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const activeMeta = AXES.find((a) => a.id === axis)!;

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 74px)" }}>
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 pt-5 pb-3 shrink-0 space-y-3">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl">Wander the bubble map</h1>
          <Squiggle width={160} height={10} color="var(--color-purple)" />
        </div>

        <AxisPicker axis={axis} onChange={setAxis} />

        <HelperRow activeMeta={activeMeta} />
      </div>

      <div
        className="flex-1 border-y-2 border-ink relative overflow-hidden"
        style={{
          backgroundColor: "#EDE6F5",
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(127,63,152,0.14) 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      >
        {events ? (
          <ForceGraph events={events} axis={axis} />
        ) : (
          <div className="h-full grid place-items-center text-ink-soft">
            <p className="text-lg italic font-display">putting the bubbles on…</p>
          </div>
        )}
      </div>
    </div>
  );
}

function AxisPicker({
  axis,
  onChange,
}: {
  axis: Axis;
  onChange: (a: Axis) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-semibold">Show me shows by</span>
      <div
        role="radiogroup"
        aria-label="How to group the map"
        className="flex flex-wrap items-center gap-1.5 rounded-full border-2 border-ink p-1"
        style={{ background: "white" }}
      >
        {AXES.map((a) => {
          const active = axis === a.id;
          return (
            <button
              key={a.id}
              role="radio"
              aria-checked={active}
              onClick={() => onChange(a.id)}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors"
              style={
                active
                  ? {
                      background: "var(--color-purple)",
                      color: "white",
                      boxShadow: "inset 0 0 0 2px var(--color-ink)",
                    }
                  : { color: "var(--color-ink)" }
              }
            >
              <AxisIcon axis={a.id} size={16} />
              <span>{a.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function HelperRow({ activeMeta }: { activeMeta: AxisMeta }) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <p
        className="font-display text-lg"
        style={{ color: "var(--color-purple-deep)", fontWeight: 700 }}
      >
        {activeMeta.prompt}
      </p>
      <p className="ink-soft text-sm">
        Each blob is a {activeMeta.blobIs}.{" "}
        <span className="hidden sm:inline">
          Click one to see its shows as thumbnails. Bubble colour = genre.
        </span>
        <span className="sm:hidden">Click one to see its shows.</span>
      </p>
      <Link href="/browse/" className="ml-auto text-sm wobble-underline">
        Prefer filters?
      </Link>
    </div>
  );
}
