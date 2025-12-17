import express from 'express';
import {
    createQuestion,
    getAllQuestions,
    getQuestionById,
    updateQuestion,
    deleteQuestion,
    getQuestionPairGroups
} from '../controllers/questionController.js';

const router = express.Router();

import multer from 'multer';

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
});

router.post('/questions', upload.single('image'), createQuestion);
router.get('/questions', getAllQuestions);
// Add the pair-groups route BEFORE the :id route to avoid collision if :id matched "pair-groups" (though unlikely with integer IDs usually, but good practice if IDs are UUIDs or strings)
router.get('/questions/pair-groups', getQuestionPairGroups);
router.get('/questions/:id', getQuestionById);
router.put('/questions/:id', upload.single('image'), updateQuestion);
router.delete('/questions/:id', deleteQuestion);

export default router;
