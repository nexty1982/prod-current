// VRT Export Utilities: exportUtils.ts
// Handles PNG snapshot export and JSON metadata export for VRT results

import html2canvas from 'html2canvas';

export interface VRTMetadata {
  componentId: string;
  componentName: string;
  timestamp: number;
  diffScore: number;
  confidenceBefore: number;
  confidenceAfter: number;
  affectedSelectors: string[];
  snapshotMetadata?: {
    baseline: {
      timestamp: number;
      dimensions: { width: number; height: number };
      deviceType: string;
    };
    postFix: {
      timestamp: number;
      dimensions: { width: number; height: number };
      deviceType: string;
    };
  };
  diffRegions: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    diffType: string;
    severity: string;
    confidence: number;
  }>;
  testResults?: Array<{
    testName: string;
    passed: boolean;
    details: string;
  }>;
}

export interface ExportLogEntry {
  timestamp: string;
  action: 'Export VRT PNG' | 'Export VRT Report JSON';
  component: string;
  details: string;
  user: string;
}

/**
 * Export snapshot comparison as PNG
 * @param viewMode - "side-by-side" or "overlay" view mode
 * @param elementRef - DOM element to capture
 * @param filename - Output filename
 */
export async function exportSnapshotAsPng(
  viewMode: "side-by-side" | "overlay",
  elementRef: HTMLElement,
  filename: string
): Promise<void> {
  try {
    // Configure html2canvas options for high-quality export
    const canvas = await html2canvas(elementRef, {
      scale: 2, // Higher resolution
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: elementRef.offsetWidth,
      height: elementRef.offsetHeight
    });

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (blob) {
        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    }, 'image/png', 0.95);
  } catch (error) {
    console.error('Failed to export PNG:', error);
    throw new Error('Failed to export snapshot as PNG');
  }
}

/**
 * Export VRT metadata as JSON
 * @param metadata - VRT metadata object
 * @param filename - Output filename
 */
export function exportVRTMetadataAsJson(metadata: VRTMetadata, filename: string): void {
  try {
    // Create JSON blob
    const jsonString = JSON.stringify(metadata, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to export JSON:', error);
    throw new Error('Failed to export VRT metadata as JSON');
  }
}

/**
 * Generate filename for PNG export
 * @param componentName - Name of the component
 * @param viewMode - View mode used
 */
export function generatePngFilename(componentName: string, viewMode: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  return `vrt-${componentName}-${viewMode}-${timestamp}.png`;
}

/**
 * Generate filename for JSON export
 * @param componentName - Name of the component
 */
export function generateJsonFilename(componentName: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  return `vrt-report-${componentName}-${timestamp}.json`;
}

/**
 * Log export action to VRT log
 * @param logEntry - Log entry to write
 */
export function logExportAction(logEntry: ExportLogEntry): void {
  try {
    // Get existing logs
    const existingLogs = localStorage.getItem('vrt_export_logs') || '[]';
    const logs = JSON.parse(existingLogs);
    
    // Add new log entry
    logs.push(logEntry);
    
    // Keep only last 1000 entries
    if (logs.length > 1000) {
      logs.splice(0, logs.length - 1000);
    }
    
    // Save back to localStorage
    localStorage.setItem('vrt_export_logs', JSON.stringify(logs));
    
    // Also log to console for debugging
    console.log(`[VRT Export] ${logEntry.action} | Component: ${logEntry.component} | ${logEntry.details}`);
  } catch (error) {
    console.error('Failed to log export action:', error);
  }
}

/**
 * Get export logs for audit purposes
 */
export function getExportLogs(): ExportLogEntry[] {
  try {
    const logs = localStorage.getItem('vrt_export_logs') || '[]';
    return JSON.parse(logs);
  } catch (error) {
    console.error('Failed to get export logs:', error);
    return [];
  }
}

/**
 * Clear export logs
 */
export function clearExportLogs(): void {
  localStorage.removeItem('vrt_export_logs');
} 