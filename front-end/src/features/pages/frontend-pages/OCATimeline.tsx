/**
 * OCATimeline Component
 * 
 * OCA (Orthodox Church in America) Timeline page for OrthodoxMetrics.
 * Displays a timeline of historical events and milestones.
 * 
 * Route: /frontend-pages/oca-timeline
 */

import React from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
} from '@mui/lab';
import {
  History as HistoryIcon,
  Church as ChurchIcon,
} from '@mui/icons-material';

interface TimelineEvent {
  year: string;
  title: string;
  description: string;
}

const OCATimeline: React.FC = () => {
  const timelineEvents: TimelineEvent[] = [
    {
      year: '1794',
      title: 'First Orthodox Missionaries',
      description: 'Russian Orthodox missionaries arrive in Alaska, establishing the first Orthodox presence in North America.',
    },
    {
      year: '1870',
      title: 'Diocese of the Aleutian Islands',
      description: 'Formation of the Diocese of the Aleutian Islands and North America.',
    },
    {
      year: '1905',
      title: 'Archdiocese Established',
      description: 'Elevation to Archdiocese of the Aleutian Islands and North America.',
    },
    {
      year: '1970',
      title: 'Autocephaly Granted',
      description: 'The Orthodox Church in America receives autocephaly (independence) from the Russian Orthodox Church.',
    },
    {
      year: '2000',
      title: 'Modern Era',
      description: 'Continued growth and development of the Orthodox Church in America across North America.',
    },
  ];

  return (
    <Box sx={{ py: 8 }}>
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <HistoryIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
          <Typography variant="h3" gutterBottom>
            OCA Timeline
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Historical milestones of the Orthodox Church in America
          </Typography>
        </Box>

        <Timeline position="alternate">
          {timelineEvents.map((event, index) => (
            <TimelineItem key={index}>
              <TimelineSeparator>
                <TimelineDot color="primary" variant="outlined">
                  <ChurchIcon />
                </TimelineDot>
                {index < timelineEvents.length - 1 && <TimelineConnector />}
              </TimelineSeparator>
              <TimelineContent>
                <Paper
                  elevation={3}
                  sx={{
                    p: 3,
                    maxWidth: 400,
                    mx: 'auto',
                    '&:hover': {
                      boxShadow: 6,
                    },
                  }}
                >
                  <Typography
                    variant="h6"
                    component="span"
                    sx={{
                      fontWeight: 'bold',
                      color: 'primary.main',
                      display: 'block',
                      mb: 1,
                    }}
                  >
                    {event.year}
                  </Typography>
                  <Typography variant="h6" gutterBottom>
                    {event.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {event.description}
                  </Typography>
                </Paper>
              </TimelineContent>
            </TimelineItem>
          ))}
        </Timeline>
      </Container>
    </Box>
  );
};

export default OCATimeline;
