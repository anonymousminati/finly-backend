# Axios Configuration Documentation

This document explains the Axios setup and configuration for the Finly backend application.

## Files Structure

```
backend/
├── configs/
│   └── axios.config.js          # Main Axios configuration
├── services/
│   ├── externalApi.service.js   # External API integrations
│   └── internalApi.service.js   # Internal microservice communications
├── middleware/
│   └── axios.middleware.js      # Error handling and retry logic
└── .env                         # Environment variables
```

## Configuration Features

### 1. Base Configuration (`configs/axios.config.js`)

- **Base URL**: Configurable via `API_BASE_URL` environment variable
- **Timeout**: 10 seconds default timeout
- **Headers**: Default JSON content-type and accept headers
- **Authorization**: Automatic Bearer token injection from `API_TOKEN` env var

### 2. Request Interceptor

- Adds authorization token if available
- Logs request details in development mode
- Handles request errors

### 3. Response Interceptor

- Logs response details in development mode
- Handles common HTTP error status codes (401, 403, 404, 500)
- Provides detailed error logging

### 4. Utility Functions

The `api` object provides convenient methods:
- `api.get(url, config)`
- `api.post(url, data, config)`
- `api.put(url, data, config)`
- `api.patch(url, data, config)`
- `api.delete(url, config)`

## Environment Variables

Add these variables to your `.env` file:

```env
# Axios Configuration
API_BASE_URL = "http://localhost:3001/api"
API_TOKEN = ""
NODE_ENV = "development"
```

## Usage Examples

### Basic Usage

```javascript
import { api } from '../configs/axios.config.js';

// GET request
const response = await api.get('/users');

// POST request
const newUser = await api.post('/users', {
    username: 'john_doe',
    email: 'john@example.com'
});
```

### Using Services

```javascript
import externalApiService from '../services/externalApi.service.js';

// Send notification
await externalApiService.sendNotification({
    userId: '123',
    type: 'welcome',
    message: 'Welcome to Finly!'
});

// Get exchange rates
const rate = await externalApiService.getExchangeRate('USD', 'EUR');
```

### Error Handling

```javascript
import { retryApiCall } from '../middleware/axios.middleware.js';

// Retry failed API calls
const result = await retryApiCall(
    () => api.get('/external-service/data'),
    3,  // max retries
    1000 // initial delay
);
```

### In Controllers

```javascript
import externalApiService from '../services/externalApi.service.js';

const createUser = async (req, res) => {
    try {
        // Create user in database
        const userId = await User.createUser(pool, req.body);
        
        // Send welcome notification (non-blocking)
        try {
            await externalApiService.sendNotification({
                userId: req.body.uuid,
                type: 'welcome',
                email: req.body.email
            });
        } catch (notificationError) {
            console.warn('Failed to send notification:', notificationError.message);
            // Don't fail user creation if notification fails
        }
        
        res.status(201).json({ message: 'User created', id: userId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
```

## Middleware Integration

Add the Axios error handler to your Express app:

```javascript
import { axiosErrorHandler } from './middleware/axios.middleware.js';

// Add after your routes
app.use(axiosErrorHandler);
```

## Best Practices

1. **Environment Variables**: Always use environment variables for URLs and tokens
2. **Error Handling**: Wrap external API calls in try-catch blocks
3. **Non-blocking**: Don't let external API failures break core functionality
4. **Retry Logic**: Use retry mechanism for network-related failures
5. **Logging**: Log requests and responses in development mode
6. **Timeouts**: Set appropriate timeouts for external services
7. **Security**: Never expose sensitive tokens in logs or responses

## Common Use Cases

### 1. Payment Gateway Integration
```javascript
const validatePayment = await externalApiService.validatePayment({
    amount: 100.00,
    currency: 'USD',
    paymentMethod: 'card'
});
```

### 2. Email Service Integration
```javascript
const notification = await externalApiService.sendNotification({
    type: 'email',
    recipient: 'user@example.com',
    template: 'welcome',
    data: { username: 'John' }
});
```

### 3. Currency Exchange
```javascript
const exchangeRate = await externalApiService.getExchangeRate('USD', 'EUR');
```

### 4. Microservice Communication
```javascript
import internalApiService from '../services/internalApi.service.js';

const auditData = await internalApiService.sendToService(
    'audit',
    '/logs',
    { action: 'user_created', userId: '123' }
);
```

## Error Handling Strategies

1. **Graceful Degradation**: Continue core functionality even if external services fail
2. **Circuit Breaker**: Implement circuit breaker pattern for repeated failures
3. **Fallback**: Provide fallback responses when external services are unavailable
4. **Monitoring**: Log all external API interactions for monitoring and debugging

## Testing

When testing, you can mock the Axios instance:

```javascript
import axios from '../configs/axios.config.js';

jest.mock('../configs/axios.config.js');
const mockedAxios = axios;

mockedAxios.get.mockResolvedValue({
    data: { message: 'success' }
});
```
