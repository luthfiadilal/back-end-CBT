import express from 'express';
import {
    startExam,
    getExamQuestions,
    submitAnswer
} from '../controllers/examStudentController.js';
import { finishExam, getExamRanking } from '../controllers/perhitunganSAWController.js';

const router = express.Router();

// POST - Mulai ujian
router.post('/student/exam/start', startExam);

// GET - Ambil soal-soal ujian berdasarkan exam_id
router.get('/student/exam/:exam_id/questions', getExamQuestions);

// POST - Submit jawaban siswa
router.post('/student/exam/answer', submitAnswer);

// POST - Selesaikan ujian dan hitung SAW
// router.post('/student/exam/finish', finishExam);

// GET - Ambil ranking exam
router.get('/student/exam/:exam_id/ranking', getExamRanking);

export default router;
