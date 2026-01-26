// Auto-Learning OCR API endpoints for Orthodox Metrics AI System
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || '';

export const autoLearningAPI = {
  // Health check
  async healthCheck() {
    try {
      const response = await axios.get(`${API_BASE}/api/ai/ocr-learning/status`);
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  },

  // Get task status
  async getStatus() {
    try {
      const response = await axios.get(`${API_BASE}/api/ai/ocr-learning/status`);
      return response.data;
    } catch (error) {
      console.error('Failed to get status:', error);
      throw error;
    }
  },

  // Start task
  async startTask(config: { path: string; hours: number }) {
    try {
      const response = await axios.post(`${API_BASE}/api/ai/ocr-learning/start`, config);
      return response.data;
    } catch (error) {
      console.error('Failed to start task:', error);
      throw error;
    }
  },

  // Stop task
  async stopTask() {
    try {
      const response = await axios.post(`${API_BASE}/api/ai/ocr-learning/stop`);
      return response.data;
    } catch (error) {
      console.error('Failed to stop task:', error);
      throw error;
    }
  },

  // Get progress
  async getProgress() {
    try {
      const response = await axios.get(`${API_BASE}/api/ai/ocr-learning/status`);
      return response.data;
    } catch (error) {
      console.error('Failed to get progress:', error);
      throw error;
    }
  },

  // Get learning rules
  async getLearningRules() {
    try {
      const response = await axios.get(`${API_BASE}/api/ai/ocr-learning/rules`);
      return response.data;
    } catch (error) {
      console.error('Failed to get learning rules:', error);
      throw error;
    }
  },

  // Get results
  async getResults(format = 'summary') {
    try {
      const response = await axios.get(`${API_BASE}/api/ai/ocr-learning/status`);
      return response.data;
    } catch (error) {
      console.error('Failed to get results:', error);
      throw error;
    }
  },

  // Reset task
  async resetTask() {
    try {
      const response = await axios.post(`${API_BASE}/api/ai/ocr-learning/reset`);
      return response.data;
    } catch (error) {
      console.error('Failed to reset task:', error);
      throw error;
    }
  }
};

export default autoLearningAPI;
