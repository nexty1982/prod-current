import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';

export interface PredictiveModel {
  id: string;
  name: string;
  type: 'time_series' | 'regression' | 'classification' | 'clustering';
  target: string;
  features: string[];
  accuracy: number;
  lastTrained: string;
  status: 'training' | 'ready' | 'failed';
  metadata?: Record<string, any>;
}

export interface Prediction {
  id: string;
  modelId: string;
  target: string;
  predictedValue: number | string;
  confidence: number;
  timestamp: string;
  actualValue?: number | string;
  error?: number;
  metadata?: Record<string, any>;
}

export interface TimeSeriesData {
  timestamp: string;
  value: number;
  metadata?: Record<string, any>;
}

export interface Forecast {
  id: string;
  target: string;
  predictions: Array<{
    timestamp: string;
    value: number;
    confidence: number;
  }>;
  horizon: number; // days
  created: string;
  accuracy?: number;
}

export interface PredictiveEngine {
  createModel(model: Omit<PredictiveModel, 'id' | 'accuracy' | 'lastTrained' | 'status'>): Promise<PredictiveModel>;
  trainModel(modelId: string, data: any[]): Promise<boolean>;
  makePrediction(modelId: string, features: Record<string, any>): Promise<Prediction>;
  generateForecast(target: string, data: TimeSeriesData[], horizon: number): Promise<Forecast>;
  evaluateModel(modelId: string): Promise<{ accuracy: number; mse: number; mae: number }>;
  listModels(): Promise<PredictiveModel[]>;
  getPredictions(modelId?: string, limit?: number): Promise<Prediction[]>;
  getForecasts(target?: string, limit?: number): Promise<Forecast[]>;
}

export class OMIPredictiveEngine implements PredictiveEngine {
  private modelsFile: string;
  private predictionsFile: string;
  private forecastsFile: string;
  private dataFile: string;

  constructor() {
    const analyticsDir = path.join(__dirname, '../memory');
    this.modelsFile = path.join(analyticsDir, 'predictive-models.json');
    this.predictionsFile = path.join(analyticsDir, 'predictions.json');
    this.forecastsFile = path.join(analyticsDir, 'forecasts.json');
    this.dataFile = path.join(analyticsDir, 'analytics-data.json');
  }

  async createModel(model: Omit<PredictiveModel, 'id' | 'accuracy' | 'lastTrained' | 'status'>): Promise<PredictiveModel> {
    const newModel: PredictiveModel = {
      ...model,
      id: uuidv4(),
      accuracy: 0,
      lastTrained: new Date().toISOString(),
      status: 'training'
    };

    const models = await this.loadModels();
    models.push(newModel);
    await this.saveModels(models);

    return newModel;
  }

  async trainModel(modelId: string, data: any[]): Promise<boolean> {
    try {
      const models = await this.loadModels();
      const modelIndex = models.findIndex(m => m.id === modelId);
      
      if (modelIndex === -1) {
        throw new Error(`Model ${modelId} not found`);
      }

      // Simulate model training
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const accuracy = Math.random() * 0.3 + 0.7; // 0.7-1.0 range
      
      models[modelIndex].accuracy = accuracy;
      models[modelIndex].lastTrained = new Date().toISOString();
      models[modelIndex].status = 'ready';

      await this.saveModels(models);
      return true;
    } catch (error) {
      console.error('Error training model:', error);
      return false;
    }
  }

  async makePrediction(modelId: string, features: Record<string, any>): Promise<Prediction> {
    const models = await this.loadModels();
    const model = models.find(m => m.id === modelId);
    
    if (!model || model.status !== 'ready') {
      throw new Error(`Model ${modelId} not ready for predictions`);
    }

    // Simulate prediction based on model type
    let predictedValue: number | string;
    let confidence: number;

    switch (model.type) {
      case 'regression':
        predictedValue = this.simulateRegressionPrediction(features);
        confidence = Math.random() * 0.3 + 0.7;
        break;
      case 'classification':
        predictedValue = this.simulateClassificationPrediction(features);
        confidence = Math.random() * 0.4 + 0.6;
        break;
      case 'time_series':
        predictedValue = this.simulateTimeSeriesPrediction(features);
        confidence = Math.random() * 0.2 + 0.8;
        break;
      default:
        predictedValue = 0;
        confidence = 0.5;
    }

    const prediction: Prediction = {
      id: uuidv4(),
      modelId,
      target: model.target,
      predictedValue,
      confidence,
      timestamp: new Date().toISOString(),
      metadata: { features }
    };

    const predictions = await this.loadPredictions();
    predictions.push(prediction);
    await this.savePredictions(predictions);

    return prediction;
  }

