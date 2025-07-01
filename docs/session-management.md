# Session Management Implementation Guide

## Overview

This document explains how session tokens are generated, stored, and managed in the Finly financial dashboard application after user login.

## Architecture

### Backend Components

1. **Session Service** (`/backend/services/session.service.js`)
   - Generates secure session and refresh tokens
   - Manages session lifecycle (create, validate, refresh, invalidate)
   - Handles database operations for user_sessions table

2. **Authentication Middleware** (`/backend/middleware/auth.middleware.js`)
   - Validates session tokens for protected routes
   - Updates session activity automatically
   - Provides user context in request object

3. **Updated User Controller** (`/backend/controllers/users.controller.js`)
   - Login endpoint creates session tokens
   - Logout endpoint invalidates sessions
   - Refresh endpoint generates new tokens

### Frontend Components

1. **User Services** (`/frontend/src/services/userServices.ts`)
   - Manages localStorage for session data
   - Handles login/logout/refresh operations
   - Provides authentication status checking

2. **API Client** (`/frontend/src/lib/api.ts`)
   - Automatically includes session tokens in requests
   - Handles token refresh on 401 errors
   - Manages authentication failures

## Database Schema

The `user_sessions` table stores session information:

```sql
CREATE TABLE user_sessions (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  refresh_token VARCHAR(255) UNIQUE,
  device_info JSON,
  ip_address VARCHAR(45),
  user_agent TEXT,
  expires_at TIMESTAMP NOT NULL,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_session_token (session_token),
  INDEX idx_expires_at (expires_at)
);
```

## Session Flow

### 1. Login Process

When a user logs in successfully:

1. **Backend (Login Endpoint)**:
   ```javascript
   // Generate secure tokens
   const sessionToken = sessionService.generateSessionToken();
   const refreshToken = sessionService.generateRefreshToken();
   
   // Create session record
   const session = await sessionService.createSession(pool, {
     userId: user.id,
     sessionToken,
     refreshToken,
     ipAddress: req.ip,
     userAgent: req.headers['user-agent'],
     deviceInfo: { /* device details */ },
     expiresInHours: 24
   });
   
   // Return tokens to frontend
   res.json({
     message: 'Login successful',
     user: userWithoutPassword,
     session: {
       token: sessionToken,
       refreshToken: refreshToken,
       expiresAt: session.expiresAt
     }
   });
   ```

2. **Frontend (Login Handler)**:
   ```javascript
   const response = await userServices.signIn(credentials);
   
   // Store session data in localStorage
   localStorage.setItem('sessionToken', response.session.token);
   localStorage.setItem('refreshToken', response.session.refreshToken);
   localStorage.setItem('sessionExpiry', response.session.expiresAt);
   localStorage.setItem('user', JSON.stringify(response.user));
   ```

### 2. Protected Route Access

For any protected route:

1. **Frontend automatically includes token**:
   ```javascript
   // API client adds Bearer token header
   headers.Authorization = `Bearer ${sessionToken}`;
   ```

2. **Backend validates token**:
   ```javascript
   const session = await sessionService.getSessionByToken(pool, sessionToken);
   
   if (!session || session.expires_at < new Date()) {
     return res.status(401).json({ message: 'Invalid or expired session' });
   }
   
   // Update last activity
   await sessionService.updateSessionActivity(pool, sessionToken);
   ```

### 3. Token Refresh

When a session token expires:

1. **Frontend detects 401 response**:
   ```javascript
   if (error.response?.status === 401) {
     const refreshResponse = await api.post('/users/refresh-session', {
       refreshToken: localStorage.getItem('refreshToken')
     });
     
     // Update stored tokens
     localStorage.setItem('sessionToken', refreshResponse.session.token);
     localStorage.setItem('refreshToken', refreshResponse.session.refreshToken);
   }
   ```

2. **Backend generates new tokens**:
   ```javascript
   const newSession = await sessionService.refreshSession(pool, refreshToken);
   
   res.json({
     message: 'Session refreshed successfully',
     session: {
       token: newSession.sessionToken,
       refreshToken: newSession.refreshToken,
       expiresAt: newSession.expiresAt
     }
   });
   ```

### 4. Logout Process

When a user logs out:

1. **Frontend calls logout**:
   ```javascript
   await userServices.signOut();
   // Clears localStorage and calls backend logout endpoint
   ```

2. **Backend invalidates session**:
   ```javascript
   await sessionService.invalidateSession(pool, sessionToken);
   ```

## Security Features

