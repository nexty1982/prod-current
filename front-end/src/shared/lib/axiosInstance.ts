/**
 * Shared Axios Instance for OrthodMetrics API
 *
 * Re-exports the canonical ApiClient from api/utils/axiosInstance.
 * This file exists to preserve the @/shared/lib/axiosInstance import path
 * used by 9+ consumers (OCR, DynamicRecordsPage, etc.).
 *
 * The canonical instance includes:
 *  - /api prefix auto-add
 *  - JWT token injection
 *  - church_id header cleanup
 *  - 401 error handling via handle401Error
 */

export { apiClient, axiosInstance, default } from '../../api/utils/axiosInstance';
