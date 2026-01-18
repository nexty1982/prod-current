import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Typography,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  LinearProgress,
  Alert,
  Card,
  CardMedia,
  useTheme,
  Paper,
  Stack,
  Chip,
} from '@mui/material';
import {
  IconArrowLeft,
  IconArrowRight,
  IconUpload,
  IconX,
  IconPhoto,
  IconTrash,
  IconDownload,
} from '@tabler/icons-react';
import { styled } from '@mui/material/styles';
import { DataGrid, GridColDef, GridRowSelectionModel, GridRenderCellParams } from '@mui/x-data-grid';

const GalleryContainer = styled(Container)(({ theme }) => ({
  paddingTop: theme.spacing(4),
  paddingBottom: theme.spacing(4),
  minHeight: '100vh',
}));

const ThumbnailGrid = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: theme.spacing(2),
  marginTop: theme.spacing(4),
  marginBottom: theme.spacing(4),
  [theme.breakpoints.down('md')]: {
    gridTemplateColumns: 'repeat(4, 1fr)',
  },
  [theme.breakpoints.down('sm')]: {
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: theme.spacing(1),
  },
}));

const ImageCard = styled(Card)(({ theme }) => ({
  position: 'relative',
  cursor: 'pointer',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  '&:hover': {
    transform: 'scale(1.05)',
    boxShadow: theme.shadows[8],
  },
}));

const ImageThumbnail = styled(CardMedia)(({ theme }) => ({
  width: '100%',
  height: '150px',
  objectFit: 'cover',
  [theme.breakpoints.down('sm')]: {
    height: '120px',
  },
}));

const CarouselContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  width: '100%',
  maxWidth: '800px',
  margin: '0 auto',
  marginBottom: theme.spacing(4),
}));

const CarouselButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
  border: `2px solid ${theme.palette.mode === 'dark' ? '#C8A24B' : '#C8A24B'}`,
  color: '#C8A24B',
  width: 56,
  height: 56,
  zIndex: 10,
  '&:hover': {
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(200, 162, 75, 0.2)' : 'rgba(200, 162, 75, 0.1)',
    borderColor: '#B8923A',
  },
  [theme.breakpoints.down('sm')]: {
    width: 44,
    height: 44,
  },
}));

const CarouselImageContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  height: '400px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#f5f5f5',
  borderRadius: '8px',
  overflow: 'hidden',
  [theme.breakpoints.down('md')]: {
    height: '300px',
  },
  [theme.breakpoints.down('sm')]: {
    height: '250px',
  },
}));

interface GalleryImage {
  id?: string;
  name: string;
  path: string;
  url: string;
  created?: string;
  size?: number;
  type?: string;
}

