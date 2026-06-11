import http from 'k6/http';
import { check, sleep } from 'k6';
import { login, authHeaders, BASE_URL } from './utils/helpers.js';

export const options = {
  vus: 1,
  duration: '20s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000'],
  },
};

export default function () {
  const token = login('admin', 'Admin123*');
  if (!token) return;

  const headers = authHeaders(token);

  const tablesRes = http.get(`${BASE_URL}/api/table`, headers);
  check(tablesRes, {
    'tables: status 200': (r) => r.status === 200,
    'tables: response < 1s': (r) => r.timings.duration < 1000,
  });

  const productsRes = http.get(`${BASE_URL}/api/product`, headers);
  check(productsRes, {
    'products: status 200': (r) => r.status === 200,
    'products: response < 1s': (r) => r.timings.duration < 1000,
  });

  const kitchenRes = http.get(`${BASE_URL}/api/order/kitchen`, headers);
  check(kitchenRes, {
    'kitchen: status 200': (r) => r.status === 200,
  });

  sleep(1);
}
