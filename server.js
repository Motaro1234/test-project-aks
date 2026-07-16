const express = require('express');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;
const APP_VERSION = process.env.APP_VERSION || 'v1';

let requestCount = 0;

app.get('/', (req, res) => {
  requestCount++;
  const info = {
    message: 'สวัสดีจาก AKS Test App 👋',
    version: APP_VERSION,
    hostname: os.hostname(),          // = ชื่อ Pod ใน Kubernetes
    podIP: process.env.POD_IP || 'N/A',
    nodeName: process.env.NODE_NAME || 'N/A',
    namespace: process.env.POD_NAMESPACE || 'N/A',
    requestCount,
    timestamp: new Date().toISOString(),
    uptimeSeconds: process.uptime().toFixed(1)
  };

  res.send(`
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="UTF-8" />
      <title>AKS Test App</title>
      <style>
        body { font-family: 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0;
               display: flex; align-items: center; justify-content: center; height: 100vh; margin:0; }
        .card { background: #1e293b; padding: 2.5rem 3rem; border-radius: 16px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.4); max-width: 480px; width: 90%; }
        h1 { color: #38bdf8; margin-top: 0; font-size: 1.5rem; }
        table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
        td { padding: 8px 6px; border-bottom: 1px solid #334155; font-size: 0.9rem; }
        td:first-child { color: #94a3b8; width: 40%; }
        .badge { display:inline-block; background:#0ea5e9; color:#fff; padding:2px 10px;
                 border-radius:999px; font-size:0.75rem; margin-left:8px; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>${info.message} <span class="badge">${info.version}</span></h1>
        <table>
          <tr><td>Pod Hostname</td><td>${info.hostname}</td></tr>
          <tr><td>Pod IP</td><td>${info.podIP}</td></tr>
          <tr><td>Node Name</td><td>${info.nodeName}</td></tr>
          <tr><td>Namespace</td><td>${info.namespace}</td></tr>
          <tr><td>Request # (ตั้งแต่เริ่ม pod นี้)</td><td>${info.requestCount}</td></tr>
          <tr><td>Uptime (s)</td><td>${info.uptimeSeconds}</td></tr>
          <tr><td>Timestamp</td><td>${info.timestamp}</td></tr>
        </table>
      </div>
    </body>
    </html>
  `);
});

// Health check endpoint สำหรับ readiness/liveness probe
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// API แบบ JSON เผื่อทดสอบด้วย curl หรือ script
app.get('/api/info', (req, res) => {
  res.json({
    hostname: os.hostname(),
    podIP: process.env.POD_IP || 'N/A',
    nodeName: process.env.NODE_NAME || 'N/A',
    namespace: process.env.POD_NAMESPACE || 'N/A',
    version: APP_VERSION,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`AKS test app listening on port ${PORT}`);
});
