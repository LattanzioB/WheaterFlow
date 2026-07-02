import http from 'k6/http';
import { check, fail, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const API_BASE_URL = (__ENV.API_BASE_URL || 'http://localhost:3000').replace(
  /\/$/,
  '',
);
const LOAD_EMAIL_PREFIX = __ENV.LOAD_EMAIL_PREFIX || 'load-s03-13';
const LOAD_PASSWORD = __ENV.LOAD_PASSWORD || 'load-test-password';
const DATASET_SIZE = Number(__ENV.LOAD_DATASET_SIZE || '72');
const STATION_NAME = __ENV.LOAD_STATION_NAME || 'Load Test OpenWeather Station';

const errorRate = new Rate('weatherflow_load_errors');

export const options = {
  scenarios: {
    sustained_ramp: {
      executor: 'ramping-vus',
      exec: 'sustainedRamp',
      startVUs: 0,
      stages: [
        {
          duration: __ENV.LOAD_RAMP_UP || '1m',
          target: Number(__ENV.LOAD_RAMP_VUS || '10'),
        },
        {
          duration: __ENV.LOAD_STEADY_DURATION || '3m',
          target: Number(__ENV.LOAD_RAMP_VUS || '10'),
        },
        { duration: __ENV.LOAD_RAMP_DOWN || '30s', target: 0 },
      ],
      gracefulRampDown: '30s',
      tags: { load_scenario: 'sustained_ramp' },
    },
    spike: {
      executor: 'ramping-vus',
      exec: 'spike',
      startVUs: 0,
      stages: [
        {
          duration: __ENV.LOAD_SPIKE_RAMP_UP || '20s',
          target: Number(__ENV.LOAD_SPIKE_VUS || '40'),
        },
        {
          duration: __ENV.LOAD_SPIKE_HOLD || '40s',
          target: Number(__ENV.LOAD_SPIKE_VUS || '40'),
        },
        { duration: __ENV.LOAD_SPIKE_RAMP_DOWN || '20s', target: 0 },
      ],
      gracefulRampDown: '20s',
      tags: { load_scenario: 'spike' },
    },
    long_run: {
      executor: 'ramping-vus',
      exec: 'longRun',
      startVUs: 0,
      stages: [
        {
          duration: __ENV.LOAD_LONG_RAMP_UP || '2m',
          target: Number(__ENV.LOAD_LONG_VUS || '8'),
        },
        {
          duration: __ENV.LOAD_LONG_DURATION || '10m',
          target: Number(__ENV.LOAD_LONG_VUS || '8'),
        },
        { duration: __ENV.LOAD_LONG_RAMP_DOWN || '1m', target: 0 },
      ],
      gracefulRampDown: '1m',
      tags: { load_scenario: 'long_run' },
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],
    weatherflow_load_errors: ['rate<0.02'],
    http_req_duration: ['p(95)<750'],
    'http_req_duration{endpoint:measurements_search}': ['p(95)<650'],
    'http_req_duration{endpoint:current_temperature}': ['p(95)<900'],
    'http_req_duration{endpoint:daily_average}': ['p(95)<700'],
    'http_req_duration{endpoint:weekly_average}': ['p(95)<700'],
    http_reqs: ['rate>15'],
  },
};

export function setup() {
  const runId = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const email = `${LOAD_EMAIL_PREFIX}-${runId}@weatherflow.local`;
  const token = registerUser(email);
  const station = createStation(token);
  seedMeasurements(token, station.id);

  return {
    token,
    stationId: station.id,
    stationName: station.name,
    datasetSize: DATASET_SIZE,
    apiBaseUrl: API_BASE_URL,
  };
}

export function sustainedRamp(data) {
  searchMeasurements(data);
  dailyAverage(data);
  sleep(1);
}

export function spike(data) {
  searchMeasurements(data);
  currentTemperature(data);
  weeklyAverage(data);
  sleep(0.3);
}

export function longRun(data) {
  searchMeasurements(data);
  dailyAverage(data);
  weeklyAverage(data);
  if (__ITER % 4 === 0) {
    currentTemperature(data);
  }
  sleep(1.5);
}

function registerUser(email) {
  const payload = JSON.stringify({
    name: 'Load',
    lastName: 'Tester',
    email,
    password: LOAD_PASSWORD,
  });

  const response = http.post(`${API_BASE_URL}/auth/register`, payload, {
    headers: jsonHeaders(),
    tags: { endpoint: 'auth_register' },
  });

  const ok = check(response, {
    'registered load-test user': (res) =>
      res.status === 201 && Boolean(res.json('access_token')),
  });

  if (!ok) {
    fail(
      `Unable to register load-test user: ${response.status} ${response.body}`,
    );
  }

  return response.json('access_token');
}

function createStation(token) {
  const payload = JSON.stringify({
    name: `${STATION_NAME} ${Date.now()}`,
    location: { latitude: -34.706, longitude: -58.277 },
    sensorModel: 'k6 synthetic station',
    provider: 'openweather',
  });

  const response = http.post(`${API_BASE_URL}/weather-stations`, payload, {
    headers: authHeaders(token),
    tags: { endpoint: 'dataset_station' },
  });

  const ok = check(response, {
    'created load-test station': (res) =>
      res.status === 201 && Boolean(res.json('id')),
  });

  if (!ok) {
    fail(
      `Unable to create load-test station: ${response.status} ${response.body}`,
    );
  }

  return response.json();
}

function seedMeasurements(token, stationId) {
  const now = Date.now();

  for (let index = 0; index < DATASET_SIZE; index += 1) {
    const reportedAt = new Date(now - index * 60 * 60 * 1000).toISOString();
    const response = http.post(
      `${API_BASE_URL}/measurements`,
      JSON.stringify({
        stationId,
        temperature: 12 + (index % 18),
        humidity: 45 + (index % 45),
        pressure: 990 + (index % 35),
        reportedAt,
      }),
      {
        headers: authHeaders(token),
        tags: { endpoint: 'dataset_measurement' },
      },
    );

    const ok = check(response, {
      'seeded measurement': (res) => res.status === 201,
    });

    if (!ok) {
      fail(
        `Unable to seed measurement ${index + 1}: ${response.status} ${response.body}`,
      );
    }
  }
}

function searchMeasurements(data) {
  const response = http.get(
    `${API_BASE_URL}/measurements?stationName=${encodeURIComponent(data.stationName)}&tempMin=10&tempMax=35&reportedFrom=${encodeURIComponent(reportedFromIso())}`,
    {
      headers: authHeaders(data.token),
      tags: { endpoint: 'measurements_search' },
    },
  );

  record(
    response,
    'search measurements returns 200',
    (res) => res.status === 200,
  );
}

function currentTemperature(data) {
  const response = http.get(
    `${API_BASE_URL}/stations/${data.stationId}/reports/temperature/current`,
    {
      headers: authHeaders(data.token),
      tags: { endpoint: 'current_temperature' },
    },
  );

  record(
    response,
    'current temperature returns stub-backed reading',
    (res) => res.status === 200 && res.json('temperature.unit') === 'celsius',
  );
}

function dailyAverage(data) {
  const response = http.get(
    `${API_BASE_URL}/stations/${data.stationId}/reports/temperature/daily-average`,
    {
      headers: authHeaders(data.token),
      tags: { endpoint: 'daily_average' },
    },
  );

  record(response, 'daily average returns 200', (res) => res.status === 200);
}

function weeklyAverage(data) {
  const response = http.get(
    `${API_BASE_URL}/stations/${data.stationId}/reports/temperature/weekly-average`,
    {
      headers: authHeaders(data.token),
      tags: { endpoint: 'weekly_average' },
    },
  );

  record(response, 'weekly average returns 200', (res) => res.status === 200);
}

function record(response, name, predicate) {
  const ok = check(response, { [name]: predicate });
  errorRate.add(!ok);
}

function reportedFromIso() {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
}

function authHeaders(token) {
  return {
    ...jsonHeaders(),
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
    'docs/load-tests/latest-summary.json': JSON.stringify(data, null, 2),
    'docs/load-tests/latest-report.html': renderHtmlSummary(data),
    stdout: textSummary(data),
  };
}

function textSummary(data) {
  const checks = data.metrics.checks?.values?.rate ?? 0;
  const p95 = data.metrics.http_req_duration?.values?.['p(95)'] ?? 0;
  const failed = data.metrics.http_req_failed?.values?.rate ?? 0;

  return [
    '',
    'WeatherFlow load-test summary',
    `checks_rate=${checks}`,
    `http_req_duration_p95_ms=${p95}`,
    `http_req_failed_rate=${failed}`,
    '',
  ].join('\n');
}

function renderHtmlSummary(data) {
  const p95 = data.metrics.http_req_duration?.values?.['p(95)'] ?? 0;
  const failed = data.metrics.http_req_failed?.values?.rate ?? 0;
  const throughput = data.metrics.http_reqs?.values?.rate ?? 0;
  const checks = data.metrics.checks?.values?.rate ?? 0;

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>WeatherFlow Load Test Summary</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 2rem; color: #1f2933; }
    table { border-collapse: collapse; min-width: 36rem; }
    th, td { border: 1px solid #ccd6dd; padding: 0.5rem 0.75rem; text-align: left; }
    th { background: #eef3f6; }
    code { background: #eef3f6; padding: 0.1rem 0.25rem; }
  </style>
</head>
<body>
  <h1>WeatherFlow Load Test Summary</h1>
  <p>Generated by <code>npm run test:load</code>.</p>
  <table>
    <tr><th>Metric</th><th>Value</th><th>Target</th></tr>
    <tr><td>p95 latency</td><td>${p95.toFixed(2)} ms</td><td>&lt; 750 ms global</td></tr>
    <tr><td>Error rate</td><td>${(failed * 100).toFixed(2)}%</td><td>&lt; 2%</td></tr>
    <tr><td>Throughput</td><td>${throughput.toFixed(2)} req/s</td><td>&gt; 15 req/s</td></tr>
    <tr><td>Checks</td><td>${(checks * 100).toFixed(2)}%</td><td>All endpoint checks pass</td></tr>
  </table>
</body>
</html>`;
}
