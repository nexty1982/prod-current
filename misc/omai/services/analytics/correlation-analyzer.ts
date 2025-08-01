import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';

export interface CorrelationAnalysis {
  id: string;
  variable1: string;
  variable2: string;
  coefficient: number;
  strength: 'weak' | 'moderate' | 'strong';
  significance: number;
  direction: 'positive' | 'negative';
  confidence: number;
  sampleSize: number;
  pValue: number;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface CorrelationMatrix {
  id: string;
  variables: string[];
  matrix: number[][];
  strengths: ('weak' | 'moderate' | 'strong')[][];
  significances: number[][];
  createdAt: string;
  description: string;
}

export interface CausalityAnalysis {
  id: string;
  cause: string;
  effect: string;
  strength: number;
  confidence: number;
  lag: number;
  method: 'granger' | 'transfer_entropy' | 'cross_correlation';
  evidence: string[];
  createdAt: string;
}

export interface CorrelationInsight {
  id: string;
  type: 'strong_correlation' | 'unexpected_correlation' | 'missing_correlation' | 'causality_hint';
  variables: string[];
  description: string;
  confidence: number;
  actionable: boolean;
  recommendations: string[];
  createdAt: string;
}

export interface CorrelationAnalyzer {
  analyzeCorrelation(variable1: string, variable2: string, data1: number[], data2: number[]): Promise<CorrelationAnalysis>;
  createCorrelationMatrix(variables: Record<string, number[]>): Promise<CorrelationMatrix>;
  detectCausality(variable1: string, variable2: string, data1: number[], data2: number[]): Promise<CausalityAnalysis>;
  generateInsights(matrix: CorrelationMatrix): Promise<CorrelationInsight[]>;
  findStrongCorrelations(variables: Record<string, number[]>, threshold?: number): Promise<CorrelationAnalysis[]>;
  findUnexpectedCorrelations(variables: Record<string, number[]>, expectedCorrelations: Record<string, string[]>): Promise<CorrelationAnalysis[]>;
  getCorrelationHistory(variable1?: string, variable2?: string, limit?: number): Promise<CorrelationAnalysis[]>;
  getCausalityHistory(cause?: string, effect?: string, limit?: number): Promise<CausalityAnalysis[]>;
}

export class OMICorrelationAnalyzer implements CorrelationAnalyzer {
  private correlationsFile: string;
  private matricesFile: string;
  private causalityFile: string;
  private insightsFile: string;

  constructor() {
    const analyticsDir = path.join(__dirname, '../memory');
    this.correlationsFile = path.join(analyticsDir, 'correlation-analyses.json');
    this.matricesFile = path.join(analyticsDir, 'correlation-matrices.json');
    this.causalityFile = path.join(analyticsDir, 'causality-analyses.json');
    this.insightsFile = path.join(analyticsDir, 'correlation-insights.json');
  }

  async analyzeCorrelation(variable1: string, variable2: string, data1: number[], data2: number[]): Promise<CorrelationAnalysis> {
    if (data1.length !== data2.length || data1.length < 3) {
      throw new Error('Invalid data for correlation analysis');
    }

    const coefficient = this.calculatePearsonCorrelation(data1, data2);
    const significance = this.calculateSignificance(coefficient, data1.length);
    const pValue = this.calculatePValue(coefficient, data1.length);
    const strength = this.determineCorrelationStrength(Math.abs(coefficient));
    const confidence = this.calculateConfidence(coefficient, data1.length);

    const analysis: CorrelationAnalysis = {
      id: uuidv4(),
      variable1,
      variable2,
      coefficient,
      strength,
      significance,
      direction: coefficient > 0 ? 'positive' : 'negative',
      confidence,
      sampleSize: data1.length,
      pValue,
      createdAt: new Date().toISOString(),
      metadata: {
        data1Stats: this.calculateStats(data1),
        data2Stats: this.calculateStats(data2)
      }
    };

    // Save analysis
    const correlations = await this.loadCorrelations();
    correlations.push(analysis);
    await this.saveCorrelations(correlations);

    return analysis;
  }

  async createCorrelationMatrix(variables: Record<string, number[]>): Promise<CorrelationMatrix> {
    const variableNames = Object.keys(variables);
    const n = variableNames.length;
    
    if (n < 2) {
      throw new Error('Need at least 2 variables for correlation matrix');
    }

    const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
    const strengths: ('weak' | 'moderate' | 'strong')[][] = Array(n).fill(null).map(() => Array(n).fill('weak'));
    const significances: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));

