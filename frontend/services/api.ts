import axios from 'axios';
import { showGlobalError } from '../contexts/GlobalErrorContext'; // Import the global error handler

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
    // Handle 401 Unauthorized globally
    if (error.response && error.response.status === 401) {
      console.error('Unauthorized access - redirecting to login');
      // Optionally, clear token and redirect to login page
      localStorage.removeItem('authToken');
      setAuthToken(null);
      // window.location.href = '/'; // Redirect to home/login
      showGlobalError('Session expired or unauthorized. Please log in again.');
      return Promise.reject(error);
    }

    // Display other API errors globally
    if (error.response && error.response.data && error.response.data.detail) {
      const detail = error.response.data.detail;
      if (typeof detail === 'string') {
        showGlobalError(detail);
      } else if (Array.isArray(detail)) {
        const errorMessages = detail.map((d: any) => `${d.loc[1]}: ${d.msg}`).join('; ');
        showGlobalError(errorMessages);
      } else {
        showGlobalError('An unexpected API error occurred.');
      }
    } else if (error.message) {
      showGlobalError(`Network Error: ${error.message}`);
    } else {
      showGlobalError('An unknown error occurred.');
    }
    
    return Promise.reject(error);
  }
);

export default api;
