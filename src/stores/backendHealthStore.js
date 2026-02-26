import { makeAutoObservable } from 'mobx';

const HEALTH_CHECK_INTERVAL_MS = 15000;
const HEALTH_CHECK_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '') + '/healthcheck';

class BackendHealthStore {
  isHealthy = true;
  _intervalId = null;

  constructor() {
    makeAutoObservable(this);
  }

  startPolling() {
    if (this._intervalId) return;
    this.checkHealth();
    this._intervalId = setInterval(() => this.checkHealth(), HEALTH_CHECK_INTERVAL_MS);
  }

  stopPolling() {
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
  }

  async checkHealth() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(HEALTH_CHECK_URL, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      this.isHealthy = response.ok;
    } catch {
      this.isHealthy = false;
    }
  }

  setHealthy(value) {
    this.isHealthy = value;
  }
}

export default new BackendHealthStore();
