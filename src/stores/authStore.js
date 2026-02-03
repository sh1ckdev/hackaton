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
    console.log('[AuthStore] Конструктор вызван, token:', this.token ? 'есть' : 'нет');
    if (this.token) {
      console.log('[AuthStore] Токен найден, запускаю fetchUser');
      this.fetchUser();
    } else {
      console.log('[AuthStore] Токена нет, устанавливаю initializing = false');
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
    console.log('[AuthStore] fetchUser вызван, token:', this.token ? 'есть' : 'нет');
    if (!this.token) {
      console.log('[AuthStore] Токена нет в fetchUser, устанавливаю initializing = false');
      this.initializing = false;
      return;
    }
    
    console.log('[AuthStore] Начинаю запрос /auth/me, initializing:', this.initializing);
    this.loading = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('[AuthStore] ⚠️ Таймаут запроса /auth/me (8 секунд)');
      controller.abort();
    }, 8000);
    try {
      console.log('[AuthStore] Отправляю запрос GET /auth/me');
      const response = await api.get('/auth/me', {
        timeout: 8000,
        signal: controller.signal
      });
      console.log('[AuthStore] ✅ Успешный ответ от /auth/me, user:', response.data.user?.username || 'нет username');
      this.user = response.data.user;
    } catch (error) {
      console.log('[AuthStore] ❌ Ошибка в fetchUser:', {
        message: error.message,
        code: error.code,
        response: error.response?.status,
        isAbort: error.name === 'AbortError' || error.code === 'ECONNABORTED'
      });
      this.logout();
    } finally {
      clearTimeout(timeoutId);
      console.log('[AuthStore] finally блок: устанавливаю loading=false, initializing=false');
      this.loading = false;
      this.initializing = false;
      console.log('[AuthStore] Состояние после fetchUser:', {
        loading: this.loading,
        initializing: this.initializing,
        hasUser: !!this.user,
        hasToken: !!this.token
      });
    }
  }

  logout() {
    console.log('[AuthStore] logout вызван');
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
    console.log('[AuthStore] logout завершен, initializing:', this.initializing);
  }

  get isAuthenticated() {
    return !!this.token;
  }

  get isAdmin() {
    return this.user?.role === 'admin';
  }
}

export default new AuthStore();
