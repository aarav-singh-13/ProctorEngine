import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { fetchCurrentSession } from '../api/auth_API.js';
import { getExamQuestions, recordStrike, submitExam, submitQuestionAnswer } from '../api/exam_API.js';
import { usePeopleDetection } from '../hooks/use_people_detection.js';
import { useTabVisibility } from '../hooks/use_tab_visibility.js';
import { useWebcam } from '../hooks/use_webcam.js';
import { TOKEN_KEY } from './login_page.jsx';
import '../styles/exam.css';

export default function ExamPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState(location.state?.session ?? null);
  const [student, setStudent] = useState(location.state?.student ?? null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Exam state
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [strikeCount, setStrikeCount] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [examActive, setExamActive] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);

  // Proctoring state
  const [lastTabSwitch, setLastTabSwitch] = useState(null);
  const [noPeopleTimer, setNoPeopleTimer] = useState(0);

  // Refs for stable access in callbacks (avoids stale closures)
  const tokenRef = useRef(localStorage.getItem(TOKEN_KEY));
  const submittedRef = useRef(false);
  const examActiveRef = useRef(true);
  const noPeopleCountRef = useRef(0);
  const multiplePeopleCountRef = useRef(0);

  // Webcam — use the hook's own videoRef and start/stop methods
  const { videoRef, ready: webcamReady, error: webcamError, start: startWebcam, stop: stopWebcam } = useWebcam();

  // People detection
  const { peopleCount, detectionTick, startDetection, stopDetection } = usePeopleDetection(videoRef, 2000);

  // ---- Submit handler ----
  const doSubmit = useCallback(async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    examActiveRef.current = false;
    setExamActive(false);
    setSubmitted(true);

    try {
      const token = tokenRef.current;
      const submitResult = await submitExam(token);
      setResult(submitResult.result);
    } catch (err) {
      console.error('Error submitting exam:', err);
      setError(err.message);
    } finally {
      stopWebcam();
      stopDetection();
    }
  }, [stopWebcam, stopDetection]);

  // ---- Strike handler ----
  const handleStrike = useCallback(async (eventType, metadata = {}) => {
    if (submittedRef.current || !examActiveRef.current) return;
    try {
      const token = tokenRef.current;
      const res = await recordStrike(token, eventType, metadata);
      setStrikeCount(res.strikeCount);

      if (res.autoSubmitted) {
        submittedRef.current = true;
        examActiveRef.current = false;
        setExamActive(false);
        setSubmitted(true);
        setResult({
          score: res.score,
          totalQuestions: res.totalQuestions,
          correctAnswers: res.correctAnswers,
          questionsAnswered: res.questionsAnswered,
        });
        stopWebcam();
        stopDetection();
      }
    } catch (err) {
      console.error('Error recording strike:', err);
    }
  }, [stopWebcam, stopDetection]);

  // ---- Tab visibility (single callback, debounced inside hook) ----
  const onTabSwitch = useCallback(() => {
    if (submittedRef.current || !examActiveRef.current) return;
    setLastTabSwitch(new Date());
    handleStrike('tab_switch', { timestamp: new Date().toISOString() });
  }, [handleStrike]);

  useTabVisibility(onTabSwitch);

  // ---- Start webcam on mount ----
  useEffect(() => {
    startWebcam();
  }, [startWebcam]);

  // ---- Start people detection when webcam is ready ----
  useEffect(() => {
    if (webcamReady) {
      startDetection();
    }
  }, [webcamReady, startDetection]);

  // ---- Monitor people count for strikes ----
  useEffect(() => {
    if (!examActiveRef.current || submittedRef.current || loading) return;

    if (peopleCount === 0) {
      noPeopleCountRef.current += 1;
      setNoPeopleTimer(noPeopleCountRef.current);
      multiplePeopleCountRef.current = 0;

      // Strike after 5 consecutive detections of 0 people (5 × 2s = 10s)
      if (noPeopleCountRef.current >= 5) {
        handleStrike('people_missing', {
          duration: noPeopleCountRef.current * 2,
          timestamp: new Date().toISOString(),
        });
        noPeopleCountRef.current = 0;
        setNoPeopleTimer(0);
      }
    } else if (peopleCount >= 2) {
      noPeopleCountRef.current = 0;
      setNoPeopleTimer(0);
      multiplePeopleCountRef.current += 1;

      // Strike after 5 consecutive detections of 2+ people (5 × 2s = 10s)
      if (multiplePeopleCountRef.current >= 5) {
        handleStrike('multiple_people', {
          count: peopleCount,
          timestamp: new Date().toISOString(),
        });
        multiplePeopleCountRef.current = 0;
      }
    } else {
      // Exactly 1 person — all good, reset counters
      noPeopleCountRef.current = 0;
      multiplePeopleCountRef.current = 0;
      setNoPeopleTimer(0);
    }
  }, [peopleCount, detectionTick, handleStrike, loading]);

  // ---- Initialize exam ----
  useEffect(() => {
    const initExam = async () => {
      try {
        // Reset refs for fresh session
        submittedRef.current = false;
        examActiveRef.current = true;
        noPeopleCountRef.current = 0;
        multiplePeopleCountRef.current = 0;
        // Always read fresh token from localStorage (not stale ref)
        const token = localStorage.getItem(TOKEN_KEY);
        tokenRef.current = token;
        if (!token) {
          navigate('/', { replace: true });
          return;
        }

        const sessionData = await fetchCurrentSession(token);
        setSession(sessionData.session);
        setStudent(sessionData.student);
        setStrikeCount(sessionData.session.strikeCount || 0);

        // If already submitted, show results
        if (
          sessionData.session.status === 'submitted' ||
          sessionData.session.status === 'auto_submitted'
        ) {
          setSubmitted(true);
          submittedRef.current = true;
          setExamActive(false);
          examActiveRef.current = false;
          setResult({
            score: sessionData.session.totalScore,
            totalQuestions: 10,
            correctAnswers: 0,
            questionsAnswered: sessionData.session.questionsAnswered,
          });
          setLoading(false);
          return;
        }

        // Calculate time remaining from server's expiresAt
        const expiresAt = new Date(sessionData.session.expiresAt);
        const now = new Date();
        const remainingSec = Math.max(0, Math.floor((expiresAt - now) / 1000));
        setTimeRemaining(remainingSec);

        if (remainingSec <= 0) {
          await doSubmit();
          setLoading(false);
          return;
        }

        const examData = await getExamQuestions(token);
        setQuestions(examData.questions);
      } catch (err) {
        setError(err.message);
        if (err.status === 401 || err.status === 403) {
          localStorage.removeItem(TOKEN_KEY);
          navigate('/', { replace: true });
        }
      } finally {
        setLoading(false);
      }
    };

    initExam();
  }, [navigate, doSubmit]);

  // ---- Timer effect (synced with server expiresAt) ----
  useEffect(() => {
    // Only run timer when exam is active, not loading, and we have a time value
    if (!examActive || loading || timeRemaining === null) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          doSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examActive, loading, timeRemaining === null]);

  // ---- Answer handler ----
  const handleAnswerQuestion = async (answer) => {
    const q = questions[currentQuestionIdx];
    setAnswers((prev) => ({ ...prev, [q.id]: answer }));

    try {
      await submitQuestionAnswer(tokenRef.current, q.id, answer);
    } catch (err) {
      console.error('Error submitting answer:', err);
    }
  };

  // ---- Manual submit with confirmation ----
  const handleManualSubmit = () => {
    const answeredCount = Object.keys(answers).length;
    const totalCount = questions.length;
    const confirmMsg =
      answeredCount < totalCount
        ? `You have answered ${answeredCount} out of ${totalCount} questions. Are you sure you want to submit?`
        : 'Are you sure you want to submit your exam?';
    if (window.confirm(confirmMsg)) {
      doSubmit();
    }
  };

  const formatTime = (seconds) => {
    if (seconds === null) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // ---- Render states ----

  if (loading) {
    return (
      <div className="exam-container">
        <div className="exam-card">Loading exam…</div>
      </div>
    );
  }

  if (error && !submitted) {
    return (
      <div className="exam-container">
        <div className="exam-card">
          <div className="exam-alert exam-alert-error">{error}</div>
          <Link to="/">Back to login</Link>
        </div>
      </div>
    );
  }

  if (submitted && result) {
    return (
      <div className="exam-container">
        <div className="exam-card">
          <h1>Exam Submitted</h1>
          <div className="exam-result">
            <p>
              <strong>{student?.fullName}</strong> ({student?.rollNumber})
            </p>
            <div className="result-grid">
              <div>
                <strong>Total Questions</strong>
                <p>{result.totalQuestions}</p>
              </div>
              <div>
                <strong>Correct Answers</strong>
                <p>{result.correctAnswers}</p>
              </div>
              <div>
                <strong>Score</strong>
                <p>{result.score}%</p>
              </div>
            </div>
            {strikeCount > 0 && (
              <div className="exam-alert exam-alert-warning">
                Strikes recorded: {strikeCount}/3
                {strikeCount >= 3 && ' — Auto-submitted due to violations'}
              </div>
            )}
          </div>
          <Link to="/" onClick={() => localStorage.removeItem(TOKEN_KEY)}>
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="exam-container">
        <div className="exam-card">No questions available</div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIdx];
  const currentAnswer = answers[currentQuestion.id];

  return (
    <div className="exam-container">
      {/* Proctoring panel */}
      <div className="proctoring-panel">
        <div className="proctoring-header">
          <h3>Live Proctoring</h3>
        </div>

        <div className="webcam-container">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width: '100%', borderRadius: '8px' }}
          />
          {webcamError && (
            <div className="exam-alert exam-alert-error">Camera error: {webcamError}</div>
          )}
          <div
            className={`people-indicator ${
              peopleCount === 1 ? 'active' : peopleCount === 0 ? 'warning' : 'error'
            }`}
          >
            {peopleCount === 0
              ? '⚠️ No face'
              : peopleCount === 1
              ? '✓ Face OK'
              : `❌ ${peopleCount} people`}
          </div>
        </div>

        <div className="proctoring-status">
          <div className="status-item">
            <span>Time Left</span>
            <strong className={timeRemaining !== null && timeRemaining < 60 ? 'error' : ''}>
              {formatTime(timeRemaining)}
            </strong>
          </div>
          <div className="status-item">
            <span>Strikes</span>
            <strong
              className={strikeCount >= 3 ? 'error' : strikeCount >= 2 ? 'warning' : ''}
            >
              {strikeCount} / 3
            </strong>
          </div>
          <div className="status-item">
            <span>Question</span>
            <strong>
              {currentQuestionIdx + 1} / {questions.length}
            </strong>
          </div>
        </div>

        {lastTabSwitch && (
          <div className="exam-alert exam-alert-warning">
            ⚠️ Tab switch detected at {lastTabSwitch.toLocaleTimeString()}
          </div>
        )}

        {noPeopleTimer > 0 && (
          <div className="exam-alert exam-alert-warning">
            ⚠️ No face detected for {noPeopleTimer * 2}s
          </div>
        )}
      </div>

      {/* Exam content */}
      <div className="exam-content">
        <div className="exam-header">
          <h2>{student?.fullName}</h2>
          <p>{student?.rollNumber}</p>
        </div>

        <div className="exam-question">
          <div className="question-number">
            Question {currentQuestionIdx + 1} of {questions.length}
          </div>
          <h3>{currentQuestion.question_text}</h3>

          <div className="options">
            {['A', 'B', 'C', 'D'].map((letter) => (
              <label key={letter} className="option">
                <input
                  type="radio"
                  name={`answer-${currentQuestion.id}`}
                  value={letter}
                  checked={currentAnswer === letter}
                  onChange={() => handleAnswerQuestion(letter)}
                  disabled={!examActive}
                />
                <span className="option-letter">{letter}</span>
                <span className="option-text">
                  {currentQuestion[`option_${letter.toLowerCase()}`]}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="exam-navigation">
          <button
            onClick={() => setCurrentQuestionIdx((i) => Math.max(0, i - 1))}
            disabled={currentQuestionIdx === 0 || !examActive}
            className="btn btn-secondary"
          >
            Previous
          </button>

          <div className="question-progress">
            {questions.map((q, idx) => (
              <button
                key={idx}
                className={`progress-dot ${
                  idx === currentQuestionIdx ? 'active' : answers[q.id] ? 'answered' : ''
                }`}
                onClick={() => setCurrentQuestionIdx(idx)}
                disabled={!examActive}
              />
            ))}
          </div>

          {currentQuestionIdx < questions.length - 1 ? (
            <button
              onClick={() => setCurrentQuestionIdx((i) => Math.min(questions.length - 1, i + 1))}
              disabled={!examActive}
              className="btn btn-primary"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleManualSubmit}
              disabled={!examActive || strikeCount >= 3}
              className="btn btn-success"
            >
              Submit Exam
            </button>
          )}
        </div>

        {strikeCount >= 3 && (
          <div className="exam-alert exam-alert-error">
            Maximum strikes reached. Exam has been auto-submitted.
          </div>
        )}
      </div>
    </div>
  );
}
