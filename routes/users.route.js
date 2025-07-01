import express from 'express';
import UsersController from '../controllers/users.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const UserRouter = express.Router();

// Authentication routes (public)
UserRouter.post('/register', UsersController.createUser);
UserRouter.post('/login', UsersController.loginUser);
UserRouter.post('/logout', UsersController.logoutUser);
UserRouter.post('/refresh-session', UsersController.refreshSession);

// User management routes (protected)
UserRouter.get('/:userId', authMiddleware, UsersController.getUserWithExternalData);
UserRouter.put('/:userId/password', authMiddleware, UsersController.changePassword);

export default UserRouter;