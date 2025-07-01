import crypto from 'crypto';

const sessionService = {
    /**
     * Generate a secure session token
     * @returns {string} Random session token
     */
    generateSessionToken: () => {
        return crypto.randomBytes(64).toString('hex');
    },

    /**
     * Generate a secure refresh token
     * @returns {string} Random refresh token
     */
    generateRefreshToken: () => {
        return crypto.randomBytes(64).toString('hex');
    },

    /**
     * Create a new session record in the database
     * @param {Object} pool - Database connection pool
     * @param {Object} sessionData - Session data object
     * @param {number} sessionData.userId - User ID
     * @param {string} sessionData.sessionToken - Session token
     * @param {string} sessionData.refreshToken - Refresh token
     * @param {string} sessionData.ipAddress - Client IP address
     * @param {string} sessionData.userAgent - Client user agent
     * @param {Object} sessionData.deviceInfo - Device information
     * @param {number} sessionData.expiresInHours - Session expiration in hours (default: 24)
     * @returns {Object} Created session object
     */
    createSession: async (pool, sessionData) => {
        const {
            userId,
            sessionToken,
            refreshToken,
            ipAddress = null,
            userAgent = null,
            deviceInfo = null,
            expiresInHours = 24
        } = sessionData;

        // Calculate expiration time
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + expiresInHours);

        const query = `
            INSERT INTO user_sessions (
                user_id, 
                session_token, 
                refresh_token, 
                device_info, 
                ip_address, 
                user_agent, 
                expires_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        // Prepare device info for storage
        let deviceInfoJson = null;
        if (deviceInfo) {
            deviceInfoJson = typeof deviceInfo === 'string' ? deviceInfo : JSON.stringify(deviceInfo);
        }

        const [result] = await pool.execute(query, [
            userId,
            sessionToken,
            refreshToken,
            deviceInfoJson,
            ipAddress,
            userAgent,
            expiresAt
        ]);

        return {
            id: result.insertId,
            userId,
            sessionToken,
            refreshToken,
            expiresAt,
            deviceInfo,
            ipAddress,
            userAgent
        };
    },

    /**
     * Get session by session token
     * @param {Object} pool - Database connection pool
     * @param {string} sessionToken - Session token to lookup
     * @returns {Object|null} Session object or null if not found
     */
    getSessionByToken: async (pool, sessionToken) => {
        const query = `
            SELECT 
                s.*,
                u.uuid as user_uuid,
                u.username,
                u.email,
                u.full_name,
                u.status
            FROM user_sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.session_token = ? 
                AND s.expires_at > NOW()
        `;

        const [rows] = await pool.execute(query, [sessionToken]);
        
        if (rows.length === 0) {
            return null;
        }

        const session = rows[0];
        
        // Parse device_info JSON if it exists and is a string
        if (session.device_info) {
            if (typeof session.device_info === 'string') {
                try {
                    session.device_info = JSON.parse(session.device_info);
                } catch (error) {
                    console.warn('Failed to parse device_info JSON:', session.device_info, 'Error:', error.message);
                    session.device_info = null;
                }
            }
            // If it's already an object, leave it as is (MySQL JSON column auto-parsing)
        }

        return session;
    },

    /**
     * Update session last activity
     * @param {Object} pool - Database connection pool
     * @param {string} sessionToken - Session token
     * @returns {boolean} Success status
     */
    updateSessionActivity: async (pool, sessionToken) => {
        const query = `
            UPDATE user_sessions 
            SET last_activity = NOW() 
            WHERE session_token = ?
        `;

        const [result] = await pool.execute(query, [sessionToken]);
        return result.affectedRows > 0;
    },

    /**
     * Invalidate (delete) a session
     * @param {Object} pool - Database connection pool
     * @param {string} sessionToken - Session token to invalidate
     * @returns {boolean} Success status
     */
    invalidateSession: async (pool, sessionToken) => {
        const query = `
            DELETE FROM user_sessions 
            WHERE session_token = ?
        `;

        const [result] = await pool.execute(query, [sessionToken]);
        return result.affectedRows > 0;
    },

    /**
     * Invalidate all sessions for a user
     * @param {Object} pool - Database connection pool
     * @param {number} userId - User ID
     * @returns {number} Number of sessions invalidated
     */
    invalidateAllUserSessions: async (pool, userId) => {
        const query = `
            DELETE FROM user_sessions 
            WHERE user_id = ?
        `;

        const [result] = await pool.execute(query, [userId]);
        return result.affectedRows;
    },

    /**
     * Clean up expired sessions
     * @param {Object} pool - Database connection pool
     * @returns {number} Number of expired sessions removed
     */
    cleanupExpiredSessions: async (pool) => {
        const query = `
            DELETE FROM user_sessions 
            WHERE expires_at < NOW()
        `;

        const [result] = await pool.execute(query);
        return result.affectedRows;
    },

    /**
     * Get all active sessions for a user
     * @param {Object} pool - Database connection pool
     * @param {number} userId - User ID
     * @returns {Array} Array of active sessions
     */
    getUserActiveSessions: async (pool, userId) => {
        const query = `
            SELECT 
                id,
                session_token,
                device_info,
                ip_address,
                user_agent,
                expires_at,
                last_activity,
                created_at
            FROM user_sessions 
            WHERE user_id = ? 
                AND expires_at > NOW()
            ORDER BY last_activity DESC
        `;

        const [rows] = await pool.execute(query, [userId]);
        
        return rows.map(session => {
            // Parse device_info JSON if it exists and is a string
            if (session.device_info) {
                if (typeof session.device_info === 'string') {
                    try {
                        session.device_info = JSON.parse(session.device_info);
                    } catch (error) {
                        console.warn('Failed to parse device_info JSON:', session.device_info, 'Error:', error.message);
                        session.device_info = null;
                    }
                }
                // If it's already an object, leave it as is (MySQL JSON column auto-parsing)
            }
            return session;
        });
    },

    /**
     * Refresh a session with a new token
     * @param {Object} pool - Database connection pool
     * @param {string} refreshToken - Refresh token
     * @param {number} expiresInHours - New session expiration in hours (default: 24)
     * @returns {Object|null} New session data or null if refresh token invalid
     */
    refreshSession: async (pool, refreshToken, expiresInHours = 24) => {
        // First verify the refresh token exists and is valid
        const getRefreshQuery = `
            SELECT user_id, id 
            FROM user_sessions 
            WHERE refresh_token = ? 
                AND expires_at > NOW()
        `;

        const [refreshRows] = await pool.execute(getRefreshQuery, [refreshToken]);
        
        if (refreshRows.length === 0) {
            return null;
        }

        const { user_id: userId, id: sessionId } = refreshRows[0];

        // Generate new tokens
        const newSessionToken = sessionService.generateSessionToken();
        const newRefreshToken = sessionService.generateRefreshToken();

        // Calculate new expiration time
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + expiresInHours);

        // Update the session with new tokens
        const updateQuery = `
            UPDATE user_sessions 
            SET session_token = ?, 
                refresh_token = ?, 
                expires_at = ?,
                last_activity = NOW()
            WHERE id = ?
        `;

        await pool.execute(updateQuery, [
            newSessionToken,
            newRefreshToken,
            expiresAt,
            sessionId
        ]);

        return {
            sessionToken: newSessionToken,
            refreshToken: newRefreshToken,
            expiresAt,
            userId
        };
    }
};

export default sessionService;
