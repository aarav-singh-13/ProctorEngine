-- Students table
CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY,
  roll_number VARCHAR(20) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exam sessions table
CREATE TABLE IF NOT EXISTS exam_sessions (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'submitted', 'auto_submitted', 'expired')),
  strike_count INTEGER DEFAULT 0,
  device_fingerprint VARCHAR(255),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  questions_answered INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Integrity events table (audit log)
CREATE TABLE IF NOT EXISTS integrity_events (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Questions table
CREATE TABLE IF NOT EXISTS questions (
  id SERIAL PRIMARY KEY,
  question_text TEXT NOT NULL UNIQUE,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer CHAR(1) NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Question responses table (tracks what each student answered)
CREATE TABLE IF NOT EXISTS question_responses (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  student_answer CHAR(1) CHECK (student_answer IN ('A', 'B', 'C', 'D')),
  is_correct BOOLEAN,
  answered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, question_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_exam_sessions_student_id ON exam_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_session_token ON exam_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_status ON exam_sessions(status);
CREATE INDEX IF NOT EXISTS idx_integrity_events_session_id ON integrity_events(session_id);
CREATE INDEX IF NOT EXISTS idx_question_responses_session_id ON question_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_question_responses_question_id ON question_responses(question_id);
