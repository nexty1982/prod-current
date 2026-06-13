import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import './ocr-studio-shell.css';
import { OcrStudioPathProvider, useOcrStudioPaths } from './OcrStudioPathContext';
import type { OcrStudioBase } from './ocrStudioPaths';
import { ocrStudioScreenFromPath } from './ocrStudioPaths';
import OcrStudioSidebar from './OcrStudioSidebar';
import OcrStudioTopBar from './OcrStudioTopBar';

export function OcrStudioLayout({ mode = 'devel' }: { mode?: OcrStudioBase }) {
  return (
    <OcrStudioPathProvider mode={mode}>
      <OcrStudioLayoutInner />
    </OcrStudioPathProvider>
  );
}

function OcrStudioLayoutInner() {
  const { pathname } = useLocation();
  const { basePath } = useOcrStudioPaths();
  const screen = ocrStudioScreenFromPath(pathname, basePath);
  const fullBleed = screen === 'review-detail' || screen === 'layout-templates';

  return (
    <div className="ocr-studio-shell flex h-[calc(100vh-64px)] min-h-[640px] w-full overflow-hidden -mx-4 -my-3 md:-mx-6">
      <OcrStudioSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <OcrStudioTopBar />
        <main className={`flex-1 overflow-auto p-5 ${fullBleed ? 'overflow-hidden' : ''}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default OcrStudioLayout;
