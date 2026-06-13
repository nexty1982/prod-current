import React from 'react';
import OcrReviewPage from '../../pages/OcrReviewPage';

/** Functional OCR review workbench inside the new studio shell. */
export default function OcrStudioReviewDetailPage() {
  return (
    <div className="-m-5 h-[calc(100%+2.5rem)] overflow-hidden bg-white rounded-lg border border-slate-200">
      <OcrReviewPage />
    </div>
  );
}
