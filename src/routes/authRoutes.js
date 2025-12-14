import express from 'express';
import { register, login, logout, getCurrentUser, refreshToken, updateProfile } from '../controllers/authController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import multer from 'multer';

const router = express.Router();

// Configure multer for memory storage (same as questionRoutes)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
});

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh-token', refreshToken);

// Protected routes
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getCurrentUser);
router.put('/profile', authenticate, upload.single('image'), updateProfile);

export default router;
