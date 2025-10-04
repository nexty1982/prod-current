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

// --- Force LIGHT theme globally (extends previous overrides) ---
try {
  // Neutralize prefers-color-scheme queries
  const _mm = window.matchMedia.bind(window);
  window.matchMedia = (q: string) => {
    const lq = (q||'').toLowerCase();
    if (lq.includes('prefers-color-scheme')) {
      // Always report "light"
      const matches = lq.includes('light');  // true only for ...: light
      const fake: MediaQueryList = Object.assign(Object.create(null), {
        media: q, matches,
        addEventListener: ()=>{}, removeEventListener: ()=>{},
        addListener: ()=>{}, removeListener: ()=>{}, onchange: null, dispatchEvent: ()=>false
      });
      return fake;
    }
    return _mm(q);
  };

  // Force common theme keys many UIs use
  const keys = ['theme','themeMode','paletteMode','mui-mode','colorScheme'];
  keys.forEach(k => { try { localStorage.setItem(k, 'light'); } catch {} });

  // Apply high-specificity light backgrounds/foregrounds
  const style = document.createElement('style');
  style.setAttribute('data-om-force-light','1');
  style.textContent = `
    :root { color-scheme: light; }
    html, body { background:#ffffff !important; color:#111 !important; }
    /* Common dark-mode containers from UI libs */
    .dark, [data-theme="dark"], [data-mui-color-scheme="dark"] { 
      background:#ffffff !important; color:#111 !important; 
    }
    .MuiPaper-root, .MuiCard-root { background-color:#ffffff !important; }
  `;
  document.head.appendChild(style);
} catch {}
