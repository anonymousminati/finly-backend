import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create axios instance with base configuration
const axiosInstance = axios.create({
    baseURL: process.env.API_BASE_URL || 'http://localhost:3001/api',
    timeout: 10000, // 10 seconds timeout
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

// Request interceptor
axiosInstance.interceptors.request.use(
    (config) => {
        // Add authorization token if available
        const token = process.env.API_TOKEN;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        
        // Log request details in development
        if (process.env.NODE_ENV === 'development') {
            console.log(`Making ${config.method?.toUpperCase()} request to: ${config.url}`);
        }
        
        return config;
    },
    (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
    }
);

// Response interceptor
axiosInstance.interceptors.response.use(
    (response) => {
        // Log response details in development
        if (process.env.NODE_ENV === 'development') {
            console.log(`Response from ${response.config.url}:`, response.status);
        }
        
        return response;
    },
    (error) => {
        // Handle common error responses
        if (error.response) {
            // Server responded with error status
            const { status, data } = error.response;
            console.error(`HTTP Error ${status}:`, data);
            
            switch (status) {
                case 401:
                    console.error('Unauthorized access - invalid token');
                    break;
                case 403:
                    console.error('Forbidden access');
                    break;
                case 404:
                    console.error('Resource not found');
                    break;
                case 500:
                    console.error('Internal server error');
                    break;
                default:
                    console.error('HTTP error occurred');
            }
        } else if (error.request) {
            // Request was made but no response received
            console.error('Network error - no response received:', error.request);
        } else {
            // Something else happened
            console.error('Error setting up request:', error.message);
        }
        
        return Promise.reject(error);
    }
);

// Utility functions for common HTTP methods
export const api = {
    get: (url, config) => axiosInstance.get(url, config),
    post: (url, data, config) => axiosInstance.post(url, data, config),
    put: (url, data, config) => axiosInstance.put(url, data, config),
    patch: (url, data, config) => axiosInstance.patch(url, data, config),
    delete: (url, config) => axiosInstance.delete(url, config),
};

// Export the configured axios instance
export default axiosInstance;
