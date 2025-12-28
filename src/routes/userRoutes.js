import express from 'express';
import { getAllUsers, createUser, updateUser, deleteUser, getStudentsExamStatus } from '../controllers/userController.js';
import { authenticate, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Protect all routes with authentication
router.use(authenticate);

// Get all users (except current)
router.get('/users', getAllUsers);

// Get students with exam status (Teacher access)
router.get('/users/students/exam-status', getStudentsExamStatus);

// Create new user (Admin only)
router.post('/users', requireRole('admin'), createUser);

// Update user (Admin only)
router.put('/users/:id', requireRole('admin'), updateUser);

// Delete user (Admin only)
router.delete('/users/:id', requireRole('admin'), deleteUser);

export default router;
