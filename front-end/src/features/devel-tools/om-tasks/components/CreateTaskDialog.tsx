/**
 * CreateTaskDialog.tsx
 * Dialog for creating new tasks with visibility control
 * Features: Persistent draft state, localStorage, drag-and-drop .md files
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Chip,
  Stack,
  Divider,
  Alert,
  Autocomplete,
  FormHelperText,
  Backdrop,
  CircularProgress
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  AttachFile as AttachFileIcon,
  CloudUpload as CloudUploadIcon,
  InsertDriveFile as FileIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';

// Categories from requirements
const TASK_CATEGORIES = [
  'Ingestion & Digitization',
  'Data Structuring & Accuracy',
  'Workflow & User Experience',
  'Platform & Infrastructure',
  'Analytics & Intelligence'
];

// Importance levels (B12-15 list - using common task priority levels)
const IMPORTANCE_LEVELS = [
  { value: 'critical', label: 'Critical', color: 'error' },
  { value: 'high', label: 'High', color: 'warning' },
  { value: 'medium', label: 'Medium', color: 'info' },
  { value: 'low', label: 'Low', color: 'default' }
];

// Status levels (1-7, including Assigned)
const TASK_STATUSES = [
  { value: 1, label: 'Not Started' },
  { value: 2, label: 'Assigned' },
  { value: 3, label: 'In Progress' },
  { value: 4, label: 'In Review' },
  { value: 5, label: 'Blocked' },
  { value: 6, label: 'On Hold' },
  { value: 7, label: 'Task Completed' }
];

// Visibility options
const VISIBILITY_OPTIONS = [
  { value: 'admin', label: 'Admin Only' },
  { value: 'public', label: 'Public' }
];

// Type options (required field)
const TASK_TYPES = [
  { value: 'documentation', label: 'Documentation', description: 'Descriptive overview of a feature/system (what it is, how it works at a high level)' },
  { value: 'configuration', label: 'Configuration', description: 'Setup, env vars, flags, settings, install/runtime configuration' },
  { value: 'reference', label: 'Reference', description: 'Authoritative, technical, exhaustive details (APIs, schemas, fields, rules, edge cases)' },
  { value: 'guide', label: 'Guide', description: 'Step-by-step, task-oriented instructions (how to do X)' }
];

// Predefined tag groups (seed list)
export const TAG_GROUPS = [
  {
    group: 'OCR & Ingestion',
    tags: [
      'ocr',
      'google-vision',
      'document-ai',
      'handwriting',
      'printed-text',
      'language-filtering',
      'bounding-box',
      'anchors',
      'layout-detection',
      'entry-detection',
      'confidence-threshold',
      'preprocessing',
      'image-quality',
      'dpi'
    ]
  },
  {
    group: 'Data & Records',
    tags: [
      'baptism',
      'marriage',
      'funeral',
      'clergy',
      'parish',
      'records',
      'schema',
      'field-mapping',
      'normalization',
      'validation',
      'duplicates',
      'historical-data'
    ]
  },
  {
    group: 'Workflow & UI',
    tags: [
      'fusion',
      'inspection-panel',
      'review-finalize',
      'drafts',
      'overlays',
      'highlights',
      'entry-editor',
      'empty-state',
      'autosave',
      'modal',
      'ux',
      'ui'
    ]
  },
  {
    group: 'Platform & Backend',
    tags: [
      'api',
      'database',
      'migrations',
      'auth',
      'roles',
      'permissions',
      'logging',
      'error-handling',
      'performance',
      'security',
      'backups',
      'infrastructure'
    ]
  },
  {
    group: 'Analytics & Intelligence',
    tags: [
      'analytics',
      'reports',
      'trends',
      'dashboards',
      'charts',
      'metrics',
      'omai',
      'bigbook',
      'search',
      'summarization',
      'insights'
    ]
  },
  {
    group: 'Documentation Meta',
    tags: [
      'docs',
      'reference',
      'guide',
      'configuration',
      'legacy',
      'task-history',
      'public',
      'admin-only'
    ]
  },
  {
    group: 'Status / Process',
    tags: [
      'blocked',
      'needs-review',
      'needs-design',
      'needs-backend',
      'needs-frontend',
      'high-risk',
      'breaking-change',
      'cleanup',
      'tech-debt'
    ]
  }
];

// Flatten all predefined tags for autocomplete
export const ALL_PREDEFINED_TAGS = TAG_GROUPS.flatMap(group => group.tags);

/**
 * Normalize tag to kebab-case
 * Converts spaces, underscores, and other separators to hyphens
 * Converts to lowercase
 */
