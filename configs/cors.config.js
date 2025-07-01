import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

// CORS configuration options
const corsOptions = {
    // Allow all origins or specific origin from env
    origin: process.env.CORS_ORIGIN || '*',
    
    // Allowed HTTP methods
    methods: [
        'GET',
        'POST',
        'PUT',
        'PATCH',
        'DELETE',
        'OPTIONS'
    ],
    
    // Allowed headers
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'Accept',
        'Origin',
        'X-Requested-With',
        'Access-Control-Request-Method',
        'Access-Control-Request-Headers'
    ],
    
    // Exposed headers (headers that the browser can access)
    exposedHeaders: [
        'Content-Length',
        'X-Request-ID',
        'X-Total-Count'
    ],
    
    // Credentials based on environment variable
    credentials: process.env.CORS_CREDENTIALS === 'true',
    
    // Preflight cache time (in seconds)
    maxAge: 86400, // 24 hours
    
    // Success status for preflight requests
    optionsSuccessStatus: 204
};

// For development - more permissive CORS
const devCorsOptions = {
    origin: true, // Allow any origin
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: '*',
    credentials: true,
    maxAge: 86400
};

// For production - specific origins (if needed)
const prodCorsOptions = {
    origin: [
        'http://localhost:3000',
        'http://localhost:3001',
        'https://your-production-domain.com'
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'Accept'
    ],
    credentials: true,
    maxAge: 3600 // 1 hour
};

// Function to get CORS options based on environment
export function getCorsOptions() {
    const env = process.env.NODE_ENV || 'development';
    
    switch (env) {
        case 'production':
            return prodCorsOptions;
        case 'development':
            return devCorsOptions;
        default:
            return corsOptions;
    }
}

// Create CORS middleware
export const corsMiddleware = cors(getCorsOptions());

// Export default CORS configuration
export default corsOptions;
