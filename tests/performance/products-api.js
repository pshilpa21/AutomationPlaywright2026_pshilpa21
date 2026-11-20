import http from 'k6/http';
import { check } from 'k6';
import { Trend } from 'k6/metrics';

const browseFlowDuration = new Trend('product_browse_flow_duration', true);

const profiles = {
  smoke: { executor: 'constant-vus', vus: 1, duration: '10s' },
  load: {
    executor: 'ramping-vus',
    startVUs: 1,
    stages: [
      { duration: '15s', target: 5 },
      { duration: '30s', target: 5 },
      { duration: '15s', target: 0 },
    ],
    gracefulRampDown: '5s',
  },
  stress: {
    executor: 'ramping-vus',
    startVUs: 1,
    stages: [
      { duration: '15s', target: 5 },
      { duration: '15s', target: 10 },
      { duration: '15s', target: 15 },
      { duration: '15s', target: 0 },
    ],
    gracefulRampDown: '5s',
  },
  spike: {
    executor: 'ramping-vus',
    startVUs: 1,
    stages: [
      { duration: '5s', target: 3 },
      { duration: '5s', target: 20 },
      { duration: '20s', target: 20 },
      { duration: '10s', target: 0 },
    ],
    gracefulRampDown: '5s',
  },
  soak: { executor: 'constant-vus', vus: 3, duration: '2m' },
};

const profileName = __ENV.PROFILE || 'smoke';
const runId = (__ENV.RUN_ID || new Date().toISOString()).replace(/[^A-Za-z0-9_-]/g, '-');
const selectedProfile = profiles[profileName];
if (!selectedProfile) {
  throw new Error(`Unknown PROFILE "${profileName}". Choose one of: ${Object.keys(profiles).join(', ')}`);
}

const baseUrl = (__ENV.BASE_URL || 'http://juice-shop:3000').replace(/\/$/, '');

export const options = {
  scenarios: { selected_profile: selectedProfile },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000'],
    'http_req_duration{endpoint:catalog}': ['p(95)<1000'],
    'http_req_duration{endpoint:product_details}': ['p(95)<1000'],
    'http_req_duration{endpoint:product_search}': ['p(95)<1000'],
    product_browse_flow_duration: ['p(95)<3000'],
    checks: ['rate>0.99'],
  },
};

export default function () {
  const flowStartedAt = Date.now();

  try {
    const catalog = http.get(`${baseUrl}/api/Products`, {
      headers: { Accept: 'application/json' },
      tags: { endpoint: 'catalog' },
    });
    const catalogOk = check(catalog, {
      'catalog returns HTTP 200': (response) => response.status === 200,
      'catalog returns JSON': (response) => String(response.headers['Content-Type'] || '').includes('application/json'),
    });
    if (!catalogOk) return;

    let productId;
    try {
      productId = JSON.parse(catalog.body).data?.[0]?.id;
    } catch {
      check(null, { 'catalog contains a readable product': () => false });
      return;
    }
    if (!productId) {
      check(null, { 'catalog contains a product ID': () => false });
      return;
    }

    const details = http.get(`${baseUrl}/api/Products/${productId}`, {
      headers: { Accept: 'application/json' },
      tags: { endpoint: 'product_details' },
    });
    check(details, {
      'product details return HTTP 200': (response) => response.status === 200,
      'product details return JSON': (response) => String(response.headers['Content-Type'] || '').includes('application/json'),
    });

    const search = http.get(`${baseUrl}/rest/products/search?q=Apple`, {
      headers: { Accept: 'application/json' },
      tags: { endpoint: 'product_search' },
    });
    check(search, {
      'product search returns HTTP 200': (response) => response.status === 200,
      'product search returns JSON': (response) => String(response.headers['Content-Type'] || '').includes('application/json'),
    });
  } finally {
    browseFlowDuration.add(Date.now() - flowStartedAt);
  }
}

