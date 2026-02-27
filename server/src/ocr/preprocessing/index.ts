export { detectAndRemoveBorder } from './borderDetection';
export type {
  BorderDetectionOptions,
  BorderDetectionResult,
  Box,
  TrimPx,
} from './borderDetection';

export { detectAndCorrectSkew } from './deskew';
export type {
  DeskewOptions,
  DeskewResult,
} from './deskew';

export { detectAndCropROI } from './roiCrop';
export type {
  RoiCropOptions,
  RoiCropResult,
} from './roiCrop';

export { detectAndSplitSpread } from './splitSpread';
export type {
  SplitSpreadOptions,
  SplitSpreadResult,
} from './splitSpread';

export { normalizeBackground } from './bgNormalize';
export type {
  BgNormalizeOptions,
  BgNormalizeResult,
  BgNormalizeMetrics,
} from './bgNormalize';

export { gridPreserveDenoise } from './denoise';
export type {
  DenoiseOptions,
  DenoiseResult,
  DenoiseMetrics,
} from './denoise';

export { generateRedactionMask } from './redaction';
export type {
  RedactionOptions,
  RedactionResult,
} from './redaction';

export { generateOcrPlan } from './ocrPlan';
export type {
  OcrPlanOptions,
  OcrPlanResult,
  OcrRegion,
} from './ocrPlan';

export { selectRegionProfiles, getProfile, getProfileNames } from './ocrProfiles';

export { computeStructureScore, selectRetryStrategy, extractSignals, buildRetryPlan } from './structureRetry';
export type {
  OcrProfile,
  RegionProfileAssignment,
  ProfilePlanResult,
  ProfilePlanOptions,
} from './ocrProfiles';
