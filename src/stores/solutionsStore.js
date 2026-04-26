import { makeAutoObservable } from 'mobx';
import api from '../utils/api';

class SolutionsStore {
  solutions = [];
  allSolutions = []; 
  selectedSolution = null;
  loading = false;
  error = null;

  constructor() {
    makeAutoObservable(this);
  }

  async fetchMySolutions() {
    this.loading = true;
    this.error = null;
    try {
      const response = await api.get('/solutions/my');
      this.solutions = response.data.solutions;
    } catch (error) {
      this.error = error.response?.data?.error || 'Ошибка загрузки решений';
    } finally {
      this.loading = false;
    }
  }

  async fetchAllSolutions(filters = {}) {
    this.loading = true;
    this.error = null;
    try {
      const params = new URLSearchParams(filters);
      const response = await api.get(`/solutions/all?${params}`);
      this.allSolutions = response.data.solutions;
    } catch (error) {
      this.error = error.response?.data?.error || 'Ошибка загрузки решений';
    } finally {
      this.loading = false;
    }
  }

  async fetchSolution(id) {
    this.loading = true;
    this.error = null;
    try {
      const response = await api.get(`/solutions/${id}`);
      this.selectedSolution = response.data.solution;
    } catch (error) {
      this.error = error.response?.data?.error || 'Ошибка загрузки решения';
    } finally {
      this.loading = false;
    }
  }

  async submitSolution(data, presentationFile) {
    this.loading = true;
    this.error = null;
    try {
      const formData = new FormData();
      Object.keys(data).forEach(key => {
        formData.append(key, data[key]);
      });
      if (presentationFile) {
        formData.append('presentation', presentationFile);
      }

      const response = await api.post('/solutions', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      const index = this.solutions.findIndex(s => s.id === response.data.solution.id);
      if (index !== -1) {
        this.solutions[index] = response.data.solution;
      } else {
        this.solutions.push(response.data.solution);
      }
      
      return response.data.solution;
    } catch (error) {
      this.error = error.response?.data?.error || 'Ошибка отправки решения';
      throw error;
    } finally {
      this.loading = false;
    }
  }

  async moderateSolution(id, data) {
    this.loading = true;
    this.error = null;
    try {
      const response = await api.put(`/solutions/${id}/moderate`, data);
      const index = this.allSolutions.findIndex(s => s.id === id);
      if (index !== -1) {
        this.allSolutions[index] = response.data.solution;
      }
      return response.data.solution;
    } catch (error) {
      this.error = error.response?.data?.error || 'Ошибка модерации';
      throw error;
    } finally {
      this.loading = false;
    }
  }

  async deleteSolution(id) {
    this.loading = true;
    this.error = null;
    try {
      await api.delete(`/solutions/${id}`);
      this.solutions = this.solutions.filter(s => s.id !== id);
      this.allSolutions = this.allSolutions.filter(s => s.id !== id);
    } catch (error) {
      this.error = error.response?.data?.error || 'Ошибка удаления решения';
      throw error;
    } finally {
      this.loading = false;
    }
  }
}

export default new SolutionsStore();
