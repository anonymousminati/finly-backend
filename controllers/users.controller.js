import User from '../models/Users.model.js';
import { pool } from '../configs/db.config.js';
import externalApiService from '../services/externalApi.service.js';
import passwordService from '../services/password.service.js';
import sessionService from '../services/session.service.js';
import { v4 as uuidv4 } from 'uuid';

const UsersController = {
    createUser: async (req, res) => {
        try {
            console.log('Creating user with data:', req.body);
            
            // Extract fields from request body
            const { 
                username, 
                email, 
                password, 
                confirmPassword, 
                full_name, 
                phone_number = null, 
                status = 'active' 
            } = req.body;

            // Validate required fields
            if (!username || !email || !password || !confirmPassword || !full_name) {
                return res.status(400).json({ 
                    message: 'Missing required fields', 
                    required: ['username', 'email', 'password', 'confirmPassword', 'full_name'],
                    received: Object.keys(req.body)
                });
            }

            // Validate password strength and match
            const passwordValidation = passwordService.validatePasswordComplete(password, confirmPassword);
            if (!passwordValidation.isValid) {
                return res.status(400).json({
                    message: 'Password validation failed',
                    errors: passwordValidation.errors
                });
            }

            // Check if email already exists
            const emailExists = await User.checkEmailExists(pool, email);
            if (emailExists) {
                return res.status(409).json({
                    message: 'Email already exists',
                    error: 'A user with this email address already exists'
                });
            }

            // Check if username already exists
            const usernameExists = await User.checkUsernameExists(pool, username);
            if (usernameExists) {
                return res.status(409).json({
                    message: 'Username already exists',
                    error: 'A user with this username already exists'
                });
            }

            // Hash the password
            const password_hash = await passwordService.hashPassword(password);
            
            // Generate UUID if not provided
            const uuid = uuidv4();

            // Prepare user data for database
            const userData = {
                uuid,
                username,
                email,
                password_hash,
                full_name,
                phone_number,
                status
            };

            const userId = await User.createUser(pool, userData);
            
            // Example: Send welcome notification via external API
            try {
                await externalApiService.sendNotification({
                    userId: uuid,
                    type: 'welcome',
                    email: email,
                    message: `Welcome ${full_name}! Your account has been created successfully.`
                });
            } catch (notificationError) {
                console.warn('Failed to send welcome notification:', notificationError.message);
                // Don't fail user creation if notification fails
            }
            
            res.status(201).json({ 
                message: 'User created successfully',
                id: userId,
                user: {
                    uuid,
                    username,
                    email,
                    full_name,
                    phone_number,
                    status
                    // Note: password_hash is not returned for security
                }
            });
        } catch (error) {
            console.error('Error creating user:', error.message);
            
            // Handle specific MySQL errors
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ 
                    message: 'User already exists', 
                    error: 'Duplicate entry for username or email' 
                });
            }
            
            res.status(500).json({ 
                message: 'Error creating user', 
                error: error.message 
            });
        }
    },

    // Login method with password verification
    loginUser: async (req, res) => {
        try {
            console.log('User login attempt:', { email: req.body.email });
            
            const { email, password } = req.body;

            // Validate required fields
            if (!email || !password) {
                return res.status(400).json({
                    message: 'Email and password are required'
                });
            }

            // Get user from database
            const user = await User.getUserByEmail(pool, email);
            if (!user) {
                return res.status(401).json({
                    message: 'Invalid email or password'
                });
            }

            // Verify password
            const isPasswordValid = await passwordService.comparePassword(password, user.password_hash);
            if (!isPasswordValid) {
                return res.status(401).json({
                    message: 'Invalid email or password'
                });
            }

            // Check if user is active
            if (user.status !== 'active') {
                return res.status(403).json({
                    message: 'Account is not active. Please contact support.'
                });
            }

            // Generate session tokens
            const sessionToken = sessionService.generateSessionToken();
            const refreshToken = sessionService.generateRefreshToken();

            // Extract device and request information
            const deviceInfo = {
                platform: req.headers['sec-ch-ua-platform'] || 'unknown',
                browser: req.headers['sec-ch-ua'] || 'unknown'
            };
            const ipAddress = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
            const userAgent = req.headers['user-agent'];

            // Create session in database
            try {
                const session = await sessionService.createSession(pool, {
                    userId: user.id,
                    sessionToken,
                    refreshToken,
                    ipAddress,
                    userAgent,
                    deviceInfo,
                    expiresInHours: 24 // 24 hours session duration
                });

                console.log('Session created successfully:', { sessionId: session.id, userId: user.id });
            } catch (sessionError) {
                console.error('Error creating session:', sessionError.message);
                return res.status(500).json({
                    message: 'Login successful but session creation failed',
                    error: 'Please try logging in again'
                });
            }

            // Return user data without password hash and include tokens
            const { password_hash, ...userWithoutPassword } = user;
            
            res.status(200).json({
                message: 'Login successful',
                user: userWithoutPassword,
                session: {
                    token: sessionToken,
                    refreshToken: refreshToken,
                    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
                }
            });

        } catch (error) {
            console.error('Error during login:', error.message);
            res.status(500).json({
                message: 'Error during login',
                error: error.message
            });
        }
    },

    // Logout method - invalidate session
    logoutUser: async (req, res) => {
        try {
            const sessionToken = req.headers.authorization?.replace('Bearer ', '') || req.body.sessionToken;

            if (!sessionToken) {
                return res.status(400).json({
                    message: 'Session token is required for logout'
                });
            }

            // Invalidate the session
            const sessionInvalidated = await sessionService.invalidateSession(pool, sessionToken);

            if (!sessionInvalidated) {
                return res.status(404).json({
                    message: 'Session not found or already expired'
                });
            }

            res.status(200).json({
                message: 'Logout successful'
            });

        } catch (error) {
            console.error('Error during logout:', error.message);
            res.status(500).json({
                message: 'Error during logout',
                error: error.message
            });
        }
    },

    // Refresh session token method
    refreshSession: async (req, res) => {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                return res.status(400).json({
                    message: 'Refresh token is required'
                });
            }

            // Refresh the session
            const newSession = await sessionService.refreshSession(pool, refreshToken);

            if (!newSession) {
                return res.status(401).json({
                    message: 'Invalid or expired refresh token'
                });
            }

            res.status(200).json({
                message: 'Session refreshed successfully',
                session: {
                    token: newSession.sessionToken,
                    refreshToken: newSession.refreshToken,
                    expiresAt: newSession.expiresAt
                }
            });

        } catch (error) {
            console.error('Error refreshing session:', error.message);
            res.status(500).json({
                message: 'Error refreshing session',
                error: error.message
            });
        }
    },

    // Change password method
    changePassword: async (req, res) => {
        try {
            const { userId } = req.params;
            const { currentPassword, newPassword, confirmNewPassword } = req.body;

            // Validate required fields
            if (!currentPassword || !newPassword || !confirmNewPassword) {
                return res.status(400).json({
                    message: 'Current password, new password, and confirm new password are required'
                });
            }

            // Get user from database
            const user = await User.getUserById(pool, userId);
            if (!user) {
                return res.status(404).json({
                    message: 'User not found'
                });
            }

            // Verify current password
            const isCurrentPasswordValid = await passwordService.comparePassword(currentPassword, user.password_hash);
            if (!isCurrentPasswordValid) {
                return res.status(401).json({
                    message: 'Current password is incorrect'
                });
            }

            // Validate new password
            const passwordValidation = passwordService.validatePasswordComplete(newPassword, confirmNewPassword);
            if (!passwordValidation.isValid) {
                return res.status(400).json({
                    message: 'New password validation failed',
                    errors: passwordValidation.errors
                });
            }

            // Check if new password is different from current
            const isSamePassword = await passwordService.comparePassword(newPassword, user.password_hash);
            if (isSamePassword) {
                return res.status(400).json({
                    message: 'New password must be different from current password'
                });
            }

            // Hash new password
            const newPasswordHash = await passwordService.hashPassword(newPassword);

            // Update password in database
            await User.updatePassword(pool, userId, newPasswordHash);

            res.status(200).json({
                message: 'Password changed successfully'
            });

        } catch (error) {
            console.error('Error changing password:', error.message);
            res.status(500).json({
                message: 'Error changing password',
                error: error.message
            });
        }
    },

    // Example: Get user with external data enrichment
    getUserWithExternalData: async (req, res) => {
        try {
            const { userId } = req.params;
            
            // Get user from database
            const user = await User.getUserById(pool, userId);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Enrich with external data (example)
            try {
                const externalData = await externalApiService.fetchExternalUserData(user.uuid);
                user.externalProfile = externalData;
            } catch (externalError) {
                console.warn('Failed to fetch external user data:', externalError.message);
                user.externalProfile = null;
            }

            res.status(200).json({
                message: 'User retrieved successfully',
                user
            });
        } catch (error) {
            console.error('Error retrieving user:', error.message);
            res.status(500).json({
                message: 'Error retrieving user',
                error: error.message
            });
        }
    }
};

export default UsersController;