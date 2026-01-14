import express from 'express';
import {
    finishExam,
    getAllDetail
} from '../controllers/perhitunganSAWController.js';

const router = express.Router();

// POST - Selesaikan ujian dan hitung nilai menggunakan metode SAW
router.post('/student/exam/finish', finishExam);
router.get('/student/exam/all-detail', getAllDetail);

export default router;
