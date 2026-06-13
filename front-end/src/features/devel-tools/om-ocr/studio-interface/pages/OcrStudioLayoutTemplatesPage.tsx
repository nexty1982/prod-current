import React from 'react';
import { OcrStudioFunctionalEmbed } from '../components/OcrStudioFunctionalEmbed';
import LayoutTemplateEditorPage from '../../pages/LayoutTemplateEditorPage';

export default function OcrStudioLayoutTemplatesPage() {
  return (
    <OcrStudioFunctionalEmbed>
      <LayoutTemplateEditorPage embeddedInStudioShell />
    </OcrStudioFunctionalEmbed>
  );
}
