export function Footer() {
  const currentTime = new Date().toLocaleString();
  
  return (
    <footer className="w-full border-t border-[var(--om-border)] bg-[var(--om-parchment)] px-6 py-3">
      <div className="max-w-7xl mx-auto">
        <div className="text-xs text-gray-600 text-center">
          <span className="font-medium">OrthodoxMetrics Internal Dev Tool</span>
          <span className="mx-2">•</span>
          <span>Last scan: {currentTime}</span>
        </div>
      </div>
    </footer>
  );
}