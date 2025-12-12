import express from 'express';
import {
    createExam,
    getAllExams,
    getExamById,
    updateExam,
    deleteExam
} from '../controllers/examController.js';

const router = express.Router();

router.post('/exams', createExam);
router.get('/exams', getAllExams);
router.get('/exams/:id', getExamById);
router.put('/exams/:id', updateExam);
router.delete('/exams/:id', deleteExam);

export default router;
