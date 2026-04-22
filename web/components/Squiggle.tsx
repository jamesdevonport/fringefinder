type SquiggleProps = {
  width?: number;
  height?: number;
  color?: string;
  className?: string;
  strokeWidth?: number;
};

export function Squiggle({
  width = 160,
  height = 14,
  color = "var(--color-coral)",
  className = "",
  strokeWidth = 3,
}: SquiggleProps) {
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={className}
      aria-hidden="true"
    >
      <path
        d={`M0 ${height / 2} Q ${width / 8} 0, ${width / 4} ${height / 2} T ${width / 2} ${height / 2} T ${(3 * width) / 4} ${height / 2} T ${width} ${height / 2}`}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Star({ size = 20, className = "", color = "currentColor" }: {
  size?: number;
  className?: string;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12 2l2.6 6.1 6.6.6-5 4.4 1.5 6.4L12 16.5l-5.7 3 1.5-6.4-5-4.4 6.6-.6L12 2z"
        fill={color}
        stroke="var(--color-ink)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SpotLight({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 200"
      className={className}
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="spot" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="var(--color-coral)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--color-coral)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points="180,0 220,0 380,200 20,200" fill="url(#spot)" />
    </svg>
  );
}
