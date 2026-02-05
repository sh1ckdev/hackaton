import { makeAutoObservable } from 'mobx';
import api from '../utils/api';

class AuthStore {
  user = null;
  token = localStorage.getItem('token');
  refreshToken = localStorage.getItem('refresh_token');
  loading = false;
  error = null;
  initializing = true;

  constructor() {
    makeAutoObservable(this);
    if (this.token) {
      this.fetchUser();
    } else {
      this.initializing = false;
    }
  }

  async login(initData, captchaToken) {
    this.loading = true;
    this.error = null;
    try {
      const response = await api.post('/auth/telegram', { initData, captcha_token: captchaToken });
      this.token = response.data.token;
      this.refreshToken = response.data.refresh_token;
      this.user = response.data.user;
      localStorage.setItem('token', this.token);
      localStorage.setItem('refresh_token', this.refreshToken);
      return true;
    } catch (error) {
      this.error = error.response?.data?.error || 'Ошибка входа';
      return false;
    } finally {
      this.loading = false;
      this.initializing = false;
    }
  }

  async loginWithToken(token, captchaToken) {
    this.loading = true;
    this.error = null;
    try {
      const response = await api.post('/auth/bot', { token, captcha_token: captchaToken });
      this.token = response.data.token;
      this.refreshToken = response.data.refresh_token;
      this.user = response.data.user;
      localStorage.setItem('token', this.token);
      localStorage.setItem('refresh_token', this.refreshToken);
      return true;
    } catch (error) {
      this.error = error.response?.data?.error || 'Ошибка входа';
      return false;
    } finally {
      this.loading = false;
      this.initializing = false;
    }
  }

  async fetchUser() {
    if (!this.token) {
      this.initializing = false;
      return;
    }
    
    this.loading = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 8000);
    try {
      const response = await api.get('/auth/me', {
        timeout: 8000,
        signal: controller.signal
      });
      this.user = response.data.user;
    } catch (error) {
      this.logout();
    } finally {
      clearTimeout(timeoutId);
      this.loading = false;
      this.initializing = false;
    }
  }

  logout() {
    if (this.refreshToken) {
      api.post('/auth/logout', { refresh_token: this.refreshToken }).catch(() => {});
    }
    this.user = null;
    this.token = null;
    this.refreshToken = null;
    this.error = null;
    this.initializing = false;
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
  }

  get isAuthenticated() {
    return !!this.token;
  }

  get isAdmin() {
    return this.user?.role === 'admin';
  }

  get isModerator() {
    return this.user?.role === 'admin' || this.user?.role === 'moderator';
  }
}

export default new AuthStore();
