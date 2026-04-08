import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  useTheme,
  Paper,
  Stack,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  IconArrowLeft,
  IconArrowRight,
  IconUpload,
  IconPhoto,
  IconTrash,
  IconDownload,
  IconFolder,
  IconFolderPlus,
  IconSparkles,
} from '@tabler/icons-react';
import { DataGrid, GridRowSelectionModel } from '@mui/x-data-grid';
import { OMLoading } from '@/components/common/OMLoading';
import {
  CANONICAL_IMAGE_DIRECTORIES,
  isCanonicalDirectory,
  buildImageUrl,
  extractDirectoryFromPath,
  IMAGES_BASE_PATH
} from '../system-documentation/gallery.config';
import type { GalleryImage } from './Gallery/types';
import { GalleryContainer, ThumbnailGrid, ImageCard, ImageThumbnail, CarouselContainer, CarouselButton, CarouselImageContainer } from './Gallery/styledComponents';
import { createColumns } from './Gallery/columns';
import UploadDialog from './Gallery/UploadDialog';
import ImageDetailDialog from './Gallery/ImageDetailDialog';
import SuggestionsDialog from './Gallery/SuggestionsDialog';
import { sortImages } from './Gallery/galleryUtils';
import type { SortBy, SortOrder, UsageFilter } from './Gallery/galleryUtils';
import { useGalleryUpload } from './Gallery/useGalleryUpload';
import { useGallerySuggestions } from './Gallery/useGallerySuggestions';
import { openImageWindow } from './Gallery/openImageWindow';
import DirectorySidebar from './Gallery/DirectorySidebar';

