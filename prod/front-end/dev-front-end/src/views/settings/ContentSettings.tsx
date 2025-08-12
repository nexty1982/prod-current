import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Alert,
    Card,
    CardContent,
    Stack,
    Button,
    CircularProgress,
    Grid,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    IconButton,
    Tooltip,
    Snackbar
} from '@mui/material';
import {
    IconUpload,
    IconPhoto,
    IconTrash,
    IconEye,
    IconDownload,
    IconUsers,
    IconLayoutGrid
} from '@tabler/icons-react';
import { useAuth } from '../../context/AuthContext';
import ImageGridExtractor from './ImageGridExtractor';
import { adminAPI } from '../../api/admin.api';

interface GlobalImage {
    id: string;
    name: string;
    url: string;
    type: 'profile' | 'banner';
    size: string;
    uploadedAt: string;
    uploadedBy: string;
    source?: 'global' | 'user';
    filename?: string;
}

const ContentSettings: React.FC = () => {
    const { isSuperAdmin } = useAuth();
    const [globalImages, setGlobalImages] = useState<GlobalImage[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
    const [uploadType, setUploadType] = useState<'profile' | 'banner'>('profile');
      const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageName, setImageName] = useState('');
  const [gridExtractorOpen, setGridExtractorOpen] = useState(false);
  const [gridExtractorType, setGridExtractorType] = useState<'profile' | 'banner'>('profile');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

    useEffect(() => {
        if (isSuperAdmin()) {
            fetchGlobalImages();
        }
    }, [isSuperAdmin]);

    const fetchGlobalImages = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const response = await adminAPI.globalImages.getAll();
            // Ensure response is always an array
            const images = Array.isArray(response) ? response : [];
            setGlobalImages(images);
        } catch (err: any) {
            setError(err.message || 'Failed to load global images');
            setGlobalImages([]); // Ensure empty array on error
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            // Validate file type
            if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
                setError('Only JPG, PNG, or GIF files are allowed');
                return;
            }

            // Validate file size (5MB limit)
            if (file.size > 5 * 1024 * 1024) {
                setError('File size must be less than 5MB');
                return;
            }

            setSelectedFile(file);
            setImageName(file.name.replace(/\.[^/.]+$/, '')); // Remove extension
            setError(null);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile || !imageName.trim()) {
            setError('Please select a file and enter a name');
            return;
        }

        setUploading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('image', selectedFile);
            formData.append('name', imageName);
            formData.append('type', uploadType);

            const response = await adminAPI.globalImages.upload(formData);

            if (response.success) {
                setGlobalImages(prev => Array.isArray(prev) ? [...prev, response.data.image] : [response.data.image]);
                setUploadDialogOpen(false);
                setSelectedFile(null);
                setImageName('');
                setUploadType('profile');
            } else {
                throw new Error(response.message || 'Upload failed');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to upload image');
            console.error('Error uploading image:', err);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (image: GlobalImage) => {
        const imageType = image.source === 'user' ? 'auto-detected' : 'global';
        if (!confirm(`Are you sure you want to delete this ${imageType} image?`)) {
            return;
        }

        try {
            const response = await adminAPI.globalImages.update(Number(image.id), { action: 'delete' });

            if (response.success) {
                setGlobalImages(prev => Array.isArray(prev) ? prev.filter(img => img.id !== image.id) : []);
            } else {
                throw new Error('Failed to delete image');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to delete image');
            console.error('Error deleting image:', err);
        }
    };

      const getImageRequirements = (type: 'profile' | 'banner') => {
    if (type === 'profile') {
      return '200x200 pixels, JPG, PNG, or GIF files only';
    } else {
      return 'Recommended: 1200x300 pixels, JPG, PNG, or GIF files only';
    }
  };

  const handleImagesExtracted = async (images: any[], type: 'profile' | 'banner') => {
    setUploading(true);
    setError(null);

    try {
      // Images are already saved by the ImageGridExtractor component
      // Just refresh the global images list to show the new images
      await fetchGlobalImages();
      
      setSnackbarMessage(`Successfully extracted and saved ${images.length} ${type} images`);
      setSnackbarOpen(true);
    } catch (err: any) {
      setError(err.message || 'Failed to refresh images list');
    } finally {
      setUploading(false);
    }
  };

    if (!isSuperAdmin()) {
        return (
            <Alert severity="error">
                Access denied. Only super administrators can manage global content.
            </Alert>
        );
    }

    return (
        <Box>
            <Typography variant="h6" gutterBottom>
                Global Content Management
            </Typography>
            
            <Alert severity="info" sx={{ mb: 3 }}>
                Manage global profile and banner images that users can select for their profiles.
                The system automatically detects images in the profile and banner directories and makes them available to all users.
                You can also upload new images through this interface.
            </Alert>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }} action={
                    <Button color="inherit" size="small" onClick={fetchGlobalImages}>
                        Retry
                    </Button>
                }>
                    {error}
                </Alert>
            )}

            <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
                <Button
                    variant="contained"
                    startIcon={<IconUpload />}
                    onClick={() => {
                        setUploadType('profile');
                        setUploadDialogOpen(true);
                    }}
                >
                    Upload Global Profile Image
                </Button>
                <Button
                    variant="contained"
                    startIcon={<IconUpload />}
                    onClick={() => {
                        setUploadType('banner');
                        setUploadDialogOpen(true);
                    }}
                >
                    Upload Global Banner Image
                </Button>
            </Stack>

            <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
                <Button
                    variant="outlined"
                    startIcon={<IconLayoutGrid />}
                    onClick={() => {
                        setGridExtractorType('profile');
                        setGridExtractorOpen(true);
                    }}
                >
                    Extract & Save Profile Images from Grid
                </Button>
                <Button
                    variant="outlined"
                    startIcon={<IconLayoutGrid />}
                    onClick={() => {
                        setGridExtractorType('banner');
                        setGridExtractorOpen(true);
                    }}
                >
                    Extract & Save Banner Images from Grid
                </Button>
            </Stack>

            {loading ? (
                <Box display="flex" justifyContent="center" alignItems="center" py={4}>
                    <CircularProgress />
                    <Typography variant="body2" sx={{ ml: 2 }}>
                        Loading global images...
                    </Typography>
                </Box>
            ) : (
                <Grid container spacing={3}>
                    {Array.isArray(globalImages) && globalImages.map((image) => (
                        <Grid item xs={12} sm={6} md={4} key={image.id}>
                            <Card variant="outlined">
                                <CardContent>
                                    <Box display="flex" alignItems="center" mb={2}>
                                        <IconPhoto size={20} style={{ marginRight: 8, color: '#1976d2' }} />
                                        <Typography variant="h6" noWrap>
                                            {image.name}
                                        </Typography>
                                    </Box>
                                    
                                    <Box 
                                        sx={{ 
                                            width: '100%', 
                                            height: image.type === 'profile' ? 120 : 80,
                                            backgroundImage: `url(${image.url})`,
                                            backgroundSize: 'cover',
                                            backgroundPosition: 'center',
                                            borderRadius: 1,
                                            mb: 2,
                                            border: '1px solid #e0e0e0'
                                        }}
                                    />
                                    
                                    <Stack spacing={1}>
                                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                            <Chip 
                                                label={image.type === 'profile' ? 'Profile' : 'Banner'} 
                                                size="small" 
                                                color={image.type === 'profile' ? 'primary' : 'secondary'}
                                            />
                                            <Chip 
                                                label={image.source === 'user' ? 'Auto-Detected' : 'Global'} 
                                                size="small" 
                                                color={image.source === 'user' ? 'warning' : 'success'}
                                                variant="outlined"
                                            />
                                        </Box>
                                        <Typography variant="body2" color="text.secondary">
                                            Size: {image.size}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Uploaded: {new Date(image.uploadedAt).toLocaleDateString()}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            By: {image.uploadedBy}
                                        </Typography>
                                    </Stack>
                                    
                                    <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                                        <Tooltip title="Preview">
                                            <IconButton 
                                                size="small" 
                                                onClick={() => window.open(image.url, '_blank')}
                                            >
                                                <IconEye size={16} />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Download">
                                            <IconButton 
                                                size="small" 
                                                onClick={() => window.open(image.url, '_blank')}
                                            >
                                                <IconDownload size={16} />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Delete">
                                            <IconButton 
                                                size="small" 
                                                color="error"
                                                onClick={() => handleDelete(image)}
                                            >
                                                <IconTrash size={16} />
                                            </IconButton>
                                        </Tooltip>
                                    </Stack>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                    
                    {Array.isArray(globalImages) && globalImages.length === 0 && (
                        <Grid item xs={12}>
                            <Card variant="outlined">
                                <CardContent>
                                    <Box display="flex" flexDirection="column" alignItems="center" py={4}>
                                        <IconPhoto size={48} style={{ color: '#ccc', marginBottom: 16 }} />
                                        <Typography variant="h6" color="text.secondary" gutterBottom>
                                            No Global Images
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" textAlign="center">
                                            Upload global profile and banner images to make them available to all users.
                                        </Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    )}
                </Grid>
            )}

            {/* Upload Dialog */}
            <Dialog 
                open={uploadDialogOpen} 
                onClose={() => setUploadDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    Upload Global {uploadType === 'profile' ? 'Profile' : 'Banner'} Image
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={3} sx={{ mt: 1 }}>
                        <Alert severity="info">
                            Requirements: {getImageRequirements(uploadType)}
                        </Alert>
                        
                        <TextField
                            label="Image Name"
                            value={imageName}
                            onChange={(e) => setImageName(e.target.value)}
                            fullWidth
                            placeholder={`Enter a name for this ${uploadType} image`}
                        />
                        
                        <Box>
                            <input
                                accept="image/jpeg,image/png,image/gif"
                                style={{ display: 'none' }}
                                id="global-image-upload"
                                type="file"
                                onChange={handleFileSelect}
                            />
                            <label htmlFor="global-image-upload">
                                <Button
                                    variant="outlined"
                                    component="span"
                                    startIcon={<IconUpload />}
                                    fullWidth
                                >
                                    Select Image File
                                </Button>
                            </label>
                            {selectedFile && (
                                <Typography variant="body2" sx={{ mt: 1 }}>
                                    Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                                </Typography>
                            )}
                        </Box>
                        
                        {error && (
                            <Alert severity="error">
                                {error}
                            </Alert>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setUploadDialogOpen(false)}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleUpload} 
                        variant="contained"
                        disabled={!selectedFile || !imageName.trim() || uploading}
                        startIcon={uploading ? <CircularProgress size={16} /> : <IconUpload />}
                    >
                        {uploading ? 'Uploading...' : 'Upload'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Image Grid Extractor */}
            <ImageGridExtractor
                open={gridExtractorOpen}
                onClose={() => setGridExtractorOpen(false)}
                onImagesExtracted={handleImagesExtracted}
                type={gridExtractorType}
            />

            {/* Success Snackbar */}
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={6000}
                onClose={() => setSnackbarOpen(false)}
                message={snackbarMessage}
            />
        </Box>
    );
};

export default ContentSettings; 