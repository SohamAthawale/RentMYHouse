import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: 'http://127.0.0.1:5001',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // 🔥 REQUIRED
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      'An error occurred';
    toast.error(message);
    return Promise.reject(error);
  }
);

export default api;
