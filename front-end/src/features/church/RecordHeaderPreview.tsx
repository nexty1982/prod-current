import {
    Close as CloseIcon,
    CloudUpload as CloudUploadIcon,
    PhotoLibrary as PhotoLibraryIcon,
    Settings as SettingsIcon,
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Drawer,
    FormControl,
    FormControlLabel,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Slider,
    Stack,
    Switch,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react';
import RecordHeaderBanner from './RecordHeaderBanner';

interface RecordHeaderPreviewProps {
  churchId: number;
  recordSettings: any;
  setRecordSettings: (updater: (prev: any) => any) => void;
  onImageUpload: (type: string, file: File) => void;
  recordType?: 'baptism' | 'marriage' | 'funeral'; // Record type for correct image
  churchName?: string; // Church name to display in header
}

const RecordHeaderPreview: React.FC<RecordHeaderPreviewProps> = ({
  churchId,
  recordSettings,
  setRecordSettings,
  onImageUpload,
  recordType = 'baptism',
  churchName,
}) => {
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [configType, setConfigType] = useState<string | null>(null);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageType, setImageType] = useState<string | null>(null);

  // Available images from church Image Sources
  const [availableImages, setAvailableImages] = useState<Array<{ filename: string; relative_path: string; serve_url: string; size: number; source_label: string; source_path_id: number }>>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [imagesError, setImagesError] = useState<string | null>(null);

  const fetchAvailableImages = useCallback(async () => {
    if (!churchId) return;
    setImagesLoading(true);
    setImagesError(null);
    try {
      const response = await fetch(`/api/gallery/churches/${churchId}/available-images`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setAvailableImages(data.images || []);
      } else {
        setImagesError('Failed to load images from Image Sources');
      }
    } catch (err) {
      setImagesError('Error loading available images');
    } finally {
      setImagesLoading(false);
    }
  }, [churchId]);

  // Fetch available images when config drawer opens
  useEffect(() => {
    if (configDialogOpen) {
      fetchAvailableImages();
    }
  }, [configDialogOpen, fetchAvailableImages]);

  // Helper: select an available image for a given library type
  const handleSelectImage = (serveUrl: string, libraryKey: string) => {
    setRecordSettings((prev: any) => {
      const imageLibrary = prev.imageLibrary || {};
      const currentImages = imageLibrary[libraryKey] || [];
      // Avoid duplicates
      if (currentImages.includes(serveUrl)) {
        // Just set the index to the existing one
        return {
          ...prev,
          currentImageIndex: {
            ...prev.currentImageIndex,
            [libraryKey]: currentImages.indexOf(serveUrl),
          },
        };
      }
      const updatedImages = [...currentImages, serveUrl];
      return {
        ...prev,
        imageLibrary: { ...imageLibrary, [libraryKey]: updatedImages },
        currentImageIndex: {
          ...prev.currentImageIndex,
          [libraryKey]: updatedImages.length - 1,
        },
      };
    });
  };

  // Reusable image picker grid for config drawers
  const renderImagePicker = (uploadType: string, libraryKey: string, label: string) => {
    const currentLibImages = recordSettings?.imageLibrary?.[libraryKey] || [];
    const currentIdx = recordSettings?.currentImageIndex?.[libraryKey] ?? 0;

    return (
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <PhotoLibraryIcon fontSize="small" /> Available Images
        </Typography>
        {imagesLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}
        {imagesError && <Alert severity="warning" sx={{ mb: 1 }}>{imagesError}</Alert>}
        {!imagesLoading && availableImages.length === 0 && !imagesError && (
          <Alert severity="info" sx={{ mb: 1 }}>
            No images found. Add image directories via "Image Sources" first.
          </Alert>
        )}
        {!imagesLoading && availableImages.length > 0 && (
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 1,
            maxHeight: 240,
            overflowY: 'auto',
            mb: 1,
            p: 0.5,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
          }}>
            {availableImages.map((img, idx) => {
              const isSelected = currentLibImages[currentIdx] === img.serve_url;
              return (
                <Tooltip key={idx} title={`${img.filename} (${img.source_label})`} arrow>
                  <Box
                    onClick={() => handleSelectImage(img.serve_url, libraryKey)}
                    sx={{
                      cursor: 'pointer',
                      border: isSelected ? '2px solid' : '1px solid',
                      borderColor: isSelected ? 'primary.main' : 'divider',
                      borderRadius: 1,
                      overflow: 'hidden',
                      bgcolor: isSelected ? 'action.selected' : 'background.paper',
                      transition: 'all 0.15s',
                      '&:hover': { borderColor: 'primary.light', boxShadow: 1 },
                    }}
                  >
                    <Box
                      component="img"
                      src={img.serve_url}
                      alt={img.filename}
                      sx={{ width: '100%', height: 70, objectFit: 'cover', display: 'block' }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <Typography variant="caption" noWrap sx={{ display: 'block', px: 0.5, fontSize: '0.6rem' }}>
                      {img.filename}
                    </Typography>
                  </Box>
                </Tooltip>
              );
            })}
          </Box>
        )}
        <Divider sx={{ my: 1 }} />
        <Button
          variant="outlined"
          component="label"
          startIcon={<CloudUploadIcon />}
          fullWidth
          size="small"
        >
          Upload {label}
          <input
            type="file"
            hidden
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onImageUpload(uploadType, file);
            }}
          />
        </Button>
      </Box>
    );
  };

  const handleDoubleClick = (type: string) => {
    setConfigType(type);
    setConfigDialogOpen(true);
  };

  const handleImageReplace = (type: string) => {
    setImageType(type);
    setImageDialogOpen(true);
  };

  const getImagePath = (type: string): string => {
    switch (type) {
      case 'logo':
        // Use image library if available, otherwise fallback to default path
        const logoImages = recordSettings?.imageLibrary?.logo || [];
        const logoIndex = recordSettings?.currentImageIndex?.logo ?? 0;
        if (logoImages.length > 0 && logoImages[logoIndex]) {
          return logoImages[logoIndex];
        }
        return `/images/records/${churchId}-logo.png`;
      case 'recordImage':
        // Use record type-specific image from library
        const recordImages = recordSettings?.imageLibrary?.[recordType] || [];
        const recordIndex = recordSettings?.currentImageIndex?.[recordType] ?? 0;
        if (recordImages.length > 0 && recordImages[recordIndex]) {
          return recordImages[recordIndex];
        }
        // Fallback to default based on record type
        return `/images/records/${recordType}.png`;
      case 'baptism':
      case 'marriage':
      case 'funeral':
        return `/images/records/${type}.png`;
      case 'bg':
        // Use background image from library if available
        const bgImages = recordSettings?.imageLibrary?.bg || [];
        const bgIndex = recordSettings?.currentImageIndex?.bg ?? 0;
        if (bgImages.length > 0 && bgImages[bgIndex]) {
          return bgImages[bgIndex];
        }
        return `/images/records/${churchId}-bg.png`;
      case 'g1':
        // Use G1 overlay from library if available
        const g1Images = recordSettings?.imageLibrary?.g1 || [];
        const g1Index = recordSettings?.currentImageIndex?.g1 ?? 0;
        if (g1Images.length > 0 && g1Images[g1Index]) {
          return g1Images[g1Index];
        }
        return '/images/records/g1.png';
      case 'omLogo':
        // Use OM logo from library if available
        const omImages = recordSettings?.imageLibrary?.omLogo || [];
        const omIndex = recordSettings?.currentImageIndex?.omLogo ?? 0;
        if (omImages.length > 0 && omImages[omIndex]) {
          return omImages[omIndex];
        }
        return '/images/records/om-logo.png';
      default:
        return '';
    }
  };

  // Sample calendar dates for preview
  const sampleDates = [
    { month: 'Dec', year: 2025, weekday: 'Mon', day: 15 },
    { month: 'Dec', year: 2025, weekday: 'Tue', day: 16 },
    { month: 'Dec', year: 2025, weekday: 'Wed', day: 17 },
  ];

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
        Live Preview
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Double-click any element to configure it. This preview matches the actual header on the records page.
      </Typography>
      
      {/* Actual Header Preview - Using shared RecordHeaderBanner component */}
      <Paper
        variant="outlined"
        sx={{
          overflow: 'hidden',
          borderRadius: 1,
          position: 'relative',
        }}
      >
        {/* Use shared header component for accurate preview with interactive mode */}
        <Box sx={{ position: 'relative' }}>
          <RecordHeaderBanner
            churchId={churchId}
            recordType={recordType}
            churchName={churchName}
            recordSettings={recordSettings}
            interactive={true}
            onElementDoubleClick={handleDoubleClick}
          />
          
          {/* Column labels for configuration */}
          {[1, 2, 3, 4].map((col) => (
            <Box
              key={`label-${col}`}
              sx={{
                position: 'absolute',
                top: -8,
                left: `calc(${(col - 1) * 25}% + ${col === 1 ? '8px' : col === 4 ? '-8px' : '0px'})`,
                width: '25%',
                textAlign: 'center',
                zIndex: 20,
                pointerEvents: 'none',
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  bgcolor: 'rgba(255,255,255,0.9)',
                  px: 1,
                  py: 0.25,
                  borderRadius: 1,
                  fontSize: '0.65rem',
                  color: 'text.secondary',
                }}
              >
                Col {col}
              </Typography>
            </Box>
          ))}
        </Box>
      </Paper>

      {/* Quick Settings Bar */}
      <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<SettingsIcon />}
          onClick={() => handleDoubleClick('recordImage')}
        >
          Record Image
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<SettingsIcon />}
          onClick={() => handleDoubleClick('calendar')}
        >
          Calendar
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<SettingsIcon />}
          onClick={() => handleDoubleClick('logo')}
        >
          Church Logo
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<SettingsIcon />}
          onClick={() => handleDoubleClick('omLogo')}
        >
          OM Logo
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<SettingsIcon />}
          onClick={() => handleDoubleClick('backgroundImage')}
        >
          Background
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<SettingsIcon />}
          onClick={() => handleDoubleClick('g1Image')}
        >
          G1 Overlay
        </Button>
      </Box>

      {/* Configuration Drawer */}
      <Drawer
        anchor="right"
        open={configDialogOpen}
        onClose={() => setConfigDialogOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: '90%', sm: 400 },
            maxWidth: 500,
          },
        }}
      >
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">
              Configure {
                configType === 'logo' ? 'Church Logo' : 
                configType === 'calendar' ? 'Calendar Cards' : 
                configType === 'omLogo' ? 'OM Logo' : 
                configType === 'recordImage' ? 'Record Image' : 
                configType === 'backgroundImage' ? 'Background Image' : 
                configType === 'g1Image' ? 'G1 Overlay' : 
                'Element'
              }
            </Typography>
            <IconButton onClick={() => setConfigDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
          <Divider sx={{ mb: 2 }} />
          
          <Box sx={{ maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
            {/* Logo Configuration */}
            {configType === 'logo' && (
              <Stack spacing={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={recordSettings.logo?.enabled ?? true}
                      onChange={(e) => setRecordSettings(prev => ({
                        ...prev,
                        logo: { ...prev.logo, enabled: e.target.checked }
                      }))}
                    />
                  }
                  label="Display Church Logo"
                />
                {recordSettings.logo?.enabled !== false && (
                  <>
                    <FormControl fullWidth>
                      <InputLabel>Column Position</InputLabel>
                      <Select
                        value={recordSettings.logo?.column || 3}
                        onChange={(e) => setRecordSettings(prev => ({
                          ...prev,
                          logo: { ...prev.logo, column: Number(e.target.value) }
                        }))}
                        label="Column Position"
                      >
                        <MenuItem value={1}>Column 1 (Left)</MenuItem>
                        <MenuItem value={2}>Column 2</MenuItem>
                        <MenuItem value={3}>Column 3</MenuItem>
                        <MenuItem value={4}>Column 4 (Right)</MenuItem>
                      </Select>
                    </FormControl>
                    <TextField
                      label="Width (px)"
                      type="number"
                      value={recordSettings.logo?.width || 120}
                      onChange={(e) => setRecordSettings(prev => ({
                        ...prev,
                        logo: { ...prev.logo, width: Number(e.target.value) }
                      }))}
                      fullWidth
                    />
                    <TextField
                      label="Height (px or 'auto')"
                      value={recordSettings.logo?.height || 'auto'}
                      onChange={(e) => setRecordSettings(prev => ({
                        ...prev,
                        logo: { ...prev.logo, height: e.target.value === 'auto' ? 'auto' : (isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value)) }
                      }))}
                      fullWidth
                    />
                    <FormControl fullWidth>
                      <InputLabel>Object Fit</InputLabel>
                      <Select
                        value={recordSettings.logo?.objectFit || 'contain'}
                        onChange={(e) => setRecordSettings(prev => ({
                          ...prev,
                          logo: { ...prev.logo, objectFit: e.target.value }
                        }))}
                        label="Object Fit"
                      >
                        <MenuItem value="contain">Contain</MenuItem>
                        <MenuItem value="cover">Cover</MenuItem>
                        <MenuItem value="fill">Fill</MenuItem>
                        <MenuItem value="none">None</MenuItem>
                      </Select>
                    </FormControl>
                    <Box>
                      <Typography gutterBottom>Opacity: {recordSettings.logo?.opacity || 100}%</Typography>
                      <Slider
                        value={recordSettings.logo?.opacity || 100}
                        onChange={(e, value) => setRecordSettings(prev => ({
                          ...prev,
                          logo: { ...prev.logo, opacity: value as number }
                        }))}
                        min={10}
                        max={100}
                        step={5}
                      />
                    </Box>
                    {renderImagePicker('logo', 'logo', 'Logo Image')}
                  </>
                )}
              </Stack>
            )}

            {/* Calendar Configuration */}
            {configType === 'calendar' && (
              <Stack spacing={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={recordSettings.calendar?.enabled ?? true}
                      onChange={(e) => setRecordSettings(prev => ({
                        ...prev,
                        calendar: { ...prev.calendar, enabled: e.target.checked }
                      }))}
                    />
                  }
                  label="Display Calendar Cards"
                />
                {recordSettings.calendar?.enabled !== false && (
                  <FormControl fullWidth>
                    <InputLabel>Column Position</InputLabel>
                    <Select
                      value={recordSettings.calendar?.column || 2}
                      onChange={(e) => setRecordSettings(prev => ({
                        ...prev,
                        calendar: { ...prev.calendar, column: Number(e.target.value) }
                      }))}
                      label="Column Position"
                    >
                      <MenuItem value={1}>Column 1 (Left)</MenuItem>
                      <MenuItem value={2}>Column 2</MenuItem>
                      <MenuItem value={3}>Column 3</MenuItem>
                      <MenuItem value={4}>Column 4 (Right)</MenuItem>
                    </Select>
                  </FormControl>
                )}
              </Stack>
            )}

            {/* OM Logo Configuration */}
            {configType === 'omLogo' && (
              <Stack spacing={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={recordSettings.omLogo?.enabled ?? true}
                      onChange={(e) => setRecordSettings(prev => ({
                        ...prev,
                        omLogo: { ...prev.omLogo, enabled: e.target.checked }
                      }))}
                    />
                  }
                  label="Display OM Logo"
                />
                {recordSettings.omLogo?.enabled !== false && (
                  <>
                    <FormControl fullWidth>
                      <InputLabel>Column Position</InputLabel>
                      <Select
                        value={recordSettings.omLogo?.column || 4}
                        onChange={(e) => setRecordSettings(prev => ({
                          ...prev,
                          omLogo: { ...prev.omLogo, column: Number(e.target.value) }
                        }))}
                        label="Column Position"
                      >
                        <MenuItem value={1}>Column 1 (Left)</MenuItem>
                        <MenuItem value={2}>Column 2</MenuItem>
                        <MenuItem value={3}>Column 3</MenuItem>
                        <MenuItem value={4}>Column 4 (Right)</MenuItem>
                      </Select>
                    </FormControl>
                    <TextField
                      label="Width (px)"
                      type="number"
                      value={recordSettings.omLogo?.width || 68}
                      onChange={(e) => setRecordSettings(prev => ({
                        ...prev,
                        omLogo: { ...prev.omLogo, width: Number(e.target.value) }
                      }))}
                      fullWidth
                    />
                    <TextField
                      label="Height (px)"
                      type="number"
                      value={recordSettings.omLogo?.height || 68}
                      onChange={(e) => setRecordSettings(prev => ({
                        ...prev,
                        omLogo: { ...prev.omLogo, height: Number(e.target.value) }
                      }))}
                      fullWidth
                    />
                    <FormControl fullWidth>
                      <InputLabel>Object Fit</InputLabel>
                      <Select
                        value={recordSettings.omLogo?.objectFit || 'contain'}
                        onChange={(e) => setRecordSettings(prev => ({
                          ...prev,
                          omLogo: { ...prev.omLogo, objectFit: e.target.value }
                        }))}
                        label="Object Fit"
                      >
                        <MenuItem value="contain">Contain</MenuItem>
                        <MenuItem value="cover">Cover</MenuItem>
                        <MenuItem value="fill">Fill</MenuItem>
                        <MenuItem value="none">None</MenuItem>
                      </Select>
                    </FormControl>
                    <Box>
                      <Typography gutterBottom>Opacity: {recordSettings.omLogo?.opacity || 100}%</Typography>
                      <Slider
                        value={recordSettings.omLogo?.opacity || 100}
                        onChange={(e, value) => setRecordSettings(prev => ({
                          ...prev,
                          omLogo: { ...prev.omLogo, opacity: value as number }
                        }))}
                        min={10}
                        max={100}
                        step={5}
                      />
                    </Box>
                    {renderImagePicker('omLogo', 'omLogo', 'OM Logo')}
                  </>
                )}
              </Stack>
            )}

            {/* Record Image Configuration */}
            {configType === 'recordImage' && (
              <Stack spacing={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={recordSettings.recordImages?.enabled !== false}
                      onChange={(e) => setRecordSettings(prev => ({
                        ...prev,
                        recordImages: { ...prev.recordImages, enabled: e.target.checked }
                      }))}
                    />
                  }
                  label="Display Record Image"
                />
                {recordSettings.recordImages?.enabled !== false && (
                  <>
                    <FormControl fullWidth>
                      <InputLabel>Column Position</InputLabel>
                      <Select
                        value={recordSettings.recordImages?.column || 1}
                        onChange={(e) => setRecordSettings(prev => ({
                          ...prev,
                          recordImages: { ...prev.recordImages, column: Number(e.target.value) }
                        }))}
                        label="Column Position"
                      >
                        <MenuItem value={1}>Column 1 (Left)</MenuItem>
                        <MenuItem value={2}>Column 2</MenuItem>
                        <MenuItem value={3}>Column 3</MenuItem>
                        <MenuItem value={4}>Column 4 (Right)</MenuItem>
                      </Select>
                    </FormControl>
                    <TextField
                      label="Width (px)"
                      type="number"
                      value={recordSettings.recordImages?.width || 60}
                      onChange={(e) => setRecordSettings(prev => ({
                        ...prev,
                        recordImages: { ...prev.recordImages, width: Number(e.target.value) }
                      }))}
                      fullWidth
                    />
                    <TextField
                      label="Height (px)"
                      type="number"
                      value={recordSettings.recordImages?.height || 60}
                      onChange={(e) => setRecordSettings(prev => ({
                        ...prev,
                        recordImages: { ...prev.recordImages, height: Number(e.target.value) }
                      }))}
                      fullWidth
                    />
                    <FormControl fullWidth>
                      <InputLabel>Object Fit</InputLabel>
                      <Select
                        value={recordSettings.recordImages?.objectFit || 'contain'}
                        onChange={(e) => setRecordSettings(prev => ({
                          ...prev,
                          recordImages: { ...prev.recordImages, objectFit: e.target.value }
                        }))}
                        label="Object Fit"
                      >
                        <MenuItem value="contain">Contain</MenuItem>
                        <MenuItem value="cover">Cover</MenuItem>
                        <MenuItem value="fill">Fill</MenuItem>
                        <MenuItem value="none">None</MenuItem>
                      </Select>
                    </FormControl>
                    <Box>
                      <Typography gutterBottom>Border Width: {recordSettings.recordImages?.borderWidth || 3}px</Typography>
                      <Slider
                        value={recordSettings.recordImages?.borderWidth || 3}
                        onChange={(e, value) => setRecordSettings(prev => ({
                          ...prev,
                          recordImages: { ...prev.recordImages, borderWidth: value as number }
                        }))}
                        min={0}
                        max={10}
                        step={1}
                      />
                    </Box>
                    {renderImagePicker(recordType || 'baptism', recordType || 'baptism', 'Record Image')}
                  </>
                )}
              </Stack>
            )}

            {/* Background Image Configuration */}
            {configType === 'backgroundImage' && (
              <Stack spacing={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={recordSettings.backgroundImage?.enabled ?? true}
                      onChange={(e) => setRecordSettings(prev => ({
                        ...prev,
                        backgroundImage: { ...prev.backgroundImage, enabled: e.target.checked }
                      }))}
                    />
                  }
                  label="Display Background Image"
                />
                {recordSettings.backgroundImage?.enabled !== false && (
                  <>
                    <FormControl fullWidth>
                      <InputLabel>Background Size</InputLabel>
                      <Select
                        value={recordSettings.backgroundImage?.size || 'auto'}
                        onChange={(e) => setRecordSettings(prev => ({
                          ...prev,
                          backgroundImage: { ...prev.backgroundImage, size: e.target.value }
                        }))}
                        label="Background Size"
                      >
                        <MenuItem value="auto">Auto (Repeat)</MenuItem>
                        <MenuItem value="cover">Cover</MenuItem>
                        <MenuItem value="contain">Contain</MenuItem>
                        <MenuItem value="100% 100%">Stretch</MenuItem>
                      </Select>
                    </FormControl>
                    <FormControl fullWidth>
                      <InputLabel>Background Position</InputLabel>
                      <Select
                        value={recordSettings.backgroundImage?.position || 'top left'}
                        onChange={(e) => setRecordSettings(prev => ({
                          ...prev,
                          backgroundImage: { ...prev.backgroundImage, position: e.target.value }
                        }))}
                        label="Background Position"
                      >
                        <MenuItem value="top left">Top Left</MenuItem>
                        <MenuItem value="top center">Top Center</MenuItem>
                        <MenuItem value="top right">Top Right</MenuItem>
                        <MenuItem value="center left">Center Left</MenuItem>
                        <MenuItem value="center center">Center</MenuItem>
                        <MenuItem value="center right">Center Right</MenuItem>
                        <MenuItem value="bottom left">Bottom Left</MenuItem>
                        <MenuItem value="bottom center">Bottom Center</MenuItem>
                        <MenuItem value="bottom right">Bottom Right</MenuItem>
                      </Select>
                    </FormControl>
                    <Box>
                      <Typography gutterBottom>Opacity: {recordSettings.backgroundImage?.opacity || 100}%</Typography>
                      <Slider
                        value={recordSettings.backgroundImage?.opacity || 100}
                        onChange={(e, value) => setRecordSettings(prev => ({
                          ...prev,
                          backgroundImage: { ...prev.backgroundImage, opacity: value as number }
                        }))}
                        min={0}
                        max={100}
                        step={5}
                      />
                    </Box>
                    {renderImagePicker('bg', 'bg', 'Background Image')}
                  </>
                )}
              </Stack>
            )}

            {/* G1 Image Configuration */}
            {configType === 'g1Image' && (
              <Stack spacing={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={recordSettings.g1Image?.enabled ?? true}
                      onChange={(e) => setRecordSettings(prev => ({
                        ...prev,
                        g1Image: { ...prev.g1Image, enabled: e.target.checked }
                      }))}
                    />
                  }
                  label="Display G1 Overlay"
                />
                {recordSettings.g1Image?.enabled !== false && (
                  <>
                    <Typography variant="body2" color="text.secondary">
                      The G1 overlay provides a gradient effect over the background image.
                    </Typography>
                    <FormControl fullWidth>
                      <InputLabel>Overlay Size</InputLabel>
                      <Select
                        value={recordSettings.g1Image?.size || 'cover'}
                        onChange={(e) => setRecordSettings(prev => ({
                          ...prev,
                          g1Image: { ...prev.g1Image, size: e.target.value }
                        }))}
                        label="Overlay Size"
                      >
                        <MenuItem value="cover">Cover</MenuItem>
                        <MenuItem value="contain">Contain</MenuItem>
                        <MenuItem value="100% 100%">Stretch</MenuItem>
                      </Select>
                    </FormControl>
                    <FormControl fullWidth>
                      <InputLabel>Overlay Position</InputLabel>
                      <Select
                        value={recordSettings.g1Image?.position || 'center'}
                        onChange={(e) => setRecordSettings(prev => ({
                          ...prev,
                          g1Image: { ...prev.g1Image, position: e.target.value }
                        }))}
                        label="Overlay Position"
                      >
                        <MenuItem value="top left">Top Left</MenuItem>
                        <MenuItem value="top center">Top Center</MenuItem>
                        <MenuItem value="top right">Top Right</MenuItem>
                        <MenuItem value="center left">Center Left</MenuItem>
                        <MenuItem value="center">Center</MenuItem>
                        <MenuItem value="center right">Center Right</MenuItem>
                        <MenuItem value="bottom left">Bottom Left</MenuItem>
                        <MenuItem value="bottom center">Bottom Center</MenuItem>
                        <MenuItem value="bottom right">Bottom Right</MenuItem>
                      </Select>
                    </FormControl>
                    <Box>
                      <Typography gutterBottom>Opacity: {Math.round((recordSettings.g1Image?.opacity || 0.85) * 100)}%</Typography>
                      <Slider
                        value={(recordSettings.g1Image?.opacity || 0.85) * 100}
                        onChange={(e, value) => setRecordSettings(prev => ({
                          ...prev,
                          g1Image: { ...prev.g1Image, opacity: (value as number) / 100 }
                        }))}
                        min={0}
                        max={100}
                        step={5}
                      />
                    </Box>
                    {renderImagePicker('g1', 'g1', 'G1 Overlay Image')}
                  </>
                )}
              </Stack>
            )}
          </Box>
        </Box>
      </Drawer>

      {/* Image Replacement Dialog */}
      <Dialog open={imageDialogOpen} onClose={() => setImageDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Upload Image
          <IconButton
            onClick={() => setImageDialogOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Button
              variant="outlined"
              component="label"
              startIcon={<CloudUploadIcon />}
              fullWidth
            >
              Select Image File
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file && imageType) {
                    onImageUpload(imageType, file);
                    setImageDialogOpen(false);
                  }
                }}
              />
            </Button>
            <Box sx={{ textAlign: 'center', p: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Current: {getImagePath(imageType || 'logo')}
              </Typography>
              <Box
                component="img"
                src={getImagePath(imageType || 'logo')}
                alt="Current"
                sx={{ maxWidth: '100%', maxHeight: 200, mt: 1, objectFit: 'contain' }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImageDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RecordHeaderPreview;
