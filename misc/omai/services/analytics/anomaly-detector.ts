import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';

export interface AnomalyDetection {
  id: string;
  target: string;
  timestamp: string;
  value: number;
  expectedValue: number;
  deviation: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'spike' | 'drop' | 'trend_break' | 'seasonal_anomaly' | 'level_shift';
  confidence: number;
  description: string;
  context?: Record<string, any>;
  resolved?: boolean;
  resolvedAt?: string;
  resolution?: string;
}

export interface AnomalyThreshold {
  target: string;
  method: 'z_score' | 'iqr' | 'mad' | 'custom';
  threshold: number;
  windowSize: number;
  enabled: boolean;
  lastUpdated: string;
}

export interface AnomalyAlert {
  id: string;
  anomalyId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

export interface AnomalyDetector {
  detectAnomalies(target: string, data: Array<{ timestamp: string; value: number }>): Promise<AnomalyDetection[]>;
  setThreshold(target: string, threshold: Omit<AnomalyThreshold, 'lastUpdated'>): Promise<void>;
  getThresholds(): Promise<AnomalyThreshold[]>;
  getAnomalyHistory(target?: string, limit?: number): Promise<AnomalyDetection[]>;
  resolveAnomaly(anomalyId: string, resolution: string): Promise<void>;
  createAlert(anomaly: AnomalyDetection): Promise<AnomalyAlert>;
  getAlerts(acknowledged?: boolean, limit?: number): Promise<AnomalyAlert[]>;
  acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<void>;
  calculateBaseline(data: Array<{ timestamp: string; value: number }>): Promise<{ mean: number; stdDev: number; median: number; q1: number; q3: number }>;
}

export class OMIAnomalyDetector implements AnomalyDetector {
  private anomaliesFile: string;
  private thresholdsFile: string;
  private alertsFile: string;

  constructor() {
    const analyticsDir = path.join(__dirname, '../memory');
    this.anomaliesFile = path.join(analyticsDir, 'anomalies.json');
    this.thresholdsFile = path.join(analyticsDir, 'anomaly-thresholds.json');
    this.alertsFile = path.join(analyticsDir, 'anomaly-alerts.json');
  }

  async detectAnomalies(target: string, data: Array<{ timestamp: string; value: number }>): Promise<AnomalyDetection[]> {
    if (data.length < 3) return [];

    const anomalies: AnomalyDetection[] = [];
    const thresholds = await this.getThresholds();
    const targetThreshold = thresholds.find(t => t.target === target);
    
    // Sort data by timestamp
    const sortedData = data.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    // Calculate baseline statistics
    const baseline = await this.calculateBaseline(sortedData);
    
    // Detect different types of anomalies
    const spikeAnomalies = this.detectSpikeAnomalies(sortedData, baseline, targetThreshold);
    const trendAnomalies = this.detectTrendBreakAnomalies(sortedData, baseline);
    const seasonalAnomalies = this.detectSeasonalAnomalies(sortedData, baseline);
    const levelShiftAnomalies = this.detectLevelShiftAnomalies(sortedData, baseline);
    
    anomalies.push(...spikeAnomalies, ...trendAnomalies, ...seasonalAnomalies, ...levelShiftAnomalies);
    
    // Save anomalies
    const existingAnomalies = await this.loadAnomalies();
    existingAnomalies.push(...anomalies);
    await this.saveAnomalies(existingAnomalies);
    
    // Create alerts for high-severity anomalies
    for (const anomaly of anomalies.filter(a => a.severity === 'high' || a.severity === 'critical')) {
      await this.createAlert(anomaly);
    }
    
    return anomalies;
  }

  async setThreshold(target: string, threshold: Omit<AnomalyThreshold, 'lastUpdated'>): Promise<void> {
    const thresholds = await this.loadThresholds();
    const existingIndex = thresholds.findIndex(t => t.target === target);
    
    const updatedThreshold: AnomalyThreshold = {
      ...threshold,
      lastUpdated: new Date().toISOString()
    };
    
    if (existingIndex >= 0) {
      thresholds[existingIndex] = updatedThreshold;
    } else {
      thresholds.push(updatedThreshold);
    }
    
    await this.saveThresholds(thresholds);
  }

  async getThresholds(): Promise<AnomalyThreshold[]> {
    return await this.loadThresholds();
  }

  async getAnomalyHistory(target?: string, limit: number = 100): Promise<AnomalyDetection[]> {
    const anomalies = await this.loadAnomalies();
    let filtered = anomalies;
    
    if (target) {
      filtered = anomalies.filter(a => a.target === target);
    }
    
    return filtered.slice(-limit);
  }

  async resolveAnomaly(anomalyId: string, resolution: string): Promise<void> {
    const anomalies = await this.loadAnomalies();
    const anomalyIndex = anomalies.findIndex(a => a.id === anomalyId);
    
    if (anomalyIndex >= 0) {
      anomalies[anomalyIndex].resolved = true;
      anomalies[anomalyIndex].resolvedAt = new Date().toISOString();
      anomalies[anomalyIndex].resolution = resolution;
      
      await this.saveAnomalies(anomalies);
    }
  }

