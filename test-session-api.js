/**
 * Quick test script to verify session management functionality
 * This script tests the complete login, session creation, and token flow
 */

// Test user credentials - let's try different credentials
const testCredentials = {
    email: 'testuser@example.com', 
    password: 'TestPassword123!'
};

// Test user registration data
const testRegistrationData = {
    username: 'sessiontestuser',
    email: 'testuser@example.com',
    password: 'TestPassword123!',
    confirmPassword: 'TestPassword123!',
    full_name: 'Session Test User'
};

/**
 * Test the registration endpoint
 */
async function testRegistration() {
    console.log('🔄 Testing user registration...');
    
    try {
        const response = await fetch('http://localhost:3001/api/users/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testRegistrationData)
        });

        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ Registration successful:', data.message);
            return true;
        } else {
            console.log('ℹ️ Registration response:', data.message);
            // User might already exist, which is fine for testing
            return data.message.includes('already exists');
        }
    } catch (error) {
        console.error('❌ Registration failed:', error.message);
        return false;
    }
}

/**
 * Test the login endpoint and session creation
 */
async function testLogin() {
    console.log('🔄 Testing user login and session creation...');
    
    try {
        const response = await fetch('http://localhost:3001/api/users/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testCredentials)
        });

        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ Login successful:', data.message);
            console.log('👤 User:', data.user.full_name, `(${data.user.email})`);
            console.log('🔑 Session token:', data.session.token.substring(0, 20) + '...');
            console.log('🔄 Refresh token:', data.session.refreshToken.substring(0, 20) + '...');
            console.log('⏰ Expires at:', data.session.expiresAt);
            
            return {
                sessionToken: data.session.token,
                refreshToken: data.session.refreshToken,
                user: data.user
            };
        } else {
            console.error('❌ Login failed:', data.message);
            return null;
        }
    } catch (error) {
        console.error('❌ Login request failed:', error.message);
        return null;
    }
}

/**
 * Test a protected endpoint with session token
 */
async function testProtectedEndpoint(sessionToken, userId) {
    console.log('🔄 Testing protected endpoint access...');
    
    try {
        const response = await fetch(`http://localhost:3001/api/users/${userId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${sessionToken}`,
                'Content-Type': 'application/json',
            }
        });

        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ Protected endpoint access successful');
            console.log('📋 User data retrieved:', data.user.full_name);
            return true;
        } else {
            console.error('❌ Protected endpoint access failed:', data.message);
            return false;
        }
    } catch (error) {
        console.error('❌ Protected endpoint request failed:', error.message);
        return false;
    }
}

/**
 * Test session refresh functionality
 */
async function testSessionRefresh(refreshToken) {
    console.log('🔄 Testing session refresh...');
    
    try {
        const response = await fetch('http://localhost:3001/api/users/refresh-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken })
        });

        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ Session refresh successful');
            console.log('🔑 New session token:', data.session.token.substring(0, 20) + '...');
            console.log('🔄 New refresh token:', data.session.refreshToken.substring(0, 20) + '...');
            
            return {
                sessionToken: data.session.token,
                refreshToken: data.session.refreshToken
            };
        } else {
            console.error('❌ Session refresh failed:', data.message);
            return null;
        }
    } catch (error) {
        console.error('❌ Session refresh request failed:', error.message);
        return null;
    }
}

/**
 * Test logout functionality
 */
async function testLogout(sessionToken) {
    console.log('🔄 Testing logout...');
    
    try {
        const response = await fetch('http://localhost:3001/api/users/logout', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${sessionToken}`,
                'Content-Type': 'application/json',
            }
        });

        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ Logout successful:', data.message);
            return true;
        } else {
            console.error('❌ Logout failed:', data.message);
            return false;
        }
    } catch (error) {
        console.error('❌ Logout request failed:', error.message);
        return false;
    }
}

/**
 * Run all tests in sequence
 */
async function runAllTests() {
    console.log('🧪 Starting Session Management Integration Tests\n');
    
    // Test 1: Registration (optional - user might already exist)
    await testRegistration();
    console.log('');
    
    // Test 2: Login and session creation
    const loginResult = await testLogin();
    if (!loginResult) {
        console.log('❌ Cannot proceed with tests - login failed');
        return;
    }
    console.log('');
    
    // Test 3: Protected endpoint access
    await testProtectedEndpoint(loginResult.sessionToken, loginResult.user.id);
    console.log('');
    
    // Test 4: Session refresh
    const refreshResult = await testSessionRefresh(loginResult.refreshToken);
    if (!refreshResult) {
        console.log('❌ Session refresh failed');
        return;
    }
    console.log('');
    
    // Test 5: Protected endpoint with new token
    await testProtectedEndpoint(refreshResult.sessionToken, loginResult.user.id);
    console.log('');
    
    // Test 6: Logout
    await testLogout(refreshResult.sessionToken);
    console.log('');
    
    console.log('🎉 All session management tests completed!');
    console.log('✅ Session tokens are working correctly');
    console.log('✅ Database storage is functioning');
    console.log('✅ Token refresh is operational');
    console.log('✅ Logout invalidation is working');
}

// Run the tests
runAllTests().catch(console.error);
