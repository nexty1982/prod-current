export { default as InspectionPanel } from './InspectionPanel';
export { default as MappingTab } from './MappingTab';
export { default as ProcessedImagesTable } from './ProcessedImagesTable';
// FusionTab is lazy-loaded in InspectionPanel to avoid circular dependencies - do not export directly
// export { default as FusionTab } from './FusionTab';
export { default as FusionOverlay } from './FusionOverlay';
export { default as ReviewFinalizeTab } from './ReviewFinalizeTab';
export { default as EditableBBox } from './EditableBBox';
export type { JobDetail, OCRResult, TextAnnotation, BoundingBox, FullTextAnnotation } from '../types/inspection';
export type { OverlayBox } from './FusionOverlay';
