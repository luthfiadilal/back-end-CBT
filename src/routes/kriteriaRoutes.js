import express from 'express';
import {
    getAllKriteria,
    getKriteriaById,
    createKriteria,
    updateKriteria,
    deleteKriteria
} from '../controllers/kriteriaController.js';
import { authenticate, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes (or authenticated for all users)
// Assuming students might need to see criteria? Or just teachers/admins.
// For now, let's protect everything.
router.use(authenticate);

router.get('/kriteria', getAllKriteria);
router.get('/kriteria/:id', getKriteriaById);

// Admin only routes for modification
router.post('/kriteria', requireRole('admin'), createKriteria);
router.put('/kriteria/:id', requireRole('admin'), updateKriteria);
router.delete('/kriteria/:id', requireRole('admin'), deleteKriteria);

export default router;