    // Calculate correlations for all pairs
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrix[i][j] = 1.0; // Perfect correlation with self
          strengths[i][j] = 'strong';
          significances[i][j] = 1.0;
        } else {
          const data1 = variables[variableNames[i]];
          const data2 = variables[variableNames[j]];
          
          if (data1.length === data2.length && data1.length >= 3) {
            const coefficient = this.calculatePearsonCorrelation(data1, data2);
            const significance = this.calculateSignificance(coefficient, data1.length);
            
            matrix[i][j] = coefficient;
            strengths[i][j] = this.determineCorrelationStrength(Math.abs(coefficient));
            significances[i][j] = significance;
          }
        }
      }
    }

    const correlationMatrix: CorrelationMatrix = {
      id: uuidv4(),
      variables: variableNames,
      matrix,
      strengths,
      significances,
      createdAt: new Date().toISOString(),
      description: `Correlation matrix for ${n} variables with ${this.countStrongCorrelations(strengths)} strong correlations`
    };

    // Save matrix
    const matrices = await this.loadMatrices();
    matrices.push(correlationMatrix);
    await this.saveMatrices(matrices);

    return correlationMatrix;
  }

  async detectCausality(variable1: string, variable2: string, data1: number[], data2: number[]): Promise<CausalityAnalysis> {
    if (data1.length !== data2.length || data1.length < 10) {
      throw new Error('Insufficient data for causality analysis');
    }

    // Use cross-correlation to detect potential causality
    const crossCorr = this.calculateCrossCorrelation(data1, data2);
    const maxLag = this.findMaxCrossCorrelation(crossCorr);
    const strength = Math.abs(crossCorr[maxLag]);
    const confidence = this.calculateCausalityConfidence(strength, data1.length);

    const causality: CausalityAnalysis = {
      id: uuidv4(),
      cause: maxLag > 0 ? variable1 : variable2,
      effect: maxLag > 0 ? variable2 : variable1,
      strength,
      confidence,
      lag: Math.abs(maxLag),
      method: 'cross_correlation',
      evidence: this.generateCausalityEvidence(crossCorr, maxLag, strength),
      createdAt: new Date().toISOString()
    };

    // Save causality analysis
    const causalities = await this.loadCausalities();
    causalities.push(causality);
    await this.saveCausalities(causalities);

    return causality;
  }

  async generateInsights(matrix: CorrelationMatrix): Promise<CorrelationInsight[]> {
    const insights: CorrelationInsight[] = [];
    const n = matrix.variables.length;

    // Find strong correlations
    const strongCorrelations: string[][] = [];
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (matrix.strengths[i][j] === 'strong' && matrix.significances[i][j] > 0.8) {
          strongCorrelations.push([matrix.variables[i], matrix.variables[j]]);
        }
      }
    }

    // Generate insights for strong correlations
    for (const [var1, var2] of strongCorrelations) {
      insights.push({
        id: uuidv4(),
        type: 'strong_correlation',
        variables: [var1, var2],
        description: `Strong correlation detected between ${var1} and ${var2}`,
        confidence: 0.9,
        actionable: true,
        recommendations: [
          `Monitor ${var1} and ${var2} together for system optimization`,
          `Consider using ${var1} as a proxy for ${var2} in predictive models`,
          `Investigate potential causal relationship between ${var1} and ${var2}`
        ],
        createdAt: new Date().toISOString()
      });
    }

    // Find unexpected correlations (weak correlations where strong ones were expected)
    const unexpectedCorrelations = this.findUnexpectedPatterns(matrix);
    for (const [var1, var2] of unexpectedCorrelations) {
      insights.push({
        id: uuidv4(),
        type: 'unexpected_correlation',
        variables: [var1, var2],
        description: `Unexpectedly weak correlation between ${var1} and ${var2}`,
        confidence: 0.7,
        actionable: true,
        recommendations: [
          `Investigate why ${var1} and ${var2} are not strongly correlated`,
          `Check for confounding variables affecting the relationship`,
          `Consider non-linear relationships between ${var1} and ${var2}`
        ],
        createdAt: new Date().toISOString()
      });
    }

    // Save insights
    const existingInsights = await this.loadInsights();
    existingInsights.push(...insights);
    await this.saveInsights(existingInsights);

    return insights;
  }

  async findStrongCorrelations(variables: Record<string, number[]>, threshold: number = 0.7): Promise<CorrelationAnalysis[]> {
    const correlations: CorrelationAnalysis[] = [];
    const variableNames = Object.keys(variables);

    for (let i = 0; i < variableNames.length; i++) {
      for (let j = i + 1; j < variableNames.length; j++) {
        const var1 = variableNames[i];
        const var2 = variableNames[j];
        const data1 = variables[var1];
        const data2 = variables[var2];

        if (data1.length === data2.length && data1.length >= 3) {
          const coefficient = this.calculatePearsonCorrelation(data1, data2);
          
          if (Math.abs(coefficient) >= threshold) {
            const analysis = await this.analyzeCorrelation(var1, var2, data1, data2);
            correlations.push(analysis);
          }
        }
      }
    }

    return correlations;
  }

  async findUnexpectedCorrelations(variables: Record<string, number[]>, expectedCorrelations: Record<string, string[]>): Promise<CorrelationAnalysis[]> {
    const unexpected: CorrelationAnalysis[] = [];
    const variableNames = Object.keys(variables);

    for (const var1 of variableNames) {
      const expected = expectedCorrelations[var1] || [];
      
      for (const var2 of variableNames) {
        if (var1 !== var2 && !expected.includes(var2)) {
          const data1 = variables[var1];
          const data2 = variables[var2];

          if (data1.length === data2.length && data1.length >= 3) {
            const coefficient = this.calculatePearsonCorrelation(data1, data2);
            
            if (Math.abs(coefficient) > 0.5) { // Unexpected strong correlation
              const analysis = await this.analyzeCorrelation(var1, var2, data1, data2);
              unexpected.push(analysis);
            }
          }
        }
      }
    }

    return unexpected;
  }

  async getCorrelationHistory(variable1?: string, variable2?: string, limit: number = 100): Promise<CorrelationAnalysis[]> {
    const correlations = await this.loadCorrelations();
    let filtered = correlations;

    if (variable1 && variable2) {
      filtered = correlations.filter(c => 
        (c.variable1 === variable1 && c.variable2 === variable2) ||
        (c.variable1 === variable2 && c.variable2 === variable1)
      );
    } else if (variable1) {
      filtered = correlations.filter(c => c.variable1 === variable1 || c.variable2 === variable1);
    }

    return filtered.slice(-limit);
  }

  async getCausalityHistory(cause?: string, effect?: string, limit: number = 50): Promise<CausalityAnalysis[]> {
    const causalities = await this.loadCausalities();
    let filtered = causalities;

    if (cause && effect) {
      filtered = causalities.filter(c => c.cause === cause && c.effect === effect);
    } else if (cause) {
      filtered = causalities.filter(c => c.cause === cause || c.effect === cause);
    }

    return filtered.slice(-limit);
  }

  // Private helper methods
  private calculatePearsonCorrelation(x: number[], y: number[]): number {
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
    return Math.min(1, Math.max(0, 1 - Math.exp(-Math.abs(t) / 10)));
  }

  private calculatePValue(correlation: number, sampleSize: number): number {
    // Simplified p-value calculation
    const t = Math.abs(correlation) * Math.sqrt((sampleSize - 2) / (1 - correlation * correlation));
    return Math.exp(-t / 2) / Math.sqrt(2 * Math.PI);
  }

  private determineCorrelationStrength(coefficient: number): 'weak' | 'moderate' | 'strong' {
    if (coefficient > 0.7) return 'strong';
    if (coefficient > 0.3) return 'moderate';
    return 'weak';
  }

  private calculateConfidence(correlation: number, sampleSize: number): number {
    const significance = this.calculateSignificance(correlation, sampleSize);
    const sampleFactor = Math.min(1, sampleSize / 100);
    return significance * sampleFactor;
  }

  private calculateStats(data: number[]): { mean: number; stdDev: number; min: number; max: number } {
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    const stdDev = Math.sqrt(variance);
    const min = Math.min(...data);
    const max = Math.max(...data);

    return { mean, stdDev, min, max };
  }

  private calculateCrossCorrelation(x: number[], y: number[]): number[] {
    const maxLag = Math.min(10, Math.floor(x.length / 2));
    const crossCorr: number[] = [];

    for (let lag = -maxLag; lag <= maxLag; lag++) {
      let sum = 0;
      let count = 0;

      for (let i = 0; i < x.length; i++) {
        const j = i + lag;
        if (j >= 0 && j < y.length) {
          sum += x[i] * y[j];
          count++;
        }
      }

      crossCorr.push(count > 0 ? sum / count : 0);
    }

    return crossCorr;
  }

  private findMaxCrossCorrelation(crossCorr: number[]): number {
    let maxIndex = 0;
    let maxValue = Math.abs(crossCorr[0]);

    for (let i = 1; i < crossCorr.length; i++) {
      if (Math.abs(crossCorr[i]) > maxValue) {
        maxValue = Math.abs(crossCorr[i]);
        maxIndex = i;
      }
    }

    return maxIndex - Math.floor(crossCorr.length / 2);
  }

  private calculateCausalityConfidence(strength: number, sampleSize: number): number {
    const strengthFactor = Math.min(1, strength * 1.5);
    const sampleFactor = Math.min(1, sampleSize / 50);
    return strengthFactor * sampleFactor;
  }

  private generateCausalityEvidence(crossCorr: number[], maxLag: number, strength: number): string[] {
    const evidence: string[] = [];
    
    if (Math.abs(maxLag) > 0) {
      evidence.push(`Cross-correlation peak at lag ${maxLag} indicates temporal relationship`);
    }
    
    if (strength > 0.7) {
      evidence.push('Strong cross-correlation suggests potential causal relationship');
    }
    
    if (maxLag > 0) {
      evidence.push('Positive lag suggests first variable may cause second variable');
    } else if (maxLag < 0) {
      evidence.push('Negative lag suggests second variable may cause first variable');
    }

    return evidence;
  }

  private countStrongCorrelations(strengths: ('weak' | 'moderate' | 'strong')[][]): number {
    let count = 0;
    for (const row of strengths) {
      for (const strength of row) {
        if (strength === 'strong') count++;
      }
    }
    return count;
  }

  private findUnexpectedPatterns(matrix: CorrelationMatrix): string[][] {
    const unexpected: string[][] = [];
    const n = matrix.variables.length;

    // Look for weak correlations in expected strong relationships
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (matrix.strengths[i][j] === 'weak' && matrix.significances[i][j] > 0.5) {
          unexpected.push([matrix.variables[i], matrix.variables[j]]);
        }
      }
    }

    return unexpected;
  }

  private async loadCorrelations(): Promise<CorrelationAnalysis[]> {
    try {
      const data = await fs.readFile(this.correlationsFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  private async saveCorrelations(correlations: CorrelationAnalysis[]): Promise<void> {
    try {
      await fs.writeFile(this.correlationsFile, JSON.stringify(correlations, null, 2));
    } catch (error) {
      console.error('Error saving correlations:', error);
    }
  }

  private async loadMatrices(): Promise<CorrelationMatrix[]> {
    try {
      const data = await fs.readFile(this.matricesFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  private async saveMatrices(matrices: CorrelationMatrix[]): Promise<void> {
    try {
      await fs.writeFile(this.matricesFile, JSON.stringify(matrices, null, 2));
    } catch (error) {
      console.error('Error saving matrices:', error);
    }
  }

  private async loadCausalities(): Promise<CausalityAnalysis[]> {
    try {
      const data = await fs.readFile(this.causalityFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  private async saveCausalities(causalities: CausalityAnalysis[]): Promise<void> {
    try {
      await fs.writeFile(this.causalityFile, JSON.stringify(causalities, null, 2));
    } catch (error) {
      console.error('Error saving causalities:', error);
    }
  }

  private async loadInsights(): Promise<CorrelationInsight[]> {
    try {
      const data = await fs.readFile(this.insightsFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  private async saveInsights(insights: CorrelationInsight[]): Promise<void> {
    try {
      await fs.writeFile(this.insightsFile, JSON.stringify(insights, null, 2));
    } catch (error) {
      console.error('Error saving insights:', error);
    }
  }
}

export const correlationAnalyzer = new OMICorrelationAnalyzer(); 