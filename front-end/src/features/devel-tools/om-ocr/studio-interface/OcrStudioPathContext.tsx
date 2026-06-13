import React, { createContext, useContext, useMemo } from 'react';
import type { OcrStudioBase } from './ocrStudioPaths';
import { ocrStudioBasePath, ocrStudioReviewPath, ocrStudioScreenPath } from './ocrStudioPaths';
import type { OcrStudioScreen } from './ocrStudioPaths';

type Ctx = {
  mode: OcrStudioBase;
  basePath: string;
  toScreen: (screen: OcrStudioScreen) => string;
  toReview: (churchId: number, jobId?: number) => string;
};

const OcrStudioPathContext = createContext<Ctx | null>(null);

export function OcrStudioPathProvider({
  mode,
  children,
}: {
  mode: OcrStudioBase;
  children: React.ReactNode;
}) {
  const value = useMemo<Ctx>(() => ({
    mode,
    basePath: ocrStudioBasePath(mode),
    toScreen: (screen) => ocrStudioScreenPath(mode, screen),
    toReview: (churchId, jobId) => ocrStudioReviewPath(mode, churchId, jobId),
  }), [mode]);

  return (
    <OcrStudioPathContext.Provider value={value}>
      {children}
    </OcrStudioPathContext.Provider>
  );
}

export function useOcrStudioPaths(): Ctx {
  const ctx = useContext(OcrStudioPathContext);
  if (!ctx) throw new Error('useOcrStudioPaths must be used within OcrStudioPathProvider');
  return ctx;
}

export function useOptionalOcrStudioPaths(): Ctx | null {
  return useContext(OcrStudioPathContext);
}
