import React from 'react';
import { OcrStudioFunctionalEmbed } from '../components/OcrStudioFunctionalEmbed';
import RecordSettingsPage from '@/features/account/parish-management/RecordSettingsPage';

export default function OcrStudioRecordHeadersPage() {
  return (
    <OcrStudioFunctionalEmbed>
      <RecordSettingsPage embeddedInStudioShell />
    </OcrStudioFunctionalEmbed>
  );
}
