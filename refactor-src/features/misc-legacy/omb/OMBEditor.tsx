import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Alert,
  Snackbar,
  CircularProgress,
  Typography,
  Tabs,
  Tab
} from '@mui/material';
import ComponentPalette from './ComponentPalette';
import ComponentPreview from './ComponentPreview';
import MetadataForm from './MetadataForm';
import PluginResultsPanel from './PluginResultsPanel';
import ComponentAgentPanel from './ComponentAgentPanel';
import CodePreviewModal from './CodePreviewModal';
import { 
  ComponentPaletteItem, 
  BoundComponent, 
  MetadataFormData,
  OMBEditorState 
} from './types';

const OMBEditor: React.FC = () => {
  const [state, setState] = useState<OMBEditorState>({
    selectedComponent: null,
    boundComponents: [],
    currentFormData: {
      name: '',
      description: '',
      route: '',
      dbTable: '',
      roles: [],
      size: 'medium'
    },
    isPreviewMode: false,
    isSaving: false,
    error: null
  });

  const [codePreviewOpen, setCodePreviewOpen] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  // Load existing components on mount
  useEffect(() => {
    loadBoundComponents();
  }, []);

  const loadBoundComponents = async () => {
    try {
      const response = await fetch('/api/omb/components');
      if (response.ok) {
        const components = await response.json();
        setState(prev => ({ ...prev, boundComponents: components }));
      }
    } catch (error) {
      console.error('Failed to load components:', error);
    }
  };

  const handleComponentSelect = (component: ComponentPaletteItem) => {
    setState(prev => ({
      ...prev,
      selectedComponent: component,
      currentFormData: {
        ...prev.currentFormData,
        name: component.name,
        description: component.description
      }
    }));
  };

  const handleFormChange = (formData: MetadataFormData) => {
    setState(prev => ({
      ...prev,
      currentFormData: formData
    }));
  };

  const handleSave = async () => {
    if (!state.selectedComponent) return;

    setState(prev => ({ ...prev, isSaving: true, error: null }));

    try {
      const boundComponent: BoundComponent = {
        id: `${state.selectedComponent.id}-${Date.now()}`,
        name: state.currentFormData.name,
        icon: state.selectedComponent.icon,
        type: state.selectedComponent.type,
        route: state.currentFormData.route,
        dbTable: state.currentFormData.dbTable,
        roles: state.currentFormData.roles,
        description: state.currentFormData.description,
        size: state.currentFormData.size,
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'current_user' // This would come from auth context
        }
      };

      // Save component
      const response = await fetch('/api/omb/components', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(boundComponent),
      });

      if (response.ok) {
        const savedComponent = await response.json();
        
        // Run plugins on the component
        const pluginResults = await runPluginsOnComponent(boundComponent);
        
        // Save plugin results
        await savePluginResults(boundComponent.id, pluginResults);
        
        // Generate markdown documentation
        const docPath = await saveMarkdownDoc(boundComponent, pluginResults);
        
        setState(prev => ({
          ...prev,
          boundComponents: [...prev.boundComponents, savedComponent],
          isSaving: false,
          pluginResults,
          generatedDocPath: docPath
        }));
        
        // Show success message
        setState(prev => ({ ...prev, error: null }));
      } else {
        throw new Error('Failed to save component');
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isSaving: false,
        error: error instanceof Error ? error.message : 'Failed to save component'
      }));
    }
  };

  // Import plugin functions
  const runPluginsOnComponent = async (component: BoundComponent) => {
    try {
      const response = await fetch('/api/omai/run-plugins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ component }),
      });

      if (response.ok) {
        const result = await response.json();
        return result.results;
      } else {
        throw new Error('Failed to run plugins');
      }
    } catch (error) {
      console.error('Plugin execution failed:', error);
      return [];
    }
  };

  const savePluginResults = async (componentId: string, results: any[]) => {
    try {
      const response = await fetch('/api/omai/plugin-results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ componentId, results }),
      });

      if (!response.ok) {
        throw new Error('Failed to save plugin results');
      }
    } catch (error) {
      console.error('Failed to save plugin results:', error);
    }
  };

  const saveMarkdownDoc = async (component: BoundComponent, pluginResults: any[]) => {
    try {
      const response = await fetch('/api/omai/generate-doc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          component,
          pluginResults,
          options: {
            includePluginResults: true,
            includeMetadata: true,
            template: 'default'
          }
        }),
      });

      if (response.ok) {
        const result = await response.json();
        return result.docPath;
      } else {
        throw new Error('Failed to generate documentation');
      }
    } catch (error) {
      console.error('Failed to generate documentation:', error);
      return null;
    }
  };

  const handleCloseError = () => {
    setState(prev => ({ ...prev, error: null }));
  };

  const handleGenerateCode = async (component: BoundComponent, commitToGit: boolean) => {
    setIsGeneratingCode(true);
    try {
      const endpoint = commitToGit ? '/api/omb/generate-and-commit' : '/api/omb/generate-code';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          component,
          user: 'current_user' // This would come from auth context
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setState(prev => ({ ...prev, error: null }));
        setCodePreviewOpen(false);
        
        // Show success message
        const message = commitToGit 
          ? 'Code generated and committed successfully!' 
          : 'Code generated successfully!';
        setState(prev => ({ ...prev, error: null }));
      } else {
        throw new Error('Failed to generate code');
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to generate code'
      }));
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handlePreviewCode = () => {
    if (state.selectedComponent) {
      setCodePreviewOpen(true);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ height: 'calc(100vh - 200px)' }}>
      <Grid container spacing={2} sx={{ height: '100%' }}>
        {/* Left Panel: Component Palette */}
        <Grid item xs={12} md={2}>
          <ComponentPalette
            onComponentSelect={handleComponentSelect}
            selectedComponent={state.selectedComponent}
          />
        </Grid>

        {/* Center Panel: Live Preview */}
        <Grid item xs={12} md={5}>
          <ComponentPreview
            selectedComponent={state.selectedComponent}
            boundComponents={state.boundComponents}
            currentFormData={state.currentFormData}
          />
        </Grid>

        {/* Right Panel: Metadata Form */}
        <Grid item xs={12} md={2}>
          <MetadataForm
            formData={state.currentFormData}
            onFormChange={handleFormChange}
            onSave={handleSave}
            isSaving={state.isSaving}
            onGenerateCode={handlePreviewCode}
            canGenerateCode={!!state.selectedComponent}
          />
        </Grid>

        {/* Right Panel: Plugin Results and Agent Tasks */}
        <Grid item xs={12} md={3}>
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={activeTab} onChange={handleTabChange}>
                <Tab label="🔍 Plugins" />
                <Tab label="🤖 Agents" />
              </Tabs>
            </Box>
            
            <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
              {activeTab === 0 && (
                <PluginResultsPanel
                  pluginResults={state.pluginResults}
                  generatedDocPath={state.generatedDocPath}
                />
              )}
              {activeTab === 1 && (
                <ComponentAgentPanel
                  component={state.selectedComponent}
                />
              )}
            </Box>
          </Box>
        </Grid>
      </Grid>

      {/* Error Snackbar */}
      <Snackbar
        open={!!state.error}
        autoHideDuration={6000}
        onClose={handleCloseError}
      >
        <Alert onClose={handleCloseError} severity="error">
          {state.error}
        </Alert>
      </Snackbar>

      {/* Success Snackbar */}
      <Snackbar
        open={state.isSaving}
        autoHideDuration={2000}
      >
        <Alert severity="success">
          Component saved successfully!
        </Alert>
      </Snackbar>

      {/* Code Preview Modal */}
      <CodePreviewModal
        open={codePreviewOpen}
        onClose={() => setCodePreviewOpen(false)}
        component={state.selectedComponent}
        onGenerate={handleGenerateCode}
        isGenerating={isGeneratingCode}
      />
    </Box>
  );
};

export default OMBEditor; 