type LogoProps = {
  variant?: "light" | "dark" | "auto";
  className?: string;
  size?: "sm" | "md" | "lg";
};

const HEIGHTS = { sm: 32, md: 40, lg: 56 } as const;

export function Logo({ variant = "auto", className = "", size = "md" }: LogoProps) {
  const h = HEIGHTS[size];
  return (
    <div className={`inline-flex items-center gap-2 ${className}`} aria-label="Orthodox Metrics">
      <LogoMark size={h} />
      <span
        className={`font-['Georgia'] tracking-tight ${
          variant === "light"
            ? "text-white"
            : variant === "dark"
              ? "text-[#2a1450]"
              : "text-[#2a1450] dark:text-white"
        }`}
        style={{ fontSize: Math.round(h * 0.45) }}
      >
        Orthodox Metrics
      </span>
    </div>
  );
}

export function LogoMark({
  className = "",
  size = 36,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <div
      className={`inline-flex items-center justify-center rounded-md bg-[#2a1450] text-[#c9a14a] ${className}`}
      style={{ width: size, height: size }}
      aria-label="Orthodox Metrics"
    >
      <svg
        viewBox="0 0 24 32"
        width={Math.round(size * 0.6)}
        height={Math.round(size * 0.78)}
        fill="currentColor"
        aria-hidden
      >
        <rect x="11" y="2" width="2" height="28" />
        <rect x="7" y="6" width="10" height="2" />
        <rect x="5" y="11" width="14" height="2" />
        <polygon points="8,16 16,16 12,20" />
      </svg>
    </div>
  );
}
