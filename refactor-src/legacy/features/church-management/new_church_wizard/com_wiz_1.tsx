import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Step1Basic from '@/features/misc-legacy/pages/church-wizard/Step1Basic';
import Step2Modules from '@/features/misc-legacy/pages/church-wizard/Step2Modules';
import Step3Accounts from '@/features/misc-legacy/pages/church-wizard/Step3Accounts';
import ProvisionDashboard from './ProvisionDashboard';
import Success from './Success';
import Summary from './Summary';

const ChurchSetupWizard: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/apps/church-management/wizard/step1" replace />} />
      <Route path="/step1" element={<Step1Basic />} />
      <Route path="/step2" element={<Step2Modules />} />
      <Route path="/step3" element={<Step3Accounts />} />
      <Route path="/summary" element={<Summary />} />
      <Route path="/success" element={<Success />} />
      <Route path="/dashboard" element={<ProvisionDashboard />} />
      <Route path="*" element={<Navigate to="/apps/church-management/wizard/step1" replace />} />
    </Routes>
  );
};

export default ChurchSetupWizard;