  async createAlert(anomaly: AnomalyDetection): Promise<AnomalyAlert> {
    const alert: AnomalyAlert = {
      id: uuidv4(),
      anomalyId: anomaly.id,
      severity: anomaly.severity,
      message: this.generateAlertMessage(anomaly),
      timestamp: new Date().toISOString(),
      acknowledged: false
    };
    
    const alerts = await this.loadAlerts();
    alerts.push(alert);
    await this.saveAlerts(alerts);
    
    return alert;
  }

  async getAlerts(acknowledged?: boolean, limit: number = 50): Promise<AnomalyAlert[]> {
    const alerts = await this.loadAlerts();
    let filtered = alerts;
    
    if (acknowledged !== undefined) {
      filtered = alerts.filter(a => a.acknowledged === acknowledged);
    }
    
    return filtered.slice(-limit);
  }

  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<void> {
    const alerts = await this.loadAlerts();
    const alertIndex = alerts.findIndex(a => a.id === alertId);
    
    if (alertIndex >= 0) {
      alerts[alertIndex].acknowledged = true;
      alerts[alertIndex].acknowledgedBy = acknowledgedBy;
      alerts[alertIndex].acknowledgedAt = new Date().toISOString();
      
      await this.saveAlerts(alerts);
    }
  }

  async calculateBaseline(data: Array<{ timestamp: string; value: number }>): Promise<{ mean: number; stdDev: number; median: number; q1: number; q3: number }> {
    const values = data.map(d => d.value).sort((a, b) => a - b);
    const n = values.length;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / n;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    
    const median = this.calculatePercentile(values, 50);
    const q1 = this.calculatePercentile(values, 25);
    const q3 = this.calculatePercentile(values, 75);
    
    return { mean, stdDev, median, q1, q3 };
  }

  // Private helper methods
  private detectSpikeAnomalies(data: Array<{ timestamp: string; value: number }>, baseline: { mean: number; stdDev: number; median: number; q1: number; q3: number }, threshold?: AnomalyThreshold): AnomalyDetection[] {
    const anomalies: AnomalyDetection[] = [];
    const thresholdValue = threshold?.threshold || 2.0;
    
    for (const point of data) {
      const zScore = Math.abs((point.value - baseline.mean) / baseline.stdDev);
      
      if (zScore > thresholdValue) {
        const severity = this.determineSeverity(zScore);
        const deviation = (point.value - baseline.mean) / baseline.stdDev;
        
        anomalies.push({
          id: uuidv4(),
          target: 'system_performance', // This would be passed as parameter
          timestamp: point.timestamp,
          value: point.value,
          expectedValue: baseline.mean,
          deviation: Math.abs(deviation),
          severity,
          type: 'spike',
          confidence: Math.min(0.95, zScore / 5),
          description: this.generateSpikeDescription(point.value, baseline.mean, deviation),
          context: { zScore, baseline }
        });
      }
    }
    
    return anomalies;
  }

  private detectTrendBreakAnomalies(data: Array<{ timestamp: string; value: number }>, baseline: { mean: number; stdDev: number; median: number; q1: number; q3: number }): AnomalyDetection[] {
    const anomalies: AnomalyDetection[] = [];
    
    if (data.length < 5) return anomalies;
    
    // Calculate moving average and detect trend breaks
    const windowSize = Math.min(5, Math.floor(data.length / 2));
    
    for (let i = windowSize; i < data.length - windowSize; i++) {
      const beforeWindow = data.slice(i - windowSize, i).map(d => d.value);
      const afterWindow = data.slice(i + 1, i + windowSize + 1).map(d => d.value);
      
      const beforeMean = beforeWindow.reduce((sum, val) => sum + val, 0) / beforeWindow.length;
      const afterMean = afterWindow.reduce((sum, val) => sum + val, 0) / afterWindow.length;
      
      const change = Math.abs(afterMean - beforeMean) / baseline.stdDev;
      
      if (change > 1.5) { // Significant trend break
        anomalies.push({
          id: uuidv4(),
          target: 'system_performance',
          timestamp: data[i].timestamp,
          value: data[i].value,
          expectedValue: beforeMean,
          deviation: change,
          severity: change > 3 ? 'high' : 'medium',
          type: 'trend_break',
          confidence: Math.min(0.9, change / 4),
          description: `Trend break detected: ${beforeMean.toFixed(2)} → ${afterMean.toFixed(2)}`,
          context: { beforeMean, afterMean, change }
        });
      }
    }
    
    return anomalies;
  }

