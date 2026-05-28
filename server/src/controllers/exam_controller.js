import {
  addStrike,
  getExamQuestions,
  recordQuestionResponse,
  submitExam,
} from '../services/exam.service.js';
import { logIntegrityEvent } from '../services/session.service.js';

export async function getQuestions(req, res, next) {
  try {
    const { session } = req.auth;

    const questions = await getExamQuestions(session.session_token);

    res.json({
      questions,
      sessionInfo: {
        strikeCount: session.strike_count,
        startedAt: session.started_at,
        expiresAt: session.expires_at,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function submitAnswer(req, res, next) {
  try {
    const { session } = req.auth;
    const { questionId, answer } = req.body;

    if (!questionId || !answer) {
      return res.status(400).json({ error: 'questionId and answer are required' });
    }

    if (!['A', 'B', 'C', 'D'].includes(answer)) {
      return res.status(400).json({ error: 'answer must be A, B, C, or D' });
    }

    const result = await recordQuestionResponse(
      session.id,
      session.session_token,
      questionId,
      answer
    );

    // Only return { recorded: true } — NOT isCorrect
    res.json({ recorded: true });
  } catch (err) {
    next(err);
  }
}

export async function recordStrike(req, res, next) {
  try {
    const { session } = req.auth;
    const { eventType, metadata } = req.body;

    if (!eventType) {
      return res.status(400).json({ error: 'eventType is required' });
    }

    const result = await addStrike(session.id, eventType, metadata);

    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function finalizeExam(req, res, next) {
  try {
    const { session } = req.auth;

    const result = await submitExam(session.id);

    await logIntegrityEvent(session.id, 'exam_submitted', result);

    res.json({
      submitted: true,
      result,
    });
  } catch (err) {
    next(err);
  }
}
