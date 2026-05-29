import { apiRequest } from './client.js';

export function getExamQuestions(token) {
  return apiRequest('/api/exam/questions', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function submitQuestionAnswer(token, questionId, answer) {
  return apiRequest('/api/exam/answer', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ questionId, answer }),
  });
}

export function recordStrike(token, eventType, metadata = {}) {
  return apiRequest('/api/exam/strike', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ eventType, metadata }),
  });
}

export function submitExam(token) {
  return apiRequest('/api/exam/submit', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}
