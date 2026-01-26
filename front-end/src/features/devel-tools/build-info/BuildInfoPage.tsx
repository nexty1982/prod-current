/**
 * Build Info Page
 * Displays build version information for cache-busting verification
 */

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Paper,
  Chip,
  Stack,
  Divider,
} from '@mui/material';
import {
  IconGitBranch,
  IconCalendar,
  IconCode,
  IconInfoCircle,
} from '@tabler/icons-react';
import { getBuildInfo, getBuildVersionString } from '@/shared/lib/buildInfo';

const BuildInfoPage: React.FC = () => {
  const buildInfo = getBuildInfo();

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        Build Information
      </Typography>

      <Card>
        <CardContent>
          <Stack spacing={3}>
            <Box>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconInfoCircle size={20} />
                Version Information
              </Typography>
              <Divider sx={{ my: 2 }} />
              
              <Stack spacing={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Full Version String
                  </Typography>
                  <Chip 
                    label={getBuildVersionString()} 
                    color="primary" 
                    sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
                  />
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Git SHA
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <IconGitBranch size={16} />
                    <Chip 
                      label={buildInfo.gitSha} 
                      variant="outlined"
                      sx={{ fontFamily: 'monospace' }}
                    />
                  </Stack>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Build Time
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <IconCalendar size={16} />
                    <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                      {new Date(buildInfo.buildTime).toLocaleString()}
                    </Typography>
                  </Stack>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Package Version
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <IconCode size={16} />
                    <Chip 
                      label={buildInfo.version} 
                      variant="outlined"
                    />
                  </Stack>
                </Box>
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography variant="h6" gutterBottom>
                Cache Verification
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                This page helps verify that the latest build is being served. 
                After a deployment, check that the Git SHA and Build Time match the latest commit.
              </Typography>
              
              <Paper 
                variant="outlined" 
                sx={{ 
                  p: 2, 
                  mt: 2, 
                  bgcolor: 'background.default',
                  fontFamily: 'monospace',
                  fontSize: '0.875rem'
                }}
              >
                <pre style={{ margin: 0 }}>
                  {JSON.stringify(buildInfo, null, 2)}
                </pre>
              </Paper>
            </Box>

            <Divider />

            <Box>
              <Typography variant="body2" color="text.secondary">
                <strong>Note:</strong> If you see old build information after a deployment, 
                clear your browser cache or perform a hard refresh (Ctrl+Shift+R / Cmd+Shift+R).
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default BuildInfoPage;
