# OMLearn Module

## Overview

OMLearn is a dedicated learning interface for capturing, evaluating, and evolving human reasoning models and moral perspectives across age levels. It serves as the foundation for training OMAI to simulate human logic across age ranges.

## 🎯 Purpose

This module will serve as the foundation for training OMAI to simulate human logic across age ranges. It will also allow Nick to submit hundreds of responses as logic benchmarks.

## 🧩 Module Structure

```
modules/OMLearn/
├── OMLearn.tsx                 # Main entry point and routing
├── OMLearnDashboard.tsx        # Overview interface
├── QuestionnaireRunner.tsx     # Dynamic survey component
├── SurveyResultsContext.tsx    # Context for storage and retrieval
├── SurveyLoader.ts             # Loads age-appropriate surveys
├── omlearn.api.ts             # Future backend API endpoints
├── index.ts                   # Module exports
└── README.md                  # This file
```

## 🚀 Features

### 1. Grade Group Selection
- **K-2**: Basic reasoning and moral development concepts
- **3-5**: Intermediate reasoning patterns and ethical thinking
- **6-8**: Advanced reasoning and complex moral scenarios
- **9-12**: Sophisticated reasoning models and philosophical concepts

### 2. Survey Types
- **Multiple Choice**: Predefined options for structured responses
- **Text**: Open-ended responses for detailed reasoning
- **Scale**: Rating-based questions for quantitative assessment
- **Scenario**: Complex situational questions

### 3. Progress Tracking
- Real-time progress indicators
- Session management with localStorage
- Resume capability for incomplete surveys
- Export/import functionality

### 4. OMAI Integration Hooks
- Response analysis and pattern recognition
- Moral framework identification
- Cognitive level assessment
- Recommendations generation

## 🔧 Usage

### Accessing OMLearn
Navigate to `/bigbook/omlearn` in the application to access the OMLearn dashboard.

### Starting a Survey
1. Select a grade group from the dashboard
2. Click "Start Survey" or "Continue" if in progress
3. Answer questions with optional reasoning
4. Save progress or complete the survey

### Data Storage
- Responses are stored locally in localStorage
- Future: Sync with backend API and OMAI memory system
- Export/import functionality for data portability

## 🎨 UI Components

### OMLearnDashboard
- Grade group selection cards
- Progress visualization
- Status indicators (not started, in progress, completed)
- Overall progress summary

### QuestionnaireRunner
- Dynamic question rendering
- Progress stepper
- Navigation controls (previous/next)
- Save progress functionality
- Reasoning prompts

## 🔮 Future Extensions

### 1. AI-Generated Explanations
- OMAI-powered response analysis
- Reasoning pattern identification
- Moral framework classification

### 2. Profile Builder
- Aggregate survey results analysis
- Personality and reasoning profile generation
- Comparative analysis across age groups

### 3. OMAI Memory Sync
- Integration with `omai_memories` table
- Real-time learning from responses
- Pattern recognition and adaptation

### 4. Advanced Analytics
- Cross-age group comparisons
- Trend analysis over time
- Statistical insights and reporting

## 📊 Data Flow

```
User Input → SurveyRunner → SurveyResultsContext → localStorage
                                    ↓
                            Future: API → OMAI Analysis → omai_memories
```

## 🛠️ Development

### Adding New Surveys
1. Create JSON file in `data/surveys/`
2. Follow the survey schema defined in `SurveyLoader.ts`
3. Update the loader to include new survey

### Extending Question Types
1. Add new type to `Question` interface
2. Update `QuestionnaireRunner` to handle new type
3. Add appropriate UI components

### API Integration
1. Implement backend endpoints in `omlearn.api.ts`
2. Add authentication and validation
3. Connect to OMAI analysis system

## 🔒 Security Considerations

- User authentication required for access
- Data privacy and GDPR compliance
- Secure API endpoints for future backend integration
- Local storage encryption for sensitive data

## 📝 Notes

- Currently uses localStorage for data persistence
- Sample surveys included for demonstration
- Ready for backend API integration
- Designed for OMAI training and analysis

## 🎯 Next Steps

1. **Backend Integration**: Implement API endpoints
2. **OMAI Analysis**: Connect to reasoning analysis system
3. **Survey Expansion**: Add more comprehensive surveys
4. **Analytics Dashboard**: Create detailed reporting interface
5. **User Management**: Add user profiles and progress tracking 