import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { env } from '../config/env.js';
import { query } from '../config/db.js';
import {
  createExamSession,
  findActiveSessionForStudent,
  findStudentByRoll,
  findSubmittedSessionForStudent,
  findSessionByToken,
  logIntegrityEvent,
} from './session.service.js';

export function signSessionToken(payload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

export function verifySessionJwt(token) {
  return jwt.verify(token, env.jwtSecret);
}

/**
 * Password-based login.
 * 1. Find student by roll number
 * 2. Verify password with bcrypt
 * 3. Check for existing submitted session (retake prevention)
 * 4. Check for existing active session (reuse)
 * 5. Create new session if none active
 */
export async function loginWithPassword({ rollNumber, password }) {
  if (!rollNumber?.trim()) {
    const err = new Error('Roll number is required');
    err.statusCode = 400;
    throw err;
  }
  if (!password) {
    const err = new Error('Password is required');
    err.statusCode = 400;
    throw err;
  }

  const student = await findStudentByRoll(rollNumber);

  if (!student) {
    const err = new Error('Roll number not found');
    err.statusCode = 404;
    throw err;
  }

  // Verify password
  const passwordValid = await bcrypt.compare(password, student.password_hash);
  if (!passwordValid) {
    const err = new Error('Invalid password');
    err.statusCode = 401;
    throw err;
  }

  // Check if student has already submitted (permanent block)
  const submittedSession = await findSubmittedSessionForStudent(student.id);
  if (submittedSession) {
    const err = new Error('You have already submitted this exam. Retakes are not allowed.');
    err.statusCode = 403;
    throw err;
  }

  // Check for existing active session (reuse it)
  const activeSession = await findActiveSessionForStudent(student.id);
  if (activeSession) {
    const accessToken = signSessionToken({
      sessionId: activeSession.id,
      sessionToken: activeSession.session_token,
      studentId: student.id,
      rollNumber: student.roll_number,
    });

    return {
      accessToken,
      session: {
        sessionToken: activeSession.session_token,
        status: activeSession.status,
        strikeCount: activeSession.strike_count,
        startedAt: activeSession.started_at,
        expiresAt: activeSession.expires_at,
      },
      student: {
        rollNumber: student.roll_number,
        fullName: student.full_name,
      },
    };
  }

  // Create new session
  const session = await createExamSession({
    studentId: student.id,
    deviceFingerprint: null,
  });

  await logIntegrityEvent(session.id, 'login_success', {
    rollNumber: student.roll_number,
  });

  const accessToken = signSessionToken({
    sessionId: session.id,
    sessionToken: session.session_token,
    studentId: student.id,
    rollNumber: student.roll_number,
  });

  return {
    accessToken,
    session: {
      sessionToken: session.session_token,
      status: session.status,
      strikeCount: session.strike_count,
      startedAt: session.started_at,
      expiresAt: session.expires_at,
    },
    student: {
      rollNumber: student.roll_number,
      fullName: student.full_name,
    },
  };
}

/**
 * Get session info from an access token.
 * @param {string} accessToken - JWT access token
 * @param {boolean} allowAllStatuses - If true, allows any session status (for getMe).
 *                                     If false, only allows 'active' sessions.
 */
export async function getSessionFromAccessToken(accessToken, allowAllStatuses = false) {
  let decoded;
  try {
    decoded = verifySessionJwt(accessToken);
  } catch {
    const err = new Error('Invalid or expired token');
    err.statusCode = 401;
    throw err;
  }

  // Auto-expire any sessions that have passed their expiry time
  await query(
    `UPDATE exam_sessions SET status = 'expired'
     WHERE session_token = $1 AND status = 'active' AND expires_at <= NOW()`,
    [decoded.sessionToken]
  );

  const session = await findSessionByToken(decoded.sessionToken);

  if (!session) {
    const err = new Error('Session not found');
    err.statusCode = 404;
    throw err;
  }

  if (!allowAllStatuses) {
    if (session.status !== 'active') {
      const err = new Error(`Session is ${session.status}`);
      err.statusCode = 403;
      throw err;
    }
  }

  return { decoded, session };
}
