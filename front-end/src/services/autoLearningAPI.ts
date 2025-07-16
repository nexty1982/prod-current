// Test the Auto-Learning OCR API endpoints
import axios from 'axios';

const API_BASE = 'http://localhost:3001/api/ai/auto-learning';

export const autoLearningAPI = {
  // Health check
  async healthCheck() {
    try {
      const response = await axios.get(`${API_BASE}/health`);
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  },

  // Get task status
  async getStatus() {
    try {
      const response = await axios.get(`${API_BASE}/status`);
      return response.data;
    } catch (error) {
      console.error('Failed to get status:', error);
      throw error;
    }
  },

  // Start task
  async startTask(config: { path: string; hours: number }) {
    try {
      const response = await axios.post(`${API_BASE}/start`, config);
      return response.data;
    } catch (error) {
      console.error('Failed to start task:', error);
      throw error;
    }
  },

  // Stop task
  async stopTask() {
    try {
      const response = await axios.post(`${API_BASE}/stop`);
      return response.data;
    } catch (error) {
      console.error('Failed to stop task:', error);
      throw error;
    }
  },

  // Get progress
  async getProgress() {
    try {
      const response = await axios.get(`${API_BASE}/progress`);
      return response.data;
    } catch (error) {
      console.error('Failed to get progress:', error);
      throw error;
    }
  },

  // Get learning rules
  async getLearningRules() {
    try {
      const response = await axios.get(`${API_BASE}/rules`);
      return response.data;
    } catch (error) {
      console.error('Failed to get learning rules:', error);
      throw error;
    }
  },

  // Get results
  async getResults(format = 'summary') {
    try {
      const response = await axios.get(`${API_BASE}/results?format=${format}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get results:', error);
      throw error;
    }
  },

  // Reset task
  async resetTask() {
    try {
      const response = await axios.post(`${API_BASE}/reset`);
      return response.data;
    } catch (error) {
      console.error('Failed to reset task:', error);
      throw error;
    }
  }
};

export default autoLearningAPI;
