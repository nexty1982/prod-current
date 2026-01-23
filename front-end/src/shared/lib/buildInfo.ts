/**
 * Build Information Utility
 * Accesses build info injected at build time
 */

// Build info is injected into index.html as window.__BUILD_INFO__
declare global {
  interface Window {
    __BUILD_INFO__?: {
      gitSha: string;
      buildTime: string;
      buildTimestamp: number;
      version: string;
    };
  }
}

/**
 * Get build information
 */
export function getBuildInfo() {
  if (typeof window !== 'undefined' && window.__BUILD_INFO__) {
    return window.__BUILD_INFO__;
  }
  
  // Fallback for development or if not injected
  return {
    gitSha: 'dev',
    buildTime: new Date().toISOString(),
    buildTimestamp: Date.now(),
    version: '1.0.0-dev'
  };
}

/**
 * Get formatted build version string
 */
export function getBuildVersionString(): string {
  const info = getBuildInfo();
  const buildDate = new Date(info.buildTime);
  const dateStr = buildDate.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  return `${info.version} (${info.gitSha}) - ${dateStr}`;
}

/**
 * Get short build version (git SHA only)
 */
export function getBuildVersionShort(): string {
  const info = getBuildInfo();
  return info.gitSha;
}