const Gallery: React.FC = () => {
  const theme = useTheme();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedRows, setSelectedRows] = useState<GridRowSelectionModel>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carousel navigation handlers
  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  // Load images from gallery directory
  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    try {
      const response = await fetch('/api/gallery/images', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        // Gallery API returns { success: true, count: number, images: [...] }
        // Filter to only show image files (jpg, jpeg, png, gif, tiff)
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.tiff'];
        const imageFiles = (data.images || []).filter((file: any) => {
          const fileName = file.name || file.path || '';
          const ext = fileName.split('.').pop()?.toLowerCase() || '';
          return imageExtensions.includes(`.${ext}`);
        });
        
        // Transform the data to match GalleryImage interface
        const transformedImages = imageFiles.map((file: any, index: number) => {
          return {
            id: `img-${index}`,
            name: file.name || 'Unknown',
            path: file.path || file.url || file.name, // Use path from API response
            url: file.url || file.path || `/images/gallery/${file.name}`, // Use URL from API response
            created: file.created || file.modified || new Date().toISOString(),
            size: file.size || 0,
            type: file.type || file.name?.split('.').pop() || 'unknown',
          };
        });
        
        // Images are already sorted by the backend (newest first)
        // But we can sort again just in case
        transformedImages.sort((a: GalleryImage, b: GalleryImage) => {
          return new Date(b.created || 0).getTime() - new Date(a.created || 0).getTime();
        });
        
        setImages(transformedImages);
      } else {
        // Log the actual error for debugging
        const errorData = await response.json().catch(() => ({}));
        console.error('Gallery API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        setImages([]);
      }
    } catch (error: any) {
      // Log the actual error for debugging
      console.error('Gallery API request failed:', {
        error: error.message,
        stack: error.stack
      });
      setImages([]);
    }
  };

  const handleImageClick = (image: GalleryImage) => {
    setSelectedImage(image);
    setImageDialogOpen(true);
  };

  const handleOpenInNewWindow = (image: GalleryImage) => {
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${image.name}</title>
            <style>
              body {
                margin: 0;
                padding: 20px;
                font-family: Arial, sans-serif;
                background: #f5f5f5;
              }
              .container {
                max-width: 1200px;
                margin: 0 auto;
                background: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              }
              .image-info {
                margin-bottom: 20px;
                padding: 15px;
                background: #f9f9f9;
                border-radius: 4px;
              }
              .image-info h2 {
                margin: 0 0 10px 0;
                color: #333;
              }
              .image-info p {
                margin: 5px 0;
                color: #666;
              }
              .image-container {
                text-align: center;
                margin: 20px 0;
              }
              .image-container img {
                max-width: 100%;
                height: auto;
                border-radius: 4px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              }
              .actions {
                margin-top: 20px;
                text-align: center;
              }
              .btn {
                padding: 10px 20px;
                margin: 0 10px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
              }
              .btn-delete {
                background: #d32f2f;
                color: white;
              }
              .btn-delete:hover {
                background: #b71c1c;
              }
              .btn-close {
                background: #666;
                color: white;
              }
              .btn-close:hover {
                background: #444;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="image-info">
                <h2>Image Information</h2>
                <p><strong>Image Name:</strong> ${image.name}</p>
                <p><strong>Image Path:</strong> ${image.path}</p>
                <p><strong>Image Type:</strong> ${image.type || 'Unknown'}</p>
                ${image.size ? `<p><strong>Image Size:</strong> ${(image.size / 1024).toFixed(2)} KB</p>` : ''}
                ${image.created ? `<p><strong>Created:</strong> ${new Date(image.created).toLocaleString()}</p>` : ''}
              </div>
              <div class="image-container">
                <img src="${image.url}" alt="${image.name}" onerror="this.src='/images/placeholder.png'" />
              </div>
              <div class="actions">
                <button class="btn btn-delete" onclick="deleteImage()">Delete Image</button>
                <button class="btn btn-close" onclick="window.close()">Close</button>
              </div>
            </div>
            <script>
              function deleteImage() {
                if (confirm('Are you sure you want to delete this image?')) {
                  fetch('/api/gallery/delete', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({ path: '${image.path}' })
                  })
                  .then(response => response.json())
                  .then(data => {
                    if (data.success) {
                      alert('Image deleted successfully');
                      window.close();
                      if (window.opener) {
                        window.opener.location.reload();
                      }
                    } else {
                      alert('Failed to delete image: ' + (data.message || 'Unknown error'));
                    }
                  })
                  .catch(error => {
                    console.error('Error:', error);
                    alert('Failed to delete image');
                  });
                }
              }
            </script>
          </body>
        </html>
      `);
      newWindow.document.close();
    }
  };

  const handleDeleteImage = async (image: GalleryImage) => {
    if (!window.confirm(`Are you sure you want to delete "${image.name}"?`)) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch('/api/gallery/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ path: image.path })
      });

      if (response.ok) {
        await loadImages();
        setImageDialogOpen(false);
        setSelectedImage(null);
        // Images will reload automatically via loadImages()
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to delete image');
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      alert('Failed to delete image');
    } finally {
      setDeleting(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Allowed image file extensions
      const allowedExtensions = ['.jpg', '.jpeg', '.tiff', '.gif', '.png'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      
      if (!allowedExtensions.includes(fileExtension)) {
        setUploadError(`Invalid file type. Allowed types: ${allowedExtensions.join(', ')}`);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setUploadError('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
      setUploadError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError('Please select a file');
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('image', selectedFile); // Gallery API expects field name 'image'
      
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(percentComplete);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.success) {
              loadImages();
              setUploadDialogOpen(false);
              setSelectedFile(null);
              setUploadProgress(0);
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
            } else {
              setUploadError(response.error || response.message || 'Upload failed');
            }
          } catch (e) {
            // If response is not JSON, assume success for 200 status
            loadImages();
            setUploadDialogOpen(false);
            setSelectedFile(null);
            setUploadProgress(0);
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          }
        } else {
          // Try to parse JSON error response
          let errorMessage = 'Upload failed';
          try {
            const errorResponse = JSON.parse(xhr.responseText);
            errorMessage = errorResponse.error || errorResponse.message || errorMessage;
          } catch (e) {
            // If response is HTML (from nginx), show generic error
            if (xhr.status === 500) {
              errorMessage = 'Internal server error. Please check server logs.';
            } else if (xhr.status === 404) {
              errorMessage = 'Upload endpoint not found. Backend needs to implement POST /api/gallery/upload';
            } else {
              errorMessage = `Upload failed with status ${xhr.status}`;
            }
          }
          setUploadError(errorMessage);
        }
        setUploading(false);
      });

      xhr.addEventListener('error', () => {
        setUploadError('Upload failed. Backend endpoint /api/gallery/upload may not be available.');
        setUploading(false);
      });

      xhr.open('POST', '/api/gallery/upload'); // Use gallery upload endpoint
      xhr.withCredentials = true; // Include cookies for authentication
      xhr.send(formData);
    } catch (error) {
      setUploadError('An error occurred during upload');
      setUploading(false);
    }
  };

  const handleOpenUploadDialog = () => {
    setUploadDialogOpen(true);
    setSelectedFile(null);
    setUploadError(null);
    setUploadProgress(0);
  };

  const handleCloseUploadDialog = () => {
    if (!uploading) {
      setUploadDialogOpen(false);
      setSelectedFile(null);
      setUploadError(null);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // MUI DataGrid column definitions
  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Image Name',
      flex: 1,
      minWidth: 200,
      renderCell: (params: GridRenderCellParams) => {
        const image = params.row as GalleryImage;
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
            <Box
              component="img"
              src={image.url}
              alt={image.name}
              sx={{
                width: 40,
                height: 40,
                objectFit: 'cover',
                borderRadius: 1,
                cursor: 'pointer',
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/images/placeholder.png';
              }}
              onClick={() => handleImageClick(image)}
            />
            <Typography
              variant="body2"
              sx={{ cursor: 'pointer', color: 'primary.main' }}
              onClick={() => handleImageClick(image)}
            >
              {params.value}
            </Typography>
          </Box>
        );
      },
    },
    {
      field: 'path',
      headerName: 'Image Location',
      flex: 2,
      minWidth: 250,
    },
    {
      field: 'created',
      headerName: 'Image Created',
      flex: 1,
      minWidth: 180,
      valueFormatter: (value: any, row?: any) => {
        // Handle both direct value and params object
        const dateValue = value?.value !== undefined ? value.value : value;
        if (!dateValue) return 'Unknown';
        try {
          const date = new Date(dateValue);
          if (isNaN(date.getTime())) {
            console.warn('Invalid date value:', dateValue, 'for row:', row);
            return 'Invalid Date';
          }
          return date.toLocaleString();
        } catch (e) {
          console.warn('Date parsing error:', e, 'value:', dateValue);
          return 'Invalid Date';
        }
      },
    },
    {
      field: 'type',
      headerName: 'File Type',
      width: 120,
    },
    {
      field: 'size',
      headerName: 'File Size',
      width: 120,
      valueFormatter: (value: any, row?: any) => {
        // Handle both direct value and params object
        const sizeValue = value?.value !== undefined ? value.value : value;
        if (sizeValue === undefined || sizeValue === null) {
          console.warn('Size is undefined/null for row:', row);
          return 'Unknown';
        }
        const numValue = typeof sizeValue === 'number' ? sizeValue : Number(sizeValue);
        if (isNaN(numValue)) {
          console.warn('Size is NaN:', sizeValue, 'for row:', row);
          return 'Unknown';
        }
        if (numValue === 0) return '0 KB';
        const sizeKB = numValue / 1024;
        if (sizeKB < 1024) {
          return `${sizeKB.toFixed(2)} KB`;
        }
        return `${(sizeKB / 1024).toFixed(2)} MB`;
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 200,
      sortable: false,
      filterable: false,
      renderCell: (params: GridRenderCellParams) => {
        const image = params.row as GalleryImage;
        return (
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant="contained"
              color="primary"
              onClick={() => handleOpenInNewWindow(image)}
            >
              View
            </Button>
            <Button
              size="small"
              variant="contained"
              color="error"
              onClick={() => handleDeleteImage(image)}
              disabled={deleting}
            >
              Delete
            </Button>
          </Stack>
        );
      },
    },
  ];

  const handleBulkDelete = async () => {
    if (selectedRows.length === 0) {
      alert('Please select at least one image to delete');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedRows.length} image(s)?`)) {
      return;
    }

    setDeleting(true);
    try {
      const selectedImages = images.filter(img => selectedRows.includes(img.id || img.path));
      const deletePromises = selectedImages.map(image =>
        fetch('/api/gallery/delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ path: image.path })
        })
      );

      const results = await Promise.allSettled(deletePromises);
      const successful = results.filter(r => r.status === 'fulfilled' && (r.value as Response).ok).length;
      const failed = results.length - successful;

      if (successful > 0) {
        await loadImages();
        setSelectedRows([]);
        alert(`Successfully deleted ${successful} image(s)`);
      } else {
        alert(`Failed to delete ${failed} image(s)`);
      }
    } catch (error) {
      console.error('Error deleting images:', error);
      alert('An error occurred while deleting images');
    } finally {
      setDeleting(false);
    }
  };

  const handleExportCSV = () => {
    if (images.length === 0) {
      alert('No images to export');
      return;
    }

    // Create CSV content
    const headers = ['Name', 'Path', 'Created', 'Type', 'Size'];
    const rows = images.map(img => [
      img.name,
      img.path,
      img.created || 'Unknown',
      img.type || 'Unknown',
      img.size ? `${(img.size / 1024).toFixed(2)} KB` : 'Unknown'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `gallery-images-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // No longer needed - MUI DataGrid uses React components for cell rendering

  // Get first 8 images for thumbnail display
  const thumbnailImages = images.slice(0, 8);

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <GalleryContainer maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography
            variant="h2"
            component="h1"
            sx={{
              fontWeight: 700,
              mb: 2,
              fontFamily: '"Cormorant Garamond", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
            }}
          >
            Image Gallery
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Browse through our collection of images
          </Typography>
          {/* Carousel Navigation Arrows */}
          {images.length > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, mb: 3 }}>
              <CarouselButton
                onClick={handlePrevious}
                aria-label="Previous image"
                sx={{ position: 'relative', transform: 'none' }}
              >
                <IconArrowLeft size={28} />
              </CarouselButton>
              
              <CarouselButton
                onClick={handleNext}
                aria-label="Next image"
                sx={{ position: 'relative', transform: 'none' }}
              >
                <IconArrowRight size={28} />
              </CarouselButton>
            </Box>
          )}

          <Button
            variant="contained"
            startIcon={<IconUpload size={20} />}
            onClick={handleOpenUploadDialog}
            sx={{
              backgroundColor: '#C8A24B',
              color: '#1a1a1a',
              '&:hover': {
                backgroundColor: '#B8923A',
              },
            }}
          >
            Upload Image
          </Button>
        </Box>

        {/* Carousel - Current Image Display */}
        {images.length > 0 && (
          <CarouselContainer>
            <CarouselButton
              onClick={handlePrevious}
              sx={{ left: { xs: -20, sm: -28 } }}
              aria-label="Previous image"
            >
              <IconArrowLeft size={28} />
            </CarouselButton>

            <CarouselImageContainer
              onClick={() => images[currentIndex] && handleOpenInNewWindow(images[currentIndex])}
              sx={{ cursor: 'pointer' }}
            >
              {images[currentIndex] && (
                <Box
                  component="img"
                  src={images[currentIndex].url}
                  alt={images[currentIndex].name}
                  sx={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/placeholder.png';
                  }}
                />
              )}
            </CarouselImageContainer>

            <CarouselButton
              onClick={handleNext}
              sx={{ right: { xs: -20, sm: -28 } }}
              aria-label="Next image"
            >
              <IconArrowRight size={28} />
            </CarouselButton>

            {/* Image info below carousel */}
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                {images[currentIndex]?.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {currentIndex + 1} of {images.length}
              </Typography>
            </Box>
          </CarouselContainer>
        )}

        {/* Thumbnail Grid - 2 rows of 4 images (8 total) */}
        {images.length > 0 && (
          <Box>
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
              Recent Images
            </Typography>
            <ThumbnailGrid>
              {thumbnailImages.map((image, index) => (
                <ImageCard
                  key={image.id || index}
                  onClick={() => handleOpenInNewWindow(image)}
                >
                  <ImageThumbnail
                    component="img"
                    image={image.url}
                    alt={image.name}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/placeholder.png';
                    }}
                  />
                </ImageCard>
              ))}
            </ThumbnailGrid>
          </Box>
        )}

        {/* AG Grid Table */}
        <Box sx={{ mt: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              All Images
            </Typography>
            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                color="error"
                startIcon={<IconTrash size={18} />}
                onClick={handleBulkDelete}
                disabled={deleting || selectedRows.length === 0}
              >
                Delete Selected ({selectedRows.length})
              </Button>
              <Button
                variant="outlined"
                startIcon={<IconDownload size={18} />}
                onClick={handleExportCSV}
                disabled={images.length === 0}
              >
                Export CSV
              </Button>
            </Stack>
          </Box>
          <Paper sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={images}
              columns={columns}
              getRowId={(row) => row.id || row.path}
              checkboxSelection
              disableRowSelectionOnClick
              rowSelectionModel={selectedRows}
              onRowSelectionModelChange={(newSelection) => {
                setSelectedRows(newSelection);
              }}
              pageSizeOptions={[10, 20, 50, 100]}
              initialState={{
                pagination: {
                  paginationModel: { pageSize: 20 },
                },
              }}
              sx={{
                '& .MuiDataGrid-cell:focus': {
                  outline: 'none',
                },
                '& .MuiDataGrid-row:hover': {
                  backgroundColor: 'action.hover',
                },
              }}
            />
          </Paper>
        </Box>

        {images.length === 0 && (
          <Box
            sx={{
              textAlign: 'center',
              py: 8,
              border: `2px dashed ${theme.palette.divider}`,
              borderRadius: 2,
            }}
          >
            <IconPhoto size={64} style={{ opacity: 0.3, marginBottom: 16 }} />
            <Typography variant="h6" color="text.secondary">
              No images in gallery
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Upload your first image to get started
            </Typography>
          </Box>
        )}
      </GalleryContainer>

      {/* Image Detail Dialog */}
      <Dialog
        open={imageDialogOpen}
        onClose={() => setImageDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">{selectedImage?.name}</Typography>
          <IconButton onClick={() => setImageDialogOpen(false)}>
            <IconX />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedImage && (
            <Box>
              <Box sx={{ mb: 3, textAlign: 'center' }}>
                <img
                  src={selectedImage.url}
                  alt={selectedImage.name}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '400px',
                    objectFit: 'contain',
                    borderRadius: '8px',
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/placeholder.png';
                  }}
                />
              </Box>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Image Name
                  </Typography>
                  <Typography variant="body1">{selectedImage.name}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Image Path
                  </Typography>
                  <Typography variant="body1" sx={{ wordBreak: 'break-all' }}>
                    {selectedImage.path}
                  </Typography>
                </Box>
                {selectedImage.created && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Image Created
                    </Typography>
                    <Typography variant="body1">
                      {new Date(selectedImage.created).toLocaleString()}
                    </Typography>
                  </Box>
                )}
                {selectedImage.type && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      File Type
                    </Typography>
                    <Chip label={selectedImage.type.toUpperCase()} size="small" />
                  </Box>
                )}
                {selectedImage.size && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      File Size
                    </Typography>
                    <Typography variant="body1">
                      {(selectedImage.size / 1024).toFixed(2)} KB
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => selectedImage && handleOpenInNewWindow(selectedImage)}
            variant="outlined"
          >
            Open in New Window
          </Button>
          <Button
            onClick={() => selectedImage && handleDeleteImage(selectedImage)}
            variant="contained"
            color="error"
            startIcon={<IconTrash size={18} />}
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete Image'}
          </Button>
          <Button onClick={() => setImageDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog
        open={uploadDialogOpen}
        onClose={handleCloseUploadDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Upload Image to Gallery
          <IconButton
            aria-label="close"
            onClick={handleCloseUploadDialog}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
            }}
          >
            <IconX size={20} />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.tiff,.gif,.png"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              id="image-upload-input"
            />
            <label htmlFor="image-upload-input">
              <Button
                variant="outlined"
                component="span"
                fullWidth
                startIcon={<IconUpload size={20} />}
                sx={{ mb: 2 }}
              >
                {selectedFile ? selectedFile.name : 'Select Image'}
              </Button>
            </label>

            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2, textAlign: 'center' }}>
              Allowed formats: .jpg, .jpeg, .tiff, .gif, .png
            </Typography>

            {selectedFile && (
              <Box sx={{ mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  <strong>File:</strong> {selectedFile.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Size:</strong> {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </Typography>
              </Box>
            )}

            {uploading && (
              <Box sx={{ mt: 2 }}>
                <LinearProgress variant="determinate" value={uploadProgress} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Uploading... {Math.round(uploadProgress)}%
                </Typography>
              </Box>
            )}

            {uploadError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {uploadError}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseUploadDialog} disabled={uploading}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            variant="contained"
            disabled={!selectedFile || uploading}
            sx={{
              backgroundColor: '#C8A24B',
              color: '#1a1a1a',
              '&:hover': {
                backgroundColor: '#B8923A',
              },
            }}
          >
            Upload
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Gallery;

