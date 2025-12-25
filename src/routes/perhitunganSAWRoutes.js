import express from 'express';
import {
    finishExam
} from '../controllers/perhitunganSAWController.js';

const router = express.Router();

// POST - Selesaikan ujian dan hitung nilai menggunakan metode SAW
router.post('/student/exam/finish', finishExam);

export default router;
