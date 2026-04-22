"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  countActive,
  type DatePreset,
  type DurationPreset,
  type FilterState,
  type PricePreset,
  type SortKey,
} from "@/lib/search";
import type { TimeOfDay } from "@/lib/types";

export type Facets = {
  genres: { value: string; count: number }[];
  venues: { slug: string; name: string; count: number }[];
  contentWarnings: { value: string; count: number }[];
  accessibility: { value: string; count: number }[];
};

const AGE_BUCKETS = ["Family", "Kids", "Teen", "16+", "18+"] as const;
const TIME_OF_DAY: TimeOfDay[] = ["Matinee", "Evening", "Late night"];

const DATE_PRESETS: { id: DatePreset; label: string }[] = [
  { id: "any", label: "Any date" },
  { id: "tonight", label: "Tonight" },
  { id: "this-weekend", label: "This weekend" },
  { id: "opening-weekend", label: "Opening (1–3 May)" },
  { id: "may-day", label: "May Day (2–4 May)" },
  { id: "final-weekend", label: "Closing (29–31 May)" },
  { id: "custom", label: "Custom range…" },
];

const PRICE_PRESETS: { id: PricePreset; label: string }[] = [
  { id: "any", label: "Any" },
  { id: "free", label: "Free" },
  { id: "under-10", label: "Under £10" },
  { id: "10-20", label: "£10–20" },
  { id: "20-plus", label: "£20+" },
];

const DUR_PRESETS: { id: DurationPreset; label: string }[] = [
  { id: "any", label: "Any" },
  { id: "short", label: "≤45 min" },
  { id: "medium", label: "45–75 min" },
  { id: "long", label: "75+ min" },
];

type FilterKind =
  | "genre"
  | "when"
  | "price"
  | "audience"
  | "length"
  | "venue"
  | "access"
  | "warnings";

