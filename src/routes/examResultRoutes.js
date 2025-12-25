import express from 'express';
import { getExamResultByAttempt } from '../controllers/examResultController.js';

const router = express.Router();

// GET - Get exam result by attempt_id
router.get('/exam/result/:attempt_id', getExamResultByAttempt);

export default router;
