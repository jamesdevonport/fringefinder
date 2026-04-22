import type { Metadata } from "next";
import { BookmarksClient } from "@/components/BookmarksClient";

export const metadata: Metadata = {
  title: "Your bookmarked shows · Fringe Finder",
  description:
    "Every Brighton Fringe 2026 show you've bookmarked. Stored locally on your device — no account, no tracking.",
};

export default function BookmarksPage() {
  return <BookmarksClient />;
}
