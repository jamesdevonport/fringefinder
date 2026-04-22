"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "fringe-finder:bookmarks";

const EMPTY: ReadonlySet<string> = new Set();
let cachedRaw: string | null = null;
let cachedSnapshot: ReadonlySet<string> = EMPTY;

function readRaw(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function parseRaw(raw: string | null): ReadonlySet<string> {
  if (!raw) return EMPTY;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;
    const cleaned = parsed.filter((x): x is string => typeof x === "string");
    if (cleaned.length === 0) return EMPTY;
    return new Set(cleaned);
  } catch {
    return EMPTY;
  }
}

function getSnapshot(): ReadonlySet<string> {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedSnapshot = parseRaw(raw);
  }
  return cachedSnapshot;
}

function getServerSnapshot(): ReadonlySet<string> {
  return EMPTY;
}

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

function writeSet(next: ReadonlySet<string>) {
  if (typeof window === "undefined") return;
  try {
    if (next.size === 0) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(Array.from(next)),
      );
    }
  } catch {
    // private mode / quota — ignore
  }
  emit();
}

export type UseBookmarks = {
  bookmarks: ReadonlySet<string>;
  count: number;
  has: (slug: string) => boolean;
  toggle: (slug: string) => void;
  add: (slug: string) => void;
  remove: (slug: string) => void;
  clear: () => void;
};

export function useBookmarks(): UseBookmarks {
  const bookmarks = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  return {
    bookmarks,
    count: bookmarks.size,
    has: (slug: string) => bookmarks.has(slug),
    toggle: (slug: string) => {
      const next = new Set(bookmarks);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      writeSet(next);
    },
    add: (slug: string) => {
      if (bookmarks.has(slug)) return;
      const next = new Set(bookmarks);
      next.add(slug);
      writeSet(next);
    },
    remove: (slug: string) => {
      if (!bookmarks.has(slug)) return;
      const next = new Set(bookmarks);
      next.delete(slug);
      writeSet(next);
    },
    clear: () => writeSet(EMPTY),
  };
}
