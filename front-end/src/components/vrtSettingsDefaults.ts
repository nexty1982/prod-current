/**
 * vrtSettingsDefaults — VRTSettings interface and default values.
 * Extracted from VRTSettingsPanel.tsx to eliminate duplication between
 * initial state and handleReset.
 */

import { SnapshotConfig } from '../ai/visualTesting/snapshotEngine.ts';
import { DiffConfig } from '../ai/visualTesting/diffAnalyzer.ts';
import { ConfidenceConfig } from '../ai/visualTesting/confidenceAdjuster.ts';
import { PlaywrightConfig } from '../ai/visualTesting/playwrightTests.ts';
import { LearningConfig } from '../ai/learning/regressionFeedback.ts';

export interface VRTSettings {
  snapshot: SnapshotConfig;
  diff: DiffConfig;
  confidence: ConfidenceConfig;
  playwright: PlaywrightConfig;
  learning: LearningConfig;
  enabledInProduction: boolean;
  requireSuperAdmin: boolean;
  auditLogging: boolean;
  auditLogRetentionDays: number;
  rateLimitPerHour: number;
}

export const DEFAULT_VRT_SETTINGS: VRTSettings = {
  snapshot: {
    enabled: true,
    retentionDays: 30,
    breakpoints: {
      desktop: { width: 1920, height: 1080 },
      tablet: { width: 768, height: 1024 },
      mobile: { width: 375, height: 667 }
    },
    quality: 0.9,
    format: 'png'
  },
  diff: {
    sensitivity: 0.05,
    minRegionSize: 100,
    maxRegions: 50,
    colorThreshold: 30,
    layoutThreshold: 5,
    enableTextDetection: true,
    enableStyleDetection: true
  },
  confidence: {
    enabled: true,
    visualWeight: 0.3,
    severityPenalties: {
      NONE: 0,
      MINOR: -0.05,
      MODERATE: -0.15,
      MAJOR: -0.25,
      CRITICAL: -0.4
    },
    typeBonuses: {
      LAYOUT_SHIFT: -0.2,
      COLOR_CHANGE: 0.05,
      ELEMENT_MISSING: -0.3,
      ELEMENT_ADDED: 0.1,
      SIZE_CHANGE: -0.1,
      POSITION_CHANGE: -0.15,
      TEXT_CHANGE: 0.02,
      STYLE_CHANGE: 0.05
    },
    unexpectedChangePenalty: -0.1,
    intentionalChangeBonus: 0.05,
    layoutStabilityBonus: 0.1,
    minConfidence: 0.1,
    maxConfidence: 0.95,
    learningEnabled: true
  },
  playwright: {
    enabled: true,
    environments: [],
    defaultAssertions: [],
    screenshotOptions: {
      fullPage: false,
      quality: 0.9,
      type: 'png'
    },
    accessibilityThreshold: 0.8,
    colorContrastThreshold: 4.5,
    responsiveBreakpoints: [375, 768, 1024, 1440, 1920],
    maxTestDuration: 30000,
    retryAttempts: 2
  },
  learning: {
    enabled: true,
    minSamplesForTraining: 50,
    trainingInterval: 24 * 60 * 60 * 1000,
    featureExtraction: {
      includeVisualFeatures: true,
      includeConfidenceFeatures: true,
      includeTestFeatures: true,
      includeUserFeedback: true
    },
    modelUpdate: {
      autoUpdate: true,
      validationSplit: 0.2,
      learningRate: 0.01,
      maxIterations: 1000
    },
    storage: {
      maxSamples: 1000,
      retentionDays: 90,
      compressionEnabled: true
    }
  },
  enabledInProduction: false,
  requireSuperAdmin: true,
  auditLogging: true,
  auditLogRetentionDays: 90,
  rateLimitPerHour: 100
};
