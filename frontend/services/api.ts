import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

// Function to set the JWT token in the request headers
export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

// Interceptors to handle token expiration or other auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Handle unauthorized access, e.g., redirect to login
      // You can dispatch a custom event or use a state manager to handle this globally
      console.error('Unauthorized access - redirecting to login');
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
