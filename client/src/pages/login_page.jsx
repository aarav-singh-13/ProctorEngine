import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginStudent } from '../api/auth_API.js';

export const TOKEN_KEY = 'exam_access_token';

export default function LoginPage() {
  const navigate = useNavigate();
  const [rollNumber, setRollNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await loginStudent({
        rollNumber: rollNumber.trim().toUpperCase(),
        password,
      });
      localStorage.setItem(TOKEN_KEY, result.accessToken);
      navigate('/exam', {
        state: { session: result.session, student: result.student },
      });
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <div className="card">
        <h1>Online Exam — Login</h1>
        <p className="subtitle">Enter your roll number and password to start the exam.</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="rollNumber">Roll Number</label>
            <input
              id="rollNumber"
              type="text"
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value.toUpperCase())}
              placeholder="e.g. CSE001"
              required
              disabled={loading}
              autoComplete="off"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              disabled={loading}
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Logging in…' : 'Start Exam'}
          </button>
        </form>
      </div>
    </div>
  );
}
