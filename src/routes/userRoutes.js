import express from 'express';
import { getAllUsers, createUser } from '../controllers/userController.js';
import { authenticate, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Protect all routes with authentication
router.use(authenticate);

// Get all users (except current)
router.get('/users', getAllUsers);

// Create new user (Admin only)
router.post('/users', requireRole('admin'), createUser);

export default router;
