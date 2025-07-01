# Password Handling Documentation

This document explains how password validation, hashing, and authentication works in the Finly backend.

## Overview

The system handles three different password-related fields:
- `password` - Plain text password from frontend (registration/login)
- `confirmPassword` - Password confirmation from frontend (registration only)
- `password_hash` - Hashed password stored in database

## Flow Diagram

```
Frontend → Backend → Database
password ──┐
           ├─→ Validation → Hashing → password_hash
confirmPassword ──┘
```

## API Endpoints

### 1. User Registration
**POST** `/api/users/register`

**Request Body:**
```json
{
    "username": "john_doe",
    "email": "john@example.com",
    "password": "MySecurePass123!",
    "confirmPassword": "MySecurePass123!",
    "full_name": "John Doe",
    "phone_number": "+1234567890"
}
```

**Response (Success):**
```json
{
    "message": "User created successfully",
    "id": 1,
    "user": {
        "uuid": "550e8400-e29b-41d4-a716-446655440000",
        "username": "john_doe",
        "email": "john@example.com",
        "full_name": "John Doe",
        "phone_number": "+1234567890",
        "status": "active"
    }
}
```

### 2. User Login
**POST** `/api/users/login`

**Request Body:**
```json
{
    "email": "john@example.com",
    "password": "MySecurePass123!"
}
```

**Response (Success):**
```json
{
    "message": "Login successful",
    "user": {
        "id": 1,
        "uuid": "550e8400-e29b-41d4-a716-446655440000",
        "username": "john_doe",
        "email": "john@example.com",
        "full_name": "John Doe",
        "phone_number": "+1234567890",
        "status": "active",
        "created_at": "2024-01-01T00:00:00.000Z"
    }
}
```

### 3. Change Password
**PUT** `/api/users/:userId/password`

**Request Body:**
```json
{
    "currentPassword": "MySecurePass123!",
    "newPassword": "MyNewSecurePass456!",
    "confirmNewPassword": "MyNewSecurePass456!"
}
```

## Password Validation Rules

### Strength Requirements:
1. **Minimum Length**: 8 characters
2. **Maximum Length**: 128 characters
3. **Uppercase**: At least one uppercase letter (A-Z)
4. **Lowercase**: At least one lowercase letter (a-z)
5. **Number**: At least one digit (0-9)
6. **Special Character**: At least one special character (!@#$%^&*()_+-=[]{}|;':"\\|,.<>?/)

### Common Password Blacklist:
- password
- 123456
- password123
- admin
- qwerty
- letmein
- welcome
- monkey
- 1234567890
- password1

### Example Valid Passwords:
- `MySecurePass123!`
- `Admin@2024$`
- `HelloWorld#99`

### Example Invalid Passwords:
- `password` (too common)
- `12345678` (no uppercase, lowercase, or special chars)
- `PASSWORD` (no lowercase, numbers, or special chars)
- `Pass123` (too short, no special chars)

## Security Features

### Password Hashing
- **Algorithm**: bcrypt with 12 salt rounds
- **Salt Rounds**: 12 (provides good security vs performance balance)
- **Storage**: Only hashed passwords are stored in database

### Protection Against:
1. **SQL Injection**: Parameterized queries
2. **Brute Force**: Strong password requirements
3. **Rainbow Tables**: Salted hashing
4. **Timing Attacks**: Consistent response times

## Implementation Details

### 1. Password Service (`services/password.service.js`)
```javascript
// Hash password
const hashedPassword = await passwordService.hashPassword(password);

// Validate password strength
const validation = passwordService.validatePassword(password);

// Check password match
const matchValidation = passwordService.validatePasswordMatch(password, confirmPassword);

// Compare password for login
const isValid = await passwordService.comparePassword(password, hashedPassword);
```

### 2. Database Schema
```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,  -- bcrypt hash
    full_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20),
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 3. Error Handling
- **400 Bad Request**: Invalid input, validation errors
- **401 Unauthorized**: Invalid credentials
- **403 Forbidden**: Account not active
- **409 Conflict**: Duplicate email/username
- **500 Internal Server Error**: System errors

## Frontend Integration Examples

### Registration Form
```javascript
const registerUser = async (formData) => {
    try {
        const response = await api.post('/users/register', {
            username: formData.username,
            email: formData.email,
            password: formData.password,
            confirmPassword: formData.confirmPassword,
            full_name: formData.fullName,
            phone_number: formData.phoneNumber
        });
        
        console.log('User registered:', response.user);
        // Redirect to login or dashboard
    } catch (error) {
        console.error('Registration failed:', error.response.data);
        // Show error messages to user
    }
};
```

### Login Form
```javascript
const loginUser = async (email, password) => {
    try {
        const response = await api.post('/users/login', {
            email,
            password
        });
        
        // Store user data in state/context
        setUser(response.user);
        
        // Redirect to dashboard
        router.push('/dashboard');
    } catch (error) {
        console.error('Login failed:', error.response.data.message);
        // Show error message
    }
};
```

### Change Password Form
```javascript
const changePassword = async (userId, passwords) => {
    try {
        await api.put(`/users/${userId}/password`, {
            currentPassword: passwords.current,
            newPassword: passwords.new,
            confirmNewPassword: passwords.confirm
        });
        
        alert('Password changed successfully!');
    } catch (error) {
        console.error('Password change failed:', error.response.data);
        // Show validation errors
    }
};
```

## Testing Examples

### Valid Registration Request
```bash
curl -X POST http://localhost:3001/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john@example.com",
    "password": "MySecurePass123!",
    "confirmPassword": "MySecurePass123!",
    "full_name": "John Doe"
  }'
```

### Valid Login Request
```bash
curl -X POST http://localhost:3001/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "MySecurePass123!"
  }'
```

## Security Best Practices

1. **Never log passwords** in plain text
2. **Always use HTTPS** in production
3. **Implement rate limiting** for login attempts
4. **Use JWT tokens** for session management
5. **Implement password reset** functionality
6. **Add email verification** for new accounts
7. **Monitor for suspicious activity**

## Common Issues and Solutions

### Issue: "Password validation failed"
**Solution**: Check password meets all strength requirements

### Issue: "Password and confirm password do not match"
**Solution**: Ensure both password fields contain identical values

### Issue: "User already exists"
**Solution**: Use a different email address or username

### Issue: "Invalid email or password"
**Solution**: Verify credentials are correct and account is active
