import { randomBytes } from 'crypto';
import { query } from '../config/db.js';
import { env } from '../config/env.js';

function generateSessionToken() {
  return randomBytes(32).toString('hex');
}

export async function findStudentByRoll(rollNumber) {
  const normalized = rollNumber.trim().toUpperCase();
  const { rows } = await query(
    `SELECT id, roll_number, full_name, password_hash, photo_url
     FROM students WHERE roll_number = $1`,
    [normalized]
  );
  return rows[0] ?? null;
}

export async function findActiveSessionForStudent(studentId) {
  const { rows } = await query(
    `SELECT id, session_token, status, strike_count, started_at, expires_at, device_fingerprint
     FROM exam_sessions
     WHERE student_id = $1 AND status = 'active' AND expires_at > NOW()
     LIMIT 1`,
    [studentId]
  );
  return rows[0] ?? null;
}

// Check if a student has already submitted (retake prevention)
export async function findSubmittedSessionForStudent(studentId) {
  const { rows } = await query(
    `SELECT id, status, submitted_at, total_score
     FROM exam_sessions
     WHERE student_id = $1 AND status IN ('submitted', 'auto_submitted')
     LIMIT 1`,
    [studentId]
  );
  return rows[0] ?? null;
}

export async function createExamSession({ studentId, deviceFingerprint }) {
  const sessionToken = generateSessionToken();

  // Expire any old active sessions that have passed their expiry time
  await query(
    `UPDATE exam_sessions SET status = 'expired'
     WHERE student_id = $1 AND status = 'active' AND expires_at <= NOW()`,
    [studentId]
  );

  const { rows } = await query(
    `INSERT INTO exam_sessions (student_id, session_token, device_fingerprint, expires_at)
     VALUES ($1, $2, $3, NOW() + ($4 || ' minutes')::INTERVAL)
     RETURNING id, session_token, status, strike_count, started_at, expires_at`,
    [studentId, sessionToken, deviceFingerprint ?? null, String(env.examDurationMinutes)]
  );

  return rows[0];
}

export async function findSessionByToken(sessionToken) {
  const { rows } = await query(
    `SELECT es.id, es.session_token, es.status, es.strike_count, es.started_at, es.expires_at,
            es.device_fingerprint, es.total_score, es.questions_answered, es.submitted_at,
            s.id AS student_id, s.roll_number, s.full_name
     FROM exam_sessions es
     JOIN students s ON s.id = es.student_id
     WHERE es.session_token = $1`,
    [sessionToken]
  );
  return rows[0] ?? null;
}

export async function logIntegrityEvent(sessionId, eventType, metadata = {}) {
  await query(
    `INSERT INTO integrity_events (session_id, event_type, metadata)
     VALUES ($1, $2, $3)`,
    [sessionId, eventType, JSON.stringify(metadata)]
  );
}
