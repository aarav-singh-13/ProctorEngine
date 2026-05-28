import { query } from '../config/db.js';

// ---- Seeded PRNG (mulberry32) for deterministic shuffling ----

function hashStringToSeed(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle(array, rng) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ---- Get the option shuffle mapping for a specific question ----
// Returns { shuffledLetter -> originalLetter } mapping

function getOptionMapping(sessionToken, questionId, question) {
  // Create a unique seed for this question within this session
  const seed = hashStringToSeed(`${sessionToken}-q${questionId}`);
  const rng = mulberry32(seed);

  const originalOptions = [
    { letter: 'A', text: question.option_a },
    { letter: 'B', text: question.option_b },
    { letter: 'C', text: question.option_c },
    { letter: 'D', text: question.option_d },
  ];

  const shuffled = seededShuffle(originalOptions, rng);

  // mapping: shuffledPosition -> originalLetter
  const mapping = {};
  shuffled.forEach((opt, idx) => {
    const newLetter = String.fromCharCode(65 + idx); // A, B, C, D
    mapping[newLetter] = opt.letter;
  });

  return { shuffled, mapping };
}

/**
 * Get shuffled exam questions for a session.
 * Uses sessionToken as seed for deterministic shuffling.
 * DOES NOT return correct_answer.
 */
export async function getExamQuestions(sessionToken) {
  const { rows } = await query(`SELECT * FROM questions ORDER BY id`);

  if (rows.length === 0) {
    throw new Error('No questions available');
  }

  // Shuffle question ORDER using session-based seed
  const questionSeed = hashStringToSeed(sessionToken);
  const questionRng = mulberry32(questionSeed);
  const shuffledQuestions = seededShuffle(rows, questionRng);

  // Shuffle OPTIONS for each question (also deterministic per session+question)
  return shuffledQuestions.map((q) => {
    const { shuffled } = getOptionMapping(sessionToken, q.id, q);

    return {
      id: q.id,
      question_text: q.question_text,
      option_a: shuffled[0].text,
      option_b: shuffled[1].text,
      option_c: shuffled[2].text,
      option_d: shuffled[3].text,
      // NOTE: correct_answer is intentionally NOT included
    };
  });
}

/**
 * Record a student's answer for a question.
 * Reverse-maps the shuffled answer back to original before checking correctness.
 * Uses UPSERT to prevent duplicate answers.
 */
export async function recordQuestionResponse(sessionId, sessionToken, questionId, studentAnswer) {
  // Get the question from DB
  const { rows: qRows } = await query(
    `SELECT * FROM questions WHERE id = $1`,
    [questionId]
  );

  if (qRows.length === 0) {
    throw new Error('Question not found');
  }

  const question = qRows[0];

  // Get the option mapping for this session+question to reverse-map the answer
  const { mapping } = getOptionMapping(sessionToken, questionId, question);

  // mapping: shuffledLetter -> originalLetter
  // Student answered in shuffled space, we need to map back to original
  const originalLetter = mapping[studentAnswer];

  if (!originalLetter) {
    throw new Error('Invalid answer option');
  }

  const isCorrect = originalLetter === question.correct_answer;

  // UPSERT: insert or update if student changes their answer
  await query(
    `INSERT INTO question_responses (session_id, question_id, student_answer, is_correct, answered_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (session_id, question_id)
     DO UPDATE SET student_answer = $3, is_correct = $4, answered_at = NOW()`,
    [sessionId, questionId, studentAnswer, isCorrect]
  );

  return { recorded: true };
}

/**
 * Submit exam and calculate final score.
 * Score = (correct / totalQuestions) * 100
 */
export async function submitExam(sessionId) {
  // Count total questions
  const { rows: totalRows } = await query(`SELECT COUNT(*) as count FROM questions`);
  const totalQuestions = parseInt(totalRows[0].count || 0);

  // Count answered and correct
  const { rows } = await query(
    `SELECT COUNT(*) as total, SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) as correct
     FROM question_responses
     WHERE session_id = $1`,
    [sessionId]
  );

  const questionsAnswered = parseInt(rows[0].total || 0);
  const correctAnswers = parseInt(rows[0].correct || 0);
  const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

  // Update session
  await query(
    `UPDATE exam_sessions
     SET status = 'submitted', submitted_at = NOW(), total_score = $1, questions_answered = $2
     WHERE id = $3 AND status = 'active'`,
    [score, questionsAnswered, sessionId]
  );

  return { score, totalQuestions, correctAnswers, questionsAnswered };
}

/**
 * Add a strike to a session.
 * At 3 strikes: auto-submit with score calculation.
 */
export async function addStrike(sessionId, eventType, metadata = {}) {
  // Increment strike count
  const { rows } = await query(
    `UPDATE exam_sessions
     SET strike_count = strike_count + 1
     WHERE id = $1 AND status = 'active'
     RETURNING strike_count, status`,
    [sessionId]
  );

  if (rows.length === 0) {
    throw new Error('Session not found or not active');
  }

  const strikeCount = rows[0].strike_count;

  // Log the integrity event
  await query(
    `INSERT INTO integrity_events (session_id, event_type, metadata)
     VALUES ($1, $2, $3)`,
    [sessionId, eventType, JSON.stringify(metadata)]
  );

  // Auto-submit if 3 strikes reached
  if (strikeCount >= 3) {
    // Calculate score first
    const scoreResult = await submitExam(sessionId);

    // Override status to auto_submitted
    await query(
      `UPDATE exam_sessions SET status = 'auto_submitted' WHERE id = $1`,
      [sessionId]
    );

    return {
      strikeCount,
      autoSubmitted: true,
      ...scoreResult,
    };
  }

  return { strikeCount, autoSubmitted: false };
}