  async generateForecast(target: string, data: TimeSeriesData[], horizon: number): Promise<Forecast> {
    // Simulate time series forecasting
    const predictions = [];
    const lastValue = data[data.length - 1]?.value || 0;
    const trend = this.calculateTrend(data);
    
    for (let i = 1; i <= horizon; i++) {
      const predictedValue = lastValue + (trend * i) + (Math.random() - 0.5) * 0.1;
      const confidence = Math.max(0.5, 1 - (i * 0.05)); // Confidence decreases with time
      
      predictions.push({
        timestamp: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString(),
        value: Math.max(0, predictedValue),
        confidence
      });
    }

    const forecast: Forecast = {
      id: uuidv4(),
      target,
      predictions,
      horizon,
      created: new Date().toISOString()
    };

    const forecasts = await this.loadForecasts();
    forecasts.push(forecast);
    await this.saveForecasts(forecasts);

    return forecast;
  }

  async evaluateModel(modelId: string): Promise<{ accuracy: number; mse: number; mae: number }> {
    const predictions = await this.loadPredictions();
    const modelPredictions = predictions.filter(p => p.modelId === modelId && p.actualValue !== undefined);
    
    if (modelPredictions.length === 0) {
      return { accuracy: 0, mse: 0, mae: 0 };
    }

    // Calculate metrics
    let totalError = 0;
    let totalAbsoluteError = 0;
    let correctPredictions = 0;

    for (const pred of modelPredictions) {
      const error = Math.abs(Number(predictedValue) - Number(pred.actualValue));
      totalError += error * error;
      totalAbsoluteError += error;
      
      if (error < 0.1) { // Threshold for "correct" prediction
        correctPredictions++;
      }
    }

    const accuracy = correctPredictions / modelPredictions.length;
    const mse = totalError / modelPredictions.length;
    const mae = totalAbsoluteError / modelPredictions.length;

    return { accuracy, mse, mae };
  }

  async listModels(): Promise<PredictiveModel[]> {
    return await this.loadModels();
  }

  async getPredictions(modelId?: string, limit: number = 100): Promise<Prediction[]> {
    const predictions = await this.loadPredictions();
    let filtered = predictions;
    
    if (modelId) {
      filtered = predictions.filter(p => p.modelId === modelId);
    }
    
    return filtered.slice(-limit);
  }

  async getForecasts(target?: string, limit: number = 50): Promise<Forecast[]> {
    const forecasts = await this.loadForecasts();
    let filtered = forecasts;
    
    if (target) {
      filtered = forecasts.filter(f => f.target === target);
    }
    
    return filtered.slice(-limit);
  }

  // Private helper methods
  private simulateRegressionPrediction(features: Record<string, any>): number {
    // Simple linear combination simulation
    let result = 0;
    for (const [key, value] of Object.entries(features)) {
      result += Number(value) * (Math.random() * 2 - 1);
    }
    return result;
  }

  private simulateClassificationPrediction(features: Record<string, any>): string {
    const classes = ['low', 'medium', 'high', 'critical'];
    return classes[Math.floor(Math.random() * classes.length)];
  }

  private simulateTimeSeriesPrediction(features: Record<string, any>): number {
    const baseValue = features.value || 0;
    const trend = features.trend || 0;
    return baseValue + trend + (Math.random() - 0.5) * 0.1;
  }

  private calculateTrend(data: TimeSeriesData[]): number {
    if (data.length < 2) return 0;
    
    const recent = data.slice(-10); // Last 10 points
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    for (let i = 0; i < recent.length; i++) {
      sumX += i;
      sumY += recent[i].value;
      sumXY += i * recent[i].value;
      sumX2 += i * i;
    }
    
    const n = recent.length;
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  private async loadModels(): Promise<PredictiveModel[]> {
    try {
      const data = await fs.readFile(this.modelsFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  private async saveModels(models: PredictiveModel[]): Promise<void> {
    try {
      await fs.writeFile(this.modelsFile, JSON.stringify(models, null, 2));
    } catch (error) {
      console.error('Error saving models:', error);
    }
  }

  private async loadPredictions(): Promise<Prediction[]> {
    try {
      const data = await fs.readFile(this.predictionsFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  private async savePredictions(predictions: Prediction[]): Promise<void> {
    try {
      await fs.writeFile(this.predictionsFile, JSON.stringify(predictions, null, 2));
    } catch (error) {
      console.error('Error saving predictions:', error);
    }
  }

  private async loadForecasts(): Promise<Forecast[]> {
    try {
      const data = await fs.readFile(this.forecastsFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  private async saveForecasts(forecasts: Forecast[]): Promise<void> {
    try {
      await fs.writeFile(this.forecastsFile, JSON.stringify(forecasts, null, 2));
    } catch (error) {
      console.error('Error saving forecasts:', error);
    }
  }
}

export const predictiveEngine = new OMIPredictiveEngine(); 