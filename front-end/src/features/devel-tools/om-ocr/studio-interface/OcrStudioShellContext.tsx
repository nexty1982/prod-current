import React, { createContext, useContext } from 'react';

const OcrStudioShellContext = createContext(false);

export function OcrStudioShellProvider({ children }: { children: React.ReactNode }) {
  return (
    <OcrStudioShellContext.Provider value={true}>
      {children}
    </OcrStudioShellContext.Provider>
  );
}

/** True when rendered inside the native OM OCR Studio layout (nav provided by shell). */
export function useInOcrStudioShell(): boolean {
  return useContext(OcrStudioShellContext);
}
