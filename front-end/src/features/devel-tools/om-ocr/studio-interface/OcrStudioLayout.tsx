import React from 'react';
import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import OcrChurchSelector from '../components/OcrChurchSelector';
import OcrStudioNav from '../components/OcrStudioNav';
import { OcrStudioPathProvider } from './OcrStudioPathContext';
import type { OcrStudioBase } from './ocrStudioPaths';
import { OcrStudioShellProvider } from './OcrStudioShellContext';

/**
 * Native OM OCR Studio shell — uses the app theme and shared OcrStudioNav,
 * not the standalone Figma sidebar/topbar frame.
 */
export function OcrStudioLayout({ mode = 'devel' }: { mode?: OcrStudioBase }) {
  return (
    <OcrStudioPathProvider mode={mode}>
      <OcrStudioShellProvider>
        <Box
          sx={{
            width: '100%',
            maxWidth: '100%',
            py: { xs: 1.5, sm: 2 },
            px: { xs: 1.5, sm: 2, md: 3 },
          }}
        >
          <OcrStudioNav />
          <OcrChurchSelector />
          <Outlet />
        </Box>
      </OcrStudioShellProvider>
    </OcrStudioPathProvider>
  );
}

export default OcrStudioLayout;
