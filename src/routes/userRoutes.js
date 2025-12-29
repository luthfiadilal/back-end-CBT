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

// Create new user (Admin and Teacher)
router.post('/users', requireRole('admin', 'teacher'), createUser);

// Update user (Admin and Teacher)
router.put('/users/:id', requireRole('admin', 'teacher'), updateUser);

// Delete user (Admin and Teacher)
router.delete('/users/:id', requireRole('admin', 'teacher'), deleteUser);

export default router;