const Gallery: React.FC = () => {
  const theme = useTheme();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedRows, setSelectedRows] = useState<GridRowSelectionModel>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [usageFilter, setUsageFilter] = useState<UsageFilter>('all');
  const [checkingUsage, setCheckingUsage] = useState(false);
  const [exportingUsedImages, setExportingUsedImages] = useState(false);
  const [selectedDirectory, setSelectedDirectory] = useState<string>(''); // Default to root (empty = all images)
  const [directoryTree, setDirectoryTree] = useState<any>({ directories: [], files: [] });
  const [loadingTree, setLoadingTree] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [itemToMove, setItemToMove] = useState<GalleryImage | null>(null);
  const [newName, setNewName] = useState('');
  const [targetDir, setTargetDir] = useState('review-required');

  // Upload hook
  const {
    uploadDialogOpen, uploading, uploadProgress, uploadError,
    selectedFiles, uploadStatus, fileInputRef,
    handleFileSelect, handleUpload, handleOpenUploadDialog,
    handleCloseUploadDialog, handleRemoveFile,
  } = useGalleryUpload();

  const hasAutoCheckedUsage = useRef(false); // Track if auto-check has been triggered
  const lastCheckedDirectory = useRef<string>(''); // Track which directory we last checked
  const lastImageCount = useRef<number>(0); // Track image count when we last checked


  // Single source of truth: activeImages combines directory selection, usage filter, and sorting
  // This ensures grid, table, and carousel all use the same filtered and sorted list
  const activeImages = React.useMemo(() => {
    if (!images || images.length === 0) return [];
    
    // Apply usage filter
    let filtered: GalleryImage[] = images;
    if (usageFilter === 'used') {
      filtered = images.filter(img => img && img.isUsed === true);
    } else if (usageFilter === 'unused') {
      filtered = images.filter(img => img && img.isUsed === false);
    } else if (usageFilter === 'not_checked') {
      filtered = images.filter(img => img && img.isUsed === undefined);
    }
    // 'all' case: filtered = images (already set)
    
    // Apply sorting
    return sortImages(filtered, sortBy, sortOrder);
  }, [images, usageFilter, sortBy, sortOrder]);

  // Reset carousel index when active images change
  React.useEffect(() => {
    if (activeImages.length > 0 && currentIndex >= activeImages.length) {
      setCurrentIndex(0);
    } else if (activeImages.length === 0) {
      setCurrentIndex(0);
    }
  }, [activeImages.length, currentIndex]);

  // Carousel navigation handlers - use activeImages instead of images
  const handlePrevious = () => {
    if (activeImages.length === 0) return;
    setCurrentIndex((prev) => (prev === 0 ? activeImages.length - 1 : prev - 1));
  };

  const handleNext = () => {
    if (activeImages.length === 0) return;
    setCurrentIndex((prev) => (prev === activeImages.length - 1 ? 0 : prev + 1));
  };

  // Check image usage in codebase (with batching to handle all images)
  const checkImageUsage = async (imagesToCheck: GalleryImage[], checkAll = false) => {
    if (!imagesToCheck || imagesToCheck.length === 0) return;
    
    setCheckingUsage(true);
    
    try {
      // Always check all images when explicitly requested
      // Backend will handle batching internally
      const imagesToProcess = imagesToCheck.filter(img => img != null);
      
      // Process in batches of 500 (backend limit) to avoid timeouts
      const BATCH_SIZE = 500;
      const batches: GalleryImage[][] = [];
      for (let i = 0; i < imagesToProcess.length; i += BATCH_SIZE) {
        batches.push(imagesToProcess.slice(i, i + BATCH_SIZE));
      }
      
      let allUsage: { [key: string]: boolean } = {};
      
      // Process batches sequentially to avoid overwhelming the server
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        
        const response = await fetch('/api/gallery/check-usage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            images: batch.map(img => ({
              name: img.name || '',
              path: img.path || '',
            }))
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.usage) {
            // Merge batch results
            allUsage = { ...allUsage, ...data.usage };
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error(`Usage check failed for batch ${batchIndex + 1}/${batches.length}:`, errorData);
        }
      }

      // Update all images with usage information
      setImages(prevImages => {
        if (!prevImages || prevImages.length === 0) return prevImages;
        const updated = prevImages.map(img => {
          if (!img) return img;
          // If the image name is in the usage map, use that value
          // Otherwise, keep as undefined (not checked) if it wasn't in any batch
          const usageValue = allUsage[img.name];
          return {
            ...img,
            isUsed: usageValue !== undefined ? usageValue : img.isUsed // Preserve undefined if not checked
          };
        });
        return sortImages(updated);
      });
    } catch (error: any) {
      console.error('Error checking image usage:', error);
      // Don't mark as unknown on error - preserve existing state
    } finally {
      setCheckingUsage(false);
    }
  };

  // Re-sort images when sort criteria changes
  useEffect(() => {
    if (images.length > 0) {
      const sorted = sortImages(images);
      setImages(sorted);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, sortOrder]);

  // Auto-check usage when filter changes for the first time (not 'all')
  useEffect(() => {
    // Only auto-check once, and only if:
    // 1. Filter is not 'all' (user wants to see filtered results)
    // 2. We haven't auto-checked yet
    // 3. We have images loaded
    // 4. We're not already checking
    if (
      !hasAutoCheckedUsage.current &&
      usageFilter !== 'all' &&
      images.length > 0 &&
      !checkingUsage
    ) {
      // Check if there are any images with undefined usage status
      const hasUncheckedImages = images.some(img => img.isUsed === undefined);
      
      if (hasUncheckedImages) {
        hasAutoCheckedUsage.current = true;
        console.log(`🔄 Auto-checking usage due to filter change to: ${usageFilter}`);
        checkImageUsage(images, true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usageFilter]);

  // Reset auto-check flag when directory changes
  useEffect(() => {
    hasAutoCheckedUsage.current = false;
    lastCheckedDirectory.current = '';
    lastImageCount.current = 0;
  }, [selectedDirectory]);

  // Load directory tree on mount, then cleanup empty directories
  useEffect(() => {
    const initializeGallery = async () => {
      await loadDirectoryTree();
      // Clean up empty directories after loading tree
      await cleanupEmptyDirectories();
    };
    initializeGallery();
  }, []);

  // Load images when directory changes
  useEffect(() => {
    loadImages();
  }, [selectedDirectory]);

  // Automatically check usage after images are loaded for a directory
  // This effect runs when selectedDirectory changes, then waits for images to load
  useEffect(() => {
    // Only auto-check if a specific directory is selected (not root)
    if (selectedDirectory === '') {
      return;
    }
    
    // Reset flags when directory changes
    hasAutoCheckedUsage.current = false;
    lastImageCount.current = 0;
    
    // Wait for images to load, then check usage
    // Use a longer delay to ensure images are fully loaded
    const checkTimer = setTimeout(() => {
      // Only check if:
      // 1. We have images loaded
      // 2. We haven't already checked this directory (directory is different or never checked)
      // 3. We're not already checking
      // 4. Images have actually been loaded (count > 0)
      const directoryNotChecked = selectedDirectory !== lastCheckedDirectory.current || lastCheckedDirectory.current === '';
      
      if (
        images.length > 0 &&
        selectedDirectory !== '' &&
        directoryNotChecked &&
        !checkingUsage &&
        !hasAutoCheckedUsage.current
      ) {
        lastCheckedDirectory.current = selectedDirectory;
        lastImageCount.current = images.length;
        hasAutoCheckedUsage.current = true;
        checkImageUsage(images, true);
      }
    }, 800); // Wait longer to ensure images are loaded after directory change
    
    return () => clearTimeout(checkTimer);
  }, [selectedDirectory]); // Only trigger on directory change, NOT on images change

  const loadDirectoryTree = async () => {
    setLoadingTree(true);
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const debug = urlParams.get('debug') === '1' ? '&debug=1' : '';
      const response = await fetch(`/api/gallery/tree?depth=3${debug}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        console.log('📁 Directory tree loaded:', {
          directories: data.directories?.length || 0,
          files: data.files?.length || 0,
          path: data.path
        });
        setDirectoryTree(data);
        
        // Log debug info if available
        if (data.debug) {
          console.log('🔍 [DEBUG] Directory tree debug info:', data.debug);
          if (data.debug.resolvedImagesRoot) {
            console.log(`🔍 [DEBUG] Images root: ${data.debug.resolvedImagesRoot}`);
            console.log(`🔍 [DEBUG] Root exists: ${data.debug.rootExists}`);
            console.log(`🔍 [DEBUG] Root readable: ${data.debug.rootCanRead}`);
            if (data.debug.firstEntries && data.debug.firstEntries.length > 0) {
              console.log(`🔍 [DEBUG] First entries:`, data.debug.firstEntries);
            }
          }
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Error loading directory tree:', {
          status: response.status,
          error: errorData
        });
        // Don't wipe state - keep existing tree if available
        // Just log the error
      }
    } catch (error) {
      console.error('❌ Error loading directory tree:', error);
      // Don't wipe state - keep existing tree if available
    } finally {
      setLoadingTree(false);
    }
  };

  const loadImages = async () => {
    try {
      // Root view (empty string) should load all images recursively
      // Otherwise use selected directory (no default fallback - use exactly what's selected)
      const path = selectedDirectory === '' ? '' : selectedDirectory;
      const url = `/api/gallery/images?path=${encodeURIComponent(path)}&recursive=1`;
      console.log('Loading images from:', url);
      
      const response = await fetch(url, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('🖼️ Images loaded:', {
          count: data.count || 0,
          path: data.path,
          recursive: data.recursive
        });
        
        // Log debug info if available
        if (data.debug) {
          console.log('🔍 [DEBUG] Images API debug info:', data.debug);
          if (data.debug.resolvedImagesRoot) {
            console.log(`🔍 [DEBUG] Images root: ${data.debug.resolvedImagesRoot}`);
            console.log(`🔍 [DEBUG] Root exists: ${data.debug.rootExists}`);
            console.log(`🔍 [DEBUG] Root readable: ${data.debug.rootCanRead}`);
            if (data.debug.sampleImage) {
              console.log(`🔍 [DEBUG] Sample image:`, data.debug.sampleImage);
            }
          }
        }
        
        // Gallery API returns { success: true, count: number, images: [...] }
        // Filter to only show image files (jpg, jpeg, png, gif, tiff, webp, svg)
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.tiff', '.webp', '.svg'];
        const imageFiles = (data.images || []).filter((file: any) => {
          const fileName = file.name || file.path || '';
          const ext = fileName.split('.').pop()?.toLowerCase() || '';
          return imageExtensions.includes(`.${ext}`);
        });
        
        // Debug: Log API response structure if needed
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('debug') === '1' && imageFiles.length > 0) {
          console.log('🔍 [DEBUG] Sample image from API:', imageFiles[0]);
          console.log('🔍 [DEBUG] Sample image keys:', Object.keys(imageFiles[0]));
        }
        
        // Transform the data to match GalleryImage interface
        const transformedImages = imageFiles.map((file: any, index: number) => {
          // Handle metadata - preserve actual values or error status from API
          let fileSize: number | null = null;
          let fileModified: string | null = null;
          let fileCreated: string | null = null;
          let metadataError: string | null = null;
          
          // Check if API returned error status
          if (file.metadataStatus === 'error') {
            metadataError = file.statError || 'Failed to read file metadata';
            // Keep size/modified/created as null when there's an error
          } else {
            // Parse size as number - API should always return numeric or null
            if (file.size !== undefined && file.size !== null && file.size !== '') {
              fileSize = typeof file.size === 'number' ? file.size : parseInt(String(file.size), 10);
              if (isNaN(fileSize) || fileSize < 0) {
                fileSize = null;
                metadataError = 'Invalid file size value';
              }
            }
            
            // Preserve date strings exactly as received - API should return ISO strings or null
            fileModified = (file.modified && file.modified !== '') ? file.modified : null;
            fileCreated = (file.created && file.created !== '') ? file.created : null;
          }
          
          // Resolve image URL with proper fallback
          // Priority: file.url > file.path > derive from path > fallback
          let imageUrl = file.url;
          if (!imageUrl && file.path) {
            imageUrl = file.path.startsWith('/') ? file.path : `${IMAGES_BASE_PATH}/${file.path}`;
          }
          if (!imageUrl && file.name) {
            // Try to extract directory from path if available
            const directory = file.path ? extractDirectoryFromPath(file.path) : null;
            if (directory) {
              imageUrl = buildImageUrl(directory, file.name);
            } else {
              // Last resort: use first canonical directory (should rarely happen)
              imageUrl = `${IMAGES_BASE_PATH}/${CANONICAL_IMAGE_DIRECTORIES[0]}/${file.name}`;
            }
          }
          
          return {
            id: `img-${index}-${file.name}`,
            name: file.name || 'Unknown',
            path: file.path || file.url || file.name,
            url: imageUrl || '/images/incode/placeholder.png',
            created: fileCreated,
            modified: fileModified,
            size: fileSize,
            type: file.type || file.name?.split('.').pop()?.toLowerCase() || 'unknown',
            isUsed: undefined, // Will be checked separately
            metadataError: metadataError || undefined, // Store error if present
          };
        });
        
        // Don't sort here - sorting will be applied in activeImages useMemo
        // This ensures sorting is applied after filtering
        setImages(transformedImages);
        
        // Reset carousel index when images change
        setCurrentIndex(0);
        
        // Note: Usage status is not auto-checked on load
        // Users must click "Refresh Usage" to check which images are used in the codebase
        // This prevents slow page loads and timeouts for large image collections
      } else {
        // Log the actual error for debugging
        const errorData = await response.json().catch(() => ({}));
        console.error('Gallery API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          url: url
        });
        setImages([]);
        
        // Show user-friendly error message
        if (response.status === 502) {
          console.error('Backend server may be down or the gallery API endpoint is not available');
        }
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

  // Suggestions hook (needs loadImages/loadDirectoryTree)
  const {
    suggestions, suggestionsDialogOpen, setSuggestionsDialogOpen,
    suggestionStatuses, setSuggestionStatuses,
    showFullSummary, setShowFullSummary,
    summaryExpanded, setSummaryExpanded,
    validating, applying,
    handleGetSuggestions, handleDryRun, handleApplySingle,
    handleApplyAll, handleCopySummary,
  } = useGallerySuggestions({ images, loadImages, loadDirectoryTree });

  const handleImageClick = (image: GalleryImage) => {
    setSelectedImage(image);
    setImageDialogOpen(true);
  };

  const handleOpenInNewWindow = (image: GalleryImage) => openImageWindow(image);

  const handleDeleteImage = async (image: GalleryImage) => {
    if (!window.confirm(`Are you sure you want to delete "${image.name}"?`)) {
      return;
    }

    setDeleting(true);
    try {
      // Extract relative path from /images/... path
      const relativePath = image.path.replace(/^\/images\//, '');
      console.log('🗑️ [Frontend] Single delete:', {
        name: image.name,
        originalPath: image.path,
        relativePath: relativePath,
        selectedDirectory: selectedDirectory
      });
      
      const response = await fetch('/api/gallery/file', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ path: relativePath })
      });

      console.log('🗑️ [Frontend] Delete response status:', response.status, response.statusText);

      if (response.ok) {
        const result = await response.json().catch(() => ({}));
        console.log('🗑️ [Frontend] Delete successful:', result);
        await loadImages();
        await loadDirectoryTree();
        setImageDialogOpen(false);
        setSelectedImage(null);
      } else {
        let errorMessage = 'Unknown error';
        try {
          const errorData = await response.json();
          console.error('🗑️ [Frontend] Delete error response:', errorData);
          errorMessage = errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`;
        } catch (e) {
          console.error('🗑️ [Frontend] Failed to parse error response:', e);
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        alert(`Failed to delete image: ${errorMessage}`);
      }
    } catch (error: any) {
      console.error('🗑️ [Frontend] Error deleting image:', error);
      alert(`Failed to delete image: ${error.message || 'Network error'}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleMoveImage = async (image: GalleryImage, targetDir: string) => {
    try {
      const relativePath = image.path.replace(/^\/images\//, '');
      const targetPath = targetDir ? `${targetDir}/${image.name}` : image.name;
      
      const response = await fetch('/api/gallery/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ from: relativePath, to: targetPath, overwrite: false })
      });

      if (response.ok) {
        await loadImages();
        await loadDirectoryTree();
        setMoveDialogOpen(false);
        setItemToMove(null);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to move image');
      }
    } catch (error) {
      console.error('Error moving image:', error);
      alert('Failed to move image');
    }
  };

  const handleRenameImage = async (image: GalleryImage, newName: string) => {
    try {
      const relativePath = image.path.replace(/^\/images\//, '');
      const response = await fetch('/api/gallery/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ path: relativePath, newName })
      });

      if (response.ok) {
        await loadImages();
        await loadDirectoryTree();
        setRenameDialogOpen(false);
        setItemToMove(null);
        setNewName('');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to rename image');
      }
    } catch (error) {
      console.error('Error renaming image:', error);
      alert('Failed to rename image');
    }
  };

  const handleCreateDirectory = async (dirName: string) => {
    if (!dirName || !dirName.trim()) {
      alert('Directory name cannot be empty');
      return;
    }
    
    try {
      const targetPath = selectedDirectory ? `${selectedDirectory}/${dirName.trim()}` : dirName.trim();
      const response = await fetch('/api/gallery/mkdir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ path: targetPath })
      });

      if (response.ok) {
        await loadDirectoryTree();
        // Show success message
        const data = await response.json();
        console.log('Directory created:', data);
      } else {
        const data = await response.json();
        // Show detailed error message
        const errorMsg = data.error || 'Failed to create directory';
        const code = data.code ? ` (${data.code})` : '';
        const pathInfo = data.path ? `\nPath: ${data.path}` : '';
        alert(`${errorMsg}${code}${pathInfo}`);
      }
    } catch (error: any) {
      console.error('Error creating directory:', error);
      alert(`Failed to create directory: ${error.message || 'Unknown error'}`);
    }
  };














  // MUI DataGrid column definitions (extracted to Gallery/columns.tsx)
  const columns = createColumns({
    checkingUsage,
    deleting,
    selectedDirectory,
    handleImageClick,
    setItemToMove,
    setNewName,
    setRenameDialogOpen,
    setTargetDir,
    setMoveDialogOpen,
    handleDeleteImage,
  });

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
      // Use activeImages to ensure we're deleting from the filtered view
      const selectedImages = activeImages.filter(img => selectedRows.includes(img.id || img.path));
      const deletePromises = selectedImages.map(async (image) => {
        const relativePath = image.path.replace(/^\/images\//, '');
        console.log('🗑️ [Frontend] Attempting to delete:', {
          name: image.name,
          originalPath: image.path,
          relativePath: relativePath,
          selectedDirectory: selectedDirectory
        });
        try {
          const response = await fetch('/api/gallery/file', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ path: relativePath })
          });

          if (!response.ok) {
            let errorMessage = 'Unknown error';
            try {
              const errorData = await response.json();
              errorMessage = errorData.error || errorData.message || `HTTP ${response.status}`;
            } catch (e) {
              errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            }
            return { success: false, image: image.name, error: errorMessage, path: relativePath };
          }

          return { success: true, image: image.name, path: relativePath };
        } catch (error: any) {
          console.error(`Error deleting ${image.name}:`, error);
          return { 
            success: false, 
            image: image.name, 
            error: error.message || 'Network error',
            path: relativePath 
          };
        }
      });

      const results = await Promise.all(deletePromises);
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      if (successful.length > 0) {
        await loadImages();
        await loadDirectoryTree();
        setSelectedRows([]);
        
        if (failed.length > 0) {
          const failedDetails = failed.map(f => `  - ${f.image}: ${f.error}`).join('\n');
          alert(`Successfully deleted ${successful.length} image(s).\n\nFailed to delete ${failed.length} image(s):\n${failedDetails}`);
        } else {
          alert(`Successfully deleted ${successful.length} image(s)`);
        }
      } else {
        const failedDetails = failed.map(f => `  - ${f.image}: ${f.error}`).join('\n');
        alert(`Failed to delete ${failed.length} image(s):\n\n${failedDetails}`);
      }
    } catch (error: any) {
      console.error('Error deleting images:', error);
      alert(`An error occurred while deleting images: ${error.message || 'Unknown error'}`);
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

  const handleExportUsedImages = async () => {
    try {
      // Show loading state
      setExportingUsedImages(true);
      setUploadError(null);
      
      // Fetch used images list from API with pagination support
      // Backend will handle batching internally, but we'll fetch all pages if needed
      let allUsedImages: any[] = [];
      let offset = 0;
      const limit = 200; // Backend batch size
      let hasMore = true;
      let totalImages = 0;
      let checkedImages = 0;
      let limited = false;
      
      while (hasMore) {
        const response = await fetch(`/api/gallery/used-images?format=json&offset=${offset}&limit=${limit}`, {
          credentials: 'include',
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = 'Failed to export used images list';
          try {
            const data = JSON.parse(errorText);
            errorMessage = data.error || data.message || errorMessage;
          } catch (e) {
            errorMessage = errorText || errorMessage;
          }
          alert(`Error: ${errorMessage}`);
          setUploadError(errorMessage);
          setExportingUsedImages(false);
          return;
        }
        
        const data = await response.json();
        
        if (data.success && data.used) {
          allUsedImages = [...allUsedImages, ...data.used];
          totalImages = data.total_images || totalImages;
          checkedImages = data.checked_images || checkedImages;
          limited = data.limited || limited;
          
          // Check if there are more pages
          if (data.used.length < limit || offset + limit >= checkedImages) {
            hasMore = false;
          } else {
            offset += limit;
          }
        } else {
          hasMore = false;
        }
      }
      
      // Generate text output
      let output = `# Images Actively Used in Production\n\n`;
      output += `Generated: ${new Date().toISOString()}\n`;
      output += `Total Images: ${totalImages}\n`;
      output += `Checked Images: ${checkedImages}\n`;
      output += `Used Images: ${allUsedImages.length}\n`;
      if (limited) {
        output += `Note: Scanning was limited due to performance constraints\n`;
      }
      output += `\n## Used Images (${allUsedImages.length})\n\n`;
      
      allUsedImages.forEach((img, index) => {
        output += `${index + 1}. **${img.name}**\n`;
        output += `   - Path: ${img.path}\n`;
        output += `   - Size: ${img.size ? (img.size / 1024).toFixed(2) + ' KB' : 'Unknown'}\n`;
        output += `   - Type: ${img.type ? img.type.toUpperCase() : 'Unknown'}\n`;
        output += `   - Modified: ${img.modified ? new Date(img.modified).toLocaleString() : 'Unknown'}\n`;
        if (img.referencedIn && img.referencedIn.length > 0) {
          output += `   - Referenced in:\n`;
          img.referencedIn.forEach((ref: string) => {
            output += `     - ${ref}\n`;
          });
        }
        output += `\n`;
      });
      
      // Create and download file
      const blob = new Blob([output], { type: 'text/plain;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `used-images-${new Date().toISOString().split('T')[0]}.txt`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      // Show success message with counts
      alert(`Used images list exported successfully!\nTotal: ${totalImages}, Checked: ${checkedImages}, Used: ${allUsedImages.length}${limited ? ' (limited)' : ''}`);
    } catch (error: any) {
      console.error('Error exporting used images:', error);
      const errorMsg = error.message || 'Failed to export used images list. Please check the browser console for details.';
      alert(`Error: ${errorMsg}`);
      setUploadError(errorMsg);
    } finally {
      setExportingUsedImages(false);
    }
  };

  // No longer needed - MUI DataGrid uses React components for cell rendering

  // Get first 8 images for thumbnail display - use activeImages to respect filters
  const thumbnailImages = activeImages.slice(0, 8);

  // Use canonical directories from shared config (single source of truth)
  const DEFAULT_DIRECTORIES = CANONICAL_IMAGE_DIRECTORIES;

  // Check if directory is a canonical directory

  // Clean up empty directories
  const cleanupEmptyDirectories = async () => {
    try {
      const response = await fetch('/api/gallery/cleanup-empty-dirs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.deleted && data.deleted.length > 0) {
          console.log(`🗑️ Cleaned up ${data.deleted.length} empty directory(ies):`, data.deleted);
          // Reload directory tree after cleanup
          await loadDirectoryTree();
        }
      }
    } catch (error) {
      console.error('Error cleaning up empty directories:', error);
      // Don't show error to user - this is a background operation
    }
  };


  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'row' }}>
      {/* Directory Tree Sidebar */}
      <DirectorySidebar
        selectedDirectory={selectedDirectory}
        setSelectedDirectory={setSelectedDirectory}
        directoryTree={directoryTree}
        loadingTree={loadingTree}
        onCreateDirectory={handleCreateDirectory}
        onGetSuggestions={handleGetSuggestions}
      />

      {/* Main Content */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <GalleryContainer maxWidth="xl">
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
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            Browse images from <code>/public/images/**</code> (all directories)
          </Typography>
          {/* Usage Status Banner */}
          {images.length > 0 && images.some(img => img.isUsed === undefined) && (
            <Alert 
              severity="info" 
              sx={{ mb: 3 }}
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => checkImageUsage(images, true)}
                  disabled={checkingUsage}
                >
                  {checkingUsage ? 'Checking...' : 'Check Now'}
                </Button>
              }
            >
              Usage status not computed. Click &quot;Refresh Usage&quot; or &quot;Check Now&quot; to determine which images are used in the codebase.
            </Alert>
          )}
          {/* Carousel Navigation Arrows */}
          {activeImages.length > 0 && (
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

          <Stack direction="row" spacing={2} justifyContent="center" alignItems="center" sx={{ mb: 3, flexWrap: 'wrap', gap: 2 }}>
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
              Upload Images
            </Button>

            {/* Refresh Usage Check */}
            {images.length > 0 && (
              <Button
                variant="outlined"
                size="small"
                onClick={() => checkImageUsage(images, true)}
                disabled={checkingUsage}
                title={checkingUsage ? 'Checking image usage in codebase...' : 'Check all images for usage in codebase'}
              >
                {checkingUsage ? 'Checking...' : 'Refresh Usage'}
              </Button>
            )}
          </Stack>
        </Box>

        {/* Carousel - Current Image Display */}
        {activeImages.length > 0 && (
          <CarouselContainer>
            <CarouselButton
              onClick={handlePrevious}
              sx={{ left: { xs: -20, sm: -28 } }}
              aria-label="Previous image"
              disabled={activeImages.length === 0}
            >
              <IconArrowLeft size={28} />
            </CarouselButton>

            <CarouselImageContainer
              onClick={() => activeImages[currentIndex] && handleOpenInNewWindow(activeImages[currentIndex])}
              sx={{ cursor: 'pointer' }}
              isUsed={activeImages[currentIndex]?.isUsed === true}
            >
              {activeImages[currentIndex] && (
                <Box
                  component="img"
                  src={activeImages[currentIndex].url}
                  alt={activeImages[currentIndex].name}
                  sx={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    imageOrientation: 'from-image', // Respect EXIF orientation
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/incode/placeholder.png';
                  }}
                />
              )}
            </CarouselImageContainer>

            <CarouselButton
              onClick={handleNext}
              sx={{ right: { xs: -20, sm: -28 } }}
              aria-label="Next image"
              disabled={activeImages.length === 0}
            >
              <IconArrowRight size={28} />
            </CarouselButton>

            {/* Image info below carousel */}
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                {activeImages[currentIndex]?.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {activeImages.length > 0 ? `${currentIndex + 1} of ${activeImages.length}` : '0 of 0'}
              </Typography>
            </Box>
          </CarouselContainer>
        )}

        {/* Thumbnail Grid - 2 rows of 4 images (8 total) */}
        {activeImages.length > 0 && (
          <Box>
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
              Recent Images
            </Typography>
            <ThumbnailGrid>
              {thumbnailImages.map((image, index) => {
                // Find index in activeImages to sync with carousel
                const activeIndex = activeImages.findIndex(img => img.id === image.id || img.path === image.path);
                return (
                <ImageCard
                  key={image.id || index}
                  onClick={() => {
                    if (activeIndex >= 0) {
                      setCurrentIndex(activeIndex);
                    }
                    handleOpenInNewWindow(image);
                  }}
                  isUsed={image.isUsed === true}
                >
                  <ImageThumbnail
                    component="img"
                    image={image.url}
                    alt={image.name}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/incode/placeholder.png';
                    }}
                  />
                </ImageCard>
                );
              })}
            </ThumbnailGrid>
          </Box>
        )}

        {/* AG Grid Table */}
        <Box sx={{ mt: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              All Images
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              {/* Sort Controls */}
              {images.length > 0 && (
                <>
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Sort By</InputLabel>
                    <Select
                      value={sortBy}
                      label="Sort By"
                      onChange={(e) => setSortBy(e.target.value as 'date' | 'name' | 'size' | 'type' | 'location')}
                    >
                      <MenuItem value="date">Date Modified</MenuItem>
                      <MenuItem value="name">Name</MenuItem>
                      <MenuItem value="size">Size</MenuItem>
                      <MenuItem value="type">Type</MenuItem>
                      <MenuItem value="location">Location</MenuItem>
                    </Select>
                  </FormControl>
                  <IconButton
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
                    size="small"
                  >
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </IconButton>
                </>
              )}

              {/* Usage Filter */}
              {images.length > 0 && (
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Usage Filter</InputLabel>
                    <Select
                      value={usageFilter}
                      label="Usage Filter"
                      onChange={(e) => setUsageFilter(e.target.value as 'all' | 'used' | 'unused' | 'not_checked')}
                    >
                    <MenuItem value="all">All Images</MenuItem>
                    <MenuItem value="used">Used in Codebase</MenuItem>
                    <MenuItem value="unused">Not Used</MenuItem>
                    <MenuItem value="not_checked">Not Checked</MenuItem>
                  </Select>
                </FormControl>
              )}

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
              <Button
                variant="outlined"
                color="success"
                startIcon={<IconDownload size={18} />}
                onClick={handleExportUsedImages}
                disabled={exportingUsedImages}
              >
                {exportingUsedImages ? 'Generating...' : 'Export Used Images List'}
              </Button>
            </Stack>
          </Box>
          <Paper sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={activeImages}
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
              getRowClassName={(params) => {
                if (!params || !params.row) return '';
                const image = params.row as GalleryImage;
                if (!image) return '';
                if (image.isUsed === true) {
                  return 'gallery-row-used';
                } else if (image.isUsed === false) {
                  return 'gallery-row-unused';
                }
                return '';
              }}
              sx={{
                '& .MuiDataGrid-cell:focus': {
                  outline: 'none',
                },
                '& .gallery-row-used': {
                  background: 'linear-gradient(90deg, rgba(200, 230, 201, 0.3) 0%, rgba(200, 230, 201, 0.1) 100%)',
                  '&:hover': {
                    backgroundColor: 'rgba(200, 230, 201, 0.4) !important',
                  },
                },
                '& .gallery-row-unused': {
                  background: 'linear-gradient(90deg, rgba(255, 205, 210, 0.3) 0%, rgba(255, 205, 210, 0.1) 100%)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 205, 210, 0.4) !important',
                  },
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
      </Box>

      {/* Move Dialog */}
      <Dialog open={moveDialogOpen} onClose={() => setMoveDialogOpen(false)}>
        <DialogTitle>Move Image</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Target Directory"
            value={targetDir}
            onChange={(e) => setTargetDir(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMoveDialogOpen(false)}>Cancel</Button>
          <Button onClick={() => itemToMove && handleMoveImage(itemToMove, targetDir)}>Move</Button>
        </DialogActions>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onClose={() => setRenameDialogOpen(false)}>
        <DialogTitle>Rename Image</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="New Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameDialogOpen(false)}>Cancel</Button>
          <Button onClick={() => itemToMove && handleRenameImage(itemToMove, newName)}>Rename</Button>
        </DialogActions>
      </Dialog>

      {/* Catalog Suggestions Dialog */}
      <SuggestionsDialog
        open={suggestionsDialogOpen}
        onClose={() => {
          setSuggestionsDialogOpen(false);
          setSuggestionStatuses({});
          setShowFullSummary(false);
          setSummaryExpanded(false);
        }}
        suggestions={suggestions}
        suggestionStatuses={suggestionStatuses}
        showFullSummary={showFullSummary}
        setShowFullSummary={setShowFullSummary}
        summaryExpanded={summaryExpanded}
        setSummaryExpanded={setSummaryExpanded}
        validating={validating}
        applying={applying}
        onDryRun={handleDryRun}
        onApplyAll={handleApplyAll}
        onApplySingle={handleApplySingle}
        onCopySummary={handleCopySummary}
      />

      {/* Image Detail Dialog */}
      <ImageDetailDialog
        open={imageDialogOpen}
        onClose={() => setImageDialogOpen(false)}
        image={selectedImage}
        deleting={deleting}
        onOpenInNewWindow={handleOpenInNewWindow}
        onDelete={handleDeleteImage}
      />

      {/* Upload Dialog */}
      <UploadDialog
        open={uploadDialogOpen}
        onClose={handleCloseUploadDialog}
        selectedFiles={selectedFiles}
        uploadStatus={uploadStatus}
        uploading={uploading}
        uploadProgress={uploadProgress}
        uploadError={uploadError}
        fileInputRef={fileInputRef}
        onFileSelect={handleFileSelect}
        onRemoveFile={handleRemoveFile}
        onUpload={handleUpload}
      />
    </Box>
  );
};

export default Gallery;