### Token Generation
- **Session tokens**: 64-byte cryptographically secure random tokens
- **Refresh tokens**: 64-byte cryptographically secure random tokens
- All tokens are unique and stored hashed in database

### Session Security
- **IP address tracking**: Detects session hijacking attempts
- **User agent tracking**: Identifies device changes
- **Automatic expiration**: Sessions expire after 24 hours
- **Activity tracking**: Updates last_activity on each request

### Device Information
Stores device context for security monitoring:
```json
{
  "platform": "Windows",
  "browser": "Chrome/91.0.4472.124"
}
```

## API Endpoints

### Authentication Endpoints

#### POST /api/users/login
Login and create session
```json
// Request
{
  "email": "user@example.com",
  "password": "password123"
}

// Response
{
  "message": "Login successful",
  "user": { /* user data */ },
  "session": {
    "token": "abc123...",
    "refreshToken": "def456...",
    "expiresAt": "2024-01-02T12:00:00Z"
  }
}
```

#### POST /api/users/logout
Logout and invalidate session
```json
// Request
{
  "sessionToken": "abc123..." // or Authorization header
}

// Response
{
  "message": "Logout successful"
}
```

#### POST /api/users/refresh-session
Refresh expired session
```json
// Request
{
  "refreshToken": "def456..."
}

// Response
{
  "message": "Session refreshed successfully",
  "session": {
    "token": "new_abc123...",
    "refreshToken": "new_def456...",
    "expiresAt": "2024-01-02T12:00:00Z"
  }
}
```

### Protected Endpoints

All protected endpoints require the Authorization header:
```
Authorization: Bearer <session_token>
```

Examples:
- `GET /api/users/:userId` - Get user profile
- `PUT /api/users/:userId/password` - Change password

## Frontend Usage

### Check Authentication Status
```javascript
import userServices from '@/services/userServices';

const isLoggedIn = userServices.isAuthenticated();
const currentUser = userServices.getCurrentUser();
```

### Manual Token Refresh
```javascript
try {
  const newSession = await userServices.refreshSession();
  console.log('Session refreshed:', newSession);
} catch (error) {
  console.error('Refresh failed:', error);
  // User will be redirected to login
}
```

### Manual Logout
```javascript
try {
  await userServices.signOut();
  // User is logged out and localStorage is cleared
} catch (error) {
  console.error('Logout failed:', error);
}
```

## Session Management Best Practices

### Backend
1. **Regular cleanup**: Remove expired sessions periodically
2. **Rate limiting**: Prevent brute force attacks on refresh tokens
3. **Session limits**: Limit concurrent sessions per user
4. **Audit logging**: Log all session activities

### Frontend
1. **Secure storage**: Consider using secure storage for sensitive data
2. **Automatic refresh**: Handle token refresh transparently
3. **Graceful degradation**: Handle network failures gracefully
4. **Clear on logout**: Always clear session data on logout

## Troubleshooting

### Common Issues

1. **401 Unauthorized on protected routes**
   - Check if session token exists in localStorage
   - Verify token hasn't expired
   - Check if refresh token is valid

2. **Session not created on login**
   - Check database connection
   - Verify user_sessions table exists
   - Check for foreign key constraints

3. **Token refresh fails**
   - Verify refresh token exists and is valid
   - Check token expiration
   - Ensure refresh endpoint is correctly implemented

### Debugging

Enable debug logging in development:
```javascript
// Backend
console.log('Session created:', { sessionId, userId, expiresAt });

// Frontend
console.log('Session status:', {
  isAuthenticated: userServices.isAuthenticated(),
  token: userServices.getSessionToken(),
  user: userServices.getCurrentUser()
});
```

## Security Considerations

1. **HTTPS Required**: Always use HTTPS in production
2. **Token Rotation**: Implement regular token rotation
3. **Device Fingerprinting**: Enhanced device tracking
4. **Suspicious Activity**: Monitor for unusual session patterns
5. **Session Invalidation**: Immediate invalidation on security events

## Database Maintenance

### Cleanup Expired Sessions
```sql
-- Run periodically to clean expired sessions
DELETE FROM user_sessions WHERE expires_at < NOW();
```

### Monitor Active Sessions
```sql
-- Check active sessions per user
SELECT 
  u.email,
  COUNT(s.id) as active_sessions,
  MAX(s.last_activity) as last_activity
FROM users u
LEFT JOIN user_sessions s ON u.id = s.user_id 
  AND s.expires_at > NOW()
GROUP BY u.id, u.email
ORDER BY active_sessions DESC;
```

This implementation provides a robust, secure session management system that handles token lifecycle, automatic refresh, and proper cleanup while maintaining good user experience.
