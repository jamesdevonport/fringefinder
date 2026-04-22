import type { Axis } from "./clusters";

type Props = { size?: number; className?: string };

// Hand-drawn style icons — drawn in currentColor so they inherit from chip text
export function AxisIcon({ axis, size = 18, className = "" }: Props & { axis: Axis }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
  };

  if (axis === "genre") {
    // Theatre masks: two overlapping circles with eye curves
    return (
      <svg {...common} aria-hidden="true">
        <circle cx="9" cy="11" r="6" />
        <circle cx="16" cy="13" r="6" />
        <path d="M7.5 10.5c.5-.5 1.3-.5 1.8 0" />
        <path d="M14.5 12.5c.5-.5 1.3-.5 1.8 0" />
        <path d="M7.2 14.5c.8.7 2 .7 2.8 0" />
      </svg>
    );
  }

  if (axis === "when") {
    // Calendar: rectangle with a tiny tear & grid dots
    return (
      <svg {...common} aria-hidden="true">
        <rect x="3.5" y="5.5" width="17" height="15" rx="2" />
        <path d="M8 3.5v3M16 3.5v3M3.5 10.5h17" />
        <circle cx="8" cy="14.5" r="0.7" fill="currentColor" />
        <circle cx="12" cy="14.5" r="0.7" fill="currentColor" />
        <circle cx="16" cy="14.5" r="0.7" fill="currentColor" />
      </svg>
    );
  }

  if (axis === "audience") {
    // Three heads-and-shoulders silhouettes
    return (
      <svg {...common} aria-hidden="true">
        <circle cx="8" cy="9" r="2.2" />
        <circle cx="16" cy="9" r="2.2" />
        <circle cx="12" cy="7" r="1.8" />
        <path d="M3.5 19c0-2.5 2-4.5 4.5-4.5S12.5 16.5 12.5 19" />
        <path d="M11.5 19c0-2.5 2-4.5 4.5-4.5S20.5 16.5 20.5 19" />
      </svg>
    );
  }

  if (axis === "price") {
    // Pound sign in a wobbly circle
    return (
      <svg {...common} aria-hidden="true">
        <circle cx="12" cy="12" r="8.5" />
        <path d="M9 8.2c.7-1.5 2.5-2 4-1.2 1.4.7 1.8 2.4 1 3.8M7.5 13.5h6M8.5 16.8h6" />
      </svg>
    );
  }

  // length — a stopwatch / clock
  return (
    <svg {...common} aria-hidden="true">
      <circle cx="12" cy="13" r="7.5" />
      <path d="M12 13V8.5M12 13l3 2.3" />
      <path d="M10 3.5h4" />
    </svg>
  );
}