export function handleSummary(data) {
  const metrics = data.metrics;
  const requests = metrics.http_reqs?.values || {};
  const latency = metrics.http_req_duration?.values || {};
  const failed = metrics.http_req_failed?.values?.rate ?? metrics.http_req_failed?.value ?? 0;
  const checks = metrics.checks?.values || metrics.checks || {};
  const checkTotal = (checks.passes || 0) + (checks.fails || 0);
  const checkRate = checks.rate !== undefined
    ? checks.rate * 100
    : checkTotal ? (checks.passes / checkTotal) * 100 : 0;
  const vusMax = metrics.vus_max?.values?.max || metrics.vus?.values?.max || 0;
  const errorPercent = failed * 100;
  const p95 = latency['p(95)'] || 0;
  const flowP95 = metrics.product_browse_flow_duration?.values?.['p(95)'] || 0;
  const errorsPass = failed < 0.01;
  const latencyPass = p95 < 1000;
  const flowPass = flowP95 < 3000;
  const checkPass = checkRate > 99;
  const endpointStats = [
    ['Catalog', 'http_req_duration{endpoint:catalog}'],
    ['Product details', 'http_req_duration{endpoint:product_details}'],
    ['Product search', 'http_req_duration{endpoint:product_search}'],
  ].map(([label, metricName]) => ({
    label,
    p95: metrics[metricName]?.values?.['p(95)'] || 0,
    p99: metrics[metricName]?.values?.['p(99)'] || 0,
  }));
  const passed = errorsPass && latencyPass && flowPass && checkPass && endpointStats.every((endpoint) => endpoint.p95 < 1000);
  const statusText = passed ? 'PASS' : 'THRESHOLD FAILED';
  const statusColor = passed ? '#087f5b' : '#c92a2a';
  const statusBackground = passed ? '#e6fcf5' : '#fff0f0';

  const formatMs = (value) => `${Number(value || 0).toFixed(1)} ms`;
  const latencyRows = [
    ['Median (p50)', latency.med],
    ['p90', latency['p(90)']],
    ['p95', latency['p(95)']],
    ['p99', latency['p(99)']],
  ].map(([label, value]) => {
    const amount = Number(value || 0);
    const width = Math.max(1, Math.min(100, (amount / 1000) * 100));
    return `<div class="latency-row"><span>${label}</span><div class="track"><div class="fill" style="width:${width}%"></div></div><strong>${formatMs(amount)}</strong></div>`;
  }).join('');
  const endpointRows = endpointStats.map((endpoint) => `<tr><td>${endpoint.label}</td><td>${formatMs(endpoint.p95)}</td><td>${formatMs(endpoint.p99)}</td><td class="${endpoint.p95 < 1000 ? 'ok' : 'bad'}">${endpoint.p95 < 1000 ? 'PASS' : 'FAIL'}</td></tr>`).join('');

  const report = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>k6 ${profileName} performance report</title>
<style>
:root{font-family:Inter,Segoe UI,Arial,sans-serif;color:#182230;background:#f4f7fb}*{box-sizing:border-box}body{margin:0;padding:36px 18px}.wrap{max-width:1040px;margin:auto}.top{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;margin-bottom:24px}.eyebrow{font-size:12px;text-transform:uppercase;letter-spacing:.12em;color:#526277;font-weight:700}h1{margin:8px 0;font-size:30px}.sub{color:#526277;margin:0}.badge{padding:10px 16px;border-radius:999px;font-weight:800;color:${statusColor};background:${statusBackground};white-space:nowrap}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:14px}.card,.panel{background:white;border:1px solid #e1e8f0;border-radius:14px;padding:18px;box-shadow:0 4px 16px #16324f0a}.label{font-size:13px;color:#526277}.value{font-size:27px;font-weight:750;margin-top:10px}.hint{font-size:12px;color:#718096;margin-top:6px}.panel{margin-top:16px}.panel h2{font-size:18px;margin:0 0 16px}.latency-row{display:grid;grid-template-columns:110px 1fr 90px;gap:12px;align-items:center;margin:13px 0;font-size:13px}.track{height:10px;background:#edf1f6;border-radius:99px;overflow:hidden}.fill{height:100%;background:#4263eb;border-radius:99px}.latency-row strong{text-align:right}.thresholds{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px}.threshold{padding:13px;border-radius:10px;background:#f7f9fc}.threshold strong{display:block;margin-bottom:5px}.ok{color:#087f5b}.bad{color:#c92a2a}table{border-collapse:collapse;width:100%;font-size:14px}th,td{text-align:left;padding:12px;border-bottom:1px solid #e8edf3}th{color:#526277;font-size:12px;text-transform:uppercase}details{margin-top:18px}pre{white-space:pre-wrap;overflow:auto;background:#111827;color:#e5e7eb;border-radius:10px;padding:16px;font-size:12px}.foot{font-size:12px;color:#718096;margin:18px 2px}@media(max-width:580px){.top{display:block}.badge{display:inline-block;margin-top:16px}.latency-row{grid-template-columns:90px 1fr 78px}}
</style></head><body><main class="wrap">
<header class="top"><div><div class="eyebrow">Juice Shop · k6 performance</div><h1>${profileName} profile</h1><p class="sub">Catalog → product details → search · Generated ${new Date().toLocaleString()}</p></div><div class="badge">${statusText}</div></header>
<section class="grid">
<article class="card"><div class="label">Requests</div><div class="value">${Number(requests.count || 0).toLocaleString()}</div><div class="hint">${Number(requests.rate || 0).toFixed(1)} requests / second · three API calls per flow</div></article>
<article class="card"><div class="label">95th percentile response time</div><div class="value">${formatMs(p95)}</div><div class="hint">Starter limit: under 1,000 ms</div></article>
<article class="card"><div class="label">Failed requests</div><div class="value">${errorPercent.toFixed(2)}%</div><div class="hint">Starter limit: under 1%</div></article>
<article class="card"><div class="label">Checks passed</div><div class="value">${checkRate.toFixed(1)}%</div><div class="hint">${Number(checks.passes || 0)} passed · ${Number(checks.fails || 0)} failed</div></article>
<article class="card"><div class="label">Average response time</div><div class="value">${formatMs(latency.avg)}</div><div class="hint">Maximum: ${formatMs(latency.max)}</div></article>
<article class="card"><div class="label">Peak virtual users</div><div class="value">${Number(vusMax).toLocaleString()}</div><div class="hint">Simulated concurrent users</div></article>
</section>
<section class="panel"><h2>Response-time distribution</h2>${latencyRows}<p class="hint">Bars use the 1,000 ms starter response-time limit as the full width.</p></section>
<section class="panel"><h2>Latency by API step</h2><table><thead><tr><th>Step</th><th>p95</th><th>p99</th><th>1 sec limit</th></tr></thead><tbody>${endpointRows}</tbody></table><p class="hint">This view shows which API request step contributes the most response time.</p></section>
<section class="panel"><h2>Thresholds</h2><div class="thresholds"><div class="threshold"><strong class="${errorsPass ? 'ok' : 'bad'}">${errorsPass ? 'PASS' : 'FAIL'} · Failed request rate</strong>${errorPercent.toFixed(2)}% (must be below 1%)</div><div class="threshold"><strong class="${latencyPass ? 'ok' : 'bad'}">${latencyPass ? 'PASS' : 'FAIL'} · Overall request p95</strong>${formatMs(p95)} (must be below 1,000 ms)</div><div class="threshold"><strong class="${flowPass ? 'ok' : 'bad'}">${flowPass ? 'PASS' : 'FAIL'} · Full browse flow p95</strong>${formatMs(flowP95)} (must be below 3,000 ms)</div><div class="threshold"><strong class="${checkPass ? 'ok' : 'bad'}">${checkPass ? 'PASS' : 'FAIL'} · Functional checks</strong>${checkRate.toFixed(1)}% (must be above 99%)</div></div></section>
<section class="panel"><h2>How to read this report</h2><p>p95 is the response time at or below which 95% of measured requests completed. Request rate is the number of requests handled per second during this run. These starter limits are for learning and should be replaced with agreed service objectives before being used as a release gate.</p><details><summary>View the full k6 summary data</summary><pre>${JSON.stringify(data, null, 2)}</pre></details></section>
<p class="foot">Generated locally from k6 summary metrics. This page contains aggregate results for one run, not a live time-series dashboard.</p>
</main></body></html>`;

  const consoleSummary = `\nk6 ${profileName}: ${statusText}\nRequests: ${requests.count || 0} (${Number(requests.rate || 0).toFixed(1)}/s) · p95: ${formatMs(p95)} · failed requests: ${errorPercent.toFixed(2)}% · checks: ${checkRate.toFixed(1)}%\n`;
  return {
    stdout: consoleSummary,
    [`/results/${profileName}-${runId}-summary.json`]: JSON.stringify(data, null, 2),
    [`/results/${profileName}-${runId}-report.html`]: report,
  };
}
