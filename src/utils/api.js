import axios from 'axios';
import authStore from '../stores/authStore';

// Используем переменную окружения или fallback на /api (для proxy в dev режиме)
const apiBaseURL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: apiBaseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Добавление токена к каждому запросу
api.interceptors.request.use(
  (config) => {
    const token = authStore.token;
    console.log('[API] Request interceptor:', {
      url: config.url,
      method: config.method,
      hasToken: !!token,
      timeout: config.timeout
    });
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.log('[API] Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Обработка ошибок авторизации
api.interceptors.response.use(
  (response) => {
    console.log('[API] Response interceptor success:', {
      url: response.config.url,
      status: response.status
    });
    return response;
  },
  async (error) => {
    console.log('[API] Response interceptor error:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message,
      code: error.code,
      isAbort: error.name === 'AbortError' || error.code === 'ECONNABORTED'
    });
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;
      const refreshToken = authStore.refreshToken;
      if (!refreshToken) {
        console.log('[API] Нет refresh токена, logout');
        authStore.logout();
        window.location.href = '/login';
        return Promise.reject(error);
      }
      try {
        console.log('[API] Пробую обновить access токен');
        const refreshResponse = await api.post('/auth/refresh', { refresh_token: refreshToken });
        authStore.token = refreshResponse.data.token;
        authStore.refreshToken = refreshResponse.data.refresh_token;
        localStorage.setItem('token', authStore.token);
        localStorage.setItem('refresh_token', authStore.refreshToken);
        originalRequest.headers.Authorization = `Bearer ${authStore.token}`;
        return api.request(originalRequest);
      } catch (refreshError) {
        console.log('[API] Ошибка обновления токена, logout');
        authStore.logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
