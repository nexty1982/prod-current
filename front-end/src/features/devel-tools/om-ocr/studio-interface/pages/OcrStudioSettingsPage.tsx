import React from 'react';
import { OcrStudioFunctionalEmbed } from '../components/OcrStudioFunctionalEmbed';
import { OcrStudioSettingsPanel } from '../../pages/OCRSettingsPage';

export default function OcrStudioSettingsPage() {
  return (
    <OcrStudioFunctionalEmbed>
      <OcrStudioSettingsPanel />
    </OcrStudioFunctionalEmbed>
  );
}
