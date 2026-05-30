import express from 'express';
import { requireAuth } from '../middleware/auth_middleware.js';
import { finalizeExam, getQuestions, recordStrike, submitAnswer } from '../controllers/exam_controller.js';

const router = express.Router();

// All exam routes require authentication
router.get('/questions', requireAuth, getQuestions);
router.post('/answer', requireAuth, submitAnswer);
router.post('/strike', requireAuth, recordStrike);
router.post('/submit', requireAuth, finalizeExam);

export default router;
