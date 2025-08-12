/**
 * @type questionnaire
 * @title Grade 6–8 Personality & Thought Process Assessment
 * @description A comprehensive questionnaire designed to understand personality traits and cognitive patterns in middle school students
 * @ageGroup 6-8
 * @version 1.0
 * @author OMAI Research Team
 * @estimatedDuration 15
 */

import React, { useState } from 'react';

const Questionnaire = ({ onResponse }) => {
  const [responses, setResponses] = useState({});

  const handleResponseChange = (questionId, answer) => {
    const newResponses = { ...responses, [questionId]: answer };
    setResponses(newResponses);
    onResponse(questionId, answer);
  };

  const questions = [
    {
      id: 'personality_1',
      type: 'radio',
      question: 'When working on a group project, I usually:',
      options: [
        'Take charge and organize everyone',
        'Work quietly on my assigned part',
        'Come up with creative ideas',
        'Help resolve conflicts between group members'
      ]
    },
    {
      id: 'personality_2',
      type: 'slider',
      question: 'How comfortable are you speaking in front of the class?',
      min: 1,
      max: 5,
      labels: ['Very uncomfortable', 'Very comfortable']
    },
    {
      id: 'thinking_1',
      type: 'radio',
      question: 'When solving a difficult math problem, I prefer to:',
      options: [
        'Work through it step by step',
        'Look for patterns or shortcuts',
        'Draw pictures or diagrams',
        'Ask for help from others'
      ]
    },
    {
      id: 'social_1',
      type: 'checkbox',
      question: 'Which activities do you enjoy most? (Select all that apply)',
      options: [
        'Reading books',
        'Playing sports',
        'Creating art or music',
        'Playing video games',
        'Hanging out with friends',
        'Learning new things'
      ]
    },
    {
      id: 'motivation_1',
      type: 'textarea',
      question: 'Describe a time when you felt really proud of something you accomplished. What made it special?',
      placeholder: 'Share your experience...'
    }
  ];

  const renderQuestion = (question) => {
    switch (question.type) {
      case 'radio':
        return (
          <FormControl component="fieldset" fullWidth>
            <FormLabel component="legend">{question.question}</FormLabel>
            <RadioGroup
              value={responses[question.id] || ''}
              onChange={(e) => handleResponseChange(question.id, e.target.value)}
            >
              {question.options.map((option, index) => (
                <FormControlLabel
                  key={index}
                  value={option}
                  control={<Radio />}
                  label={option}
                />
              ))}
            </RadioGroup>
          </FormControl>
        );

      case 'slider':
        return (
          <Box>
            <Typography gutterBottom>{question.question}</Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography variant="caption">{question.labels[0]}</Typography>
              <Slider
                value={responses[question.id] || question.min}
                min={question.min}
                max={question.max}
                step={1}
                marks
                onChange={(e, value) => handleResponseChange(question.id, value)}
                sx={{ flex: 1 }}
              />
              <Typography variant="caption">{question.labels[1]}</Typography>
            </Stack>
          </Box>
        );

      case 'checkbox':
        return (
          <FormControl component="fieldset" fullWidth>
            <FormLabel component="legend">{question.question}</FormLabel>
            <Box sx={{ pl: 2 }}>
              {question.options.map((option, index) => (
                <FormControlLabel
                  key={index}
                  control={
                    <Checkbox
                      checked={(responses[question.id] || []).includes(option)}
                      onChange={(e) => {
                        const currentValues = responses[question.id] || [];
                        const newValues = e.target.checked
                          ? [...currentValues, option]
                          : currentValues.filter(v => v !== option);
                        handleResponseChange(question.id, newValues);
                      }}
                    />
                  }
                  label={option}
                />
              ))}
            </Box>
          </FormControl>
        );

      case 'textarea':
        return (
          <TextField
            fullWidth
            multiline
            rows={4}
            label={question.question}
            placeholder={question.placeholder}
            value={responses[question.id] || ''}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
            variant="outlined"
          />
        );

      default:
        return null;
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h4" gutterBottom>
          Personality & Thought Process Assessment
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          This questionnaire helps us understand how you think, learn, and interact with others. 
          There are no right or wrong answers – just be honest about what feels most like you!
        </Typography>

        <Stack spacing={4} sx={{ mt: 3 }}>
          {questions.map((question, index) => (
            <Card key={question.id} variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Question {index + 1}
                </Typography>
                {renderQuestion(question)}
              </CardContent>
            </Card>
          ))}
        </Stack>

        <Box sx={{ mt: 4, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Completed: {Object.keys(responses).length} / {questions.length} questions
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default Questionnaire; 