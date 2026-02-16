import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Paper,
  Typography,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  FormGroup,
  Slider,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import { CheckCircle, RadioButtonUnchecked, Save, ArrowForward, ArrowBack } from '@mui/icons-material';

interface SetupState {
  step1?: {
    churchId: number;
    churchName?: string;
    permissionsVerified: boolean;
  };
  step2?: {
    language: string;
    defaultLanguage: string;
    recordTypes: string[];
    confidenceThreshold: number;
  };
  step3?: {
    storagePath: string;
    storageWritable: boolean;
  };
  step4?: {
    visionConfigured: boolean;
  };
  step5?: {
    mappingTemplates: {
      baptism?: boolean;
      marriage?: boolean;
      funeral?: boolean;
    };
  };
}

interface ChecklistItem {
  passed: boolean;
  message: string;
}

interface ValidationResponse {
  checklist: {
    churchContext: ChecklistItem;
    ocrSettings: ChecklistItem;
    storageReady: ChecklistItem;
    visionReady: ChecklistItem;
    mappingReady: ChecklistItem;
  };
  allPassed: boolean;
  percentComplete: number;
}

interface InventoryResponse {
  church_id: number;
  records: {
    baptism: { table_exists: boolean; row_count: number };
    marriage: { table_exists: boolean; row_count: number };
    funeral: { table_exists: boolean; row_count: number };
  };
  ocr: {
    ocr_jobs: { table_exists: boolean; row_count: number };
    ocr_fused_drafts: { table_exists: boolean; row_count: number };
    ocr_mappings: { table_exists: boolean; row_count: number };
    ocr_settings: { table_exists: boolean; row_count: number };
  };
  classification: 'existing_records' | 'blank_slate';
  reasons: string[];
}

const blankSlateSteps = [
  'Church Data Inventory',
  'Church Context & Permissions',
  'OCR Settings',
  'Storage & Uploads',
  'Vision Integration',
  'Mapping Baseline',
  'Ready to Launch'
];

const existingRecordsSteps = [
  'Church Data Inventory',
  'Mapping Baseline',
  'Sampling Plan',
  'Review Workflow',
  'Safety Gate',
  'Ready to Launch'
];