  private detectSeasonalAnomalies(data: Array<{ timestamp: string; value: number }>, baseline: { mean: number; stdDev: number; median: number; q1: number; q3: number }): AnomalyDetection[] {
    const anomalies: AnomalyDetection[] = [];
    
    if (data.length < 14) return anomalies; // Need at least 2 weeks for seasonal detection
    
    // Simple seasonal anomaly detection
    const seasonalPeriod = 7; // Assume weekly seasonality
    
    for (let i = seasonalPeriod; i < data.length; i++) {
      const currentValue = data[i].value;
      const seasonalBaseline = data[i - seasonalPeriod].value;
      const deviation = Math.abs(currentValue - seasonalBaseline) / baseline.stdDev;
      
      if (deviation > 2.0) {
        anomalies.push({
          id: uuidv4(),
          target: 'system_performance',
          timestamp: data[i].timestamp,
          value: currentValue,
          expectedValue: seasonalBaseline,
          deviation,
          severity: deviation > 3 ? 'high' : 'medium',
          type: 'seasonal_anomaly',
          confidence: Math.min(0.85, deviation / 4),
          description: `Seasonal anomaly: expected ${seasonalBaseline.toFixed(2)}, got ${currentValue.toFixed(2)}`,
          context: { seasonalBaseline, seasonalPeriod }
        });
      }
    }
    
    return anomalies;
  }

  private detectLevelShiftAnomalies(data: Array<{ timestamp: string; value: number }>, baseline: { mean: number; stdDev: number; median: number; q1: number; q3: number }): AnomalyDetection[] {
    const anomalies: AnomalyDetection[] = [];
    
    if (data.length < 10) return anomalies;
    
    // Detect level shifts using cumulative sum control chart
    const values = data.map(d => d.value);
    const mean = baseline.mean;
    const cusum = this.calculateCUSUM(values, mean);
    
    const threshold = 2.0 * baseline.stdDev;
    
    for (let i = 1; i < cusum.length; i++) {
      if (Math.abs(cusum[i]) > threshold) {
        anomalies.push({
          id: uuidv4(),
          target: 'system_performance',
          timestamp: data[i].timestamp,
          value: values[i],
          expectedValue: mean,
          deviation: Math.abs(cusum[i]) / baseline.stdDev,
          severity: Math.abs(cusum[i]) > 3 * baseline.stdDev ? 'high' : 'medium',
          type: 'level_shift',
          confidence: Math.min(0.9, Math.abs(cusum[i]) / (4 * baseline.stdDev)),
          description: `Level shift detected: CUSUM = ${cusum[i].toFixed(2)}`,
          context: { cusum: cusum[i], threshold }
        });
      }
    }
    
    return anomalies;
  }

  private calculateCUSUM(values: number[], target: number): number[] {
    const cusum: number[] = [0];
    let cumulative = 0;
    
    for (let i = 1; i < values.length; i++) {
      const deviation = values[i] - target;
      cumulative += deviation;
      cusum.push(cumulative);
    }
    
    return cusum;
  }

  private calculatePercentile(sortedValues: number[], percentile: number): number {
    const index = (percentile / 100) * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    
    if (upper >= sortedValues.length) return sortedValues[sortedValues.length - 1];
    if (lower === upper) return sortedValues[lower];
    
    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
  }

  private determineSeverity(deviation: number): 'low' | 'medium' | 'high' | 'critical' {
    if (deviation > 4) return 'critical';
    if (deviation > 3) return 'high';
    if (deviation > 2) return 'medium';
    return 'low';
  }

  private generateSpikeDescription(value: number, expected: number, deviation: number): string {
    const direction = value > expected ? 'above' : 'below';
    const percentage = Math.abs((value - expected) / expected * 100);
    return `Value ${direction} expected by ${percentage.toFixed(1)}% (${deviation.toFixed(1)}σ deviation)`;
  }

  private generateAlertMessage(anomaly: AnomalyDetection): string {
    return `Anomaly detected in ${anomaly.target}: ${anomaly.description} (Severity: ${anomaly.severity})`;
  }

  private async loadAnomalies(): Promise<AnomalyDetection[]> {
    try {
      const data = await fs.readFile(this.anomaliesFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  private async saveAnomalies(anomalies: AnomalyDetection[]): Promise<void> {
    try {
      await fs.writeFile(this.anomaliesFile, JSON.stringify(anomalies, null, 2));
    } catch (error) {
      console.error('Error saving anomalies:', error);
    }
  }

  private async loadThresholds(): Promise<AnomalyThreshold[]> {
    try {
      const data = await fs.readFile(this.thresholdsFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  private async saveThresholds(thresholds: AnomalyThreshold[]): Promise<void> {
    try {
      await fs.writeFile(this.thresholdsFile, JSON.stringify(thresholds, null, 2));
    } catch (error) {
      console.error('Error saving thresholds:', error);
    }
  }

  private async loadAlerts(): Promise<AnomalyAlert[]> {
    try {
      const data = await fs.readFile(this.alertsFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  private async saveAlerts(alerts: AnomalyAlert[]): Promise<void> {
    try {
      await fs.writeFile(this.alertsFile, JSON.stringify(alerts, null, 2));
    } catch (error) {
      console.error('Error saving alerts:', error);
    }
  }
}

export const anomalyDetector = new OMIAnomalyDetector(); 