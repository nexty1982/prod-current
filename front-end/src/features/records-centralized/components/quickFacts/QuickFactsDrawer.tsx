/**
 * Quick Facts Drawer Component
 * Displays computed quick facts in a right-side drawer
 */

import React from 'react';
import {
  Drawer,
  Box,
  Typography,
  Divider,
  CircularProgress,
  Stack,
  Tooltip,
  Paper,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import IconButton from '@mui/material/IconButton';
import { QuickFactsResult } from './types';

export interface QuickFactsDrawerProps {
  open: boolean;
  onClose: () => void;
  facts: QuickFactsResult | null;
  loading?: boolean;
  recordType?: 'baptism' | 'marriage' | 'funeral';
}

export const QuickFactsDrawer: React.FC<QuickFactsDrawerProps> = ({
  open,
  onClose,
  facts,
  loading = false,
  recordType,
}) => {
  const drawerWidth = 400;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          maxWidth: '90vw',
        },
      }}
    >
      <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
            Quick Facts
            {recordType && (
              <Typography component="span" variant="body2" sx={{ ml: 1, color: 'text.secondary', textTransform: 'capitalize' }}>
                ({recordType})
              </Typography>
            )}
          </Typography>
          <IconButton onClick={onClose} size="small" sx={{ ml: 2 }}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Content */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
            <CircularProgress />
          </Box>
        ) : facts?.isEmpty ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              No records available to compute facts.
            </Typography>
          </Box>
        ) : facts?.sections && facts.sections.length > 0 ? (
          <Stack spacing={3}>
            {facts.sections.map((section, sectionIndex) => (
              <Box key={sectionIndex}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 600,
                    mb: 1.5,
                    color: 'text.primary',
                    textTransform: 'uppercase',
                    fontSize: '0.75rem',
                    letterSpacing: '0.5px',
                  }}
                >
                  {section.title}
                </Typography>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    bgcolor: 'background.paper',
                  }}
                >
                  <Stack spacing={1.5}>
                    {section.facts.map((fact, factIndex) => {
                      const content = (
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            py: 0.5,
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              color: 'text.secondary',
                              flex: 1,
                            }}
                          >
                            {fact.label}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: fact.highlight ? 600 : 400,
                              color: fact.highlight ? 'primary.main' : 'text.primary',
                              ml: 2,
                              textAlign: 'right',
                            }}
                          >
                            {typeof fact.value === 'number' ? fact.value.toLocaleString() : fact.value}
                          </Typography>
                        </Box>
                      );

                      if (fact.tooltip) {
                        return (
                          <Tooltip key={factIndex} title={fact.tooltip} arrow placement="left">
                            {content}
                          </Tooltip>
                        );
                      }

                      return <React.Fragment key={factIndex}>{content}</React.Fragment>;
                    })}
                  </Stack>
                </Paper>
              </Box>
            ))}
          </Stack>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              Unable to compute facts.
            </Typography>
          </Box>
        )}
      </Box>
    </Drawer>
  );
};
