// Thumbnail generation utility for multilingual pages
export const generateThumbnail = (
  title: string,
  language: string,
  flag: string,
  languageCode: string
): string => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    return generateSVGThumbnail(title, language, flag, languageCode);
  }

  // Set canvas dimensions
  canvas.width = 400;
  canvas.height = 300;

  // Draw gradient background
  const gradient = ctx.createLinearGradient(0, 0, 400, 300);
  gradient.addColorStop(0, '#4169E1');
  gradient.addColorStop(1, '#DAA520');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 400, 300);

  // Draw Orthodox cross
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 3;
  ctx.beginPath();
  // Vertical line
  ctx.moveTo(200, 80);
  ctx.lineTo(200, 200);
  // Horizontal line
  ctx.moveTo(160, 120);
  ctx.lineTo(240, 120);
  // Small horizontal line (Orthodox cross)
  ctx.moveTo(170, 140);
  ctx.lineTo(230, 140);
  ctx.stroke();

  // Draw title
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('OrthodMetrics', 200, 40);

  // Draw language-specific title
  ctx.font = '14px Arial';
  ctx.fillText(title.substring(0, 40), 200, 250);

  // Draw flag
  ctx.font = '24px Arial';
  ctx.fillText(flag, 50, 50);

  // Draw language code
  ctx.fillStyle = '#DAA520';
  ctx.font = 'bold 12px Arial';
  ctx.fillText(languageCode, 350, 50);

  return canvas.toDataURL();
};

export const generateSVGThumbnail = (
  title: string,
  language: string,
  flag: string,
  languageCode: string
): string => {
  const svg = `
    <svg width="400" height="300" viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#4169E1;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#DAA520;stop-opacity:1" />
        </linearGradient>
      </defs>
      
      <!-- Background -->
      <rect width="400" height="300" fill="url(#grad)"/>
      
      <!-- Orthodox Cross -->
      <g stroke="#FFFFFF" stroke-width="3" fill="none">
        <!-- Vertical line -->
        <line x1="200" y1="80" x2="200" y2="200"/>
        <!-- Horizontal line -->
        <line x1="160" y1="120" x2="240" y2="120"/>
        <!-- Small horizontal line -->
        <line x1="170" y1="140" x2="230" y2="140"/>
      </g>
      
      <!-- Title -->
      <text x="200" y="40" fill="#FFFFFF" font-size="18" font-weight="bold" text-anchor="middle" font-family="Arial">
        OrthodMetrics
      </text>
      
      <!-- Flag -->
      <text x="50" y="50" fill="#FFFFFF" font-size="24" font-family="Arial">
        ${flag}
      </text>
      
      <!-- Language Code -->
      <text x="350" y="50" fill="#DAA520" font-size="12" font-weight="bold" text-anchor="middle" font-family="Arial">
        ${languageCode}
      </text>
      
      <!-- Page Title -->
      <text x="200" y="250" fill="#FFFFFF" font-size="14" text-anchor="middle" font-family="Arial">
        ${title.length > 40 ? title.substring(0, 37) + '...' : title}
      </text>
      
      <!-- Decorative elements -->
      <circle cx="100" cy="100" r="8" fill="#DAA520" opacity="0.6"/>
      <circle cx="120" cy="80" r="5" fill="#DAA520" opacity="0.4"/>
      <circle cx="280" cy="120" r="10" fill="#DAA520" opacity="0.7"/>
      <circle cx="300" cy="140" r="6" fill="#DAA520" opacity="0.5"/>
      <circle cx="160" cy="80" r="4" fill="#DAA520" opacity="0.6"/>
      <circle cx="240" cy="160" r="7" fill="#DAA520" opacity="0.5"/>
      
      <!-- Content placeholder -->
      <rect x="30" y="200" width="340" height="30" fill="#FFFFFF" opacity="0.3" rx="5"/>
      <rect x="50" y="210" width="300" height="10" fill="#FFFFFF" opacity="0.2" rx="5"/>
    </svg>
  `;
  
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};
