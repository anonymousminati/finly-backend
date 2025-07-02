# ============================================================================
# FINANCIAL SUMMARY API - CURL TESTING COMMANDS
# ============================================================================

# 1. LOGIN TO GET AUTHENTICATION TOKEN
# Replace with actual user credentials
curl -X POST http://localhost:3001/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# Expected response:
# {
#   "success": true,
#   "message": "Login successful",
#   "user": { ... },
#   "sessionToken": "your_jwt_token_here"
# }

# 2. GET FINANCIAL SUMMARY (Default - Authenticated User)
# Replace YOUR_JWT_TOKEN with the actual token from login
curl -X GET http://localhost:3001/api/financial/summary \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# 3. GET FINANCIAL SUMMARY WITH DATE RANGE
curl -X GET "http://localhost:3001/api/financial/summary?from=2024-01-01&to=2024-12-31" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# 4. GET FINANCIAL SUMMARY FOR SPECIFIC USER (by ID)
# Note: This will only work if you have permission to access this user's data
curl -X GET "http://localhost:3001/api/financial/summary?userId=123" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# 5. GET FINANCIAL SUMMARY FOR SPECIFIC USER (by UUID)
curl -X GET "http://localhost:3001/api/financial/summary?userUuid=550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# 6. GET FINANCIAL SUMMARY WITH PARTIAL DATE RANGE (from date only)
curl -X GET "http://localhost:3001/api/financial/summary?from=2024-06-01" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# 7. GET FINANCIAL SUMMARY WITH PARTIAL DATE RANGE (to date only)
curl -X GET "http://localhost:3001/api/financial/summary?to=2024-06-30" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# ============================================================================
# ERROR TESTING COMMANDS
# ============================================================================

# 8. TEST WITHOUT AUTHENTICATION (should return 401)
curl -X GET http://localhost:3001/api/financial/summary \
  -H "Content-Type: application/json"

# 9. TEST WITH INVALID TOKEN (should return 401)
curl -X GET http://localhost:3001/api/financial/summary \
  -H "Authorization: Bearer invalid_token" \
  -H "Content-Type: application/json"

# 10. TEST WITH INVALID DATE FORMAT (should return 400)
curl -X GET "http://localhost:3001/api/financial/summary?from=invalid-date" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# 11. TEST WITH INVALID USER ID (should return 400)
curl -X GET "http://localhost:3001/api/financial/summary?userId=invalid" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# 12. TEST WITH INVALID UUID FORMAT (should return 400)
curl -X GET "http://localhost:3001/api/financial/summary?userUuid=invalid-uuid" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# 13. TEST WITH BOTH userId AND userUuid (should return 400)
curl -X GET "http://localhost:3001/api/financial/summary?userId=123&userUuid=550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# 14. TEST WITH INVALID DATE RANGE (from > to, should return 400)
curl -X GET "http://localhost:3001/api/financial/summary?from=2024-12-31&to=2024-01-01" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# ============================================================================
# PERFORMANCE TESTING
# ============================================================================

# 15. CONCURRENT REQUESTS TEST (using bash)
# This will make 10 concurrent requests to test performance
for i in {1..10}; do
  curl -X GET http://localhost:3001/api/financial/summary \
    -H "Authorization: Bearer YOUR_JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -w "@curl-format.txt" \
    -o /dev/null -s &
done
wait

# Create curl-format.txt file for performance metrics:
# echo "     time_namelookup:  %{time_namelookup}\n
#      time_connect:  %{time_connect}\n
#   time_appconnect:  %{time_appconnect}\n
#  time_pretransfer:  %{time_pretransfer}\n
#     time_redirect:  %{time_redirect}\n
#time_starttransfer:  %{time_starttransfer}\n
#                   ----------\n
#        time_total:  %{time_total}\n" > curl-format.txt

# ============================================================================
# EXPECTED RESPONSE FORMAT
# ============================================================================

# Successful response structure:
# {
#   "success": true,
#   "data": {
#     "summary": {
#       "total_balance": 15750.50,
#       "total_active_accounts": 3,
#       "credit_card": {
#         "total_limit": 10000.00,
#         "total_utilized": 2500.00,
#         "utilization_percentage": 25.0
#       }
#     },
#     "accounts": [
#       {
#         "account_id": 1,
#         "account_name": "Primary Checking",
#         "account_number": "1234567890",
#         "masked_account_number": "******7890",
#         "bank_name": "Bank of America",
#         "branch_name": "Main Branch",
#         "card_type": null,
#         "current_balance": 5250.50,
#         "available_balance": 5250.50,
#         "credit_limit": null,
#         "currency": "USD",
#         "transactions_count": 45,
#         "categories_summary": [
#           {
#             "category_id": 1,
#             "category_name": "Groceries",
#             "total_amount": 450.25,
#             "transaction_count": 12
#           }
#         ]
#       }
#     ],
#     "transactions_summary": {
#       "total_transactions": 125,
#       "total_income": 8500.00,
#       "total_expenses": 3200.75,
#       "average_transaction": 92.80,
#       "recent_transactions": [
#         {
#           "transaction_id": 1001,
#           "type": "expense",
#           "category": {
#             "id": 1,
#             "name": "Groceries",
#             "icon": "shopping-cart"
#           },
#           "description": "Walmart Purchase",
#           "amount": 85.50,
#           "date": "2024-07-01",
#           "status": "completed"
#         }
#       ]
#     }
#   },
#   "metadata": {
#     "user_id": 123,
#     "date_range": {
#       "from": "2024-01-01",
#       "to": "2024-12-31"
#     },
#     "generated_at": "2024-07-01T12:00:00.000Z",
#     "cache_duration": 60
#   }
# }

# ============================================================================
# AUTOMATION SCRIPTS
# ============================================================================

# Save this as test-api.sh for automated testing:
#!/bin/bash

# Get token
TOKEN=$(curl -s -X POST http://localhost:3001/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' | \
  jq -r '.sessionToken')

if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
  echo "✅ Login successful, token: ${TOKEN:0:20}..."
  
  # Test financial summary
  echo "📊 Testing financial summary..."
  curl -s -X GET http://localhost:3001/api/financial/summary \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" | jq '.'
    
  echo "✅ Financial summary test completed"
else
  echo "❌ Login failed"
fi
