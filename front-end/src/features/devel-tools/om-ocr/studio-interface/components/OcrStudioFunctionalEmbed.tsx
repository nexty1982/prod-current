import React from 'react';

/** Wraps legacy MUI OCR pages inside the Figma studio shell without duplicate nav chrome. */
export function OcrStudioFunctionalEmbed({ children }: { children: React.ReactNode }) {
  return (
    <div className="ocr-studio-functional-embed -mx-1">
      {children}
    </div>
  );
}
