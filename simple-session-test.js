/**
 * Simple working session test
 */

console.log('🧪 Starting Simple Session Test...');

const runSimpleTest = async () => {
    try {
        // Dynamic imports to avoid hanging issues
        const { pool } = await import('./configs/db.config.js');
        const sessionService = await import('./services/session.service.js');
        
        console.log('✅ Modules imported successfully');

        // Test database connection
        console.log('1. Testing database connection...');
        const [rows] = await pool.execute('SELECT 1 as test');
        console.log('✅ Database connected');

        // Generate tokens
        console.log('2. Generating tokens...');
        const sessionToken = sessionService.default.generateSessionToken();
        const refreshToken = sessionService.default.generateRefreshToken();
        console.log('✅ Tokens generated');

        // Test complete
        console.log('3. Test completed successfully!');
        
        // Close connection
        await pool.end();
        console.log('✅ Connection closed');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
    }
};

runSimpleTest();