export const normalizeTag = (tag: string): string => {
  return tag
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')  // Replace spaces and underscores with hyphens
    .replace(/[^a-z0-9-]/g, '')  // Remove invalid characters
    .replace(/-+/g, '-')  // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, '');  // Remove leading/trailing hyphens
};

interface TaskRevision {
  rev_index: number;
  rev_number: number | null;
  title: string;
  markdown: string;
}

interface TaskFormData {
  title: string;
  category: string;
  importance: string;
  details: string;
  tags: string[];
  attachments: string[];
  status: number;
  type: 'documentation' | 'configuration' | 'reference' | 'guide';
  visibility: 'admin' | 'public';
  date_created?: string;
  date_completed?: string;
  assignedTo?: string;
  assignedBy?: string;
  notes?: string;
  remindMe?: boolean;
  revisions?: TaskRevision[];
}

interface CreateTaskDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (taskData: TaskFormData) => Promise<void>;
}

const DRAFT_STORAGE_KEY = 'om_tasks:create_task_draft:v1';
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const DEBOUNCE_DELAY = 300; // ms

const CreateTaskDialog: React.FC<CreateTaskDialogProps> = ({ open, onClose, onSave }) => {
  // Load draft from localStorage on mount
  const loadDraft = (): TaskFormData => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Validate structure
        if (parsed && typeof parsed === 'object') {
          return {
            title: parsed.title || '',
            category: parsed.category || '',
            importance: parsed.importance || 'high',
            details: parsed.details || '',
            tags: Array.isArray(parsed.tags) ? parsed.tags : [],
            attachments: Array.isArray(parsed.attachments) ? parsed.attachments : [],
            status: parsed.status || 1,
            type: parsed.type || ('' as any),
            visibility: parsed.visibility || 'admin',
            assignedTo: parsed.assignedTo || 'Nick Parsells',
            assignedBy: parsed.assignedBy || 'system',
            notes: parsed.notes || '',
            remindMe: parsed.remindMe || false,
            revisions: Array.isArray(parsed.revisions) ? parsed.revisions : undefined
          };
        }
      }
    } catch (e) {
      console.warn('Failed to load draft:', e);
    }
    return {
      title: '',
      category: '',
      importance: 'high', // Default to High
      details: '',
      tags: [],
      attachments: [],
      status: 1,
      type: '' as any,
      visibility: 'admin',
      assignedTo: 'Nick Parsells', // Default
      assignedBy: 'system', // Default
      notes: '',
      remindMe: false,
      revisions: undefined
    };
  };

  const [formData, setFormData] = useState<TaskFormData>(loadDraft);
  const [tagInput, setTagInput] = useState('');
  const [attachmentInput, setAttachmentInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dropDialogOpen, setDropDialogOpen] = useState(false);
  const [droppedFile, setDroppedFile] = useState<{ name: string; content: string } | null>(null);
  const [parsedRevisions, setParsedRevisions] = useState<TaskRevision[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const detailsRef = useRef<HTMLTextAreaElement>(null);

  // Auto-fill date created (locked) - Use ISO string for API, format for display
  const now = new Date();
  const dateCreated = now.toISOString(); // For API: ISO format (YYYY-MM-DDTHH:MM:SS)
  const dateCreatedDisplay = now.toLocaleString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).replace(',', ''); // For display: MM/DD/YYYY HH:MM

  // Debounced save to localStorage
  const saveDraft = useCallback((data: TaskFormData) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(data));
        setHasUnsavedChanges(true);
      } catch (e) {
        console.warn('Failed to save draft:', e);
      }
    }, DEBOUNCE_DELAY);
  }, []);

  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      setHasUnsavedChanges(false);
    } catch (e) {
      console.warn('Failed to clear draft:', e);
    }
  }, []);

  // Restore draft when dialog opens
  useEffect(() => {
    if (open) {
      const draft = loadDraft();
      setFormData(draft);
      setHasUnsavedChanges(Object.values(draft).some(v => {
        if (Array.isArray(v)) return v.length > 0;
        if (typeof v === 'string') return v.trim().length > 0;
        if (typeof v === 'number') return v !== 1; // status default is 1
        if (typeof v === 'boolean') return v !== false;
        return v !== '' && v !== null && v !== undefined;
      }));
    }
  }, [open]);

  const handleChange = (field: keyof TaskFormData, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-add default tag based on type
      if (field === 'type' && value) {
        const defaultTags: Record<string, string> = {
          'documentation': 'document-ai',
          'configuration': 'config-ai',
          'reference': 'reference-ai',
          'guide': 'guide-ai'
        };
        
        const defaultTag = defaultTags[value];
        if (defaultTag && !updated.tags.includes(defaultTag)) {
          updated.tags = [...updated.tags, defaultTag];
        }
      }
      
      saveDraft(updated);
      return updated;
    });
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleAddTag = (tagValue?: string) => {
    const tagToAdd = normalizeTag(tagValue || tagInput);
    if (tagToAdd && !formData.tags.includes(tagToAdd)) {
      handleChange('tags', [...formData.tags, tagToAdd]);
      setTagInput('');
    }
  };

  const handleTagSelect = (selectedTags: string[]) => {
    // Normalize all tags and remove duplicates
    const normalizedTags = selectedTags
      .map(tag => normalizeTag(tag))
      .filter((tag, index, self) => tag && self.indexOf(tag) === index);
    handleChange('tags', normalizedTags);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    handleChange('tags', formData.tags.filter(tag => tag !== tagToRemove));
  };

  const handleAddAttachment = () => {
    if (attachmentInput.trim() && !formData.attachments.includes(attachmentInput.trim())) {
      handleChange('attachments', [...formData.attachments, attachmentInput.trim()]);
      setAttachmentInput('');
    }
  };

  const handleRemoveAttachment = (attachmentToRemove: string) => {
    handleChange('attachments', formData.attachments.filter(att => att !== attachmentToRemove));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (!formData.importance) {
      newErrors.importance = 'Importance is required';
    }

    if (!formData.details.trim()) {
      newErrors.details = 'Details are required';
    }

    if (formData.tags.length === 0) {
      newErrors.tags = 'At least one tag is required';
    }

    if (!formData.type) {
      newErrors.type = 'Type is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    const emptyForm: TaskFormData = {
      title: '',
      category: '',
      importance: '',
      details: '',
      tags: [],
      attachments: [],
      status: 1,
      type: '' as any,
      visibility: 'admin',
      assignedTo: '',
      assignedBy: '',
      notes: '',
      remindMe: false,
      revisions: undefined
    };
    setFormData(emptyForm);
    setTagInput('');
    setAttachmentInput('');
    setErrors({});
    clearDraft();
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    setErrors({}); // Clear previous errors
    try {
      // Prepare task data with date_completed if status is "Task Completed" (6)
      const taskData = {
        ...formData,
        date_created: dateCreated,
        date_completed: formData.status === 7 ? dateCreated : undefined
      };
      
      const result = await onSave(taskData);
      
      // Check if result indicates failure
      if (result && result.success === false) {
        throw new Error(result.error || 'Failed to create task');
      }
      
      // Clear draft and reset form on success
      resetForm();
      onClose();
    } catch (error: any) {
      console.error('Error saving task:', error);
      console.error('Error details:', error.details);
      
      let errorMessage = error.message || 'Failed to create task. Please check your connection and try again.';
      
      // Include SQL error details if available (for debugging)
      if (error.details && error.details.sqlMessage) {
        errorMessage += `\n\nSQL Error: ${error.details.sqlMessage}`;
        if (error.details.code) {
          errorMessage += `\nError Code: ${error.details.code}`;
        }
      }
      
      setErrors({ submit: errorMessage });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (saving) return;
    
    // Check if there are unsaved changes
    if (hasUnsavedChanges) {
      setDiscardConfirmOpen(true);
    } else {
      resetForm();
      onClose();
    }
  };

  const handleDiscardConfirm = () => {
    resetForm();
    setDiscardConfirmOpen(false);
    onClose();
  };

  const handleDiscardCancel = () => {
    setDiscardConfirmOpen(false);
  };

  // Drag and drop handlers
  const dragCounterRef = useRef(0);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const mdFile = files.find(f => 
      f.name.endsWith('.md') || 
      f.name.endsWith('.txt') ||
      f.type === 'text/markdown' ||
      f.type === 'text/plain'
    );

    if (!mdFile) {
      setErrors({ submit: 'Please drop a .md or .txt file' });
      return;
    }

    if (mdFile.size > MAX_FILE_SIZE) {
      setErrors({ submit: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` });
      return;
    }

    try {
      const content = await readFileAsText(mdFile);
      
      // Parse first 13 lines for metadata
      const allLines = content.split('\n');
      const parseMetadataLine = (line: string, prefix: string): string => {
        const trimmed = line.trim();
        if (trimmed.toLowerCase().startsWith(prefix.toLowerCase() + ':')) {
          return trimmed.substring(prefix.length + 1).trim();
        }
        return '';
      };
      
      // Parse lines 1-13
      const metadata: Partial<TaskFormData> = {};
      
      // Line 1: Title
      if (allLines[0]) {
        const title = parseMetadataLine(allLines[0], 'Title');
        if (title) metadata.title = title;
      }
      
      // Line 2: Category
      if (allLines[1]) {
        const category = parseMetadataLine(allLines[1], 'Category');
        if (category) metadata.category = category;
      }
      
      // Line 3: Importance (default to "High" if not specified)
      if (allLines[2]) {
        const importance = parseMetadataLine(allLines[2], 'Importance');
        metadata.importance = importance || 'high';
      } else {
        metadata.importance = 'high';
      }
      
      // Line 4: Details (starts here, may continue)
      if (allLines[3]) {
        const detailsStart = parseMetadataLine(allLines[3], 'Details');
        // Details may continue on subsequent lines until next metadata field
        let details = detailsStart;
        for (let i = 4; i < 13 && i < allLines.length; i++) {
          const line = allLines[i].trim();
          // Stop if we hit another metadata field
          if (line.match(/^(Title|Category|Importance|Type|tags|Attachment|Status|Visibility|Date|Optional|Assigned):/i)) {
            break;
          }
          if (line) {
            details += (details ? '\n' : '') + line;
          }
        }
        if (details) metadata.details = details;
      }
      
      // Line 5: Type
      if (allLines[4]) {
        const type = parseMetadataLine(allLines[4], 'Type');
        if (type) {
          // Normalize type value
          const normalizedType = type.toLowerCase();
          if (['documentation', 'configuration', 'reference', 'guide'].includes(normalizedType)) {
            metadata.type = normalizedType as any;
          }
        }
      }
      
      // Line 6: tags (lowercase)
      if (allLines[5]) {
        const tagsStr = parseMetadataLine(allLines[5], 'tags');
        if (tagsStr) {
          const tags = tagsStr.split(',').map(t => normalizeTag(t.trim())).filter(t => t);
          metadata.tags = tags;
        }
      }
      
      // Line 7: Attachment Link
      if (allLines[6]) {
        const attachment = parseMetadataLine(allLines[6], 'Attachment Link');
        if (attachment) {
          metadata.attachments = [attachment];
        }
      }
      
      // Line 8: Status (map "Assigned" to status 2)
      if (allLines[7]) {
        const statusStr = parseMetadataLine(allLines[7], 'Status');
        if (statusStr) {
          const statusMap: Record<string, number> = {
            'not started': 1,
            'assigned': 2,
            'in progress': 3,
            'in review': 4,
            'blocked': 5,
            'on hold': 6,
            'task completed': 7,
            'completed': 7
          };
          const normalizedStatus = statusStr.toLowerCase();
          if (statusMap[normalizedStatus] !== undefined) {
            metadata.status = statusMap[normalizedStatus];
          }
        }
      }
      
      // Line 9: Visibility
      if (allLines[8]) {
        const visibility = parseMetadataLine(allLines[8], 'Visibility');
        if (visibility) {
          const normalized = visibility.toLowerCase();
          if (normalized.includes('admin')) {
            metadata.visibility = 'admin';
          } else if (normalized.includes('public')) {
            metadata.visibility = 'public';
          }
        }
      }
      
      // Line 10: Date Created (skip, auto-filled)
      
      // Line 11: Assigned To (default "Nick Parsells")
      if (allLines[10]) {
        const assignedTo = parseMetadataLine(allLines[10], 'Optional Fields: Assigned To');
        metadata.assignedTo = assignedTo || 'Nick Parsells';
      } else {
        metadata.assignedTo = 'Nick Parsells';
      }
      
      // Line 12: Assigned By (default "system")
      if (allLines[11]) {
        const assignedBy = parseMetadataLine(allLines[11], 'Assigned by');
        metadata.assignedBy = assignedBy || 'system';
      } else {
        metadata.assignedBy = 'system';
      }
      
      // Line 13: Notes
      if (allLines[12]) {
        const notes = allLines[12].trim();
        if (notes && !notes.toLowerCase().startsWith('notes:')) {
          metadata.notes = notes;
        }
      }
      
      // Apply parsed metadata to form (only if field is empty)
      Object.entries(metadata).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          const currentValue = formData[key as keyof TaskFormData];
          // Only set if current value is empty
          if (!currentValue || (Array.isArray(currentValue) && currentValue.length === 0)) {
            handleChange(key as keyof TaskFormData, value);
          }
        }
      });
      
      const revisions = parseRevisions(content);
      
      // Validate: check if any Title: markers were found
      if (revisions.length === 0) {
        setParseError('No Title: markers found. Import expects Title: lines.');
        setDroppedFile({ name: mdFile.name, content });
        setParsedRevisions([]);
      } else {
        setParseError(null);
        setDroppedFile({ name: mdFile.name, content });
        setParsedRevisions(revisions);
      }
      setDropDialogOpen(true);
    } catch (error: any) {
      setErrors({ submit: `Failed to read file: ${error.message}` });
    }
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target?.result as string);
      };
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      reader.readAsText(file);
    });
  };

  /**
   * Parse markdown file for revision markers (Title: lines with rev numbers)
   * Returns array of revision objects in file order
   */
  const parseRevisions = (content: string): TaskRevision[] => {
    const lines = content.split('\n');
    const revisions: TaskRevision[] = [];
    let currentSection: { title: string; content: string[]; rev_number: number | null } | null = null;
    let rev_index = 0;
    let foundFirstTitle = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Match Title: lines (case-insensitive, allow leading whitespace)
      const titleMatch = line.match(/^\s*Title:\s*(.+)\s*$/i);
      
      if (titleMatch) {
        foundFirstTitle = true;
        
        // Save previous section if exists
        if (currentSection) {
          revisions.push({
            rev_index: rev_index++,
            rev_number: currentSection.rev_number,
            title: currentSection.title,
            markdown: currentSection.content.join('\n')
          });
        }

        // Extract title text
        const titleText = titleMatch[1].trim();
        
        // Try to extract rev number: rev1, rev 1, rev-1, – rev1, etc.
        const revMatch = titleText.match(/rev\s*[-(]?\s*(\d+)\s*[)]?/i);
        const rev_number = revMatch ? parseInt(revMatch[1], 10) : null;

        // Start new section
        currentSection = {
          title: titleText,
          content: [],
          rev_number
        };
      } else {
        // Add line to current section content
        if (currentSection) {
          currentSection.content.push(line);
        } else if (!foundFirstTitle) {
          // Content before first Title: line - create intro section
          if (!currentSection) {
            currentSection = {
              title: 'OM-tasks creation and revisions',
              content: [],
              rev_number: null
            };
          }
          currentSection.content.push(line);
        }
      }
    }

    // Save last section
    if (currentSection) {
      revisions.push({
        rev_index: rev_index++,
        rev_number: currentSection.rev_number,
        title: currentSection.title,
        markdown: currentSection.content.join('\n')
      });
    }

    return revisions;
  };

  /**
   * Get display label for a revision
   */
  const getRevisionLabel = (revision: TaskRevision): string => {
    if (revision.rev_number !== null) {
      return `rev${revision.rev_number}`;
    }
    return revision.title || 'intro';
  };

  const handleDropAction = (action: 'replace' | 'append' | 'attach' | 'import_revisions') => {
    if (!droppedFile) return;

    if (action === 'import_revisions') {
      // Import as revisions - store revisions in form data
      if (parsedRevisions.length > 0) {
        handleChange('revisions', parsedRevisions);
        // Also set details to full content for backward compatibility
        handleChange('details', droppedFile.content);
      }
    } else if (action === 'replace') {
      if (formData.details.trim()) {
        // Confirm replace if details already has content
        if (window.confirm('Replace existing Details content?')) {
          handleChange('details', droppedFile.content);
          // Clear revisions if replacing
          handleChange('revisions', undefined);
        } else {
          setDropDialogOpen(false);
          setDroppedFile(null);
          setParsedRevisions([]);
          setParseError(null);
          return;
        }
      } else {
        handleChange('details', droppedFile.content);
        handleChange('revisions', undefined);
      }
    } else if (action === 'append') {
      const separator = formData.details.trim() ? '\n\n---\n\n' : '';
      handleChange('details', formData.details + separator + droppedFile.content);
      // Don't modify revisions on append
    } else if (action === 'attach') {
      // For now, we'll store the filename in attachments
      // In a real implementation, you'd upload the file and get a URL
      const attachmentUrl = `[Local: ${droppedFile.name}]`;
      if (!formData.attachments.includes(attachmentUrl)) {
        handleChange('attachments', [...formData.attachments, attachmentUrl]);
      }
    }

    setDropDialogOpen(false);
    setDroppedFile(null);
    setParsedRevisions([]);
    setParseError(null);
  };

  const handleDropDialogCancel = () => {
    setDropDialogOpen(false);
    setDroppedFile(null);
    setParsedRevisions([]);
    setParseError(null);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Check if status is "Task Completed" (status 6)
  const isCompleted = formData.status === 7;

  return (
    <>
      <Dialog 
        open={open} 
        onClose={handleClose} 
        maxWidth="md" 
        fullWidth
        disableEscapeKeyDown={hasUnsavedChanges}
        onBackdropClick={(e) => {
          if (hasUnsavedChanges) {
            e.preventDefault();
            handleClose();
          }
        }}
      >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Create New Task</Typography>
          <Chip
            label={formData.visibility === 'admin' ? 'Admin Only' : 'Public'}
            color={formData.visibility === 'admin' ? 'default' : 'primary'}
            size="small"
          />
        </Box>
      </DialogTitle>
      <DialogContent>
        {errors.submit && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrors(prev => ({ ...prev, submit: '' }))}>
            {errors.submit}
          </Alert>
        )}

        <Stack spacing={3} sx={{ mt: 1 }}>
          {/* Title - Required */}
          <TextField
            fullWidth
            label="Title"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            error={!!errors.title}
            helperText={errors.title}
            required
          />

          {/* Category - Required */}
          <FormControl fullWidth required error={!!errors.category}>
            <InputLabel>Category</InputLabel>
            <Select
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value)}
              label="Category"
            >
              {TASK_CATEGORIES.map((category) => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </Select>
            {errors.category && <FormHelperText>{errors.category}</FormHelperText>}
          </FormControl>

          {/* Importance - Required */}
          <FormControl fullWidth required error={!!errors.importance}>
            <InputLabel>Importance</InputLabel>
            <Select
              value={formData.importance}
              onChange={(e) => handleChange('importance', e.target.value)}
              label="Importance"
            >
              {IMPORTANCE_LEVELS.map((level) => (
                <MenuItem key={level.value} value={level.value}>
                  {level.label}
                </MenuItem>
              ))}
            </Select>
            {errors.importance && <FormHelperText>{errors.importance}</FormHelperText>}
          </FormControl>

          {/* Details - Required - Large resizable with drag-and-drop */}
          <Box
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            sx={{
              position: 'relative',
              border: isDragging ? '2px dashed #8c249d' : '1px solid transparent',
              borderRadius: 1,
              bgcolor: isDragging ? 'action.hover' : 'transparent',
              transition: 'all 0.2s',
              minHeight: '400px'
            }}
          >
            {isDragging && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 10,
                  bgcolor: 'rgba(140, 36, 157, 0.15)',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: 2,
                  pointerEvents: 'none'
                }}
              >
                <CloudUploadIcon sx={{ fontSize: 48, color: '#8c249d' }} />
                <Typography variant="h6" color="primary" fontWeight="bold">
                  Drop .md file to import
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Release to add content to Details
                </Typography>
              </Box>
            )}
            <TextField
              inputRef={detailsRef}
              fullWidth
              label="Details"
              multiline
              minRows={12}
              maxRows={30}
              value={formData.details}
              onChange={(e) => handleChange('details', e.target.value)}
              error={!!errors.details}
              helperText={errors.details || 'Drag and drop .md or .txt files here to import'}
              required
              sx={{
                '& .MuiInputBase-root': {
                  minHeight: '400px'
                },
                '& textarea': {
                  resize: 'vertical',
                  minHeight: '400px !important',
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  lineHeight: 1.6
                }
              }}
            />
          </Box>

          {/* Type - Required */}
          <FormControl fullWidth required error={!!errors.type}>
            <InputLabel>Type</InputLabel>
            <Select
              value={formData.type || ''}
              onChange={(e) => handleChange('type', e.target.value)}
              label="Type"
            >
              {TASK_TYPES.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  <Box>
                    <Typography variant="body1">{type.label}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {type.description}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
            {errors.type && <FormHelperText>{errors.type}</FormHelperText>}
            {!errors.type && (
              <FormHelperText>
                Category = domain (Ingestion, Workflow, etc.). Type = content nature (doc vs guide vs reference).
              </FormHelperText>
            )}
          </FormControl>

          {/* Tags - Required (at least one) - Autocomplete with predefined tags */}
          <Box>
            <Typography variant="body2" gutterBottom>
              Tags <span style={{ color: 'red' }}>*</span>
            </Typography>
            <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
              {formData.tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  onDelete={() => handleRemoveTag(tag)}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Box>
            <Autocomplete
              multiple
              freeSolo
              options={ALL_PREDEFINED_TAGS}
              value={formData.tags}
              onChange={(_, newValue) => {
                handleTagSelect(newValue);
                setTagInput(''); // Clear input after selection
              }}
              inputValue={tagInput}
              onInputChange={(_, newInputValue, reason) => {
                // Only normalize on input, not on selection
                if (reason === 'input') {
                  setTagInput(newInputValue);
                } else {
                  setTagInput('');
                }
              }}
              groupBy={(option) => {
                // Find which group this tag belongs to
                const group = TAG_GROUPS.find(g => g.tags.includes(option));
                return group ? group.group : 'Custom';
              }}
              renderGroup={(params) => (
                <Box key={params.key}>
                  <Typography
                    variant="caption"
                    sx={{
                      px: 1.5,
                      py: 0.5,
                      fontWeight: 'bold',
                      color: 'text.secondary',
                      bgcolor: 'grey.100',
                      display: 'block'
                    }}
                  >
                    {params.group}
                  </Typography>
                  {params.children}
                </Box>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  placeholder="Type or select tags (kebab-case enforced)"
                  helperText={errors.tags || `${formData.tags.length} tag(s) selected. Tags are normalized to kebab-case.`}
                  error={!!errors.tags}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && tagInput.trim()) {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                />
              )}
              renderOption={(props, option) => (
                <Box component="li" {...props} key={option}>
                  {option}
                </Box>
              )}
              getOptionLabel={(option) => typeof option === 'string' ? option : option}
              filterOptions={(options, params) => {
                const filtered = options.filter(option =>
                  option.toLowerCase().includes(params.inputValue.toLowerCase())
                );
                
                // If input doesn't match any predefined tag, allow custom entry
                if (params.inputValue && !filtered.includes(params.inputValue)) {
                  const normalized = normalizeTag(params.inputValue);
                  if (normalized && !filtered.includes(normalized)) {
                    filtered.push(normalized);
                  }
                }
                
                return filtered;
              }}
              sx={{ mb: 1 }}
            />
            {errors.tags && (
              <FormHelperText error sx={{ mt: 0.5 }}>
                {errors.tags}
              </FormHelperText>
            )}
          </Box>

          {/* Attachments - Optional */}
          <Box>
            <Typography variant="body2" gutterBottom>
              Attachments (Links to .md or other docs)
            </Typography>
            <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
              {formData.attachments.map((attachment, index) => (
                <Chip
                  key={index}
                  label={attachment.length > 30 ? `${attachment.substring(0, 30)}...` : attachment}
                  onDelete={() => handleRemoveAttachment(attachment)}
                  size="small"
                  icon={<AttachFileIcon />}
                />
              ))}
            </Box>
            <Box display="flex" gap={1}>
              <TextField
                size="small"
                fullWidth
                placeholder="https://example.com/doc.md"
                value={attachmentInput}
                onChange={(e) => setAttachmentInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddAttachment();
                  }
                }}
              />
              <Button size="small" onClick={handleAddAttachment} disabled={!attachmentInput.trim()}>
                Add
              </Button>
            </Box>
          </Box>

          {/* Status - Required */}
          <FormControl fullWidth required>
            <InputLabel>Status</InputLabel>
            <Select
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
              label="Status"
            >
              {TASK_STATUSES.map((status) => (
                <MenuItem key={status.value} value={status.value}>
                  {status.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Visibility - Required (New Field) */}
          <FormControl fullWidth required>
            <InputLabel>Visibility</InputLabel>
            <Select
              value={formData.visibility}
              onChange={(e) => handleChange('visibility', e.target.value as 'admin' | 'public')}
              label="Visibility"
            >
              {VISIBILITY_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>
              {formData.visibility === 'admin' 
                ? 'Only admins and superadmins can view this task'
                : 'Anyone can view this task on public pages'}
            </FormHelperText>
          </FormControl>

          <Divider />

          {/* Date Created - Auto-filled and locked */}
          <TextField
            fullWidth
            label="Date Created"
            value={dateCreatedDisplay}
            disabled
            helperText="Automatically set to current date and time"
          />

          {/* Date Completed - Auto-filled when status is "Task Completed" */}
          {isCompleted && (
            <TextField
              fullWidth
              label="Date Completed"
              value={dateCreatedDisplay}
              disabled
              helperText="Automatically set when task is marked as completed"
            />
          )}

          <Divider />

          {/* Optional Fields */}
          <Typography variant="subtitle2" color="text.secondary">
            Optional Fields
          </Typography>

          <TextField
            fullWidth
            label="Assigned To"
            value={formData.assignedTo}
            onChange={(e) => handleChange('assignedTo', e.target.value)}
            placeholder="Email or username"
          />

          <TextField
            fullWidth
            label="Assigned By"
            value={formData.assignedBy}
            onChange={(e) => handleChange('assignedBy', e.target.value)}
            placeholder="Email or username"
          />

          <TextField
            fullWidth
            label="Notes"
            multiline
            rows={3}
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="Additional notes or context"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={saving} startIcon={<CancelIcon />}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving || !formData.type}
          startIcon={saving ? null : <SaveIcon />}
          sx={{ bgcolor: '#8c249d', '&:hover': { bgcolor: '#6a1b9a' } }}
        >
          {saving ? 'Creating...' : 'Create Task'}
        </Button>
      </DialogActions>
    </Dialog>

    {/* Discard Confirmation Dialog */}
    <Dialog open={discardConfirmOpen} onClose={handleDiscardCancel}>
      <DialogTitle>Discard Draft?</DialogTitle>
      <DialogContent>
        <Typography>
          You have unsaved changes. Are you sure you want to discard them?
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleDiscardCancel}>Keep Editing</Button>
        <Button onClick={handleDiscardConfirm} color="error" variant="contained">
          Discard
        </Button>
      </DialogActions>
    </Dialog>

    {/* Drop Action Dialog */}
    <Dialog open={dropDialogOpen} onClose={handleDropDialogCancel} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <FileIcon />
          <Typography>Import {droppedFile?.name}</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        {parseError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {parseError}
          </Alert>
        )}

        {parsedRevisions.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom fontWeight="bold">
              Parsed Revisions ({parsedRevisions.length})
            </Typography>
            <Typography variant="caption" color="text.secondary" gutterBottom display="block" sx={{ mb: 2 }}>
              Revisions found in file order:
            </Typography>
            <Box sx={{ maxHeight: '400px', overflowY: 'auto' }}>
              {parsedRevisions.map((revision, index) => (
                <Accordion key={revision.rev_index} defaultExpanded={false}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                      <Chip
                        label={getRevisionLabel(revision)}
                        size="small"
                        color={revision.rev_number !== null ? 'primary' : 'default'}
                        sx={{ minWidth: '60px' }}
                      />
                      <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                        {revision.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {revision.markdown.split('\n').length} lines
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box
                      component="pre"
                      sx={{
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                        bgcolor: 'grey.50',
                        p: 2,
                        borderRadius: 1,
                        maxHeight: '300px',
                        overflow: 'auto',
                        border: '1px solid',
                        borderColor: 'divider'
                      }}
                    >
                      {revision.markdown}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          </Box>
        )}

        <Typography variant="body2" color="text.secondary" gutterBottom>
          Choose how to handle the dropped file:
        </Typography>
        <Stack spacing={2} sx={{ mt: 2 }}>
          {parsedRevisions.length > 0 && (
            <Button
              variant="contained"
              fullWidth
              onClick={() => handleDropAction('import_revisions')}
              disabled={!droppedFile || parsedRevisions.length === 0}
              sx={{ bgcolor: '#8c249d', '&:hover': { bgcolor: '#6a1b9a' } }}
            >
              Import as Revisions ({parsedRevisions.length} sections)
            </Button>
          )}
          <Button
            variant="outlined"
            fullWidth
            onClick={() => handleDropAction('replace')}
            disabled={!droppedFile}
          >
            Replace Details
          </Button>
          <Button
            variant={parsedRevisions.length === 0 ? 'contained' : 'outlined'}
            fullWidth
            onClick={() => handleDropAction('append')}
            disabled={!droppedFile}
            sx={parsedRevisions.length === 0 ? { bgcolor: '#8c249d', '&:hover': { bgcolor: '#6a1b9a' } } : {}}
          >
            Append to Details {parsedRevisions.length === 0 && '(Default)'}
          </Button>
          <Button
            variant="outlined"
            fullWidth
            onClick={() => handleDropAction('attach')}
            disabled={!droppedFile}
            startIcon={<AttachFileIcon />}
          >
            Attach as File Only
          </Button>
        </Stack>
        {droppedFile && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
            File size: {(droppedFile.content.length / 1024).toFixed(2)} KB
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleDropDialogCancel}>Cancel</Button>
      </DialogActions>
    </Dialog>
    </>
  );
};

export default CreateTaskDialog;

