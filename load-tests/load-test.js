import http from 'k6/http';
import { check, sleep } from 'k6';
import { login, authHeaders, BASE_URL } from './utils/helpers.js';

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m',  target: 20 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<2000'],
  },
};

export default function () {
  const token = login('admin', 'Admin123*');
  if (!token) return;

  const headers = authHeaders(token);

  const tablesRes = http.get(`${BASE_URL}/api/table`, headers);
  check(tablesRes, { 'tables: status 200': (r) => r.status === 200 });

  const tables = JSON.parse(tablesRes.body);
  if (!tables || tables.length === 0) return;

  const availableTable = tables.find((t) => t.status === 0);
  if (!availableTable) return;

  const createOrderRes = http.post(
    `${BASE_URL}/api/order`,
    JSON.stringify({ tableId: availableTable.id }),
    headers
  );
  check(createOrderRes, { 'create order: status 201': (r) => r.status === 201 });

  const order = JSON.parse(createOrderRes.body);
  if (!order || !order.id) return;

  const productsRes = http.get(`${BASE_URL}/api/product`, headers);
  check(productsRes, { 'products: status 200': (r) => r.status === 200 });

  const products = JSON.parse(productsRes.body);
  if (!products || products.length === 0) return;

  const addProductRes = http.post(
    `${BASE_URL}/api/order/add-product`,
    JSON.stringify({
      orderId: order.id,
      productId: products[0].id,
      quantity: 2,
    }),
    headers
  );
  check(addProductRes, { 'add product: status 200': (r) => r.status === 200 });

  // Close the order so the table becomes available again for the next iteration
  const closeOrderRes = http.post(
    `${BASE_URL}/api/order/close`,
    JSON.stringify({ OrderId: order.id }),
    headers
  );
  check(closeOrderRes, { 'close order: status 200': (r) => r.status === 200 });

  sleep(1);
}
