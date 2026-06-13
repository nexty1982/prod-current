import React from 'react';
import { OcrStudioFunctionalEmbed } from '../components/OcrStudioFunctionalEmbed';
import OcrTableExtractorPage from '../../pages/OcrTableExtractorPage';

export default function OcrStudioTableExtractorPage() {
  return (
    <OcrStudioFunctionalEmbed>
      <OcrTableExtractorPage embeddedInStudioShell />
    </OcrStudioFunctionalEmbed>
  );
}
