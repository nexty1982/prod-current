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

export {
  extractWithTemplate,
  selectTemplate,
  resolveTemplate,
  templateFromExtractorRow,
  getBuiltinTemplate,
  getBuiltinTemplates,
  extractTokens,
  clusterRows,
} from './templateSpec';
export type {
  TemplateSpec,
  TemplateColumn,
  TemplateMatchResult,
  TemplateExtractionResult,
  WordToken,
  RowModel,
} from './templateSpec';

export {
  normalizeTokens,
  buildTableProvenance,
  buildRecordCandidatesProvenance,
  aggregateConfidence,
  bboxUnion,
  buildBundle,
} from './provenance';
export type {
  NormalizedToken,
  ProvenanceBundle,
  CellProvenance,
  TableProvenanceResult,
  FieldProvenance,
  RecordCandidatesProvenanceResult,
  NormalizedTokensResult,
} from './provenance';

export { computeScoringV2 } from './scoringV2';
export type {
  ScoringV2Result,
  ScoringV2Options,
  RowScore,
  FieldScore,
  ReasonCode,
} from './scoringV2';

export {
  isRowAutoCommittable,
  buildAutocommitPlan,
  buildAutocommitResults,
  generateBatchId,
  DEFAULT_THRESHOLDS,
} from './autocommit';
export type {
  AutocommitThresholds,
  RowEligibility,
  AutocommitPlan,
  AutocommitRowResult,
  AutocommitResults,
} from './autocommit';

export { extractRollbackTargets, verifyTargets, buildRollbackResult } from './rollback';
export type {
  RollbackTarget,
  RollbackPlan,
  RollbackVerification,
  RollbackResult,
} from './rollback';

export type {
  OcrProfile,
  RegionProfileAssignment,
  ProfilePlanResult,
  ProfilePlanOptions,
} from './ocrProfiles';
