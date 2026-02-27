/**
 * OcrPipelineOverview — Static visual diagram of the OCR processing pipeline
 * Shows all stages with descriptions, always visible on upload page
 */

import React from 'react';
import {
  Box,
  Divider,
  Paper,
  Stack,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import {
  IconUpload,
  IconSettings,
  IconScan,
  IconTableColumn,
  IconShieldCheck,
  IconDatabase,
  IconRefresh,
} from '@tabler/icons-react';

// ---------------------------------------------------------------------------
// Pipeline stages config
// ---------------------------------------------------------------------------

interface StageConfig {
  icon: React.ElementType;
  title: string;
  bullets: string[];
}

const PIPELINE_STAGES: StageConfig[] = [
  {
    icon: IconUpload,
    title: 'IMAGE INTAKE',
    bullets: ['Church Upload', 'Archive Import', 'Email Ingestion'],
  },
  {
    icon: IconSettings,
    title: 'PREPROCESSING & PAGE ANALYSIS',
    bullets: ['Deskew', 'Noise Reduction', 'Segmentation'],
  },
  {
    icon: IconScan,
    title: 'OCR TEXT RECOGNITION',
    bullets: ['Google Vision', 'Bounding Boxes', 'Raw Text Artifacts'],
  },
  {
    icon: IconTableColumn,
    title: 'STRUCTURED FIELD EXTRACTION',
    bullets: ['Record Type Classification', 'Column Mapping', 'JSON Output'],
  },
  {
    icon: IconShieldCheck,
    title: 'CONFIDENCE VALIDATION',
    bullets: ['Scoring Engine', 'Auto-Approve or Manual', 'Review Queue'],
  },
  {
    icon: IconDatabase,
    title: 'TENANT DATABASE COMMIT',
    bullets: ['Insert into Baptism', 'Marriage', 'Funeral Tables'],
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const OcrPipelineOverview: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const iconBg = isDark ? alpha(theme.palette.primary.main, 0.12) : alpha(theme.palette.primary.main, 0.08);
  const iconColor = theme.palette.primary.main;
  const arrowColor = isDark ? theme.palette.grey[600] : theme.palette.grey[400];

  return (
    <Box sx={{ mb: 4 }}>
      {/* Pipeline stages */}
      <Stack
        direction="row"
        sx={{
          overflowX: 'auto',
          pb: 2,
          '&::-webkit-scrollbar': { height: 6 },
          '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 3 },
        }}
      >
        {PIPELINE_STAGES.map((stage, index) => {
          const Icon = stage.icon;
          const isLast = index === PIPELINE_STAGES.length - 1;

          return (
            <React.Fragment key={stage.title}>
              <Paper
                variant="outlined"
                sx={{
                  minWidth: 140,
                  maxWidth: 160,
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  borderRadius: 2,
                  bgcolor: isDark ? 'background.paper' : '#fff',
                  flexShrink: 0,
                }}
              >
                {/* Icon */}
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: iconBg,
                    mb: 1.5,
                  }}
                >
                  <Icon size={24} color={iconColor} />
                </Box>

                {/* Title */}
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.65rem',
                    letterSpacing: '0.02em',
                    lineHeight: 1.3,
                    mb: 1,
                    minHeight: 28,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {stage.title}
                </Typography>

                {/* Bullets */}
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    fontSize: '0.6rem',
                    lineHeight: 1.4,
                  }}
                >
                  {stage.bullets.join(' • ')}
                </Typography>
              </Paper>

              {/* Arrow */}
              {!isLast && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    px: 1,
                    color: arrowColor,
                    flexShrink: 0,
                  }}
                >
                  <Typography sx={{ fontSize: '1.2rem', fontWeight: 300 }}>→</Typography>
                </Box>
              )}
            </React.Fragment>
          );
        })}
      </Stack>

      {/* Feedback loop section */}
      <Box sx={{ position: 'relative', mt: 2 }}>
        {/* Decorative line */}
        <Divider sx={{ mb: 1.5 }}>
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(theme.palette.warning.main, 0.1),
              border: `2px solid ${alpha(theme.palette.warning.main, 0.3)}`,
            }}
          >
            <IconRefresh size={14} color={theme.palette.warning.main} />
          </Box>
        </Divider>

        {/* Feedback loop text */}
        <Box sx={{ textAlign: 'center' }}>
          <Typography
            variant="overline"
            sx={{
              fontWeight: 700,
              fontSize: '0.7rem',
              letterSpacing: '0.08em',
              color: 'text.secondary',
              mb: 0.5,
              display: 'block',
            }}
          >
            EXTRACTION INTELLIGENCE FEEDBACK LOOP
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontSize: '0.7rem' }}
          >
            Error Tracking • Reprocessing • Template Refinement • Threshold Calibration
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default OcrPipelineOverview;
