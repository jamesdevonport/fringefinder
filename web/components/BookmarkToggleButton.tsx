"use client";

import { useBookmarks } from "@/lib/bookmarks";

export function BookmarkToggleButton({ slug }: { slug: string }) {
  const { has, toggle } = useBookmarks();
  const active = has(slug);

  return (
    <button
      type="button"
      onClick={() => toggle(slug)}
      aria-pressed={active}
      className="btn"
      style={
        active
          ? { background: "var(--color-coral)", color: "white" }
          : undefined
      }
    >
      <svg
        width={18}
        height={18}
        viewBox="0 0 24 24"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
      <span>{active ? "Bookmarked" : "Bookmark"}</span>
    </button>
  );
}
