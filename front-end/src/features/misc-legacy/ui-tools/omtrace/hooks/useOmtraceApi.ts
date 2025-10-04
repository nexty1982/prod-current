import { useState, useCallback } from 'react';
import { OmtraceRunFlags, OmtraceRunResult, RefactorRequest, RefactorResponse, SlugRulesResponse, RefactorHistoryItem } from '@/types';

// Mock data for development
const MOCK_RESULTS: OmtraceRunResult[] = [
  {
    entry: 'ChurchSetupWizard',
    resolvedPath: 'src/components/church-management/ch-wiz/ChurchSetupWizard.tsx',
    direct: [
      '@/shared/ui/FormField.tsx',
      '@/shared/ui/Button.tsx',
      'src/utils/validation.ts',
      'src/services/churchService.ts'
    ],
    transitive: [
      '@/shared/ui/Input.tsx',
      '@/shared/ui/Label.tsx',
      'src/utils/helpers.ts',
      'src/types/church.ts'
    ],
    api: [
      { method: 'POST', path: '/api/churches', file: 'src/services/churchService.ts', line: 45 },
      { method: 'GET', path: '/api/churches/:id', file: 'src/services/churchService.ts', line: 23 }
    ],
    routes: [
      { file: 'src/routes/Router.tsx', line: 156, path: '/apps/church-management/wizard', roles: ['admin', 'super_admin'] }
    ],
    guards: [
      { file: 'src/routes/Router.tsx', line: 156, type: 'ProtectedRoute', roles: ['admin', 'super_admin'] }
    ],
    refactorPlan: {
      from: 'src/components/church-management/ch-wiz/ChurchSetupWizard.tsx',
      to: 'src/components/church-management/ch-wiz/ChurchSetupWizard.tsx',
      domain: 'church',
      slug: 'ch-wiz'
    },
    stats: {
      duration: 245,
      cacheHit: true
    }
  },
  {
    entry: 'UserManagement',
    resolvedPath: 'src/views/admin/UserManagement.tsx',
    direct: [
      '@/shared/ui/DataTable.tsx',
      '@/shared/ui/Modal.tsx',
      'src/services/userService.ts',
      'src/hooks/useUsers.ts'
    ],
    transitive: [
      '@/shared/ui/Table.tsx',
      '@/shared/ui/Pagination.tsx',
      'src/utils/tableHelpers.ts'
    ],
    api: [
      { method: 'GET', path: '/api/admin/users', file: 'src/services/userService.ts', line: 12 },
      { method: 'PUT', path: '/api/admin/users/:id', file: 'src/services/userService.ts', line: 67 }
    ],
    stats: {
      duration: 189,
      cacheHit: false
    }
  }
];

const MOCK_SLUG_RULES: SlugRulesResponse = {
  domains: [
    {
      domain: 'church',
      slugs: [
        { code: 'ch-panel', label: 'Admin Panel', patterns: ['Admin', 'Panel'] },
        { code: 'ch-wiz', label: 'Wizard', patterns: ['Wizard', 'Setup', 'Onboard'] },
        { code: 'ch-dir', label: 'Directory', patterns: ['Directory', 'List'] }
      ]
    },
    {
      domain: 'user',
      slugs: [
        { code: 'usr-core', label: 'Core Management', patterns: ['Management', 'Admin'] },
        { code: 'usr-wiz', label: 'Wizard', patterns: ['Wizard', 'Setup'] },
        { code: 'usr-roles', label: 'Roles & Permissions', patterns: ['Roles', 'Permissions'] }
      ]
    },
    {
      domain: 'record',
      slugs: [
        { code: 'rec-template', label: 'Template', patterns: ['Template', 'Schema'] },
        { code: 'rec-opt', label: 'Options', patterns: ['Options', 'Config', 'Fields'] },
        { code: 'rec-dis', label: 'Display', patterns: ['Display', 'View', 'Show'] }
      ]
    }
  ],
  updatedAt: new Date().toISOString()
};

const MOCK_HISTORY: RefactorHistoryItem[] = [
  {
    timestamp: '2024-01-15T10:30:00Z',
    entry: 'ChurchSetupWizard',
    from: 'src/components/ChurchSetupWizard.tsx',
    to: 'src/components/church-management/ch-wiz/ChurchSetupWizard.tsx',
    importUpdates: 12,
    result: 'success',
    refactorMdPath: 'refactor.md',
    logPath: '.refactor_logs/2024-01-15/ChurchSetupWizard.json'
  },
  {
    timestamp: '2024-01-14T14:20:00Z',
    entry: 'UserManagement',
    from: 'src/views/UserManagement.tsx',
    to: 'src/components/user-management/usr-core/UserManagement.tsx',
    importUpdates: 8,
    result: 'success',
    refactorMdPath: 'refactor.md',
    logPath: '.refactor_logs/2024-01-14/UserManagement.json'
  }
];

export const useOmtraceApi = () => {
  const [isLoading, setIsLoading] = useState(false);

  const runAnalysis = useCallback(async (targets: string[], flags: OmtraceRunFlags): Promise<OmtraceRunResult> => {
    setIsLoading(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    setIsLoading(false);
    
    // Return mock result for first target
    const target = targets[0];
    if (target.toLowerCase().includes('church')) {
      return MOCK_RESULTS[0];
    } else if (target.toLowerCase().includes('user')) {
      return MOCK_RESULTS[1];
    } else {
      // Generate a generic result
      return {
        entry: target,
        resolvedPath: `src/components/${target}/${target}.tsx`,
        direct: [`@/shared/ui/Button.tsx`, `src/utils/helpers.ts`],
        stats: {
          duration: Math.floor(Math.random() * 500) + 100,
          cacheHit: Math.random() > 0.5
        }
      };
    }
  }, []);

  const runRefactor = useCallback(async (target: string, options: RefactorRequest): Promise<RefactorResponse> => {
    setIsLoading(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
    
    setIsLoading(false);
    
    // Generate mock refactor response
    const domain = target.toLowerCase().includes('church') ? 'church' : 'user';
    const slug = target.toLowerCase().includes('wizard') ? 'wiz' : 'core';
    
    return {
      from: `src/components/${target}.tsx`,
      to: `src/components/${domain}-management/${domain}-${slug}/${target}.tsx`,
      domain,
      slug: `${domain}-${slug}`,
      importUpdates: Math.floor(Math.random() * 20) + 5,
      notes: ['Refactor completed successfully'],
      refactorMdPath: 'refactor.md',
      logPath: `.refactor_logs/${new Date().toISOString().split('T')[0]}/${target}.json`
    };
  }, []);

  const getHistory = useCallback(async (): Promise<RefactorHistoryItem[]> => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsLoading(false);
    return MOCK_HISTORY;
  }, []);

  const getSlugRules = useCallback(async (): Promise<SlugRulesResponse> => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 300));
    setIsLoading(false);
    return MOCK_SLUG_RULES;
  }, []);

  const updateSlugRules = useCallback(async (rules: SlugRulesResponse): Promise<void> => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
    console.log('Updated slug rules:', rules);
  }, []);

  return {
    runAnalysis,
    runRefactor,
    getHistory,
    getSlugRules,
    updateSlugRules,
    isLoading
  };
};
