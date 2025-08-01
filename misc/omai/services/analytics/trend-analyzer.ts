import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';

export interface TrendAnalysis {
  id: string;
  target: string;
  period: string;
  trend: 'increasing' | 'decreasing' | 'stable' | 'fluctuating';
  strength: number; // 0-1
  confidence: number; // 0-1
  slope: number;
  seasonality?: {
    detected: boolean;
    period: number;
    strength: number;
  };
  anomalies: Anomaly[];
  insights: string[];
  createdAt: string;
}

export interface Anomaly {
  timestamp: string;
  value: number;
  expectedValue: number;
  deviation: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

export interface Correlation {
  variable1: string;
  variable2: string;
  coefficient: number;
  strength: 'weak' | 'moderate' | 'strong';
  significance: number;
  direction: 'positive' | 'negative';
}

export interface SeasonalPattern {
  period: number; // days
  strength: number;
  amplitude: number;
  phase: number;
  confidence: number;
}

export interface TrendAnalyzer {
  analyzeTrend(target: string, data: Array<{ timestamp: string; value: number }>): Promise<TrendAnalysis>;
  detectAnomalies(data: Array<{ timestamp: string; value: number }>, threshold?: number): Promise<Anomaly[]>;
  findCorrelations(variables: Record<string, number[]>): Promise<Correlation[]>;
  detectSeasonality(data: Array<{ timestamp: string; value: number }>): Promise<SeasonalPattern | null>;
  calculateTrendStrength(data: Array<{ timestamp: string; value: number }>): Promise<number>;
  generateInsights(analysis: TrendAnalysis): Promise<string[]>;
  getTrendHistory(target?: string, limit?: number): Promise<TrendAnalysis[]>;
}

export class OMITrendAnalyzer implements TrendAnalyzer {
  private trendsFile: string;
  private correlationsFile: string;

  constructor() {
    const analyticsDir = path.join(__dirname, '../memory');
    this.trendsFile = path.join(analyticsDir, 'trend-analyses.json');
    this.correlationsFile = path.join(analyticsDir, 'correlations.json');
  }

  async analyzeTrend(target: string, data: Array<{ timestamp: string; value: number }>): Promise<TrendAnalysis> {
    if (data.length < 3) {
      throw new Error('Insufficient data for trend analysis');
    }

    // Sort data by timestamp
    const sortedData = data.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    // Calculate basic trend metrics
    const slope = this.calculateLinearRegression(sortedData);
    const strength = await this.calculateTrendStrength(sortedData);
    const trend = this.determineTrendDirection(slope, strength);
    
    // Detect anomalies
    const anomalies = await this.detectAnomalies(sortedData);
    
    // Detect seasonality
    const seasonality = await this.detectSeasonality(sortedData);
    
    // Generate insights
    const insights = await this.generateInsights({
      id: '',
      target,
      period: this.calculatePeriod(sortedData),
      trend,
      strength,
      confidence: Math.min(0.95, strength + 0.1),
      slope,
      seasonality,
      anomalies,
      insights: [],
      createdAt: new Date().toISOString()
    });

    const analysis: TrendAnalysis = {
      id: uuidv4(),
      target,
      period: this.calculatePeriod(sortedData),
      trend,
      strength,
      confidence: Math.min(0.95, strength + 0.1),
      slope,
      seasonality,
      anomalies,
      insights,
      createdAt: new Date().toISOString()
    };

    // Save analysis
    const trends = await this.loadTrends();
    trends.push(analysis);
    await this.saveTrends(trends);

    return analysis;
  }

  async detectAnomalies(data: Array<{ timestamp: string; value: number }>, threshold: number = 2.0): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];
    
    if (data.length < 3) return anomalies;

    // Calculate moving average and standard deviation
    const windowSize = Math.min(7, Math.floor(data.length / 2));
    const movingStats = this.calculateMovingStats(data, windowSize);

    for (let i = windowSize; i < data.length; i++) {
      const currentValue = data[i].value;
      const expectedValue = movingStats[i - windowSize].mean;
      const stdDev = movingStats[i - windowSize].stdDev;
      
      const deviation = Math.abs(currentValue - expectedValue) / stdDev;
      
      if (deviation > threshold) {
        const severity = this.determineAnomalySeverity(deviation);
        const description = this.generateAnomalyDescription(currentValue, expectedValue, deviation);
        
        anomalies.push({
          timestamp: data[i].timestamp,
          value: currentValue,
          expectedValue,
          deviation,
          severity,
          description
        });
      }
    }

