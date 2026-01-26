import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Grid,
  Chip,
  LinearProgress,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  Alert,
  Paper,
  Stack,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  School as SchoolIcon,
  PlayArrow as StartIcon,
  PlayCircleFilledWhite as ContinueIcon, // Use this as the continue icon
  Assessment as AssessmentIcon,
  TrendingUp as ProgressIcon,
  Group as GroupIcon,
  CheckCircle as CompletedIcon,
  Schedule as PendingIcon,
  Psychology as PsychologyIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface GradeGroup {
  id: string;
  name: string;
  ageRange: string;
  description: string;
  completed: number;
  total: number;
  status: 'not_started' | 'in_progress' | 'completed';
  lastAccessed?: Date;
}

interface SurveyProgress {
  gradeGroup: string;
  completed: number;
  total: number;
  percentage: number;
}

const OMLearnDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [selectedGradeGroup, setSelectedGradeGroup] = useState<string | null>(null);
  const [gradeGroups, setGradeGroups] = useState<GradeGroup[]>([
    {
      id: 'k-2',
      name: 'Kindergarten - 2nd Grade',
      ageRange: 'Ages 5-8',
      description: 'Basic reasoning and moral development concepts',
      completed: 0,
      total: 15,
      status: 'not_started'
    },
    {
      id: '3-5',
      name: '3rd - 5th Grade',
      ageRange: 'Ages 8-11',
      description: 'Intermediate reasoning patterns and ethical thinking',
      completed: 0,
      total: 20,
      status: 'not_started'
    },
    {
      id: '6-8',
      name: '6th - 8th Grade',
      ageRange: 'Ages 11-14',
      description: 'Advanced reasoning and complex moral scenarios',
      completed: 0,
      total: 25,
      status: 'not_started'
    },
    {
      id: '9-12',
      name: '9th - 12th Grade',
      ageRange: 'Ages 14-18',
      description: 'Sophisticated reasoning models and philosophical concepts',
      completed: 0,
      total: 30,
      status: 'not_started'
    }
  ]);

  const [overallProgress, setOverallProgress] = useState<SurveyProgress[]>([]);

  useEffect(() => {
    // Calculate overall progress
    const progress = gradeGroups.map(group => ({
      gradeGroup: group.name,
      completed: group.completed,
      total: group.total,
      percentage: group.total > 0 ? (group.completed / group.total) * 100 : 0
    }));
    setOverallProgress(progress);
  }, [gradeGroups]);

  const handleStartSurvey = (gradeGroupId: string) => {
    setSelectedGradeGroup(gradeGroupId);
    navigate(`/bigbook/omlearn/survey/${gradeGroupId}`);
  };

  const handleContinueSurvey = (gradeGroupId: string) => {
    setSelectedGradeGroup(gradeGroupId);
    navigate(`/bigbook/omlearn/survey/${gradeGroupId}`);
  };

  const getStatusIcon = (status: GradeGroup['status']) => {
    switch (status) {
      case 'completed':
        return <CompletedIcon color="success" />;
      case 'in_progress':
        return <PendingIcon color="warning" />;
      default:
        return <PendingIcon color="disabled" />;
    }
  };

  const getStatusChip = (status: GradeGroup['status']) => {
    switch (status) {
      case 'completed':
        return <Chip label="Completed" color="success" size="small" />;
      case 'in_progress':
        return <Chip label="In Progress" color="warning" size="small" />;
      default:
        return <Chip label="Not Started" color="default" size="small" />;
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'success';
    if (percentage >= 50) return 'warning';
    return 'primary';
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              <PsychologyIcon />
            </Avatar>
            <Box>
              <Typography variant="h4" component="h1" gutterBottom>
                OMLearn - Human Reasoning Models
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Capture, evaluate, and evolve human reasoning models and moral perspectives across age levels
              </Typography>
            </Box>
          </Box>
          
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              This module serves as the foundation for training OMAI to simulate human logic across age ranges. 
              Your responses will help build comprehensive reasoning benchmarks.
            </Typography>
          </Alert>
        </CardContent>
      </Card>

      {/* Overall Progress */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <ProgressIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Overall Progress
          </Typography>
          <Grid container spacing={2}>
            {overallProgress.map((progress, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {progress.gradeGroup}
                  </Typography>
                  <Typography variant="h4" color="primary" gutterBottom>
                    {Math.round(progress.percentage)}%
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={progress.percentage} 
                    color={getProgressColor(progress.percentage) as any}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    {progress.completed} of {progress.total} completed
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Grade Groups */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <GroupIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Grade Groups
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Select a grade group to begin or continue your reasoning assessment
          </Typography>
          
          <Grid container spacing={3}>
            {gradeGroups.map((group) => (
              <Grid item xs={12} md={6} key={group.id}>
                <Paper 
                  sx={{ 
                    p: 3, 
                    border: selectedGradeGroup === group.id ? 2 : 1,
                    borderColor: selectedGradeGroup === group.id ? 'primary.main' : 'divider',
                    '&:hover': {
                      borderColor: 'primary.main',
                      boxShadow: 2
                    }
                  }}
                >
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        {group.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {group.ageRange}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 2 }}>
                        {group.description}
                      </Typography>
                    </Box>
                    {getStatusIcon(group.status)}
                  </Box>

                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    {getStatusChip(group.status)}
                    <Typography variant="body2" color="text.secondary">
                      {group.completed} of {group.total} surveys
                    </Typography>
                  </Box>

                  <LinearProgress 
                    variant="determinate" 
                    value={group.total > 0 ? (group.completed / group.total) * 100 : 0}
                    color={getProgressColor(group.total > 0 ? (group.completed / group.total) * 100 : 0) as any}
                    sx={{ height: 6, borderRadius: 3, mb: 2 }}
                  />

                  <Stack direction="row" spacing={1}>
                    {group.status === 'not_started' && (
                      <Button
                        variant="contained"
                        startIcon={<StartIcon />}
                        onClick={() => handleStartSurvey(group.id)}
                        fullWidth
                      >
                        Start Survey
                      </Button>
                    )}
                    {group.status === 'in_progress' && (
                      <Button
                        variant="contained"
                        startIcon={<ContinueIcon />}
                        onClick={() => handleContinueSurvey(group.id)}
                        fullWidth
                      >
                        Continue Survey
                      </Button>
                    )}
                    {group.status === 'completed' && (
                      <Button
                        variant="outlined"
                        startIcon={<AssessmentIcon />}
                        onClick={() => handleStartSurvey(group.id)}
                        fullWidth
                      >
                        Review Results
                      </Button>
                    )}
                  </Stack>

                  {group.lastAccessed && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Last accessed: {group.lastAccessed.toLocaleDateString()}
                    </Typography>
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default OMLearnDashboard; 