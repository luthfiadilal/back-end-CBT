import express from 'express';
import {
    createOption,
    getOptionById,
    updateOption,
    deleteOption
} from '../controllers/questionOptionController.js';

const router = express.Router();

router.post('/question-options', createOption);
router.get('/question-options/:id', getOptionById);
router.put('/question-options/:id', updateOption);
router.delete('/question-options/:id', deleteOption);

export default router;
