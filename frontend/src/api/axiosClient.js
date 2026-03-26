/**
 * Axios Client — Base configuration with interceptors.
 * All API calls go through this client.
 */
import axios from 'axios';

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// Attach auth token to every request
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors globally
axiosClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // Use Zustand's getState() to logout without React context
      // Dynamic import avoids circular dependency
      import('../store/useAuthStore').then(({ default: useAuthStore }) => {
        useAuthStore.getState().logout();
      });
    }
    return Promise.reject(err);
  }
);

export default axiosClient;
