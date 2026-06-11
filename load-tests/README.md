# Load Tests

Performance tests written with k6. Measures how the system behaves under different load levels.

## Setup

k6 must be installed:

```bash
# Windows (zip)
# Download k6-vX.X.X-windows-amd64.zip from https://github.com/grafana/k6/releases/latest
# Extract to C:\k6\, add to PATH
```

## Running

The API must be running (`docker compose up` or `dotnet run`).

```bash
# Smoke test — is the system up? (1 user, 20 seconds)
k6 run load-tests/smoke.js

# Load test — performance under normal load (up to 20 users, 2 minutes)
k6 run load-tests/load-test.js

# Stress test — find the breaking point (up to 100 users, 2.5 minutes)
k6 run load-tests/stress-test.js
```

To target a different API:

```bash
k6 run -e BASE_URL=https://your-api.com load-tests/smoke.js
```

## Tests

### smoke.js
1 virtual user, 20 seconds. Verifies the system is alive after deployment.

**Scenario:** Login → Table list → Product list → Kitchen orders

**Thresholds:**
- Error rate < 1%
- p(95) response time < 1 second

### load-test.js
Gradual ramp-up to 20 users, 2 minutes total. Tests performance under normal workload.

**Scenario:** Login → Table list → Create order → Add product → Close order

**Thresholds:**
- Error rate < 5%
- p(95) response time < 2 seconds

### stress-test.js
Gradual ramp-up to 100 users, 2.5 minutes total. Finds the breaking point of the system.

**Scenario:** Login → Table list → Product list → Kitchen orders (read-heavy)

**Thresholds:**
- Error rate < 10%
- p(95) response time < 5 seconds

## Reading Results

```
✓ 'p(95)<2000'  p(95)=1.46s   → threshold passed (good)
✗ 'p(95)<2000'  p(95)=2.95s   → threshold exceeded (bad)

http_req_duration: avg=479ms  p(90)=1.29s  p(95)=1.46s  max=8.48s
                   ^average   ^90% below   ^95% below   ^slowest request
```

**p(95)** — 95% of requests completed below this duration. Used instead of average because it is not skewed by outliers.

## Findings & Improvements

### Load Test — Order Close Added

**Problem:** First load test run resulted in p(95) = 2.95s, exceeding the 2s threshold.

**Cause:** 20 virtual users were creating orders simultaneously. Once the 7-8 available tables were occupied, new users could not find an available table and their iterations were cut short. This caused both unrealistic test coverage and artificial delays from table contention.

**Fix:** Added order close (`POST /api/order/close`) at the end of each iteration. The table becomes available again for the next user.

**Result:** p(95) dropped from 2.95s to 1.46s, threshold passed.

### Stress Test — Saturation Point

**Finding:** System reaches saturation at ~90 concurrent users.

**Details:**
- p(90) = 2.47s → first 90% of requests respond at normal speed
- p(95) = 37.25s → requests start queuing after the 90th user
- Error rate = 0% → system did not crash, it degraded gracefully

**Conclusion:** Graceful degradation under extreme load — the system slowed down but kept responding. 100 concurrent users is well above the realistic usage scenario for this project, so this result is acceptable.
