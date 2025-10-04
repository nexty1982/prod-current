import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import OMLearnDashboard from './OMLearnDashboard';
import QuestionnaireRunner from './QuestionnaireRunner';
import { SurveyResultsProvider } from './SurveyResultsContext';

const OMLearn: React.FC = () => {
  return (
    <SurveyResultsProvider>
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <Routes>
          <Route path="/" element={<OMLearnDashboard />} />
          <Route path="/survey/:gradeGroupId" element={<QuestionnaireRunner />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Box>
    </SurveyResultsProvider>
  );
};

export default OMLearn; 