/**
 * OM Specification Documentation Component Configuration
 * 
 * This file contains configuration for the OM Specification Documentation component at /church/om-spec
 * 
 * Backend API Endpoints Required:
 * - GET /api/docs/files - List all documentation files
 * - POST /api/docs/upload - Upload new documentation file
 * 
 * File Storage:
 * - Production: /var/www/orthodoxmetrics/prod/front-end/public/docs
 * - Development: front-end/public/docs (relative to project root)
 * 
 * Allowed File Types: .docx, .xlsx, .md, .json, .txt, .pdf, .tsx, .ts, .html, .js
 * Max File Size: 50MB
 * 
 * File Naming: Files are saved with timestamp prefix: {timestamp}_{originalFilename}
 * Timestamp Format: YYYY-MM-DDTHH-MM-SS-sssZ
 */

export const omSpecConfig = {
  api: {
    baseUrl: '/api/docs',
    endpoints: {
      list: '/files',
      upload: '/upload',
    },
  },
  storage: {
    production: '/var/www/orthodoxmetrics/prod/front-end/public/docs',
    development: 'front-end/public/docs', // Relative to backend root
  },
  allowedTypes: ['.docx', '.xlsx', '.md', '.json', '.txt', '.pdf', '.tsx', '.ts', '.html', '.js'],
  maxFileSize: 50 * 1024 * 1024, // 50MB
  publicPath: '/docs', // URL path for accessing files
  timestampFormat: 'YYYY-MM-DDTHH-MM-SS-sssZ', // ISO format with dashes instead of colons
  fileNaming: {
    prefix: 'timestamp', // Format: {timestamp}_{originalFilename}
    separator: '_',
  },
  display: {
    carousel: {
      autoPlay: false,
      showIndicators: true,
    },
    grid: {
      columns: {
        xs: 2,
        sm: 3,
        md: 4,
        lg: 5,
      },
    },
  },
  fileTypeIcons: {
    docx: 'IconFileText',
    xlsx: 'IconFileSpreadsheet',
    md: 'IconFileText',
    txt: 'IconFileText',
    pdf: 'IconFile',
    tsx: 'IconCode',
    ts: 'IconCode',
    js: 'IconCode',
    html: 'IconCode',
    json: 'IconCode',
  },
  fileTypeColors: {
    docx: '#2B579A',
    xlsx: '#1D6F42',
    md: '#083FA1',
    json: '#F7DF1E',
    txt: '#808080',
    pdf: '#DC143C',
    tsx: '#3178C6',
    ts: '#3178C6',
    html: '#E34C26',
    js: '#F7DF1E',
  },
} as const;

export type OMSpecConfig = typeof omSpecConfig;

