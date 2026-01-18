// Force-desktop overrides for mobile browsers (reversible test)
const FORCE = true;
if (FORCE) {
  try {
    const desktopUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
    // Best-effort UA override (read-only in some contexts; ignore failures)
    try { Object.defineProperty(navigator, 'userAgent', {get(){return desktopUA}}); } catch {}
    try {
      // Some libs sniff .platform or .vendor
      Object.defineProperty(navigator, 'platform', {get(){return 'Win32'}});
      Object.defineProperty(navigator, 'vendor', {get(){return 'Google Inc.'}});
    } catch {}
    // Neutralize responsive gates
    const realMM = window.matchMedia.bind(window);
    window.matchMedia = (q: string) => {
      const qLow = (q || '').toLowerCase();
      const isMobileGate =
        qLow.includes('max-width') ||
        qLow.includes('device-width') ||
        qLow.includes('pointer: coarse') ||
        qLow.includes('hover: none') ||
        qLow.includes('orientation');
      if (isMobileGate) {
        const fake: MediaQueryList = Object.assign(Object.create(null), {
          media: q, matches: false,
          addEventListener: (_: any, __: any)=>{}, removeEventListener: (_: any, __: any)=>{},
          addListener: (_: any)=>{}, removeListener: (_: any)=>{}, onchange: null, dispatchEvent: ()=>false
        });
        return fake;
      }
      return realMM(q);
    };
    // Visual width anchor so desktop layout has room on phones
    document.documentElement.classList.add('om-force-desktop');
    const style = document.createElement('style');
    style.textContent = `
      html.om-force-desktop { min-width: 1200px; }
      body { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
    `;
    document.head.appendChild(style);
  } catch (e) { /* no-op */ }
}
export {};
