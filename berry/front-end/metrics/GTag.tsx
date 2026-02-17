declare global {
  interface Window {
    dataLayer: any[];
  }
}

function loadGTag(gaId: string): void {
  if (!gaId) {
    console.warn('Google Analytics ID is missing.');
    return;
  }

  // Check if the script already exists
  if (document.getElementById('gtag-script')) return;

  // Add the Google Analytics script
  const script = document.createElement('script');
  script.id = 'gtag-script';
  script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
  script.async = true;
  document.head.appendChild(script);

  // Initialize Google Analytics
  script.onload = () => {
    (window as any).dataLayer = (window as any).dataLayer || [];
    function gtag(...args: any[]) {
      (window as any).dataLayer.push(args);
    }
    gtag('js', new Date());
    gtag('config', gaId);
  };
}

export default function GTag({ gaId }: { gaId: string }) {
  // Call the utility function directly
  loadGTag(gaId);

  return null; // No visible UI for this component
}
