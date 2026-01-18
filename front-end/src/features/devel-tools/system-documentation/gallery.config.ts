/**
 * Gallery Component Configuration
 * 
 * This file contains configuration for the Gallery component at /apps/gallery
 * 
 * Backend API Endpoints Required:
 * - GET /api/gallery/images - List all images
 * - POST /api/gallery/upload - Upload new image
 * - POST /api/gallery/delete - Delete image
 * 
 * File Storage:
 * - Production: /var/www/orthodoxmetrics/prod/front-end/public/images/gallery
 * - Development: front-end/public/images/gallery (relative to project root)
 * 
 * Allowed File Types: .png, .jpg, .jpeg, .gif, .webp, .svg
 * Max File Size: 10MB
 */

export const galleryConfig = {
  api: {
    baseUrl: '/api/gallery',
    endpoints: {
      list: '/images',
      upload: '/upload',
      delete: '/delete',
    },
  },
  storage: {
    production: '/var/www/orthodoxmetrics/prod/front-end/public/images/gallery',
    development: 'front-end/public/images/gallery', // Relative to backend root
  },
  allowedTypes: ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'],
  maxFileSize: 10 * 1024 * 1024, // 10MB
  publicPath: '/images/gallery', // URL path for accessing images
  table: {
    // MUI DataGrid configuration
    pageSize: 20,
    pageSizeOptions: [10, 20, 50, 100],
    columns: {
      imageName: { flex: 1, minWidth: 200 },
      imageLocation: { flex: 2, minWidth: 250 },
      imageCreated: { flex: 1, minWidth: 180 },
      fileType: { width: 120 },
      fileSize: { width: 120 },
      actions: { width: 200 },
    },
  },
} as const;

export type GalleryConfig = typeof galleryConfig;