export default function OcrSetupWizardPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const churchId = parseInt(searchParams.get('church_id') || '46');
  
  const [activeStep, setActiveStep] = useState(0);
  const [setupState, setSetupState] = useState<SetupState>({});
  const [percentComplete, setPercentComplete] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validation, setValidation] = useState<ValidationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inventory, setInventory] = useState<InventoryResponse | null>(null);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [flowType, setFlowType] = useState<'blank_slate' | 'existing_records' | null>(null);
  const [overrideMode, setOverrideMode] = useState(false);

  // Determine which steps to use based on flow type
  const steps = flowType === 'existing_records' ? existingRecordsSteps : blankSlateSteps;

  // Load setup state and inventory on mount
  useEffect(() => {
    loadInventory();
    loadSetupState();
    validateSetup();
  }, [churchId]);

  // Auto-complete when reaching final step
  useEffect(() => {
    const finalStep = steps.length - 1;
    if (activeStep === finalStep && percentComplete < 100 && !isComplete) {
      saveSetupState({}, 100).catch(console.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStep, percentComplete, isComplete]);

  const loadInventory = async () => {
    try {
      setInventoryLoading(true);
      const response = await fetch(`/api/church/${churchId}/ocr/setup-inventory`);
      if (response.ok) {
        const data: InventoryResponse = await response.json();
        setInventory(data);
        setFlowType(data.classification);
      } else {
        throw new Error('Failed to load inventory');
      }
    } catch (err: any) {
      setError(`Failed to load inventory: ${err.message}`);
      // Default to blank_slate on error
      setFlowType('blank_slate');
    } finally {
      setInventoryLoading(false);
    }
  };

  const loadSetupState = async () => {
    try {
      const response = await fetch(`/api/church/${churchId}/ocr/setup-state`);
      if (response.ok) {
        const data = await response.json();
        setSetupState(data.state || {});
        setPercentComplete(data.percentComplete || 0);
        setIsComplete(data.isComplete || false);
        
        // Use flow_type from saved state if available, otherwise use inventory classification
        if (data.flowType) {
          setFlowType(data.flowType);
        }
        
        // Determine active step based on progress (skip Step 0 if already past it)
        const maxStep = steps.length - 1;
        if (data.percentComplete >= 100) {
          setActiveStep(maxStep);
        } else if (data.percentComplete >= 80) {
          setActiveStep(Math.min(maxStep - 1, 4));
        } else if (data.percentComplete >= 60) {
          setActiveStep(Math.min(maxStep - 2, 3));
        } else if (data.percentComplete >= 40) {
          setActiveStep(Math.min(maxStep - 3, 2));
        } else if (data.percentComplete >= 20) {
          setActiveStep(Math.min(maxStep - 4, 1));
        } else {
          setActiveStep(0); // Start at inventory step
        }
      }
    } catch (err: any) {
      setError(`Failed to load setup state: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const validateSetup = async () => {
    try {
      const response = await fetch(`/api/church/${churchId}/ocr/setup-validate`, {
        method: 'POST'
      });
      if (response.ok) {
        const data = await response.json();
        setValidation(data);
      }
    } catch (err) {
      console.error('Validation failed:', err);
    }
  };

  const saveSetupState = async (newState: Partial<SetupState>, stepPercent: number, flowTypeOverride?: 'blank_slate' | 'existing_records' | null) => {
    setSaving(true);
    try {
      const updatedState = { ...setupState, ...newState };
      const totalPercent = Math.max(percentComplete, stepPercent);
      const complete = totalPercent >= 100;
      const flowToSave = flowTypeOverride !== undefined ? flowTypeOverride : flowType;

      const response = await fetch(`/api/church/${churchId}/ocr/setup-state`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: updatedState,
          percentComplete: totalPercent,
          isComplete: complete,
          flowType: flowToSave
        })
      });

      if (response.ok) {
        setSetupState(updatedState);
        setPercentComplete(totalPercent);
        setIsComplete(complete);
        if (flowToSave) {
          setFlowType(flowToSave);
        }
        await validateSetup();
      } else {
        throw new Error('Failed to save state');
      }
    } catch (err: any) {
      setError(`Failed to save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleNext = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const handleStep1Complete = async () => {
    await saveSetupState({
      step1: {
        churchId,
        permissionsVerified: true
      }
    }, 20);
    handleNext();
  };

  const handleStep2Complete = async () => {
    const step2Data = {
      language: setupState.step2?.language || 'eng',
      defaultLanguage: setupState.step2?.defaultLanguage || 'en',
      recordTypes: setupState.step2?.recordTypes || ['baptism'],
      confidenceThreshold: setupState.step2?.confidenceThreshold || 75
    };
    await saveSetupState({ step2: step2Data }, 40);
    handleNext();
  };

  const handleStep3Complete = async () => {
    await validateSetup();
    await saveSetupState({
      step3: {
        storagePath: `/var/www/orthodoxmetrics/data/church/${churchId}/ocr_uploads`,
        storageWritable: validation?.checklist.storageReady.passed || false
      }
    }, 60);
    handleNext();
  };

  const handleStep4Complete = async () => {
    await validateSetup();
    await saveSetupState({
      step4: {
        visionConfigured: validation?.checklist.visionReady.passed || false
      }
    }, 80);
    handleNext();
  };

  const handleStep5Complete = async () => {
    await saveSetupState({
      step5: {
        mappingTemplates: {
          baptism: true,
          marriage: true,
          funeral: true
        }
      }
    }, 100);
    handleNext();
  };

  const handleStep0Complete = async () => {
    if (!inventory) return;
    
    // If override mode, use blank_slate flow
    const selectedFlow = overrideMode ? 'blank_slate' : inventory.classification;
    setFlowType(selectedFlow);
    await saveSetupState({}, 5, selectedFlow); // 5% for completing inventory step
    handleNext();
  };

  const renderStepContent = (step: number) => {
    // Step 0: Church Data Inventory (always first)
    if (step === 0) {
      if (inventoryLoading) {
        return (
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Loading church data inventory...</Typography>
          </Box>
        );
      }

      if (!inventory) {
        return (
          <Box sx={{ p: 2 }}>
            <Alert severity="error">Failed to load inventory data</Alert>
            <Button onClick={loadInventory} sx={{ mt: 2 }}>Retry</Button>
          </Box>
        );
      }

      const totalRecords = inventory.records.baptism.row_count + 
                          inventory.records.marriage.row_count + 
                          inventory.records.funeral.row_count;
      const hasRecords = totalRecords > 0;
      const recommendedFlow = inventory.classification;

      return (
        <Box sx={{ p: 2 }}>
          <Typography variant="body1" gutterBottom>
            Review your church's data inventory to determine the appropriate OCR setup path.
          </Typography>

          <Card sx={{ mt: 2, mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Record Tables</Typography>
              <Typography>Baptism: {inventory.records.baptism.table_exists ? `${inventory.records.baptism.row_count} records` : 'Not found'}</Typography>
              <Typography>Marriage: {inventory.records.marriage.table_exists ? `${inventory.records.marriage.row_count} records` : 'Not found'}</Typography>
              <Typography>Funeral: {inventory.records.funeral.table_exists ? `${inventory.records.funeral.row_count} records` : 'Not found'}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Total: {totalRecords} records found
              </Typography>
            </CardContent>
          </Card>

          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>OCR Infrastructure</Typography>
              <Typography>OCR Jobs: {inventory.ocr.ocr_jobs.table_exists ? `${inventory.ocr.ocr_jobs.row_count} jobs` : 'Not found'}</Typography>
              <Typography>Mappings: {inventory.ocr.ocr_mappings.table_exists ? `${inventory.ocr.ocr_mappings.row_count} mappings` : 'Not found'}</Typography>
              <Typography>Drafts: {inventory.ocr.ocr_fused_drafts.table_exists ? `${inventory.ocr.ocr_fused_drafts.row_count} drafts` : 'Not found'}</Typography>
              <Typography>Settings: {inventory.ocr.ocr_settings.table_exists ? `${inventory.ocr.ocr_settings.row_count} settings` : 'Not found'}</Typography>
            </CardContent>
          </Card>

          <Card sx={{ mb: 2, bgcolor: recommendedFlow === 'existing_records' ? 'info.light' : 'success.light' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recommended Path: {recommendedFlow === 'existing_records' ? 'Existing Records OCR Enablement' : 'Blank Slate Setup'}
              </Typography>
              <Typography variant="body2" component="div">
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {inventory.reasons.map((reason, idx) => (
                    <li key={idx}>{reason}</li>
                  ))}
                </ul>
              </Typography>
            </CardContent>
          </Card>

          {hasRecords && (
            <Box sx={{ mt: 2 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={overrideMode}
                    onChange={(e) => setOverrideMode(e.target.checked)}
                  />
                }
                label="Override: Use blank slate setup (requires confirmation)"
              />
              {overrideMode && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  Warning: You are choosing to use blank slate setup even though existing records were found. 
                  This will skip the existing records workflow.
                </Alert>
              )}
            </Box>
          )}

          <Button
            variant="contained"
            onClick={handleStep0Complete}
            disabled={inventoryLoading}
            sx={{ mt: 2 }}
          >
            Continue with {overrideMode ? 'Blank Slate' : recommendedFlow === 'existing_records' ? 'Existing Records' : 'Blank Slate'} Setup
          </Button>
        </Box>
      );
    }

    // Adjust step index for blank_slate flow (Step 0 is inventory, Step 1+ are the original steps)
    const blankSlateStepIndex = step - 1;
    
    // For existing_records flow, handle different steps
    if (flowType === 'existing_records' && !overrideMode) {
      switch (step) {
        case 1: // Mapping Baseline
          return (
            <Box sx={{ p: 2 }}>
              <Typography variant="body1" gutterBottom>
                Create or select mapping templates based on your existing record columns.
              </Typography>
              <Alert severity="info" sx={{ mt: 2 }}>
                This step will analyze your existing record tables and suggest field mappings.
              </Alert>
              <FormGroup sx={{ mt: 2 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={setupState.step5?.mappingTemplates?.baptism || false}
                      onChange={(e) => {
                        setSetupState({
                          ...setupState,
                          step5: {
                            mappingTemplates: {
                              ...setupState.step5?.mappingTemplates,
                              baptism: e.target.checked
                            }
                          }
                        });
                      }}
                    />
                  }
                  label="Baptism Mapping Template"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={setupState.step5?.mappingTemplates?.marriage || false}
                      onChange={(e) => {
                        setSetupState({
                          ...setupState,
                          step5: {
                            mappingTemplates: {
                              ...setupState.step5?.mappingTemplates,
                              marriage: e.target.checked
                            }
                          }
                        });
                      }}
                    />
                  }
                  label="Marriage Mapping Template"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={setupState.step5?.mappingTemplates?.funeral || false}
                      onChange={(e) => {
                        setSetupState({
                          ...setupState,
                          step5: {
                            mappingTemplates: {
                              ...setupState.step5?.mappingTemplates,
                              funeral: e.target.checked
                            }
                          }
                        });
                      }}
                    />
                  }
                  label="Funeral Mapping Template"
                />
              </FormGroup>
              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Button onClick={handleBack}>Back</Button>
                <Button
                  variant="contained"
                  onClick={async () => {
                    await saveSetupState({
                      step5: {
                        mappingTemplates: {
                          baptism: setupState.step5?.mappingTemplates?.baptism || false,
                          marriage: setupState.step5?.mappingTemplates?.marriage || false,
                          funeral: setupState.step5?.mappingTemplates?.funeral || false
                        }
                      }
                    }, 30);
                    handleNext();
                  }}
                  disabled={
                    !setupState.step5?.mappingTemplates?.baptism &&
                    !setupState.step5?.mappingTemplates?.marriage &&
                    !setupState.step5?.mappingTemplates?.funeral
                  }
                >
                  Continue
                </Button>
              </Box>
            </Box>
          );
        case 2: // Sampling Plan
          return (
            <Box sx={{ p: 2 }}>
              <Typography variant="body1" gutterBottom>
                Select 20-50 pages/images to calibrate OCR accuracy for your existing records.
              </Typography>
              <Alert severity="info" sx={{ mt: 2 }}>
                Upload sample documents that represent your typical record formats. These will be used to train and validate the OCR mapping.
              </Alert>
              <Typography variant="body2" sx={{ mt: 2 }}>
                You can upload sample images in the Enhanced OCR Uploader after completing setup.
              </Typography>
              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Button onClick={handleBack}>Back</Button>
                <Button
                  variant="contained"
                  onClick={async () => {
                    await saveSetupState({}, 50);
                    handleNext();
                  }}
                >
                  Continue
                </Button>
              </Box>
            </Box>
          );
        case 3: // Review Workflow
          return (
            <Box sx={{ p: 2 }}>
              <Typography variant="body1" gutterBottom>
                Configure the review workflow for OCR drafts, acceptance, and audit history.
              </Typography>
              <Alert severity="info" sx={{ mt: 2 }}>
                Drafts will be created from OCR results and require review before committing to your existing records.
              </Alert>
              <FormGroup sx={{ mt: 2 }}>
                <FormControlLabel
                  control={<Checkbox defaultChecked />}
                  label="Enable draft review workflow"
                />
                <FormControlLabel
                  control={<Checkbox defaultChecked />}
                  label="Require approval before committing records"
                />
                <FormControlLabel
                  control={<Checkbox defaultChecked />}
                  label="Maintain audit history for all changes"
                />
              </FormGroup>
              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Button onClick={handleBack}>Back</Button>
                <Button
                  variant="contained"
                  onClick={async () => {
                    await saveSetupState({}, 70);
                    handleNext();
                  }}
                >
                  Continue
                </Button>
              </Box>
            </Box>
          );
        case 4: // Safety Gate
          return (
            <Box sx={{ p: 2 }}>
              <Typography variant="body1" gutterBottom>
                Acknowledge safety measures: OCR will not overwrite existing records.
              </Typography>
              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom>Safety Gate</Typography>
                <Typography>
                  • OCR commits will create pending updates, not overwrite existing records<br/>
                  • All changes require explicit approval<br/>
                  • Audit trail will be maintained for all modifications
                </Typography>
              </Alert>
              <FormGroup sx={{ mt: 2 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={setupState.step1?.permissionsVerified || false}
                      onChange={(e) => {
                        setSetupState({
                          ...setupState,
                          step1: {
                            churchId,
                            permissionsVerified: e.target.checked
                          }
                        });
                      }}
                    />
                  }
                  label="I understand that OCR will not overwrite existing records"
                />
              </FormGroup>
              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Button onClick={handleBack}>Back</Button>
                <Button
                  variant="contained"
                  onClick={async () => {
                    await saveSetupState({
                      step1: {
                        churchId,
                        permissionsVerified: true
                      }
                    }, 90);
                    handleNext();
                  }}
                  disabled={!setupState.step1?.permissionsVerified}
                >
                  Acknowledge & Continue
                </Button>
              </Box>
            </Box>
          );
        case 5: // Ready to Launch (existing_records)
          return (
            <Box sx={{ p: 2 }}>
              <Alert severity="success" sx={{ mb: 2 }}>
                Setup Complete! You're ready to use Enhanced OCR Uploader with existing records.
              </Alert>
              <Typography variant="h6" gutterBottom>
                Summary
              </Typography>
              <Typography>Church ID: {churchId}</Typography>
              <Typography>Flow Type: Existing Records</Typography>
              <Typography>Progress: {percentComplete}%</Typography>
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate(`/devel/enhanced-ocr-uploader?church_id=${churchId}`)}
                sx={{ mt: 2 }}
                startIcon={<ArrowForward />}
              >
                Launch Enhanced OCR Uploader
              </Button>
            </Box>
          );
        default:
          return null;
      }
    }

    // Blank slate flow (original steps, adjusted for Step 0)
    switch (blankSlateStepIndex) {
      case 0:
        return (
          <Box sx={{ p: 2 }}>
            <Typography variant="body1" gutterBottom>
              Verify church context and permissions for OCR setup.
            </Typography>
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="h6">Church Information</Typography>
                <Typography>Church ID: {churchId}</Typography>
                <FormGroup sx={{ mt: 2 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={setupState.step1?.permissionsVerified || false}
                        onChange={(e) => {
                          setSetupState({
                            ...setupState,
                            step1: {
                              churchId,
                              permissionsVerified: e.target.checked
                            }
                          });
                        }}
                      />
                    }
                    label="I have permission to configure OCR for this church"
                  />
                </FormGroup>
              </CardContent>
            </Card>
            <Button
              variant="contained"
              onClick={handleStep1Complete}
              disabled={!setupState.step1?.permissionsVerified}
              sx={{ mt: 2 }}
            >
              Continue
            </Button>
          </Box>
        );

      case 1:
        return (
          <Box sx={{ p: 2 }}>
            <Typography variant="body1" gutterBottom>
              Configure OCR language settings and record types.
            </Typography>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <FormLabel>Default Language</FormLabel>
              <RadioGroup
                value={setupState.step2?.defaultLanguage || 'en'}
                onChange={(e) => {
                  setSetupState({
                    ...setupState,
                    step2: {
                      ...setupState.step2,
                      defaultLanguage: e.target.value,
                      language: e.target.value === 'en' ? 'eng' : e.target.value
                    }
                  });
                }}
              >
                <FormControlLabel value="en" control={<Radio />} label="English" />
                <FormControlLabel value="el" control={<Radio />} label="Greek" />
                <FormControlLabel value="ru" control={<Radio />} label="Russian" />
                <FormControlLabel value="ar" control={<Radio />} label="Arabic" />
              </RadioGroup>
            </FormControl>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <FormLabel>Record Types Enabled</FormLabel>
              <FormGroup>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={setupState.step2?.recordTypes?.includes('baptism') || false}
                      onChange={(e) => {
                        const types = setupState.step2?.recordTypes || [];
                        const newTypes = e.target.checked
                          ? [...types, 'baptism']
                          : types.filter(t => t !== 'baptism');
                        setSetupState({
                          ...setupState,
                          step2: { ...setupState.step2, recordTypes: newTypes }
                        });
                      }}
                    />
                  }
                  label="Baptism"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={setupState.step2?.recordTypes?.includes('marriage') || false}
                      onChange={(e) => {
                        const types = setupState.step2?.recordTypes || [];
                        const newTypes = e.target.checked
                          ? [...types, 'marriage']
                          : types.filter(t => t !== 'marriage');
                        setSetupState({
                          ...setupState,
                          step2: { ...setupState.step2, recordTypes: newTypes }
                        });
                      }}
                    />
                  }
                  label="Marriage"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={setupState.step2?.recordTypes?.includes('funeral') || false}
                      onChange={(e) => {
                        const types = setupState.step2?.recordTypes || [];
                        const newTypes = e.target.checked
                          ? [...types, 'funeral']
                          : types.filter(t => t !== 'funeral');
                        setSetupState({
                          ...setupState,
                          step2: { ...setupState.step2, recordTypes: newTypes }
                        });
                      }}
                    />
                  }
                  label="Funeral"
                />
              </FormGroup>
            </FormControl>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <FormLabel>Confidence Threshold: {setupState.step2?.confidenceThreshold || 75}%</FormLabel>
              <Slider
                value={setupState.step2?.confidenceThreshold || 75}
                onChange={(_, value) => {
                  setSetupState({
                    ...setupState,
                    step2: { ...setupState.step2, confidenceThreshold: value as number }
                  });
                }}
                min={50}
                max={100}
                step={5}
                marks
              />
            </FormControl>
            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
              <Button onClick={handleBack}>Back</Button>
              <Button
                variant="contained"
                onClick={handleStep2Complete}
                disabled={(setupState.step2?.recordTypes?.length || 0) === 0}
              >
                Save & Continue
              </Button>
            </Box>
          </Box>
        );

      case 2:
        return (
          <Box sx={{ p: 2 }}>
            <Typography variant="body1" gutterBottom>
              Verify storage paths and upload readiness.
            </Typography>
            {validation && (
              <Alert
                severity={validation.checklist.storageReady.passed ? 'success' : 'warning'}
                sx={{ mt: 2 }}
              >
                {validation.checklist.storageReady.message}
              </Alert>
            )}
            <Button
              variant="outlined"
              onClick={validateSetup}
              sx={{ mt: 2 }}
            >
              Re-check Storage
            </Button>
            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
              <Button onClick={handleBack}>Back</Button>
              <Button
                variant="contained"
                onClick={handleStep3Complete}
                disabled={!validation?.checklist.storageReady.passed}
              >
                Continue
              </Button>
            </Box>
          </Box>
        );

      case 3:
        return (
          <Box sx={{ p: 2 }}>
            <Typography variant="body1" gutterBottom>
              Verify Vision API credentials are configured.
            </Typography>
            {validation && (
              <Alert
                severity={validation.checklist.visionReady.passed ? 'success' : 'error'}
                sx={{ mt: 2 }}
              >
                {validation.checklist.visionReady.message}
              </Alert>
            )}
            <Typography variant="body2" sx={{ mt: 2 }}>
              Note: Credentials are configured server-side. This step only verifies they exist.
            </Typography>
            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
              <Button onClick={handleBack}>Back</Button>
              <Button
                variant="contained"
                onClick={handleStep4Complete}
                disabled={!validation?.checklist.visionReady.passed}
              >
                Continue
              </Button>
            </Box>
          </Box>
        );

      case 4:
        return (
          <Box sx={{ p: 2 }}>
            <Typography variant="body1" gutterBottom>
              Create or select mapping templates for record types.
            </Typography>
            <FormGroup sx={{ mt: 2 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={setupState.step5?.mappingTemplates?.baptism || false}
                    onChange={(e) => {
                      setSetupState({
                        ...setupState,
                        step5: {
                          mappingTemplates: {
                            ...setupState.step5?.mappingTemplates,
                            baptism: e.target.checked
                          }
                        }
                      });
                    }}
                  />
                }
                label="Baptism Mapping Template"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={setupState.step5?.mappingTemplates?.marriage || false}
                    onChange={(e) => {
                      setSetupState({
                        ...setupState,
                        step5: {
                          mappingTemplates: {
                            ...setupState.step5?.mappingTemplates,
                            marriage: e.target.checked
                          }
                        }
                      });
                    }}
                  />
                }
                label="Marriage Mapping Template"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={setupState.step5?.mappingTemplates?.funeral || false}
                    onChange={(e) => {
                      setSetupState({
                        ...setupState,
                        step5: {
                          mappingTemplates: {
                            ...setupState.step5?.mappingTemplates,
                            funeral: e.target.checked
                          }
                        }
                      });
                    }}
                  />
                }
                label="Funeral Mapping Template"
              />
            </FormGroup>
            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
              <Button onClick={handleBack}>Back</Button>
              <Button
                variant="contained"
                onClick={handleStep5Complete}
                disabled={
                  !setupState.step5?.mappingTemplates?.baptism &&
                  !setupState.step5?.mappingTemplates?.marriage &&
                  !setupState.step5?.mappingTemplates?.funeral
                }
              >
                Complete Setup
              </Button>
            </Box>
          </Box>
        );

      case 5:
        return (
          <Box sx={{ p: 2 }}>
            <Alert severity="success" sx={{ mb: 2 }}>
              Setup Complete! You're ready to use Enhanced OCR Uploader.
            </Alert>
            <Typography variant="h6" gutterBottom>
              Summary
            </Typography>
            <Typography>Church ID: {churchId}</Typography>
            <Typography>Flow Type: Blank Slate</Typography>
            <Typography>Progress: {percentComplete}%</Typography>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate(`/devel/enhanced-ocr-uploader?church_id=${churchId}`)}
              sx={{ mt: 2 }}
              startIcon={<ArrowForward />}
            >
              Launch Enhanced OCR Uploader
            </Button>
          </Box>
        );

      default:
        return null;
    }
  };

  if (loading || inventoryLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4 }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading setup wizard...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        OCR Setup Wizard
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Church ID: {churchId} • Progress: {percentComplete}%
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3, mt: 2 }}>
        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((label, index) => (
            <Step key={label}>
              <StepLabel
                optional={
                  index === activeStep ? (
                    <Typography variant="caption">Current step</Typography>
                  ) : index < activeStep ? (
                    <CheckCircle color="success" fontSize="small" />
                  ) : null
                }
              >
                {label}
              </StepLabel>
              <StepContent>
                {renderStepContent(index)}
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {saving && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
          <CircularProgress size={20} />
          <Typography variant="body2">Saving...</Typography>
        </Box>
      )}
    </Box>
  );
}
