"use client";

import Image from "next/image";

type Props = {
  images: string[];
  rows?: number;
};

// Distribute images across N rows, duplicating each row's list so the CSS
// marquee animation can translate to -50% and still look seamless.
function splitIntoRows(images: string[], rows: number): string[][] {
  const out: string[][] = Array.from({ length: rows }, () => []);
  images.forEach((img, i) => {
    out[i % rows].push(img);
  });
  return out.map((r) => [...r, ...r]);
}

export function HeroMosaic({ images, rows = 4 }: Props) {
  const distributed = splitIntoRows(images, rows);
  // Each row gets its own slightly different speed + direction so the mosaic
  // feels alive without being distracting.
  const tracks = distributed.map((list, i) => {
    const reverse = i % 2 === 1;
    const duration = 80 + i * 18; // 80s, 98s, 116s, 134s
    return { list, reverse, duration };
  });

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="flex flex-col gap-2 sm:gap-3 h-full py-2 sm:py-3">
        {tracks.map((track, i) => (
          <MarqueeRow key={i} {...track} />
        ))}
      </div>
    </div>
  );
}

function MarqueeRow({
  list,
  reverse,
  duration,
}: {
  list: string[];
  reverse: boolean;
  duration: number;
}) {
  return (
    <div className="flex-1 min-h-0 relative overflow-hidden">
      <div
        className="flex gap-2 sm:gap-3 h-full"
        style={{
          width: "max-content",
          animation: `fringe-marquee ${duration}s linear infinite`,
          animationDirection: reverse ? "reverse" : "normal",
          willChange: "transform",
        }}
      >
        {list.map((src, i) => (
          <div
            key={`${src}-${i}`}
            className="relative aspect-[4/5] h-full shrink-0"
            style={{
              width: "clamp(140px, 18vw, 240px)",
              borderRadius: 14,
              overflow: "hidden",
              border: "2px solid #1A1714",
              boxShadow: "3px 3px 0 rgba(26, 23, 20, 0.35)",
              transform: `rotate(${((i * 7) % 11) - 5}deg) translateY(${((i * 13) % 9) - 4}px)`,
            }}
          >
            <Image
              src={src}
              alt=""
              fill
              sizes="240px"
              className="object-cover"
              unoptimized
              priority={i < 4}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
