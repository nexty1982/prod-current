type LogoProps = {
  variant?: "light" | "dark" | "auto";
  className?: string;
  size?: "sm" | "md" | "lg";
};

const HEIGHTS = { sm: 36, md: 44, lg: 56 } as const;

export function Logo({ variant = "auto", className = "", size = "md" }: LogoProps) {
  const h = HEIGHTS[size];
  return (
    <div className={`inline-flex items-center ${className}`} aria-label="Orthodox Metrics">
      {variant === "light" ? (
        <img
          src="/images/logos/om-logo-dark.png"
          alt="Orthodox Metrics"
          style={{ height: h, width: 'auto', objectFit: 'contain' }}
        />
      ) : variant === "dark" ? (
        <img
          src="/images/logos/om-logo-light.png"
          alt="Orthodox Metrics"
          style={{ height: h, width: 'auto', objectFit: 'contain' }}
        />
      ) : (
        <>
          <img
            src="/images/logos/om-logo-light.png"
            alt="Orthodox Metrics"
            className="block dark:hidden"
            style={{ height: h, width: 'auto', objectFit: 'contain' }}
          />
          <img
            src="/images/logos/om-logo-dark.png"
            alt="Orthodox Metrics"
            className="hidden dark:block"
            style={{ height: h, width: 'auto', objectFit: 'contain' }}
          />
        </>
      )}
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
    <div className={`inline-flex items-center ${className}`} aria-label="Orthodox Metrics">
      <img
        src="/images/logos/om-logo-light.png"
        alt="Orthodox Metrics"
        className="block dark:hidden"
        style={{ height: size, width: 'auto', objectFit: 'contain' }}
      />
      <img
        src="/images/logos/om-logo-dark.png"
        alt="Orthodox Metrics"
        className="hidden dark:block"
        style={{ height: size, width: 'auto', objectFit: 'contain' }}
      />
    </div>
  );
}
