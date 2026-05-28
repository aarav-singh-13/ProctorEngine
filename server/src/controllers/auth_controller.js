import {
  loginWithPassword,
  getSessionFromAccessToken,
} from '../services/auth.service.js';

export async function postLogin(req, res, next) {
  try {
    const { rollNumber, password } = req.body;

    if (!rollNumber?.trim()) {
      return res.status(400).json({ error: 'rollNumber is required' });
    }
    if (!password) {
      return res.status(400).json({ error: 'password is required' });
    }

    const result = await loginWithPassword({ rollNumber, password });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getMe(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: 'Authorization token required' });
    }

    // allowAllStatuses = true so students can see results after submission
    const { decoded, session } = await getSessionFromAccessToken(token, true);

    res.json({
      student: {
        rollNumber: session.roll_number,
        fullName: session.full_name,
      },
      session: {
        sessionToken: session.session_token,
        status: session.status,
        strikeCount: session.strike_count,
        startedAt: session.started_at,
        expiresAt: session.expires_at,
        totalScore: session.total_score,
        questionsAnswered: session.questions_answered,
      },
      tokenPayload: {
        sessionId: decoded.sessionId,
        rollNumber: decoded.rollNumber,
      },
    });
  } catch (err) {
    next(err);
  }
}
