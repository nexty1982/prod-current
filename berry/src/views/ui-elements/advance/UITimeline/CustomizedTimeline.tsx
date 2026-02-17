// material-ui
import { useTheme } from '@mui/material/styles';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent
} from '@mui/lab';

// project imports
import { ThemeMode } from 'config';

// assets
import FastfoodIcon from '@mui/icons-material/FastfoodTwoTone';
import LaptopMacIcon from '@mui/icons-material/LaptopMacTwoTone';
import HotelIcon from '@mui/icons-material/HotelTwoTone';
import RepeatIcon from '@mui/icons-material/RepeatTwoTone';

// ==============================|| UI TIMELINE - CUSTOMIZED ||============================== //

export default function CustomizedTimeline() {
  const theme = useTheme();
  const paper = {
    p: 2.5,
    boxShadow: 'none',
    bgcolor: theme.palette.mode === ThemeMode.DARK ? 'dark.main' : 'primary.light',
    border: '1px dashed',
    borderColor: theme.palette.mode === ThemeMode.DARK ? 'dark.dark' : 'primary.dark'
  };

  return (
    <Timeline position="alternate">
      <TimelineItem>
        <TimelineOppositeContent>
          <Typography variant="body2" color="textSecondary">
            9:30 am
          </Typography>
        </TimelineOppositeContent>
        <TimelineSeparator>
          <TimelineDot color="secondary">
            <FastfoodIcon sx={{ color: '#fff' }} />
          </TimelineDot>
          <TimelineConnector />
        </TimelineSeparator>
        <TimelineContent>
          <Paper elevation={3} sx={paper}>
            <Typography variant="h5" component="h1">
              Eat
            </Typography>
            <Typography>Because you need strength</Typography>
          </Paper>
        </TimelineContent>
      </TimelineItem>
      <TimelineItem>
        <TimelineOppositeContent>
          <Typography variant="body2" color="textSecondary">
            10:00 am
          </Typography>
        </TimelineOppositeContent>
        <TimelineSeparator>
          <TimelineDot color="primary">
            <LaptopMacIcon />
          </TimelineDot>
          <TimelineConnector />
        </TimelineSeparator>
        <TimelineContent>
          <Paper elevation={3} sx={paper}>
            <Typography variant="h5" component="h1">
              Code
            </Typography>
            <Typography>Because it&apos;s awesome!</Typography>
          </Paper>
        </TimelineContent>
      </TimelineItem>
      <TimelineItem>
        <TimelineSeparator>
          <TimelineDot color="secondary">
            <HotelIcon />
          </TimelineDot>
          <TimelineConnector />
        </TimelineSeparator>
        <TimelineContent>
          <Paper elevation={3} sx={paper}>
            <Typography variant="h5" component="h1">
              Sleep
            </Typography>
            <Typography>Because you need rest</Typography>
          </Paper>
        </TimelineContent>
      </TimelineItem>
      <TimelineItem>
        <TimelineSeparator>
          <TimelineDot color="primary">
            <RepeatIcon />
          </TimelineDot>
        </TimelineSeparator>
        <TimelineContent>
          <Paper elevation={3} sx={paper}>
            <Typography variant="h5" component="h1">
              Repeat
            </Typography>
            <Typography>Because this is the life you love!</Typography>
          </Paper>
        </TimelineContent>
      </TimelineItem>
    </Timeline>
  );
}
