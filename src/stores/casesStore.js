import { makeAutoObservable } from 'mobx';
import api from '../utils/api';

class CasesStore {
  cases = [];
  selectedCase = null;
  loading = false;
  error = null;

  constructor() {
    makeAutoObservable(this);
  }

  async fetchCases(status = 'active') {
    this.loading = true;
    this.error = null;
    try {
      const response = await api.get(`/cases?status=${status}`);
      this.cases = response.data.cases;
    } catch (error) {
      this.error = error.response?.data?.error || 'Ошибка загрузки кейсов';
    } finally {
      this.loading = false;
    }
  }

  async fetchCase(id) {
    this.loading = true;
    this.error = null;
    try {
      const response = await api.get(`/cases/${id}`);
      this.selectedCase = response.data.case;
    } catch (error) {
      this.error = error.response?.data?.error || 'Ошибка загрузки кейса';
    } finally {
      this.loading = false;
    }
  }

  async createCase(data, isFormData = false) {
    this.loading = true;
    this.error = null;
    try {
      const config = isFormData ? {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      } : {};
      const response = await api.post('/cases', data, config);
      this.cases.push(response.data.case);
      return response.data.case;
    } catch (error) {
      this.error = error.response?.data?.error || 'Ошибка создания кейса';
      throw error;
    } finally {
      this.loading = false;
    }
  }

  async updateCase(id, data, isFormData = false) {
    this.loading = true;
    this.error = null;
    try {
      const config = isFormData ? {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      } : {};
      const response = await api.put(`/cases/${id}`, data, config);
      const index = this.cases.findIndex(c => c.id === id);
      if (index !== -1) {
        this.cases[index] = response.data.case;
      }
      if (this.selectedCase && this.selectedCase.id === id) {
        this.selectedCase = response.data.case;
      }
      return response.data.case;
    } catch (error) {
      this.error = error.response?.data?.error || 'Ошибка обновления кейса';
      throw error;
    } finally {
      this.loading = false;
    }
  }

  async deleteCase(id) {
    this.loading = true;
    this.error = null;
    try {
      await api.delete(`/cases/${id}`);
      this.cases = this.cases.filter(c => c.id !== id);
    } catch (error) {
      this.error = error.response?.data?.error || 'Ошибка удаления кейса';
      throw error;
    } finally {
      this.loading = false;
    }
  }
}

export default new CasesStore();
