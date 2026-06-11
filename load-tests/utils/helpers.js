import http from 'k6/http';
import { check } from 'k6';

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export function login(username, password) {
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ userName: username, password: password }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(res, { 'login successful': (r) => r.status === 200 });

  if (res.status !== 200) {
    console.error(`Login failed: ${res.status} — ${res.body}`);
    return null;
  }

  // API returns the JWT token as a plain string, strip surrounding quotes if any
  return res.body.replace(/^"|"$/g, '').trim();
}

export function authHeaders(token) {
  return {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };
}
