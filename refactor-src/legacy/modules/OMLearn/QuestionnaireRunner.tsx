import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  LinearProgress,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  TextField,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Alert,
  Chip,
  Stack,
  Divider,
  IconButton,
  Tooltip,
  Avatar
} from '@mui/material';
import {
  NavigateNext as NextIcon,
  NavigateBefore as PrevIcon,
  Save as SaveIcon,
  CheckCircle as CompleteIcon,
  Psychology as PsychologyIcon,
  Timer as TimerIcon,
  QuestionAnswer as QuestionIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useSurveyResults } from './SurveyResultsContext';

interface Question {
  id: string;
  text: string;
  type: 'multiple_choice' | 'text' | 'scale' | 'scenario';
  options?: string[];
  scale?: {
    min: number;
    max: number;
    labels: {
      min: string;
      max: string;
    };
  };
  required: boolean;
  reasoning?: string;
  category: string;
}

interface Survey {
  id: string;
  title: string;
  description: string;
  gradeGroup: string;
  questions: Question[];
  estimatedTime: number;
  categories: string[];
}

interface SurveyResponse {
  questionId: string;
  answer: string | number;
  reasoning?: string;
  timestamp: Date;
}

const QuestionnaireRunner: React.FC = () => {
  const { gradeGroupId } = useParams<{ gradeGroupId: string }>();
  const navigate = useNavigate();
  const { saveResponse, getResponses, clearResponses } = useSurveyResults();
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState<string>('');
  const [currentReasoning, setCurrentReasoning] = useState<string>('');
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReasoning, setShowReasoning] = useState(false);

  useEffect(() => {
    loadSurvey();
    loadExistingResponses();
  }, [gradeGroupId]);

  const loadSurvey = async () => {
    try {
      setLoading(true);
      // In a real implementation, this would load from the survey loader
      // For now, we'll create a sample survey
      const sampleSurvey: Survey = {
        id: `survey-${gradeGroupId}`,
        title: `${gradeGroupId.toUpperCase()} Reasoning Assessment`,
        description: `Comprehensive reasoning and moral development assessment for ${gradeGroupId} grade level`,
        gradeGroup: gradeGroupId!,
        estimatedTime: 15,
        categories: ['Moral Reasoning', 'Logical Thinking', 'Ethical Decision Making'],
        questions: [
          {
            id: 'q1',
            text: 'If you found a wallet with money in it, what would you do and why?',
            type: 'text',
            required: true,
            category: 'Moral Reasoning',
            reasoning: 'This question assesses basic moral reasoning and honesty principles.'
          },
          {
            id: 'q2',
            text: 'How important is it to tell the truth, even when it might hurt someone\'s feelings?',
            type: 'scale',
            required: true,
            category: 'Ethical Decision Making',
            scale: {
              min: 1,
              max: 5,
              labels: {
                min: 'Not important at all',
                max: 'Very important'
              }
            },
            reasoning: 'This measures the balance between honesty and compassion.'
          },
          {
            id: 'q3',
            text: 'What would you do if you saw someone being bullied at school?',
            type: 'multiple_choice',
            options: [
              'Walk away and ignore it',
              'Tell a teacher or adult',
              'Try to stop it yourself',
              'Join in with the bullying',
              'Other (please explain)'
            ],
            required: true,
            category: 'Moral Reasoning',
            reasoning: 'This assesses moral courage and intervention behavior.'
          },
          {
            id: 'q4',
            text: 'If you could change one rule at school, what would it be and why?',
            type: 'text',
            required: true,
            category: 'Logical Thinking',
            reasoning: 'This evaluates critical thinking about rules and their purposes.'
          },
          {
            id: 'q5',
            text: 'How do you decide what is right and wrong?',
            type: 'text',
            required: true,
            category: 'Ethical Decision Making',
            reasoning: 'This explores the foundation of moral reasoning.'
          }
        ]
      };
      
      setSurvey(sampleSurvey);
    } catch (err) {
      setError('Failed to load survey');
      console.error('Error loading survey:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadExistingResponses = () => {
    if (gradeGroupId) {
      const existing = getResponses(gradeGroupId);
      setResponses(existing);
      
      // Find the last answered question
      const lastAnsweredIndex = survey?.questions.findIndex(q => 
        existing.some(r => r.questionId === q.id)
      ) ?? -1;
      
      if (lastAnsweredIndex >= 0) {
        setCurrentQuestionIndex(lastAnsweredIndex + 1);
      }
    }
  };

  const handleAnswerChange = (value: string) => {
    setCurrentAnswer(value);
  };

  const handleReasoningChange = (value: string) => {
    setCurrentReasoning(value);
  };

  const handleNext = () => {
    if (survey && currentAnswer.trim()) {
      const currentQuestion = survey.questions[currentQuestionIndex];
      const response: SurveyResponse = {
        questionId: currentQuestion.id,
        answer: currentAnswer,
        reasoning: currentReasoning,
        timestamp: new Date()
      };

      const newResponses = [...responses, response];
      setResponses(newResponses);
      saveResponse(gradeGroupId!, response);

      if (currentQuestionIndex < survey.questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setCurrentAnswer('');
        setCurrentReasoning('');
        setShowReasoning(false);
      } else {
        // Survey completed
        navigate(`/bigbook/omlearn/results/${gradeGroupId}`);
      }
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      const previousQuestion = survey?.questions[currentQuestionIndex - 1];
      const previousResponse = responses.find(r => r.questionId === previousQuestion?.id);
      
      if (previousResponse) {
        setCurrentAnswer(previousResponse.answer.toString());
        setCurrentReasoning(previousResponse.reasoning || '');
      } else {
        setCurrentAnswer('');
        setCurrentReasoning('');
      }
      setShowReasoning(false);
    }
  };

  const handleSaveProgress = () => {
    if (survey && currentAnswer.trim()) {
      const currentQuestion = survey.questions[currentQuestionIndex];
      const response: SurveyResponse = {
        questionId: currentQuestion.id,
        answer: currentAnswer,
        reasoning: currentReasoning,
        timestamp: new Date()
      };
      saveResponse(gradeGroupId!, response);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6">Loading survey...</Typography>
        <LinearProgress sx={{ mt: 2 }} />
      </Box>
    );
  }

  if (error || !survey) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          {error || 'Failed to load survey'}
        </Alert>
        <Button 
          variant="contained" 
          onClick={() => navigate('/bigbook/omlearn')}
          sx={{ mt: 2 }}
        >
          Back to Dashboard
        </Button>
      </Box>
    );
  }

  const currentQuestion = survey.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / survey.questions.length) * 100;
  const answeredQuestions = responses.length;

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      {/* Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              <PsychologyIcon />
            </Avatar>
            <Box flex={1}>
              <Typography variant="h5" gutterBottom>
                {survey.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {survey.description}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Chip 
                icon={<TimerIcon />} 
                label={`${survey.estimatedTime} min`} 
                size="small" 
              />
              <Chip 
                icon={<QuestionIcon />} 
                label={`${answeredQuestions}/${survey.questions.length}`} 
                size="small" 
                color="primary"
              />
            </Stack>
          </Box>

          {/* Progress */}
          <Box sx={{ mb: 2 }}>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body2" color="text.secondary">
                Progress
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {Math.round(progress)}%
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={progress} 
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>

          {/* Stepper */}
          <Stepper activeStep={currentQuestionIndex} alternativeLabel>
            {survey.questions.map((question, index) => (
              <Step key={question.id}>
                <StepLabel>
                  {responses.find(r => r.questionId === question.id) ? (
                    <CompleteIcon color="success" fontSize="small" />
                  ) : (
                    index + 1
                  )}
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>

      {/* Question */}
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
            <Box flex={1}>
              <Typography variant="h6" gutterBottom>
                Question {currentQuestionIndex + 1} of {survey.questions.length}
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {currentQuestion.text}
              </Typography>
              <Chip 
                label={currentQuestion.category} 
                size="small" 
                color="secondary" 
                sx={{ mb: 2 }}
              />
            </Box>
            <Tooltip title="Show reasoning prompt">
              <IconButton 
                onClick={() => setShowReasoning(!showReasoning)}
                color={showReasoning ? 'primary' : 'default'}
              >
                <PsychologyIcon />
              </IconButton>
            </Tooltip>
          </Box>

          {showReasoning && currentQuestion.reasoning && (
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Reasoning Focus:</strong> {currentQuestion.reasoning}
              </Typography>
            </Alert>
          )}

          {/* Answer Input */}
          <Box sx={{ mb: 3 }}>
            {currentQuestion.type === 'multiple_choice' && (
              <FormControl component="fieldset" fullWidth>
                <FormLabel component="legend">Select your answer:</FormLabel>
                <RadioGroup
                  value={currentAnswer}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                >
                  {currentQuestion.options?.map((option, index) => (
                    <FormControlLabel
                      key={index}
                      value={option}
                      control={<Radio />}
                      label={option}
                    />
                  ))}
                </RadioGroup>
              </FormControl>
            )}

            {currentQuestion.type === 'scale' && (
              <FormControl component="fieldset" fullWidth>
                <FormLabel component="legend">Rate your response:</FormLabel>
                <RadioGroup
                  value={currentAnswer}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  row
                >
                  {Array.from({ length: currentQuestion.scale!.max }, (_, i) => i + 1).map((value) => (
                    <FormControlLabel
                      key={value}
                      value={value.toString()}
                      control={<Radio />}
                      label={value}
                    />
                  ))}
                </RadioGroup>
                <Box display="flex" justifyContent="space-between" mt={1}>
                  <Typography variant="caption" color="text.secondary">
                    {currentQuestion.scale!.labels.min}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {currentQuestion.scale!.labels.max}
                  </Typography>
                </Box>
              </FormControl>
            )}

            {currentQuestion.type === 'text' && (
              <TextField
                fullWidth
                multiline
                rows={4}
                variant="outlined"
                placeholder="Type your answer here..."
                value={currentAnswer}
                onChange={(e) => handleAnswerChange(e.target.value)}
              />
            )}
          </Box>

          {/* Optional Reasoning */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Additional Reasoning (Optional)
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              variant="outlined"
              placeholder="Explain your reasoning or thought process..."
              value={currentReasoning}
              onChange={(e) => handleReasoningChange(e.target.value)}
            />
          </Box>

          {/* Navigation */}
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Button
              variant="outlined"
              startIcon={<PrevIcon />}
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
            >
              Previous
            </Button>

            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={<SaveIcon />}
                onClick={handleSaveProgress}
                disabled={!currentAnswer.trim()}
              >
                Save Progress
              </Button>
              
              <Button
                variant="contained"
                endIcon={currentQuestionIndex === survey.questions.length - 1 ? <CompleteIcon /> : <NextIcon />}
                onClick={handleNext}
                disabled={!currentAnswer.trim()}
              >
                {currentQuestionIndex === survey.questions.length - 1 ? 'Complete' : 'Next'}
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default QuestionnaireRunner; 