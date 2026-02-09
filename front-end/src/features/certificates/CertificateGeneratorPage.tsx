/**
 * Certificate Generator Page
 * 
 * Features:
 * - Blank certificate template with drag-and-drop field positioning
 * - Save/load church-specific field positions
 * - Generate Report wizard for batch certificate generation
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import JSZip from 'jszip';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Divider,
  IconButton,
  Slider,
  Stack,
  Chip,
  Tooltip,
  Switch,
  FormControlLabel,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  TextField,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  LinearProgress,
} from '@mui/material';
import {
  Download as DownloadIcon,
  ArrowBack as BackIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Refresh as RefreshIcon,
  Restore as ResetIcon,
  DragIndicator as DragIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Assignment as AssignmentIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

const API_BASE = '/api/church';

// Default field positions for baptism certificate
const BAPTISM_DEFAULT_POSITIONS: Record<string, { x: number; y: number }> = {
  fullName: { x: 400, y: 340 },
  birthDate: { x: 530, y: 405 },
  birthplace: { x: 400, y: 405 },
  baptismDate: { x: 300, y: 510 },
  sponsors: { x: 400, y: 545 },
  clergyBy: { x: 400, y: 475 },
  clergyRector: { x: 600, y: 620 },
  church: { x: 500, y: 490 },
};

// Default field positions for marriage certificate
const MARRIAGE_DEFAULT_POSITIONS: Record<string, { x: number; y: number }> = {
  groomName: { x: 383, y: 574 },
  brideName: { x: 383, y: 626 },
  marriageDate: { x: 444, y: 678 },
  witnesses: { x: 400, y: 782 },
  clergy: { x: 410, y: 730 },
  church: { x: 514, y: 756 },
};

// Field labels for display
const BAPTISM_FIELD_LABELS: Record<string, string> = {
  fullName: 'Full Name',
  birthDate: 'Birth Date',
  birthplace: 'Birthplace',
  baptismDate: 'Baptism Date',
  sponsors: 'Sponsors/Godparents',
  clergyBy: 'Clergy (BY)',
  clergyRector: 'Rector',
  church: 'Church Name',
};

const MARRIAGE_FIELD_LABELS: Record<string, string> = {
  groomName: 'Groom Name',
  brideName: 'Bride Name',
  marriageDate: 'Marriage Date',
  witnesses: 'Witnesses',
  clergy: 'Clergy',
  church: 'Church Name',
};

// Search fields for baptism records
const BAPTISM_SEARCH_FIELDS = [
  { key: 'first_name', label: 'First Name', type: 'text' },
  { key: 'last_name', label: 'Last Name', type: 'text' },
  { key: 'birth_date', label: 'Birth Date', type: 'date' },
  { key: 'reception_date', label: 'Baptism Date', type: 'date' },
  { key: 'birthplace', label: 'Birthplace', type: 'text' },
  { key: 'sponsors', label: 'Sponsors', type: 'text' },
  { key: 'clergy', label: 'Clergy', type: 'text' },
];

// Search fields for marriage records
const MARRIAGE_SEARCH_FIELDS = [
  { key: 'groom_first', label: 'Groom First Name', type: 'text' },
  { key: 'groom_last', label: 'Groom Last Name', type: 'text' },
  { key: 'bride_first', label: 'Bride First Name', type: 'text' },
  { key: 'bride_last', label: 'Bride Last Name', type: 'text' },
  { key: 'marriage_date', label: 'Marriage Date', type: 'date' },
  { key: 'clergy', label: 'Clergy', type: 'text' },
];

interface RecordData {
  id: number;
  first_name?: string;
  last_name?: string;
  person_first?: string;
  person_last?: string;
  birth_date?: string;
  baptism_date?: string;
  reception_date?: string;
  sponsors?: string;
  godparents?: string;
  clergy?: string;
  fname_groom?: string;
  lname_groom?: string;
  groom_first?: string;
  groom_last?: string;
  fname_bride?: string;
  lname_bride?: string;
  bride_first?: string;
  bride_last?: string;
  marriage_date?: string;
  witnesses?: string;
  churchName?: string;
  birthplace?: string;
}

interface SearchCriteria {
  field: string;
  value: string;
}

const CertificateGeneratorPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const recordType = searchParams.get('recordType') || 'baptism';
  const recordId = searchParams.get('recordId');
  const churchIdParam = searchParams.get('churchId');
  const churchId = (!churchIdParam || churchIdParam === '0') ? '46' : churchIdParam;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [templateUrl, setTemplateUrl] = useState<string | null>(null);
  const [recordData, setRecordData] = useState<RecordData | null>(null);
  const [zoom, setZoom] = useState(90);
  const [downloading, setDownloading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  
  // Field positioning state
  const defaultPositions = recordType === 'marriage' ? MARRIAGE_DEFAULT_POSITIONS : BAPTISM_DEFAULT_POSITIONS;
  const fieldLabels = recordType === 'marriage' ? MARRIAGE_FIELD_LABELS : BAPTISM_FIELD_LABELS;
  
  const [fieldPositions, setFieldPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [placedFields, setPlacedFields] = useState<Set<string>>(new Set());
  const [draggingField, setDraggingField] = useState<string | null>(null);
  const [showCoordinates, setShowCoordinates] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [savedPositionsLoaded, setSavedPositionsLoaded] = useState(false);
  const [savedPositions, setSavedPositions] = useState<Record<string, { x: number; y: number }> | null>(null);
  const [driftWarnings, setDriftWarnings] = useState<Array<{ field: string; label: string; distance: number }>>([]);
  const [showDriftDialog, setShowDriftDialog] = useState(false);
  
  // Wizard state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteria[]>([{ field: '', value: '' }]);
  const [searchResults, setSearchResults] = useState<RecordData[]>([]);
  const [selectedRecords, setSelectedRecords] = useState<Set<number>>(new Set());
  const [searching, setSearching] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedCount, setGeneratedCount] = useState(0);
  
  // Preview state for wizard
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  
  // Refs
  const imageRef = useRef<HTMLImageElement>(null);
  const imageWrapperRef = useRef<HTMLDivElement>(null);

  const searchFields = recordType === 'marriage' ? MARRIAGE_SEARCH_FIELDS : BAPTISM_SEARCH_FIELDS;
  const wizardSteps = ['Search Criteria', 'Select Records', 'Preview & Adjust', 'Generate'];

  // Format date for display
  const formatDate = (dateStr: string | undefined): string => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  // Get field value for display
  const getFieldValue = (fieldName: string): string => {
    if (!recordData) return '';
    
    switch (fieldName) {
      case 'fullName': {
        const first = recordData.first_name || recordData.person_first || '';
        const last = recordData.last_name || recordData.person_last || '';
        return `${first} ${last}`.trim();
      }
      case 'birthDate':
        return formatDate(recordData.birth_date);
      case 'birthplace':
        return recordData.birthplace || '';
      case 'baptismDate':
        return formatDate(recordData.baptism_date || recordData.reception_date);
      case 'sponsors':
        return recordData.sponsors || recordData.godparents || '';
      case 'clergyBy':
      case 'clergyRector':
      case 'clergy':
        return recordData.clergy || '';
      case 'church':
        return recordData.churchName || '';
      case 'groomName': {
        const gFirst = recordData.fname_groom || recordData.groom_first || '';
        const gLast = recordData.lname_groom || recordData.groom_last || '';
        return `${gFirst} ${gLast}`.trim();
      }
      case 'brideName': {
        const bFirst = recordData.fname_bride || recordData.bride_first || '';
        const bLast = recordData.lname_bride || recordData.bride_last || '';
        return `${bFirst} ${bLast}`.trim();
      }
      case 'marriageDate':
        return formatDate(recordData.marriage_date);
      case 'witnesses':
        return recordData.witnesses || '';
      default:
        return '';
    }
  };

  // Remove a field from the certificate
  const removeField = (fieldName: string) => {
    setPlacedFields(prev => {
      const newSet = new Set(prev);
      newSet.delete(fieldName);
      return newSet;
    });
    setFieldPositions(prev => {
      const newPos = { ...prev };
      delete newPos[fieldName];
      return newPos;
    });
  };

  // Reset - remove all placed fields
  const resetPositions = () => {
    setFieldPositions({});
    setPlacedFields(new Set());
  };

  // Place all fields at saved or default positions
  const placeAllFields = () => {
    setFieldPositions(prev => {
      const newPos = { ...prev };
      Object.keys(fieldLabels).forEach(key => {
        if (!newPos[key]) {
          newPos[key] = defaultPositions[key] || { x: 300, y: 300 };
        }
      });
      return newPos;
    });
    setPlacedFields(new Set(Object.keys(fieldLabels)));
  };

  // Load saved positions for this church
  const loadSavedPositions = async (): Promise<Record<string, { x: number; y: number }> | null> => {
    try {
      const response = await fetch(`${API_BASE}/${churchId}/certificate/positions/${recordType}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.positions && !data.isDefault) {
          setSavedPositions(data.positions);
          setFieldPositions(data.positions);
          setPlacedFields(new Set(Object.keys(data.positions)));
          setSavedPositionsLoaded(true);
          setShowCoordinates(true); // Show coordinates by default when saved positions exist
          return data.positions;
        }
      }
    } catch (err) {
      console.warn('Could not load saved positions:', err);
    }
    return null;
  };

  // Check for coordinate drift from saved positions
  const checkCoordinateDrift = () => {
    if (!savedPositions || Object.keys(fieldPositions).length === 0) return;
    
    const DRIFT_THRESHOLD = 50; // pixels
    const warnings: Array<{ field: string; label: string; distance: number }> = [];
    
    Object.keys(fieldPositions).forEach(fieldName => {
      const current = fieldPositions[fieldName];
      const saved = savedPositions[fieldName];
      
      if (current && saved) {
        const distance = Math.sqrt(
          Math.pow(current.x - saved.x, 2) + Math.pow(current.y - saved.y, 2)
        );
        
        if (distance > DRIFT_THRESHOLD) {
          warnings.push({
            field: fieldName,
            label: fieldLabels[fieldName] || fieldName,
            distance: Math.round(distance),
          });
        }
      }
    });
    
    setDriftWarnings(warnings);
    if (warnings.length > 0) {
      setShowDriftDialog(true);
    }
  };

  // Revert to saved positions
  const revertToSaved = () => {
    if (savedPositions) {
      setFieldPositions(savedPositions);
      setPlacedFields(new Set(Object.keys(savedPositions)));
      setDriftWarnings([]);
      setShowDriftDialog(false);
      setSnackbar({ open: true, message: 'Reverted to saved positions', severity: 'success' });
    }
  };

  // Save positions for this church
  const savePositions = async () => {
    if (placedFields.size === 0) {
      setSnackbar({ open: true, message: 'No fields to save', severity: 'error' });
      return;
    }
    
    try {
      setSaving(true);
      const response = await fetch(`${API_BASE}/${churchId}/certificate/positions/${recordType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positions: fieldPositions }),
      });
      
      if (response.ok) {
        setSnackbar({ open: true, message: 'Positions saved! These will be used for all certificates of this type.', severity: 'success' });
        setSavedPositionsLoaded(true);
      } else {
        throw new Error('Failed to save');
      }
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to save positions', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Fetch blank template and record data
  const fetchData = useCallback(async () => {
    if (!recordId || !churchId) {
      setError('Missing required parameters: recordId and churchId');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [templateRes, recordRes] = await Promise.all([
        fetch(`${API_BASE}/${churchId}/certificate/${recordType}/template`),
        fetch(`${API_BASE}/${churchId}/certificate/${recordType}/${recordId}/preview`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fieldOffsets: {}, hiddenFields: Object.keys(fieldLabels) }),
        }),
      ]);

      if (templateRes.ok) {
        const templateData = await templateRes.json();
        if (templateData.success && templateData.template) {
          setTemplateUrl(templateData.template); setImageLoaded(false);
        }
      }

      if (recordRes.ok) {
        const recordResData = await recordRes.json();
        if (recordResData.success && recordResData.record) {
          setRecordData(recordResData.record);
        }
        if (!templateUrl && recordResData.preview) {
          setTemplateUrl(recordResData.preview);
        }
      }

      // Load saved positions
      await loadSavedPositions();

      if (!templateRes.ok && !recordRes.ok) {
        throw new Error('Failed to load certificate data');
      }

    } catch (err) {
      console.error('Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load certificate data');
    } finally {
      setLoading(false);
    }
  }, [recordId, churchId, recordType, fieldLabels]);

  useEffect(() => {
    fetchData();
  }, []);

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, fieldName: string) => {
    setDraggingField(fieldName);
    e.dataTransfer.setData('fieldName', fieldName);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const fieldName = e.dataTransfer.getData('fieldName') || draggingField;
    if (!fieldName || !imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const scaleX = imageRef.current.naturalWidth / rect.width;
    const scaleY = imageRef.current.naturalHeight / rect.height;
    
    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);
    
    setFieldPositions(prev => ({ ...prev, [fieldName]: { x, y } }));
    setPlacedFields(prev => new Set([...prev, fieldName]));
    setDraggingField(null);
  };

  const handleDragEnd = () => setDraggingField(null);

  const handleFieldMouseDown = (e: React.MouseEvent, fieldName: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startPos = fieldPositions[fieldName] || { x: 0, y: 0 };
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!imageRef.current) return;
      
      const rect = imageRef.current.getBoundingClientRect();
      const scaleX = imageRef.current.naturalWidth / rect.width;
      const scaleY = imageRef.current.naturalHeight / rect.height;
      
      const deltaX = (moveEvent.clientX - startX) * scaleX;
      const deltaY = (moveEvent.clientY - startY) * scaleY;
      
      setFieldPositions(prev => ({
        ...prev,
        [fieldName]: {
          x: Math.round(startPos.x + deltaX),
          y: Math.round(startPos.y + deltaY),
        },
      }));
    };
    
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      // Check for drift after drag ends
      setTimeout(() => checkCoordinateDrift(), 100);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Download single certificate
  // Preview PDF in new window
  const handlePreviewPDF = async () => {
    if (!recordId || !churchId) return;

    try {
      const positions: Record<string, { x: number; y: number }> = {};
      const hiddenFields: string[] = [];
      
      Object.keys(fieldLabels).forEach(key => {
        if (placedFields.has(key) && fieldPositions[key]) {
          positions[key] = fieldPositions[key];
        } else {
          hiddenFields.push(key);
        }
      });
      
      const response = await fetch(
        `${API_BASE}/${churchId}/certificate/${recordType}/${recordId}/download?positions=${encodeURIComponent(JSON.stringify(positions))}&hidden=${encodeURIComponent(JSON.stringify(hiddenFields))}`
      );

      if (!response.ok) throw new Error(`Preview failed: HTTP ${response.status}`);

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      console.error('Preview error:', err);
      setError(err instanceof Error ? err.message : 'Failed to preview certificate');
    }
  };

  const handleDownload = async () => {
    if (!recordId || !churchId) return;

    try {
      setDownloading(true);
      
      const positions: Record<string, { x: number; y: number }> = {};
      const hiddenFields: string[] = [];
      
      Object.keys(fieldLabels).forEach(key => {
        if (placedFields.has(key) && fieldPositions[key]) {
          positions[key] = fieldPositions[key];
        } else {
          hiddenFields.push(key);
        }
      });
      
      const response = await fetch(
        `${API_BASE}/${churchId}/certificate/${recordType}/${recordId}/download?positions=${encodeURIComponent(JSON.stringify(positions))}&hidden=${encodeURIComponent(JSON.stringify(hiddenFields))}`
      );

      if (!response.ok) throw new Error(`Download failed: HTTP ${response.status}`);

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${recordType}_certificate_${recordId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download error:', err);
      setError(err instanceof Error ? err.message : 'Failed to download certificate');
    } finally {
      setDownloading(false);
    }
  };

  // Wizard functions
  const openWizard = () => {
    setWizardOpen(true);
    setWizardStep(0);
    setSearchCriteria([{ field: '', value: '' }]);
    setSearchResults([]);
    setSelectedRecords(new Set());
    setGenerationProgress(0);
    setGeneratedCount(0);
  };

  const closeWizard = () => {
    setWizardOpen(false);
    setGenerating(false);
  };

  const addSearchCriteria = () => {
    setSearchCriteria(prev => [...prev, { field: '', value: '' }]);
  };

  const removeSearchCriteria = (index: number) => {
    if (searchCriteria.length > 1) {
      setSearchCriteria(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateSearchCriteria = (index: number, key: 'field' | 'value', value: string) => {
    setSearchCriteria(prev => {
      const newCriteria = [...prev];
      newCriteria[index] = { ...newCriteria[index], [key]: value };
      return newCriteria;
    });
  };

  const hasValidSearchCriteria = () => {
    return searchCriteria.some(c => c.field && c.value.trim());
  };

  const handleSearch = async () => {
    if (!hasValidSearchCriteria()) return;
    
    setSearching(true);
    try {
      const validCriteria = searchCriteria.filter(c => c.field && c.value.trim());
      const queryParams = new URLSearchParams();
      validCriteria.forEach(c => queryParams.append(c.field, c.value.trim()));
      
      const response = await fetch(
        `${API_BASE}/${churchId}/certificate/${recordType}/search?${queryParams.toString()}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.records || []);
        setWizardStep(1);
      } else {
        throw new Error('Search failed');
      }
    } catch (err) {
      setSnackbar({ open: true, message: 'Search failed. Please try again.', severity: 'error' });
    } finally {
      setSearching(false);
    }
  };

  const toggleRecordSelection = (id: number) => {
    setSelectedRecords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAllRecords = () => {
    setSelectedRecords(new Set(searchResults.map(r => r.id)));
  };

  const deselectAllRecords = () => {
    setSelectedRecords(new Set());
  };


  // Load preview for a specific record in wizard
  const loadPreview = async (recId: number) => {
    setLoadingPreview(true);
    try {
      // Use saved positions for preview, show all fields (no hidden fields)
      const positions = savedPositions || fieldPositions || {};
      const response = await fetch(
        `${API_BASE}/${churchId}/certificate/${recordType}/${recId}/preview`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fieldOffsets: positions, hiddenFields: [] }),
        }
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.preview) {
          setPreviewUrl(data.preview);
        }
      }
    } catch (err) {
      console.error('Preview load error:', err);
    } finally {
      setLoadingPreview(false);
    }
  };

  // Get selected records as array for navigation
  const selectedRecordsArray = Array.from(selectedRecords);
  
  // Navigate to specific preview
  const goToPreview = (index: number) => {
    if (index >= 0 && index < selectedRecordsArray.length) {
      setPreviewIndex(index);
      loadPreview(selectedRecordsArray[index]);
    }
  };

  // Get current preview record
  const currentPreviewRecord = selectedRecordsArray.length > 0 
    ? searchResults.find(r => r.id === selectedRecordsArray[previewIndex]) 
    : null;

  const generateBatchCertificates = async () => {
    if (selectedRecords.size === 0) return;
    
    setGenerating(true);
    setGenerationProgress(0);
    setGeneratedCount(0);
    
    // Load saved positions for this church
    let positions = fieldPositions;
    if (Object.keys(positions).length === 0) {
      const savedPos = await loadSavedPositions();
      if (savedPos) {
        positions = savedPos;
      } else {
        positions = defaultPositions;
      }
    }
    
    const hiddenFields = Object.keys(fieldLabels).filter(k => !positions[k]);
    const recordIds = Array.from(selectedRecords);
    const total = recordIds.length;
    
    // Create ZIP file
    const zip = new JSZip();
    let successCount = 0;
    
    for (let i = 0; i < recordIds.length; i++) {
      const recId = recordIds[i];
      try {
        const response = await fetch(
          `${API_BASE}/${churchId}/certificate/${recordType}/${recId}/download?positions=${encodeURIComponent(JSON.stringify(positions))}&hidden=${encodeURIComponent(JSON.stringify(hiddenFields))}`
        );
        
        if (response.ok) {
          const blob = await response.blob();
          // Get record info for filename
          const record = searchResults.find(r => r.id === recId);
          let filename = `${recordType}_${recId}.pdf`;
          if (record) {
            const lastName = (record.last_name || record.lname_groom || '').replace(/[^a-zA-Z]/g, '');
            const firstName = (record.first_name || record.fname_groom || '').replace(/[^a-zA-Z]/g, '');
            if (lastName && firstName) {
              filename = `${recordType}_${lastName}_${firstName}.pdf`;
            }
          }
          zip.file(filename, blob);
          successCount++;
          setGeneratedCount(successCount);
        }
      } catch (err) {
        console.error(`Failed to generate certificate for record ${recId}:`, err);
      }
      
      setGenerationProgress(((i + 1) / total) * 100);
    }
    
    // Generate and download ZIP
    if (successCount > 0) {
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${recordType}_certificates_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }
    
    setGenerating(false);
    setSnackbar({ open: true, message: `Generated ${successCount} certificates in ZIP file!`, severity: 'success' });
  };

  const getDisplayName = () => {
    if (!recordData) return '';
    if (recordType === 'marriage') {
      const groom = `${recordData.fname_groom || recordData.groom_first || ''} ${recordData.lname_groom || recordData.groom_last || ''}`.trim();
      const bride = `${recordData.fname_bride || recordData.bride_first || ''} ${recordData.lname_bride || recordData.bride_last || ''}`.trim();
      return `${groom} & ${bride}`;
    }
    return `${recordData.first_name || recordData.person_first || ''} ${recordData.last_name || recordData.person_last || ''}`.trim();
  };

  const handleGoBack = () => navigate(-1);

  const getScreenPosition = (fieldName: string) => {
    if (!imageRef.current || !imageWrapperRef.current) return null;
    
    const rect = imageRef.current.getBoundingClientRect();
    const wrapperRect = imageWrapperRef.current.getBoundingClientRect();
    const pos = fieldPositions[fieldName];
    if (!pos) return null;
    
    const scaleX = rect.width / imageRef.current.naturalWidth;
    const scaleY = rect.height / imageRef.current.naturalHeight;
    
    return {
      left: (rect.left - wrapperRect.left) + (pos.x * scaleX),
      top: (rect.top - wrapperRect.top) + (pos.y * scaleY),
    };
  };

  const getRecordDisplayName = (record: RecordData) => {
    if (recordType === 'marriage') {
      const groom = `${record.fname_groom || record.groom_first || ''} ${record.lname_groom || record.groom_last || ''}`.trim();
      const bride = `${record.fname_bride || record.bride_first || ''} ${record.lname_bride || record.bride_last || ''}`.trim();
      return `${groom} & ${bride}`;
    }
    return `${record.first_name || record.person_first || ''} ${record.last_name || record.person_last || ''}`.trim();
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Header */}
      <Paper sx={{ p: 1.5, flexShrink: 0 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={2}>
            <IconButton onClick={handleGoBack} size="small">
              <BackIcon />
            </IconButton>
            <Box>
              <Typography variant="h6">
                {recordType === 'marriage' ? 'Marriage' : 'Baptism'} Certificate Generator
              </Typography>
              {recordData && (
                <Typography variant="caption" color="text.secondary">{getDisplayName()}</Typography>
              )}
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              variant="outlined"
              size="small"
              startIcon={<AssignmentIcon />}
              onClick={openWizard}
            >
              Generate Report
            </Button>
            <Chip label={`Record #${recordId}`} size="small" variant="outlined" />
            <Chip label={`Church #${churchId}`} size="small" variant="outlined" />
            {savedPositionsLoaded && (
              <Chip label="Saved positions loaded" size="small" color="success" />
            )}
            {driftWarnings.length > 0 && (
              <Chip 
                label={`${driftWarnings.length} position changes`} 
                size="small" 
                color="warning" 
                icon={<WarningIcon />}
                onClick={() => setShowDriftDialog(true)}
                sx={{ cursor: 'pointer' }}
              />
            )}
          </Stack>
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mx: 2, mt: 1 }} action={<Button size="small" onClick={fetchData}>Retry</Button>}>
          {error}
        </Alert>
      )}

      {/* Main Content */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden', p: 2, gap: 2 }}>
        {/* Left Panel */}
        <Box sx={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2, overflow: 'auto' }}>
          <Card>
            <CardContent sx={{ py: 1 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold">Drag Fields</Typography>
                <Stack direction="row" spacing={0.5}>
                  <Tooltip title="Place All Fields">
                    <Button size="small" variant="outlined" onClick={placeAllFields} sx={{ minWidth: 'auto', px: 1 }}>
                      All
                    </Button>
                  </Tooltip>
                  <Tooltip title="Clear All">
                    <IconButton size="small" onClick={resetPositions}>
                      <ResetIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>
              
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Drag fields onto the certificate to place them.
              </Typography>
              
              <Divider sx={{ my: 1 }} />
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {Object.keys(fieldLabels).map((fieldName) => {
                  const isPlaced = placedFields.has(fieldName);
                  const value = getFieldValue(fieldName);
                  const displayValue = value || `[${fieldLabels[fieldName]}]`;
                  
                  return (
                    <Box
                      key={fieldName}
                      draggable
                      onDragStart={(e) => handleDragStart(e, fieldName)}
                      onDragEnd={handleDragEnd}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        p: 0.75,
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: isPlaced ? 'success.main' : 'grey.300',
                        bgcolor: isPlaced ? 'success.light' : 'background.paper',
                        cursor: 'grab',
                        opacity: isPlaced ? 0.6 : 1,
                        '&:hover': {
                          bgcolor: isPlaced ? 'success.light' : 'action.hover',
                          borderColor: isPlaced ? 'success.main' : 'primary.main',
                        },
                      }}
                    >
                      <DragIcon fontSize="small" color="action" />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1 }}>
                          {fieldLabels[fieldName]}
                        </Typography>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontWeight: 'medium',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            color: value ? 'text.primary' : 'text.disabled',
                          }}
                        >
                          {displayValue}
                        </Typography>
                      </Box>
                      {isPlaced && (
                        <Chip label="✓" size="small" color="success" sx={{ height: 20, '& .MuiChip-label': { px: 0.5 } }} />
                      )}
                    </Box>
                  );
                })}
              </Box>
            </CardContent>
          </Card>

          {/* Coordinates Toggle */}
          <Card>
            <CardContent sx={{ py: 1 }}>
              <FormControlLabel
                control={<Switch size="small" checked={showCoordinates} onChange={(e) => setShowCoordinates(e.target.checked)} />}
                label={<Typography variant="body2">Show coordinates</Typography>}
              />
              
              {showCoordinates && placedFields.size > 0 && (
                <Box sx={{ mt: 1, maxHeight: 150, overflow: 'auto' }}>
                  {Object.keys(fieldLabels).map((fieldName) => {
                    const pos = fieldPositions[fieldName];
                    if (!pos || !placedFields.has(fieldName)) return null;
                    return (
                      <Typography key={fieldName} variant="caption" sx={{ display: 'block' }}>
                        {fieldLabels[fieldName]}: ({pos.x}, {pos.y})
                      </Typography>
                    );
                  })}
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardContent sx={{ py: 1 }}>
              <Stack spacing={1}>
                <Button
                  variant="outlined"
                  fullWidth
                  size="small"
                  color="secondary"
                  startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                  onClick={savePositions}
                  disabled={saving || placedFields.size === 0}
                >
                  {saving ? 'Saving...' : 'Save Positions for Church'}
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  size="small"
                  startIcon={<SearchIcon />}
                  onClick={handlePreviewPDF}
                  disabled={loading || placedFields.size === 0}
                >
                  Preview PDF
                </Button>
                <Button
                  variant="contained"
                  fullWidth
                  size="small"
                  startIcon={downloading ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
                  onClick={handleDownload}
                  disabled={loading || downloading || placedFields.size === 0}
                >
                  {downloading ? 'Downloading...' : 'Download PDF'}
                </Button>
                <Button variant="outlined" fullWidth size="small" onClick={handleGoBack}>
                  Back to Records
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Box>

        {/* Right Panel - Certificate Preview */}
        <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 1, borderBottom: '1px solid #e0e0e0' }}>
            <Typography variant="subtitle2">
              Certificate Preview 
              {placedFields.size > 0 && (
                <Chip label={`${placedFields.size} fields`} size="small" sx={{ ml: 1 }} />
              )}
            </Typography>
            <Stack direction="row" alignItems="center" spacing={1}>
              <IconButton size="small" onClick={() => setZoom(z => Math.max(30, z - 10))}>
                <ZoomOutIcon fontSize="small" />
              </IconButton>
              <Slider value={zoom} onChange={(_, v) => setZoom(v as number)} min={30} max={150} sx={{ width: 80 }} size="small" />
              <IconButton size="small" onClick={() => setZoom(z => Math.min(150, z + 10))}>
                <ZoomInIcon fontSize="small" />
              </IconButton>
              <Typography variant="caption" sx={{ minWidth: 35 }}>{zoom}%</Typography>
              <Divider orientation="vertical" flexItem />
              <IconButton size="small" onClick={fetchData} disabled={loading}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>

          <Box
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'grey.200',
              overflow: 'auto',
              p: 2,
            }}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {loading ? (
              <Stack alignItems="center" spacing={2}>
                <CircularProgress />
                <Typography color="text.secondary">Loading template...</Typography>
              </Stack>
            ) : templateUrl ? (
              <Box ref={imageWrapperRef} sx={{ position: 'relative', display: 'inline-block' }}>
                <img
                  ref={imageRef}
                  src={templateUrl}
                  alt="Certificate Template"
                  onLoad={() => setImageLoaded(true)}
                  style={{
                    width: `${zoom}%`,
                    maxWidth: 'none',
                    objectFit: 'contain',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                    borderRadius: 4,
                    backgroundColor: 'white',
                    userSelect: 'none',
                  }}
                  draggable={false}
                />
                
                {imageLoaded && Array.from(placedFields).map((fieldName) => {
                  const screenPos = getScreenPosition(fieldName);
                  if (!screenPos) return null;
                  
                  const value = getFieldValue(fieldName);
                  const displayValue = value || `[${fieldLabels[fieldName]}]`;
                  
                  return (
                    <Box
                      key={fieldName}
                      onMouseDown={(e) => handleFieldMouseDown(e, fieldName)}
                      sx={{
                        position: 'absolute',
                        left: screenPos.left,
                        top: screenPos.top,
                        transform: 'translate(-50%, -50%)',
                        cursor: 'move',
                        zIndex: 10,
                        userSelect: 'none',
                      }}
                    >
                      <Box sx={{ position: 'relative' }}>
                        <Typography
                          sx={{
                            color: value ? '#000' : '#999',
                            fontWeight: 500,
                            fontSize: '11px',
                            whiteSpace: 'nowrap',
                            backgroundColor: 'rgba(255,255,255,0.9)',
                            padding: '3px 8px',
                            borderRadius: '3px',
                            border: '1px solid #1976d2',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                          }}
                        >
                          {displayValue}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={(e) => { e.stopPropagation(); removeField(fieldName); }}
                          sx={{
                            position: 'absolute',
                            top: -8,
                            right: -8,
                            width: 16,
                            height: 16,
                            bgcolor: 'error.main',
                            color: 'white',
                            '&:hover': { bgcolor: 'error.dark' },
                            p: 0,
                          }}
                        >
                          <CloseIcon sx={{ fontSize: 12 }} />
                        </IconButton>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            ) : (
              <Typography color="text.secondary">No template available</Typography>
            )}
          </Box>
        </Paper>
      </Box>

      {/* Toast Notification - Top Center */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Drift Warning Dialog */}
      <Dialog open={showDriftDialog} onClose={() => setShowDriftDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <WarningIcon color="warning" />
            <Typography>Position Changes Detected</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            The following fields have been moved significantly from their saved positions. 
            Would you like to save these new positions or revert to the saved ones?
          </Alert>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Field</TableCell>
                  <TableCell>Distance Moved</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {driftWarnings.map(warning => (
                  <TableRow key={warning.field}>
                    <TableCell>{warning.label}</TableCell>
                    <TableCell>{warning.distance}px</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDriftDialog(false)}>Keep Changes</Button>
          <Button onClick={revertToSaved} color="warning">Revert to Saved</Button>
          <Button onClick={() => { savePositions(); setShowDriftDialog(false); }} variant="contained" color="primary">
            Save New Positions
          </Button>
        </DialogActions>
      </Dialog>

      {/* Generate Report Wizard Dialog */}
      <Dialog open={wizardOpen} onClose={closeWizard} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">Generate Certificates</Typography>
            <IconButton onClick={closeWizard} size="small">
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        
        <DialogContent dividers>
          <Stepper activeStep={wizardStep} sx={{ mb: 3 }}>
            {wizardSteps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Step 1: Search Criteria */}
          {wizardStep === 0 && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Step 1:</strong> Define your search criteria to find records. You can use multiple fields to narrow down your search.
                  At least one field must have a value.
                </Typography>
              </Alert>
              
              <Typography variant="subtitle2" gutterBottom>Search Criteria</Typography>
              
              {searchCriteria.map((criteria, index) => (
                <Grid container spacing={2} key={index} sx={{ mb: 1 }}>
                  <Grid item xs={5}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Field</InputLabel>
                      <Select
                        value={criteria.field}
                        label="Field"
                        onChange={(e) => updateSearchCriteria(index, 'field', e.target.value)}
                      >
                        {searchFields.map(f => (
                          <MenuItem key={f.key} value={f.key}>{f.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={5}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Value"
                      type={searchFields.find(f => f.key === criteria.field)?.type === 'date' ? 'date' : 'text'}
                      value={criteria.value}
                      onChange={(e) => updateSearchCriteria(index, 'value', e.target.value)}
                      InputLabelProps={searchFields.find(f => f.key === criteria.field)?.type === 'date' ? { shrink: true } : undefined}
                    />
                  </Grid>
                  <Grid item xs={2}>
                    <IconButton 
                      onClick={() => removeSearchCriteria(index)} 
                      disabled={searchCriteria.length === 1}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Grid>
                </Grid>
              ))}
              
              <Button startIcon={<AddIcon />} onClick={addSearchCriteria} size="small" sx={{ mt: 1 }}>
                Add Criteria
              </Button>
            </Box>
          )}

          {/* Step 2: Select Records */}
          {wizardStep === 1 && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Step 2:</strong> Select the records you want to generate certificates for. 
                  You can select multiple records. A certificate will be generated for each selected record.
                </Typography>
              </Alert>
              
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="subtitle2">
                  Found {searchResults.length} records
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button size="small" onClick={selectAllRecords}>Select All</Button>
                  <Button size="small" onClick={deselectAllRecords}>Deselect All</Button>
                </Stack>
              </Stack>
              
              <TableContainer sx={{ maxHeight: 300 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedRecords.size === searchResults.length && searchResults.length > 0}
                          indeterminate={selectedRecords.size > 0 && selectedRecords.size < searchResults.length}
                          onChange={(e) => e.target.checked ? selectAllRecords() : deselectAllRecords()}
                        />
                      </TableCell>
                      <TableCell>ID</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Date</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {searchResults.map((record) => (
                      <TableRow 
                        key={record.id} 
                        hover 
                        onClick={() => toggleRecordSelection(record.id)}
                        selected={selectedRecords.has(record.id)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell padding="checkbox">
                          <Checkbox checked={selectedRecords.has(record.id)} />
                        </TableCell>
                        <TableCell>{record.id}</TableCell>
                        <TableCell>{getRecordDisplayName(record)}</TableCell>
                        <TableCell>
                          {formatDate(record.reception_date || record.baptism_date || record.marriage_date)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              
              {searchResults.length === 0 && (
                <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                  No records found. Try adjusting your search criteria.
                </Typography>
              )}
            </Box>
          )}

          {/* Step 3: Preview & Adjust */}
          {wizardStep === 2 && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Step 3:</strong> Preview certificates and adjust field positions if needed. 
                  Changes here apply to all certificates in this batch.
                </Typography>
              </Alert>
              
              <Stack direction="row" alignItems="center" justifyContent="center" spacing={2} sx={{ mb: 2 }}>
                <Button size="small" variant="outlined" onClick={() => goToPreview(previewIndex - 1)} disabled={previewIndex === 0}>Previous</Button>
                <Typography variant="body2">
                  Record {previewIndex + 1} of {selectedRecordsArray.length}
                  {currentPreviewRecord && <Typography component="span" color="text.secondary" sx={{ ml: 1 }}>({getRecordDisplayName(currentPreviewRecord)})</Typography>}
                </Typography>
                <Button size="small" variant="outlined" onClick={() => goToPreview(previewIndex + 1)} disabled={previewIndex >= selectedRecordsArray.length - 1}>Next</Button>
                <Button size="small" variant="contained" onClick={() => { if (selectedRecordsArray.length > 0) loadPreview(selectedRecordsArray[previewIndex]); }}>Refresh</Button>
              </Stack>
              
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                p: 2,
                minHeight: 550,
              }}>
                {loadingPreview ? (
                  <CircularProgress />
                ) : previewUrl ? (
                  <img src={previewUrl} alt="Certificate Preview" style={{ width: '100%', maxWidth: 650, height: 'auto', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', borderRadius: 4 }} />
                ) : (
                  <Typography color="text.secondary">Loading preview...</Typography>
                )}
              </Box>
            </Box>
          )}

          {/* Step 4: Generate */}
          {wizardStep === 3 && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Step 4:</strong> Review your selection and generate certificates. 
                  Each certificate will be downloaded as a separate PDF file.
                </Typography>
              </Alert>
              
              <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>Summary</Typography>
                  <Typography variant="body2">
                    • <strong>{selectedRecords.size}</strong> records selected
                  </Typography>
                  <Typography variant="body2">
                    • Certificate type: <strong>{recordType === 'marriage' ? 'Marriage' : 'Baptism'}</strong>
                  </Typography>
                  <Typography variant="body2">
                    • Church ID: <strong>{churchId}</strong>
                  </Typography>
                  <Typography variant="body2">
                    • Positions: <strong>{savedPositionsLoaded ? 'Saved (custom)' : 'Default'}</strong>
                  </Typography>
                </CardContent>
              </Card>
              
              {generating && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    Generating certificates... ({generatedCount} of {selectedRecords.size})
                  </Typography>
                  <LinearProgress variant="determinate" value={generationProgress} />
                </Box>
              )}
              
              {!generating && generatedCount > 0 && (
                <Alert severity="success" icon={<CheckCircleIcon />}>
                  Successfully generated {generatedCount} certificates!
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          {wizardStep > 0 && !generating && (
            <Button onClick={() => setWizardStep(prev => prev - 1)}>
              Back
            </Button>
          )}
          <Box sx={{ flex: 1 }} />
          {wizardStep === 0 && (
            <Button 
              variant="contained" 
              onClick={handleSearch}
              disabled={!hasValidSearchCriteria() || searching}
              startIcon={searching ? <CircularProgress size={16} /> : <SearchIcon />}
            >
              {searching ? 'Searching...' : 'Search Records'}
            </Button>
          )}
          {wizardStep === 1 && (
            <Button 
              variant="contained" 
              onClick={() => { setWizardStep(2); setPreviewIndex(0); if (selectedRecordsArray.length > 0) loadPreview(selectedRecordsArray[0]); }}
              disabled={selectedRecords.size === 0}
            >
              Preview ({selectedRecords.size} selected)
            </Button>
          )}
          {wizardStep === 2 && (
            <Button 
              variant="contained" 
              onClick={() => setWizardStep(3)}
            >
              Continue to Generate
            </Button>
          )}
          {wizardStep === 3 && (
            <Button 
              variant="contained" 
              color="primary"
              onClick={generateBatchCertificates}
              disabled={generating || selectedRecords.size === 0}
              startIcon={generating ? <CircularProgress size={16} /> : <DownloadIcon />}
            >
              {generating ? 'Generating...' : `Generate ${selectedRecords.size} Certificates`}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CertificateGeneratorPage;
