/**
 * Parish workflow goals — next actions from app_workflow catalog + live runtime.
 * GET /api/workflow-goals?church_id=
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Chip, CircularProgress, Paper, Stack, Typography, alpha, useTheme,
} from '@mui/material';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import apiClient from '@/api/utils/axiosInstance';

interface WorkflowGoal {
  workflow_key: string;
  title: string;
  summary: string;
  action_route: string | null;
  action_label: string | null;
  workflow?: {
    current_step?: { step_name?: string };
  };
}

interface GoalsResponse {
  success: boolean;
  goals: WorkflowGoal[];
}

interface WorkflowGoalStripProps {
  churchId: number | null | undefined;
}

const WorkflowGoalStrip: React.FC<WorkflowGoalStripProps> = ({ churchId }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isDark = theme.palette.mode === 'dark';
  const [goals, setGoals] = useState<WorkflowGoal[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!churchId) return;
    let cancelled = false;
    setLoading(true);
    apiClient
      .get<GoalsResponse>(`/workflow-goals?church_id=${churchId}`)
      .then((res) => {
        if (!cancelled) setGoals(res.goals || []);
      })
      .catch(() => {
        if (!cancelled) setGoals([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [churchId]);

  if (!churchId || loading) {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2, mb: 3 }}>
          <CircularProgress size={22} />
        </Box>
      );
    }
    return null;
  }

  if (!goals.length) return null;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2.5,
        mb: 3,
        borderRadius: 2,
        borderColor: isDark ? 'rgba(212,175,55,0.25)' : 'rgba(45,27,78,0.15)',
        bgcolor: isDark ? 'rgba(212,175,55,0.06)' : 'rgba(45,27,78,0.04)',
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
        <FlagOutlinedIcon sx={{ fontSize: 18, color: isDark ? '#d4af37' : '#2d1b4e' }} />
        <Typography
          sx={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.875rem',
            fontWeight: 600,
            color: isDark ? '#f3f4f6' : '#111827',
          }}
        >
          Next steps
        </Typography>
        <Chip
          label={`${goals.length} open`}
          size="small"
          sx={{ height: 20, fontSize: '0.65rem', ml: 'auto !important' }}
        />
      </Stack>

      <Stack spacing={1.25}>
        {goals.map((goal) => (
          <Box
            key={`${goal.workflow_key}-${goal.summary}`}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              p: 1.5,
              borderRadius: 1.5,
              bgcolor: isDark ? alpha('#fff', 0.03) : '#fff',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: isDark ? '#f3f4f6' : '#111827',
                }}
              >
                {goal.title}
              </Typography>
              <Typography
                sx={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.75rem',
                  color: isDark ? '#9ca3af' : '#6b7280',
                }}
              >
                {goal.workflow?.current_step?.step_name || goal.summary}
              </Typography>
            </Box>
            {goal.action_route && (
              <Button
                size="small"
                variant="contained"
                endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
                onClick={() => navigate(goal.action_route!)}
                sx={{
                  textTransform: 'none',
                  fontSize: '0.75rem',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  bgcolor: isDark ? '#d4af37' : '#2d1b4e',
                  '&:hover': { bgcolor: isDark ? '#c9a430' : '#1f1235' },
                }}
              >
                {goal.action_label || 'Continue'}
              </Button>
            )}
          </Box>
        ))}
      </Stack>
    </Paper>
  );
};

export default WorkflowGoalStrip;
