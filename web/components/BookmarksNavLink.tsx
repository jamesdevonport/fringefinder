"use client";

import Link from "next/link";
import { useBookmarks } from "@/lib/bookmarks";

export function BookmarksNavLink() {
  const { count } = useBookmarks();
  const hasBookmarks = count > 0;

  return (
    <Link
      href="/bookmarks"
      aria-label={
        hasBookmarks
          ? `Your ${count} bookmarked show${count === 1 ? "" : "s"}`
          : "Bookmarks"
      }
      className="px-3 py-1.5 rounded-full hover:bg-ink hover:text-cream transition-colors font-medium inline-flex items-center gap-1.5"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill={hasBookmarks ? "var(--color-coral)" : "none"}
        stroke={hasBookmarks ? "var(--color-coral)" : "currentColor"}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
      {hasBookmarks && (
        <span className="tabular-nums text-xs font-bold">{count}</span>
      )}
    </Link>
  );
}
