import axios from 'axios';
import authStore from '../stores/authStore';



const apiBaseURL = import.meta.env.VITE_API_URL || '/api';


if (import.meta.env.MODE === 'production' && !import.meta.env.VITE_API_URL) {

}

const api = axios.create({
  baseURL: apiBaseURL,
  withCredentials: true,
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
    if (
      error.response?.status === 401 &&
      !originalRequest?._retry &&
      originalRequest?.url !== '/auth/refresh' &&
      !originalRequest?._skipAuthRefresh
    ) {
      originalRequest._retry = true;
      try {
        const refreshResponse = await api.post('/auth/refresh', {});
        authStore.token = refreshResponse.data.token;
        if (authStore.token) {
          originalRequest.headers.Authorization = `Bearer ${authStore.token}`;
        }
        return api.request(originalRequest);
      } catch (refreshError) {
        if (!originalRequest?._skipAuthRedirect) {
          authStore.logout();
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
