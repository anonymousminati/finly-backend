# Financial Summary API Documentation

## Overview
The Financial Summary API provides a comprehensive financial overview for authenticated users, including account balances, transaction summaries, and detailed financial insights.

## Endpoint
```
GET /api/financial/summary
```

## Authentication
- **Required**: JWT Bearer token
- **Header**: `Authorization: Bearer <token>`

## Request Parameters

### Query Parameters (Optional)
| Parameter | Type | Format | Description |
|-----------|------|--------|-------------|
| `userId` | integer | Positive integer | Target user ID (admin access only) |
| `userUuid` | string | UUID v4 | Target user UUID (admin access only) |
| `from` | string | YYYY-MM-DD | Start date for filtering transactions |
| `to` | string | YYYY-MM-DD | End date for filtering transactions |

### Parameter Rules
- If neither `userId` nor `userUuid` is provided, returns data for the authenticated user
- Cannot provide both `userId` and `userUuid` in the same request
- Date parameters must be in ISO format (YYYY-MM-DD)
- `from` date cannot be later than `to` date
- Users can only access their own data unless they have admin privileges

## Response Format

### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_balance": 15750.50,
      "total_active_accounts": 3,
      "credit_card": {
        "total_limit": 10000.00,
        "total_utilized": 2500.00,
        "utilization_percentage": 25.0
      }
    },
    "accounts": [
      {
        "account_id": 1,
        "account_name": "Primary Checking",
        "account_number": "1234567890",
        "masked_account_number": "******7890",
        "bank_name": "Bank of America",
        "branch_name": "Main Branch",
        "card_type": "visa",
        "current_balance": 5250.50,
        "available_balance": 5250.50,
        "credit_limit": null,
        "currency": "USD",
        "transactions_count": 45,
        "categories_summary": [
          {
            "category_id": 1,
            "category_name": "Groceries",
            "total_amount": 450.25,
            "transaction_count": 12
          }
        ]
      }
    ],
    "transactions_summary": {
      "total_transactions": 125,
      "total_income": 8500.00,
      "total_expenses": 3200.75,
      "average_transaction": 92.80,
      "recent_transactions": [
        {
          "transaction_id": 1001,
          "type": "expense",
          "category": {
            "id": 1,
            "name": "Groceries",
            "icon": "shopping-cart"
          },
          "description": "Walmart Purchase",
          "amount": 85.50,
          "date": "2024-07-01",
          "status": "completed"
        }
      ]
    }
  },
  "metadata": {
    "user_id": 123,
    "date_range": {
      "from": "2024-01-01",
      "to": "2024-12-31"
    },
    "generated_at": "2024-07-01T12:00:00.000Z",
    "cache_duration": 60
  }
}
```

### Error Responses

#### 400 Bad Request
```json
{
  "success": false,
  "message": "Invalid date format. Use YYYY-MM-DD format."
}
```

#### 401 Unauthorized
```json
{
  "success": false,
  "message": "Authentication required"
}
```

#### 403 Forbidden
```json
{
  "success": false,
  "message": "You do not have permission to access this user's financial data"
}
```

#### 404 Not Found
```json
{
  "success": false,
  "message": "User not found or inactive"
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error occurred while fetching financial summary"
}
```

## Response Fields

### Summary Object
- `total_balance`: Sum of all non-credit account balances
- `total_active_accounts`: Number of active accounts
- `credit_card`: Credit card utilization summary

### Accounts Array
- `account_id`: Unique account identifier
- `account_name`: Display name for the account
- `account_number`: Full account number (backend use only)
- `masked_account_number`: Masked version for UI display
- `bank_name`: Financial institution name
- `branch_name`: Branch name (if applicable)
- `card_type`: Card type for credit cards (visa, mastercard, etc.)
- `current_balance`: Current account balance
- `available_balance`: Available balance (for credit cards)
- `credit_limit`: Credit limit (for credit cards only)
- `currency`: Currency code (ISO 4217)
- `transactions_count`: Number of transactions in the date range
- `categories_summary`: Top 3 spending categories for this account

### Transactions Summary
- `total_transactions`: Total number of transactions
- `total_income`: Sum of all income transactions
- `total_expenses`: Sum of all expense transactions
- `average_transaction`: Average transaction amount
- `recent_transactions`: Last 5 transactions

## Performance Considerations

### Caching
- Responses are cached for 60 seconds
- ETags are used for conditional requests
- Cache headers are set appropriately

### Database Optimizations
- Optimized indexes on frequently queried columns
- Efficient query patterns to minimize database load
- Temporary tables for complex aggregations

## Security Features

### Authentication & Authorization
- JWT token validation
- User permission checks
- Admin access controls

### Data Protection
- Account numbers are masked in responses
- Sensitive data is filtered based on user permissions
- SQL injection protection through parameterized queries

## Usage Examples

### Basic Usage
```bash
curl -X GET "http://localhost:3001/api/financial/summary" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### With Date Range
```bash
curl -X GET "http://localhost:3001/api/financial/summary?from=2024-01-01&to=2024-06-30" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript/Axios Example
```javascript
const response = await axios.get('/api/financial/summary', {
  headers: {
    'Authorization': `Bearer ${token}`
  },
  params: {
    from: '2024-01-01',
    to: '2024-06-30'
  }
});

if (response.data.success) {
  console.log('Financial Summary:', response.data.data);
}
```

## Rate Limiting
- No specific rate limiting implemented
- Consider implementing rate limiting for production use
- Recommended: 100 requests per minute per user

## Error Handling Best Practices

### Client-Side Handling
```javascript
try {
  const response = await financialAPI.getSummary();
  // Handle success
} catch (error) {
  switch (error.response?.status) {
    case 400:
      // Handle validation errors
      break;
    case 401:
      // Handle authentication errors
      redirectToLogin();
      break;
    case 403:
      // Handle authorization errors
      showPermissionError();
      break;
    case 404:
      // Handle not found errors
      break;
    case 500:
      // Handle server errors
      break;
  }
}
```

## Testing

### Unit Tests
- Controller logic testing
- Model data validation
- Error handling scenarios

### Integration Tests
- End-to-end API testing
- Authentication flow testing
- Performance testing

### Sample Test Data
```sql
-- Create test user
INSERT INTO users (uuid, username, email, password_hash, full_name, status) 
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'testuser', 'test@example.com', 'hashed_password', 'Test User', 'active');

-- Create test accounts
INSERT INTO financial_accounts (user_id, account_type, account_name, account_number, masked_account_number, bank_name, current_balance, is_active) 
VALUES (1, 'checking', 'Primary Checking', '1234567890', '******7890', 'Test Bank', 5000.00, 1);

-- Create test transactions
INSERT INTO transactions (user_id, account_id, transaction_type, description, amount, transaction_date, status) 
VALUES (1, 1, 'income', 'Salary', 3000.00, '2024-07-01', 'completed');
```

## Deployment Considerations

### Environment Variables
- `NODE_ENV`: Set to 'production' for production deployment
- `JWT_SECRET`: Strong secret key for JWT signing
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`: Database connection details

### Database Indexes
Run the optimization script to create necessary indexes:
```bash
mysql -u username -p database_name < db-optimizations.sql
```

### Monitoring
- Log all API requests and responses
- Monitor query performance
- Set up alerts for error rates
- Track response times

## Changelog

### Version 1.0.0
- Initial implementation
- Basic financial summary endpoint
- Authentication and authorization
- Date range filtering
- Performance optimizations
