import { apiRequest } from './client.js';

export function loginStudent({ rollNumber, password }) {
  return apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ rollNumber, password }),
  });
}

export function fetchCurrentSession(accessToken) {
  return apiRequest('/api/auth/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
