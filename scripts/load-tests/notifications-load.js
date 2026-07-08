import http from 'k6/http';
import { check, fail, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const API_BASE_URL = (__ENV.API_BASE_URL || 'http://localhost:3000').replace(
  /\/$/,
  '',
);
const NOTIFICATIONS_BASE_URL = (
  __ENV.NOTIFICATIONS_BASE_URL || 'http://localhost:3001'
).replace(/\/$/, '');
const LOAD_EMAIL_PREFIX = __ENV.LOAD_EMAIL_PREFIX || 'load-s03-19';
const LOAD_PASSWORD = __ENV.LOAD_PASSWORD || 'load-test-password';
const STATION_NAME = __ENV.LOAD_STATION_NAME || 'Notifications Load Station';
const RESULT_PREFIX =
  __ENV.LOAD_NOTIFICATIONS_RESULT_PREFIX ||
  'docs/load-tests/notifications-latest';
const NOTIFICATION_SETTLE_SLEEP = Number(
  __ENV.LOAD_NOTIFICATION_SETTLE_SLEEP || '0.2',
);

const errorRate = new Rate('notifications_load_errors');

export const options = {
  scenarios: {
    sustained_ramp: {
      executor: 'ramping-vus',
      exec: 'notificationFlow',
      startVUs: 0,
      stages: [
        {
          duration: __ENV.LOAD_RAMP_UP || '1m',
          target: Number(__ENV.LOAD_RAMP_VUS || '8'),
        },
        {
          duration: __ENV.LOAD_STEADY_DURATION || '3m',
          target: Number(__ENV.LOAD_RAMP_VUS || '8'),
        },
        { duration: __ENV.LOAD_RAMP_DOWN || '30s', target: 0 },
      ],
      gracefulRampDown: '30s',
      tags: { load_scenario: 'sustained_ramp' },
    },
    spike: {
      executor: 'ramping-vus',
      exec: 'notificationFlow',
      startVUs: 0,
      stages: [
        {
          duration: __ENV.LOAD_SPIKE_RAMP_UP || '20s',
          target: Number(__ENV.LOAD_SPIKE_VUS || '24'),
        },
        {
          duration: __ENV.LOAD_SPIKE_HOLD || '40s',
          target: Number(__ENV.LOAD_SPIKE_VUS || '24'),
        },
        { duration: __ENV.LOAD_SPIKE_RAMP_DOWN || '20s', target: 0 },
      ],
      gracefulRampDown: '20s',
      tags: { load_scenario: 'spike' },
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.03'],
    notifications_load_errors: ['rate<0.03'],
    http_req_duration: ['p(95)<900'],
    'http_req_duration{endpoint:alert_measurement}': ['p(95)<800'],
    'http_req_duration{endpoint:notifications_list}': ['p(95)<650'],
    'http_req_duration{endpoint:notification_mark_read}': ['p(95)<650'],
    'http_req_duration{endpoint:notifications_read_all}': ['p(95)<650'],
    'http_req_duration{endpoint:notification_profile}': ['p(95)<650'],
    http_reqs: ['rate>8'],
  },
};

export function setup() {
  const runId = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const email = `${LOAD_EMAIL_PREFIX}-${runId}@weatherflow.local`;
  const token = registerUser(email);
  const user = getCurrentUser(token);
  const station = createStation(token);

  subscribeToExtremeHeat(user.id, station.id);

  return {
    token,
    userId: user.id,
    stationId: station.id,
    apiBaseUrl: API_BASE_URL,
    notificationsBaseUrl: NOTIFICATIONS_BASE_URL,
  };
}

export function notificationFlow(data) {
  createExtremeHeatMeasurement(data);
  sleep(NOTIFICATION_SETTLE_SLEEP);

  const page = listNotifications(data);
  const notificationId = firstNotificationId(page);

  if (notificationId) {
    markNotificationRead(data, notificationId);
  }

  markAllNotificationsRead(data);
  getNotificationProfile(data);
  sleep(1);
}

function registerUser(email) {
  const response = http.post(
    `${API_BASE_URL}/auth/register`,
    JSON.stringify({
      name: 'Load',
      lastName: 'Notifications',
      email,
      password: LOAD_PASSWORD,
    }),
    {
      headers: jsonHeaders(),
      tags: { endpoint: 'auth_register' },
    },
  );

  assertResponse(response, 'registered notifications load-test user', (res) => {
    return res.status === 201 && Boolean(res.json('access_token'));
  });

  return response.json('access_token');
}

function getCurrentUser(token) {
  const response = http.get(`${API_BASE_URL}/users/me`, {
    headers: authHeaders(token),
    tags: { endpoint: 'current_user' },
  });

  assertResponse(response, 'loaded current user', (res) => {
    return res.status === 200 && Boolean(res.json('id'));
  });

  return response.json();
}

function createStation(token) {
  const response = http.post(
    `${API_BASE_URL}/weather-stations`,
    JSON.stringify({
      name: `${STATION_NAME} ${Date.now()}`,
      location: { latitude: -34.706, longitude: -58.277 },
      sensorModel: 'k6 notifications synthetic station',
      provider: 'openweather',
    }),
    {
      headers: authHeaders(token),
      tags: { endpoint: 'dataset_station' },
    },
  );

  assertResponse(response, 'created notifications load-test station', (res) => {
    return res.status === 201 && Boolean(res.json('id'));
  });

  return response.json();
}

function subscribeToExtremeHeat(userId, stationId) {
  const response = http.post(
    `${NOTIFICATIONS_BASE_URL}/notification-preferences/users/${encodeURIComponent(userId)}/subscriptions/${encodeURIComponent(stationId)}`,
    JSON.stringify({ alertTypes: ['EXTREME_HEAT'] }),
    {
      headers: jsonHeaders(),
      tags: { endpoint: 'notification_subscription' },
    },
  );

  assertResponse(response, 'subscribed user to extreme heat alerts', (res) => {
    return (
      (res.status === 200 || res.status === 201) && Boolean(res.json('userId'))
    );
  });
}

function createExtremeHeatMeasurement(data) {
  const response = http.post(
    `${API_BASE_URL}/measurements`,
    JSON.stringify({
      stationId: data.stationId,
      temperature: 42 + (__ITER % 5),
      humidity: 45 + (__ITER % 20),
      pressure: 1000 + (__ITER % 12),
      reportedAt: uniqueReportedAt(),
    }),
    {
      headers: authHeaders(data.token),
      tags: { endpoint: 'alert_measurement' },
    },
  );

  recordCheck(response, 'created extreme heat measurement', (res) => {
    return res.status === 201;
  });
}

function listNotifications(data) {
  const response = http.get(`${NOTIFICATIONS_BASE_URL}/notifications?limit=20`, {
    headers: authHeaders(data.token),
    tags: { endpoint: 'notifications_list' },
  });

  const ok = recordCheck(response, 'listed user notifications', (res) => {
    return res.status === 200 && Array.isArray(res.json('items'));
  });

  return ok ? response.json() : { items: [] };
}

function markNotificationRead(data, notificationId) {
  const response = http.patch(
    `${NOTIFICATIONS_BASE_URL}/notifications/${encodeURIComponent(notificationId)}/read`,
    null,
    {
      headers: authHeaders(data.token),
      tags: { endpoint: 'notification_mark_read' },
    },
  );

  recordCheck(response, 'marked one notification as read', (res) => {
    return res.status === 204 || res.status === 404;
  });
}

function markAllNotificationsRead(data) {
  const response = http.patch(
    `${NOTIFICATIONS_BASE_URL}/notifications/read-all`,
    null,
    {
      headers: authHeaders(data.token),
      tags: { endpoint: 'notifications_read_all' },
    },
  );

  recordCheck(response, 'marked all notifications as read', (res) => {
    return res.status === 204;
  });
}

function getNotificationProfile(data) {
  const response = http.get(
    `${NOTIFICATIONS_BASE_URL}/notification-preferences/users/${encodeURIComponent(data.userId)}`,
    {
      tags: { endpoint: 'notification_profile' },
    },
  );

  recordCheck(response, 'loaded notification profile', (res) => {
    return res.status === 200 && res.json('userId') === data.userId;
  });
}

function firstNotificationId(page) {
  const items = Array.isArray(page.items) ? page.items : [];
  const firstUnread = items.find((item) => item.readAt === null);
  return (firstUnread && firstUnread.id) || (items[0] && items[0].id);
}

function uniqueReportedAt() {
  const offsetMs = (__VU * 1000000 + __ITER) * 1000;
  return new Date(Date.now() + offsetMs).toISOString();
}

function assertResponse(response, label, predicate) {
  const ok = recordCheck(response, label, predicate);

  if (!ok) {
    fail(`${label}: ${response.status} ${response.body}`);
  }
}

function recordCheck(response, label, predicate) {
  const ok = check(response, { [label]: predicate });
  errorRate.add(!ok);
  return ok;
}

function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

function jsonHeaders() {
  return {
    'Content-Type': 'application/json',
  };
}

export function handleSummary(data) {
  return {
    [`${RESULT_PREFIX}-summary.json`]: JSON.stringify(data, null, 2),
    [`${RESULT_PREFIX}-report.html`]: renderHtmlSummary(data),
    stdout: textSummary(data),
  };
}

function textSummary(data) {
  const checks = metricValue(data, 'checks', 'rate', 0);
  const p95 = metricValue(data, 'http_req_duration', 'p(95)', 0);
  const throughput = metricValue(data, 'http_reqs', 'rate', 0);

  return [
    '',
    'WeatherFlow notifications load summary',
    `API base URL: ${API_BASE_URL}`,
    `Notifications base URL: ${NOTIFICATIONS_BASE_URL}`,
    `Checks: ${(checks * 100).toFixed(2)}%`,
    `HTTP p95: ${p95.toFixed(2)} ms`,
    `Throughput: ${throughput.toFixed(2)} req/s`,
    `Artifacts: ${RESULT_PREFIX}-summary.json, ${RESULT_PREFIX}-report.html`,
    '',
  ].join('\n');
}

function renderHtmlSummary(data) {
  const rows = [
    metricRow('Checks', metricValue(data, 'checks', 'rate'), 'percent'),
    metricRow(
      'HTTP failed',
      metricValue(data, 'http_req_failed', 'rate'),
      'percent',
    ),
    metricRow('HTTP p95', metricValue(data, 'http_req_duration', 'p(95)'), 'ms'),
    metricRow('HTTP req/s', metricValue(data, 'http_reqs', 'rate'), 'rate'),
    metricRow(
      'Load errors',
      metricValue(data, 'notifications_load_errors', 'rate'),
      'percent',
    ),
  ].join('\n');

  const endpointRows = Object.entries(data.metrics)
    .filter(([name]) => name.startsWith('http_req_duration{endpoint:'))
    .map(([name, metric]) => {
      const match = name.match(/endpoint:([^}]+)/);
      const endpoint = match ? match[1] : name;
      const value = metric && metric.values ? metric.values['p(95)'] : undefined;
      return metricRow(endpoint, value, 'ms');
    })
    .join('\n');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>WeatherFlow S-03.19 Notifications Load Test</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 2rem; color: #1f2937; }
      table { border-collapse: collapse; margin: 1rem 0; min-width: 32rem; }
      th, td { border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; text-align: left; }
      th { background: #f3f4f6; }
      code { background: #f3f4f6; padding: 0.1rem 0.25rem; }
    </style>
  </head>
  <body>
    <h1>WeatherFlow S-03.19 Notifications Load Test</h1>
    <p>Generated by <code>npm run test:load:notifications</code>.</p>
    <p><strong>API:</strong> ${escapeHtml(API_BASE_URL)}<br />
    <strong>Notifications:</strong> ${escapeHtml(NOTIFICATIONS_BASE_URL)}</p>
    <h2>Global metrics</h2>
    <table>
      <tr><th>Metric</th><th>Value</th></tr>
      ${rows}
    </table>
    <h2>Endpoint p95</h2>
    <table>
      <tr><th>Endpoint</th><th>p95</th></tr>
      ${endpointRows}
    </table>
  </body>
</html>`;
}

function metricRow(name, value, unit) {
  return `<tr><td>${escapeHtml(name)}</td><td>${formatMetric(value, unit)}</td></tr>`;
}

function formatMetric(value, unit) {
  if (typeof value !== 'number') {
    return 'n/a';
  }

  if (unit === 'percent') {
    return `${(value * 100).toFixed(2)}%`;
  }

  if (unit === 'ms') {
    return `${value.toFixed(2)} ms`;
  }

  return value.toFixed(2);
}

function metricValue(data, metricName, valueName, fallback) {
  const metric = data.metrics[metricName];

  if (!metric || !metric.values || typeof metric.values[valueName] !== 'number') {
    return fallback;
  }

  return metric.values[valueName];
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
