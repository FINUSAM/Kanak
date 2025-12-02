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
    if (error.response) {
      if (error.response.data && error.response.data.detail) {
        const detail = error.response.data.detail;
        if (typeof detail === 'string') {
          showGlobalError(detail);
        } else if (Array.isArray(detail)) {
          const errorMessages = detail.map((d: any) => `${d.loc[1]}: ${d.msg}`).join('; ');
          showGlobalError(errorMessages);
        } else {
          // If detail exists but is not a string or array, try using the entire data object if it's a string
          if (typeof error.response.data === 'string') {
            showGlobalError(error.response.data);
          } else {
            showGlobalError('An unexpected API error occurred (check console for details).');
            console.error('API Error Response Data:', error.response.data);
          }
        }
      } else if (error.response.data) {
        // If data exists but no 'detail' field, try to display the data directly if it's a string
        if (typeof error.response.data === 'string') {
          showGlobalError(error.response.data);
        } else {
          showGlobalError('An unexpected API error occurred (no detail field, check console).');
          console.error('API Error Response Data (no detail):', error.response.data);
        }
      } else {
        // If response exists but no data object
        showGlobalError(`API Error: Status ${error.response.status} ${error.response.statusText}`);
      }
    } else if (error.request) {
      // The request was made but no response was received (e.g., network down, CORS issue)
      showGlobalError('Network Error: Could not connect to the server.');
      console.error('Network Error - No response:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      showGlobalError(`Request Error: ${error.message}`);
      console.error('Request setup error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export default api;