export function FilterBar({
  filter,
  onChange,
  facets,
  sort,
  onSort,
  onReset,
  resultText,
  totalCount,
  showSort = true,
  searchPlaceholder,
}: {
  filter: FilterState;
  onChange: (f: FilterState) => void;
  facets: Facets;
  sort?: SortKey;
  onSort?: (s: SortKey) => void;
  onReset: () => void;
  resultText: string;
  totalCount: number;
  showSort?: boolean;
  searchPlaceholder?: string;
}) {
  const activeCount = countActive(filter);
  const [open, setOpen] = useState<FilterKind | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  function toggleList<K extends keyof FilterState>(key: K, value: string) {
    const current = filter[key] as unknown as string[];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onChange({ ...filter, [key]: next });
  }

  const pills: {
    kind: FilterKind;
    label: string;
    count: number;
    summary?: string;
  }[] = [
    { kind: "genre", label: "Genre", count: filter.genres.length, summary: filter.genres[0] },
    {
      kind: "when",
      label: "When",
      count: (filter.datePreset !== "any" ? 1 : 0) + filter.timeOfDay.length,
      summary: summariseWhen(filter),
    },
    {
      kind: "price",
      label: "Price",
      count: filter.price !== "any" ? 1 : 0,
      summary: PRICE_PRESETS.find((p) => p.id === filter.price && p.id !== "any")?.label,
    },
    { kind: "audience", label: "Audience", count: filter.ageBuckets.length, summary: filter.ageBuckets[0] },
    {
      kind: "length",
      label: "Length",
      count: filter.duration !== "any" ? 1 : 0,
      summary: DUR_PRESETS.find((p) => p.id === filter.duration && p.id !== "any")?.label,
    },
    { kind: "venue", label: "Venue", count: filter.venues.length },
    { kind: "access", label: "Access", count: filter.accessibility.length },
    { kind: "warnings", label: "Exclude", count: filter.excludeWarnings.length },
  ];

  return (
    <div
      className="sticky top-0 z-30 border-b-2 border-ink"
      style={{ background: "rgba(247, 243, 251, 0.96)", backdropFilter: "blur(10px)" }}
    >
      {/* Row 1 — BIG search */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-2">
        <BigSearch
          value={filter.q}
          onChange={(q) => onChange({ ...filter, q })}
          resultText={resultText}
          totalCount={totalCount}
          placeholder={searchPlaceholder}
        />
      </div>

      {/* Row 2 — pills + sort */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-3 flex items-center gap-2 flex-wrap">
        {/* Desktop / tablet: inline pill row */}
        <div className="hidden md:flex flex-wrap items-center gap-1.5">
          {pills.map((p) => (
            <FilterPill
              key={p.kind}
              label={p.label}
              count={p.count}
              summary={p.summary}
              open={open === p.kind}
              onToggle={() => setOpen(open === p.kind ? null : p.kind)}
              onClose={() => setOpen(null)}
            >
              <GroupContent
                kind={p.kind}
                filter={filter}
                onChange={onChange}
                facets={facets}
                toggleList={toggleList}
              />
            </FilterPill>
          ))}
        </div>

        {/* Mobile: one button opens a full sheet */}
        <button
          onClick={() => setSheetOpen(true)}
          className="md:hidden inline-flex items-center gap-2 chip"
          data-active={activeCount > 0}
          aria-haspopup="dialog"
          aria-expanded={sheetOpen}
        >
          <IconSliders />
          Filters{activeCount > 0 ? ` · ${activeCount}` : ""}
        </button>

        <div className="ml-auto flex items-center gap-3">
          {showSort && sort && onSort && (
            <SortSelect value={sort} onChange={onSort} />
          )}
          {activeCount > 0 && (
            <button
              onClick={onReset}
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: "var(--color-purple)" }}
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {activeCount > 0 && (
        <ActiveChips
          filter={filter}
          onChange={onChange}
          facets={facets}
          onReset={onReset}
        />
      )}

      {sheetOpen && (
        <MobileFilterSheet
          filter={filter}
          onChange={onChange}
          facets={facets}
          toggleList={toggleList}
          onClose={() => setSheetOpen(false)}
          onReset={onReset}
        />
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Big hero search — its own row, sticker-styled to pop
// -----------------------------------------------------------------------------
function BigSearch({
  value,
  onChange,
  resultText,
  totalCount,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  resultText: string;
  totalCount: number;
  placeholder?: string;
}) {
  const ph =
    placeholder ??
    `Search ${totalCount.toLocaleString("en-GB")} shows — try "komedia", "clown", a company…`;
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1">
        <span
          aria-hidden="true"
          className="absolute left-4 top-1/2 -translate-y-1/2"
          style={{ color: "var(--color-purple)" }}
        >
          <IconSearch size={22} />
        </span>
        <input
          type="search"
          placeholder={ph}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border-2 border-ink rounded-full bg-white outline-none transition-shadow"
          style={{
            height: 56,
            paddingLeft: 52,
            paddingRight: value ? 52 : 20,
            fontSize: 17,
            fontWeight: 500,
            boxShadow: "4px 4px 0 var(--color-purple)",
          }}
          aria-label="Search shows"
          onFocus={(e) => {
            e.currentTarget.style.boxShadow = "6px 6px 0 var(--color-purple-hot)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.boxShadow = "4px 4px 0 var(--color-purple)";
          }}
        />
        {value && (
          <button
            onClick={() => onChange("")}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-2 border-ink flex items-center justify-center text-sm hover:bg-paper"
            style={{ background: "white" }}
          >
            ✕
          </button>
        )}
      </div>
      <span className="hidden md:inline-block text-xs ink-soft tabular-nums whitespace-nowrap">
        {resultText}
      </span>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Pill button + anchored popover
// -----------------------------------------------------------------------------
function FilterPill({
  label,
  count,
  summary,
  open,
  onToggle,
  onClose,
  children,
}: {
  label: string;
  count: number;
  summary?: string;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;
      if (popRef.current?.contains(t)) return;
      if (btnRef.current?.contains(t)) return;
      onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const pillStyle: React.CSSProperties =
    count > 0
      ? {
          background: "var(--color-purple)",
          color: "white",
          borderColor: "var(--color-ink)",
        }
      : {};

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={onToggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="chip text-sm"
        style={pillStyle}
      >
        <span className="font-semibold">{label}</span>
        {count > 0 ? (
          <span
            className="tabular-nums text-xs rounded-full px-1.5"
            style={{ background: "rgba(255,255,255,0.25)" }}
          >
            {count}
          </span>
        ) : null}
        {count === 0 && summary && (
          <span className="ink-soft text-xs hidden lg:inline">{summary}</span>
        )}
        <span aria-hidden="true" className="ink-soft">
          {open ? "▴" : "▾"}
        </span>
      </button>

      {open && (
        <div
          ref={popRef}
          role="dialog"
          aria-label={`${label} filter`}
          className="absolute left-0 top-full mt-2 w-[min(360px,90vw)] max-h-[70vh] overflow-y-auto scrollbar-thin card p-4 z-40"
          style={{ background: "white" }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Per-kind content — shared between popover and mobile sheet
// -----------------------------------------------------------------------------
function GroupContent({
  kind,
  filter,
  onChange,
  facets,
  toggleList,
}: {
  kind: FilterKind;
  filter: FilterState;
  onChange: (f: FilterState) => void;
  facets: Facets;
  toggleList: <K extends keyof FilterState>(key: K, value: string) => void;
}) {
  if (kind === "genre") {
    return (
      <ChipGrid>
        {facets.genres.map((g) => (
          <button
            key={g.value}
            className="chip"
            data-active={filter.genres.includes(g.value)}
            onClick={() => toggleList("genres", g.value)}
          >
            {g.value} <span className="ink-soft">{g.count}</span>
          </button>
        ))}
      </ChipGrid>
    );
  }

  if (kind === "when") {
    return (
      <div className="space-y-3">
        <Section label="Preset">
          <ChipGrid>
            {DATE_PRESETS.map((d) => (
              <button
                key={d.id}
                className="chip"
                data-active={filter.datePreset === d.id}
                onClick={() =>
                  onChange({
                    ...filter,
                    datePreset: d.id,
                    dateFrom: d.id === "custom" ? filter.dateFrom : null,
                    dateTo: d.id === "custom" ? filter.dateTo : null,
                  })
                }
              >
                {d.label}
              </button>
            ))}
          </ChipGrid>
        </Section>
        {filter.datePreset === "custom" && (
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs ink-soft">
              From
              <input
                type="date"
                min="2026-05-01"
                max="2026-05-31"
                value={filter.dateFrom ?? ""}
                onChange={(e) =>
                  onChange({ ...filter, dateFrom: e.target.value || null })
                }
                className="input mt-1"
              />
            </label>
            <label className="text-xs ink-soft">
              To
              <input
                type="date"
                min="2026-05-01"
                max="2026-05-31"
                value={filter.dateTo ?? ""}
                onChange={(e) => onChange({ ...filter, dateTo: e.target.value || null })}
                className="input mt-1"
              />
            </label>
          </div>
        )}
        <Section label="Time of day">
          <ChipGrid>
            {TIME_OF_DAY.map((t) => (
              <button
                key={t}
                className="chip"
                data-active={filter.timeOfDay.includes(t)}
                onClick={() => toggleList("timeOfDay", t)}
              >
                {t}
              </button>
            ))}
          </ChipGrid>
        </Section>
      </div>
    );
  }

  if (kind === "price") {
    return (
      <ChipGrid>
        {PRICE_PRESETS.map((p) => (
          <button
            key={p.id}
            className="chip"
            data-active={filter.price === p.id}
            onClick={() => onChange({ ...filter, price: p.id })}
          >
            {p.label}
          </button>
        ))}
      </ChipGrid>
    );
  }

  if (kind === "audience") {
    return (
      <ChipGrid>
        {AGE_BUCKETS.map((a) => (
          <button
            key={a}
            className="chip"
            data-active={filter.ageBuckets.includes(a)}
            onClick={() => toggleList("ageBuckets", a)}
          >
            {a}
          </button>
        ))}
      </ChipGrid>
    );
  }

  if (kind === "length") {
    return (
      <ChipGrid>
        {DUR_PRESETS.map((d) => (
          <button
            key={d.id}
            className="chip"
            data-active={filter.duration === d.id}
            onClick={() => onChange({ ...filter, duration: d.id })}
          >
            {d.label}
          </button>
        ))}
      </ChipGrid>
    );
  }

  if (kind === "venue") {
    return (
      <VenuePicker
        facets={facets.venues}
        selected={filter.venues}
        onChange={(venues) => onChange({ ...filter, venues })}
      />
    );
  }

  if (kind === "access") {
    if (facets.accessibility.length === 0) {
      return <p className="text-sm ink-soft">No accessibility tags on this catalogue yet.</p>;
    }
    return (
      <ChipGrid>
        {facets.accessibility.map((a) => (
          <button
            key={a.value}
            className="chip"
            data-active={filter.accessibility.includes(a.value)}
            onClick={() => toggleList("accessibility", a.value)}
          >
            {a.value}
          </button>
        ))}
      </ChipGrid>
    );
  }

  // warnings
  return (
    <>
      <p className="text-xs ink-soft mb-2">
        Hide shows that contain any of the following:
      </p>
      <ChipGrid>
        {facets.contentWarnings.map((w) => (
          <button
            key={w.value}
            className="chip"
            data-tone="warn"
            data-active={filter.excludeWarnings.includes(w.value)}
            onClick={() => toggleList("excludeWarnings", w.value)}
          >
            {w.value} <span className="ink-soft">{w.count}</span>
          </button>
        ))}
      </ChipGrid>
    </>
  );
}

// -----------------------------------------------------------------------------
// Mobile full-screen sheet with all groups stacked
// -----------------------------------------------------------------------------
function MobileFilterSheet({
  filter,
  onChange,
  facets,
  toggleList,
  onClose,
  onReset,
}: {
  filter: FilterState;
  onChange: (f: FilterState) => void;
  facets: Facets;
  toggleList: <K extends keyof FilterState>(key: K, value: string) => void;
  onClose: () => void;
  onReset: () => void;
}) {
  // lock body scroll while sheet is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const groups: { kind: FilterKind; title: string }[] = [
    { kind: "genre", title: "Genre" },
    { kind: "when", title: "When" },
    { kind: "price", title: "Price" },
    { kind: "audience", title: "Audience" },
    { kind: "length", title: "Length" },
    { kind: "venue", title: "Venue" },
    { kind: "access", title: "Accessibility" },
    { kind: "warnings", title: "Exclude content warnings" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "rgba(26, 23, 20, 0.55)" }}
      onClick={onClose}
    >
      <div
        className="ml-auto h-full w-[min(420px,100%)] bg-white border-l-2 border-ink flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="p-4 flex items-center justify-between border-b-2 border-ink shrink-0">
          <h2 className="font-display text-xl" style={{ fontWeight: 800 }}>
            Filters
          </h2>
          <button onClick={onClose} aria-label="Close filters" className="chip">
            ✕ Close
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {groups.map((g) => (
            <section key={g.kind}>
              <h3 className="text-xs font-bold uppercase tracking-[0.22em] ink-soft mb-2">
                {g.title}
              </h3>
              <GroupContent
                kind={g.kind}
                filter={filter}
                onChange={onChange}
                facets={facets}
                toggleList={toggleList}
              />
            </section>
          ))}
        </div>
        <footer className="p-4 border-t-2 border-ink flex gap-2 shrink-0">
          <button
            onClick={() => {
              onReset();
              onClose();
            }}
            className="btn flex-1"
          >
            Clear all
          </button>
          <button
            onClick={onClose}
            className="btn btn--purple flex-1"
            style={{ background: "var(--color-purple-hot)" }}
          >
            Show results
          </button>
        </footer>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Active filter chips row
// -----------------------------------------------------------------------------
function ActiveChips({
  filter,
  onChange,
  facets,
  onReset,
}: {
  filter: FilterState;
  onChange: (f: FilterState) => void;
  facets: Facets;
  onReset: () => void;
}) {
  type Chip = { label: string; onRemove: () => void };
  const chips: Chip[] = [];

  if (filter.q) {
    chips.push({
      label: `“${filter.q}”`,
      onRemove: () => onChange({ ...filter, q: "" }),
    });
  }
  for (const g of filter.genres) {
    chips.push({
      label: g,
      onRemove: () =>
        onChange({ ...filter, genres: filter.genres.filter((x) => x !== g) }),
    });
  }
  if (filter.datePreset !== "any") {
    const label = DATE_PRESETS.find((d) => d.id === filter.datePreset)?.label ?? filter.datePreset;
    chips.push({
      label,
      onRemove: () =>
        onChange({ ...filter, datePreset: "any", dateFrom: null, dateTo: null }),
    });
  }
  for (const t of filter.timeOfDay) {
    chips.push({
      label: t,
      onRemove: () =>
        onChange({ ...filter, timeOfDay: filter.timeOfDay.filter((x) => x !== t) }),
    });
  }
  if (filter.price !== "any") {
    const label = PRICE_PRESETS.find((p) => p.id === filter.price)?.label ?? filter.price;
    chips.push({ label, onRemove: () => onChange({ ...filter, price: "any" }) });
  }
  if (filter.duration !== "any") {
    const label = DUR_PRESETS.find((p) => p.id === filter.duration)?.label ?? filter.duration;
    chips.push({ label, onRemove: () => onChange({ ...filter, duration: "any" }) });
  }
  for (const b of filter.ageBuckets) {
    chips.push({
      label: b,
      onRemove: () =>
        onChange({ ...filter, ageBuckets: filter.ageBuckets.filter((x) => x !== b) }),
    });
  }
  for (const v of filter.venues) {
    const name = facets.venues.find((f) => f.slug === v)?.name ?? v;
    chips.push({
      label: `📍 ${name}`,
      onRemove: () =>
        onChange({ ...filter, venues: filter.venues.filter((x) => x !== v) }),
    });
  }
  for (const a of filter.accessibility) {
    chips.push({
      label: `✓ ${a}`,
      onRemove: () =>
        onChange({
          ...filter,
          accessibility: filter.accessibility.filter((x) => x !== a),
        }),
    });
  }
  for (const w of filter.excludeWarnings) {
    chips.push({
      label: `no ${w}`,
      onRemove: () =>
        onChange({
          ...filter,
          excludeWarnings: filter.excludeWarnings.filter((x) => x !== w),
        }),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-3 flex flex-wrap items-center gap-1.5">
      {chips.map((c, i) => (
        <button
          key={`${c.label}-${i}`}
          onClick={c.onRemove}
          className="chip"
          data-active="true"
          aria-label={`Remove ${c.label}`}
        >
          {c.label} <span aria-hidden="true">×</span>
        </button>
      ))}
      <button
        onClick={onReset}
        className="text-xs ink-soft ml-2 font-bold uppercase tracking-wider"
      >
        Clear
      </button>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Sort select
// -----------------------------------------------------------------------------
function SortSelect({
  value,
  onChange,
}: {
  value: SortKey;
  onChange: (v: SortKey) => void;
}) {
  return (
    <label className="flex items-center gap-1.5 text-sm">
      <span className="ink-soft hidden sm:inline text-xs">Sort</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortKey)}
        className="input py-1 px-2 w-auto text-sm"
      >
        <option value="next">Next showing</option>
        <option value="title">Title A–Z</option>
        <option value="price">Price ↑</option>
        <option value="performances">Most showings</option>
      </select>
    </label>
  );
}

// -----------------------------------------------------------------------------
// Venue picker (searchable multi-select)
// -----------------------------------------------------------------------------
function VenuePicker({
  facets,
  selected,
  onChange,
}: {
  facets: Facets["venues"];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return facets.slice(0, 20);
    return facets.filter((v) => v.name.toLowerCase().includes(s)).slice(0, 40);
  }, [q, facets]);

  function toggle(slug: string) {
    onChange(selected.includes(slug) ? selected.filter((s) => s !== slug) : [...selected, slug]);
  }

  const selectedFacets = facets.filter((v) => selected.includes(v.slug));

  return (
    <div>
      <input
        type="search"
        placeholder="Find a venue…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="input text-sm"
      />
      {selectedFacets.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selectedFacets.map((v) => (
            <button
              key={v.slug}
              onClick={() => toggle(v.slug)}
              className="chip"
              data-active="true"
            >
              × {v.name}
            </button>
          ))}
        </div>
      )}
      <ul className="mt-2 max-h-56 overflow-y-auto scrollbar-thin space-y-1">
        {filtered.map((v) => (
          <li key={v.slug}>
            <button
              className="flex w-full items-center justify-between py-1 px-2 rounded hover:bg-paper text-sm text-left"
              onClick={() => toggle(v.slug)}
            >
              <span className="truncate">{v.name}</span>
              <span className="ink-soft text-xs tabular-nums ml-2">{v.count}</span>
            </button>
          </li>
        ))}
        {!filtered.length && (
          <li className="text-xs ink-soft p-2">No venues match &ldquo;{q}&rdquo;.</li>
        )}
      </ul>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Tiny layout helpers + icons
// -----------------------------------------------------------------------------
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.22em] ink-soft mb-1.5">
        {label}
      </p>
      {children}
    </div>
  );
}

function ChipGrid({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-1.5">{children}</div>;
}

function IconSearch({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5l3 3" />
    </svg>
  );
}

function IconSliders() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M2 4h12M2 8h6M2 12h9" />
      <circle cx="11" cy="4" r="1.5" fill="currentColor" />
      <circle cx="9" cy="8" r="1.5" fill="currentColor" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

// Build the "When" summary string for the pill when nothing's active
function summariseWhen(f: FilterState): string | undefined {
  if (f.datePreset !== "any") {
    return DATE_PRESETS.find((p) => p.id === f.datePreset)?.label;
  }
  if (f.timeOfDay.length === 1) return f.timeOfDay[0];
  return undefined;
}
