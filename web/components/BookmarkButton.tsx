"use client";

import { useBookmarks } from "@/lib/bookmarks";

export function BookmarkButton({
  slug,
  size = "md",
  tone = "overlay",
}: {
  slug: string;
  size?: "sm" | "md";
  tone?: "overlay" | "plain";
}) {
  const { has, toggle } = useBookmarks();
  const active = has(slug);
  const dim = size === "sm" ? 30 : 36;
  const iconSize = size === "sm" ? 16 : 20;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(slug);
      }}
      aria-label={active ? "Remove bookmark" : "Bookmark this show"}
      aria-pressed={active}
      title={active ? "Bookmarked · click to remove" : "Bookmark this show"}
      className="group rounded-full border-2 border-ink flex items-center justify-center transition-transform"
      style={{
        width: dim,
        height: dim,
        background: active
          ? "var(--color-coral)"
          : tone === "overlay"
            ? "rgba(255,255,255,0.92)"
            : "white",
        color: active ? "white" : "var(--color-ink)",
        boxShadow: active
          ? "2px 2px 0 var(--color-ink)"
          : tone === "overlay"
            ? "2px 2px 0 rgba(26,23,20,0.35)"
            : "2px 2px 0 var(--color-ink)",
        cursor: "pointer",
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = "translate(1px, 1px)";
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = "";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "";
      }}
    >
      <svg
        width={iconSize}
        height={iconSize}
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
    </button>
  );
}
