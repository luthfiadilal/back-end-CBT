import express from 'express';
import {
    createAttempt,
    getAttemptById,
    getAttemptsByUser,
    saveAnswer,
    submitAttempt
} from '../controllers/examAttemptController.js';

const router = express.Router();

router.post('/exam-attempts', createAttempt);
router.get('/exam-attempts/:id', getAttemptById);
router.get('/exam-attempts/user/:uid', getAttemptsByUser);
router.post('/exam-attempts/:id/answers', saveAnswer); // New route for saving answers
router.post('/exam-attempts/:id/submit', submitAttempt);

export default router;
