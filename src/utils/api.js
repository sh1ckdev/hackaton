import axios from 'axios';
import authStore from '../stores/authStore';



const apiBaseURL = import.meta.env.VITE_API_URL || '/api';


if (import.meta.env.MODE === 'production' && !import.meta.env.VITE_API_URL) {

}

const api = axios.create({
  baseURL: apiBaseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});


api.interceptors.request.use(
  (config) => {
    const token = authStore.token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);


api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;
      const refreshToken = authStore.refreshToken;
      if (!refreshToken) {
        authStore.logout();
        window.location.href = '/login';
        return Promise.reject(error);
      }
      try {
        const refreshResponse = await api.post('/auth/refresh', { refresh_token: refreshToken });
        authStore.token = refreshResponse.data.token;
        authStore.refreshToken = refreshResponse.data.refresh_token;
        localStorage.setItem('token', authStore.token);
        localStorage.setItem('refresh_token', authStore.refreshToken);
        originalRequest.headers.Authorization = `Bearer ${authStore.token}`;
        return api.request(originalRequest);
      } catch (refreshError) {
        authStore.logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
