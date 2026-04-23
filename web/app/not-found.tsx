import Link from "next/link";
import { Squiggle } from "@/components/Squiggle";

export default function NotFound() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 text-center">
      <p
        className="text-xs uppercase tracking-[0.3em] font-semibold mb-3"
        style={{ color: "var(--color-purple-deep)" }}
      >
        404 · Page not found
      </p>
      <h1 className="font-display text-5xl sm:text-6xl leading-tight mb-4">
        That show&apos;s not in the programme.
      </h1>
      <div className="flex justify-center mb-8">
        <Squiggle width={220} height={12} />
      </div>
      <p className="ink-soft text-lg mb-8">
        Try browsing every Brighton Fringe 2026 show, or wander the bubble map
        instead.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/browse/"
          className="btn"
          style={{ background: "var(--color-purple)", color: "white" }}
        >
          Browse all shows
        </Link>
        <Link href="/" className="btn">
          Back to the home page
        </Link>
      </div>
    </div>
  );
}