    return anomalies;
  }

  async findCorrelations(variables: Record<string, number[]>): Promise<Correlation[]> {
    const correlations: Correlation[] = [];
    const variableNames = Object.keys(variables);
    
    for (let i = 0; i < variableNames.length; i++) {
      for (let j = i + 1; j < variableNames.length; j++) {
        const var1 = variableNames[i];
        const var2 = variableNames[j];
        const data1 = variables[var1];
        const data2 = variables[var2];
        
        if (data1.length === data2.length && data1.length > 1) {
          const coefficient = this.calculateCorrelation(data1, data2);
          const significance = this.calculateSignificance(coefficient, data1.length);
          
          if (Math.abs(coefficient) > 0.1) { // Only report meaningful correlations
            correlations.push({
              variable1: var1,
              variable2: var2,
              coefficient,
              strength: this.determineCorrelationStrength(Math.abs(coefficient)),
              significance,
              direction: coefficient > 0 ? 'positive' : 'negative'
            });
          }
        }
      }
    }

    // Save correlations
    const existingCorrelations = await this.loadCorrelations();
    existingCorrelations.push(...correlations);
    await this.saveCorrelations(existingCorrelations);

    return correlations;
  }

  async detectSeasonality(data: Array<{ timestamp: string; value: number }>): Promise<SeasonalPattern | null> {
    if (data.length < 14) return null; // Need at least 2 weeks of data
    
    // Simple seasonality detection using autocorrelation
    const values = data.map(d => d.value);
    const autocorr = this.calculateAutocorrelation(values);
    
    // Find peaks in autocorrelation (potential seasonal periods)
    const peaks = this.findPeaks(autocorr);
    
    if (peaks.length === 0) return null;
    
    // Use the strongest peak as the seasonal period
    const strongestPeak = peaks.reduce((max, peak) => 
      autocorr[peak] > autocorr[max] ? peak : max
    );
    
    const period = strongestPeak;
    const strength = autocorr[strongestPeak];
    const amplitude = this.calculateSeasonalAmplitude(values, period);
    
    return {
      period,
      strength,
      amplitude,
      phase: 0, // Simplified
      confidence: Math.min(0.9, strength * 1.2)
    };
  }

  async calculateTrendStrength(data: Array<{ timestamp: string; value: number }>): Promise<number> {
    if (data.length < 2) return 0;
    
    const values = data.map(d => d.value);
    const x = Array.from({ length: values.length }, (_, i) => i);
    
    // Calculate R-squared (coefficient of determination)
    const slope = this.calculateLinearRegression(data);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    let ssRes = 0; // Sum of squared residuals
    let ssTot = 0; // Total sum of squares
    
    for (let i = 0; i < values.length; i++) {
      const predicted = slope * i + (values[0] - slope * 0);
      ssRes += Math.pow(values[i] - predicted, 2);
      ssTot += Math.pow(values[i] - mean, 2);
    }
    
    const rSquared = 1 - (ssRes / ssTot);
    return Math.max(0, Math.min(1, rSquared));
  }

  async generateInsights(analysis: TrendAnalysis): Promise<string[]> {
    const insights: string[] = [];
    
    // Trend insights
    if (analysis.trend === 'increasing' && analysis.strength > 0.7) {
      insights.push(`Strong upward trend detected with ${(analysis.strength * 100).toFixed(1)}% confidence`);
    } else if (analysis.trend === 'decreasing' && analysis.strength > 0.7) {
      insights.push(`Strong downward trend detected with ${(analysis.strength * 100).toFixed(1)}% confidence`);
    } else if (analysis.trend === 'stable') {
      insights.push('Data shows stable pattern with minimal variation');
    }
    
    // Anomaly insights
    if (analysis.anomalies.length > 0) {
      const criticalAnomalies = analysis.anomalies.filter(a => a.severity === 'critical');
      if (criticalAnomalies.length > 0) {
        insights.push(`${criticalAnomalies.length} critical anomalies detected requiring immediate attention`);
      }
    }
    
    // Seasonality insights
    if (analysis.seasonality?.detected) {
      insights.push(`Seasonal pattern detected with ${analysis.seasonality.period}-day cycle`);
    }
    
    // Performance insights
    if (analysis.confidence > 0.8) {
      insights.push('High confidence in trend analysis - reliable for forecasting');
    } else if (analysis.confidence < 0.5) {
      insights.push('Low confidence in trend analysis - consider collecting more data');
    }
    
    return insights;
  }

  async getTrendHistory(target?: string, limit: number = 50): Promise<TrendAnalysis[]> {
    const trends = await this.loadTrends();
    let filtered = trends;
    
    if (target) {
      filtered = trends.filter(t => t.target === target);
    }
    
    return filtered.slice(-limit);
  }

  // Private helper methods
  private calculateLinearRegression(data: Array<{ timestamp: string; value: number }>): number {
    const values = data.map(d => d.value);
    const x = Array.from({ length: values.length }, (_, i) => i);
    
    const n = values.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * values[i], 0);
    const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
    
    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  }

  private determineTrendDirection(slope: number, strength: number): 'increasing' | 'decreasing' | 'stable' | 'fluctuating' {
    if (strength < 0.3) return 'fluctuating';
    if (Math.abs(slope) < 0.01) return 'stable';
    return slope > 0 ? 'increasing' : 'decreasing';
  }

  private calculatePeriod(data: Array<{ timestamp: string; value: number }>): string {
    if (data.length < 2) return 'Unknown';
    
    const firstDate = new Date(data[0].timestamp);
    const lastDate = new Date(data[data.length - 1].timestamp);
    const daysDiff = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysDiff < 1) return 'Less than 1 day';
    if (daysDiff < 7) return `${Math.round(daysDiff)} days`;
    if (daysDiff < 30) return `${Math.round(daysDiff / 7)} weeks`;
    if (daysDiff < 365) return `${Math.round(daysDiff / 30)} months`;
    return `${Math.round(daysDiff / 365)} years`;
  }

  private calculateMovingStats(data: Array<{ timestamp: string; value: number }>, windowSize: number): Array<{ mean: number; stdDev: number }> {
    const stats: Array<{ mean: number; stdDev: number }> = [];
    
    for (let i = windowSize; i < data.length; i++) {
      const window = data.slice(i - windowSize, i).map(d => d.value);
      const mean = window.reduce((sum, val) => sum + val, 0) / window.length;
      const variance = window.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / window.length;
      const stdDev = Math.sqrt(variance);
      
      stats.push({ mean, stdDev });
    }
    
    return stats;
  }

  private determineAnomalySeverity(deviation: number): 'low' | 'medium' | 'high' | 'critical' {
    if (deviation > 4) return 'critical';
    if (deviation > 3) return 'high';
    if (deviation > 2) return 'medium';
    return 'low';
  }

  private generateAnomalyDescription(value: number, expected: number, deviation: number): string {
    const direction = value > expected ? 'above' : 'below';
    const percentage = Math.abs((value - expected) / expected * 100);
    return `Value ${direction} expected by ${percentage.toFixed(1)}% (${deviation.toFixed(1)}σ deviation)`;
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
    const sumY2 = y.reduce((sum, val) => sum + val * val, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  private calculateSignificance(correlation: number, sampleSize: number): number {
    const t = correlation * Math.sqrt((sampleSize - 2) / (1 - correlation * correlation));
    // Simplified significance calculation
    return Math.min(1, Math.max(0, 1 - Math.exp(-Math.abs(t) / 10)));
  }

  private determineCorrelationStrength(coefficient: number): 'weak' | 'moderate' | 'strong' {
    if (coefficient > 0.7) return 'strong';
    if (coefficient > 0.3) return 'moderate';
    return 'weak';
  }

  private calculateAutocorrelation(values: number[]): number[] {
    const maxLag = Math.min(20, Math.floor(values.length / 2));
    const autocorr: number[] = [];
    
    for (let lag = 1; lag <= maxLag; lag++) {
      let sum = 0;
      let count = 0;
      
      for (let i = 0; i < values.length - lag; i++) {
        sum += values[i] * values[i + lag];
        count++;
      }
      
      autocorr.push(count > 0 ? sum / count : 0);
    }
    
    return autocorr;
  }

  private findPeaks(data: number[]): number[] {
    const peaks: number[] = [];
    
    for (let i = 1; i < data.length - 1; i++) {
      if (data[i] > data[i - 1] && data[i] > data[i + 1] && data[i] > 0.3) {
        peaks.push(i + 1); // +1 because lag starts at 1
      }
    }
    
    return peaks;
  }

  private calculateSeasonalAmplitude(values: number[], period: number): number {
    if (period <= 1 || period >= values.length) return 0;
    
    let sum = 0;
    let count = 0;
    
    for (let i = 0; i < values.length - period; i++) {
      sum += Math.abs(values[i] - values[i + period]);
      count++;
    }
    
    return count > 0 ? sum / count / 2 : 0;
  }

  private async loadTrends(): Promise<TrendAnalysis[]> {
    try {
      const data = await fs.readFile(this.trendsFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  private async saveTrends(trends: TrendAnalysis[]): Promise<void> {
    try {
      await fs.writeFile(this.trendsFile, JSON.stringify(trends, null, 2));
    } catch (error) {
      console.error('Error saving trends:', error);
    }
  }

  private async loadCorrelations(): Promise<Correlation[]> {
    try {
      const data = await fs.readFile(this.correlationsFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  private async saveCorrelations(correlations: Correlation[]): Promise<void> {
    try {
      await fs.writeFile(this.correlationsFile, JSON.stringify(correlations, null, 2));
    } catch (error) {
      console.error('Error saving correlations:', error);
    }
  }
}

export const trendAnalyzer = new OMITrendAnalyzer(); 