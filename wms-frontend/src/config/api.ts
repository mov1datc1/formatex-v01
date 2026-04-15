import axios from 'axios';
import toast from 'react-hot-toast';
import { store } from '../store';
import { logout } from '../store/slices/authSlice';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// JWT token auto-attach
api.interceptors.request.use(
  (config) => {
    const token = store.getState().auth.user?.token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    toast.error('Error en la solicitud');
    return Promise.reject(error);
  },
);

// Response handler: auto-logout on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      toast.error('Sesión expirada. Inicia sesión nuevamente.');
      store.dispatch(logout());
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);
