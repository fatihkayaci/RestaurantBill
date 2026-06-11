import http from 'k6/http';
import { check, sleep } from 'k6';
import { login, authHeaders, BASE_URL } from './utils/helpers.js';

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '30s', target: 30 },
    { duration: '30s', target: 60 },
    { duration: '30s', target: 100 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.1'],
    http_req_duration: ['p(95)<5000'],
  },
};

export default function () {
  const token = login('admin', 'Admin123*');
  if (!token) return;

  const headers = authHeaders(token);
  const tablesRes = http.get(`${BASE_URL}/api/table`, headers);
  check(tablesRes, { 'tables: status 200': (r) => r.status === 200 });

  const productsRes = http.get(`${BASE_URL}/api/product`, headers);
  check(productsRes, { 'products: status 200': (r) => r.status === 200 });

  const kitchenRes = http.get(`${BASE_URL}/api/order/kitchen`, headers);
  check(kitchenRes, { 'kitchen: status 200': (r) => r.status === 200 });

  sleep(0.5);
}
