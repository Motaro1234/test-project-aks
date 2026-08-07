const express = require('express');
const os = require('os');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;
const APP_VERSION = process.env.APP_VERSION || 'v1';

//script for pull images from NFS
const express = require("express");
const path = require("path");

const app = express();

// Folder ที่เก็บรูป
const IMAGE_PATH = "Z:\\images";

// เปิดให้เข้าถึงรูปผ่าน URL
app.use("/images", express.static(IMAGE_PATH));



// Middleware สำหรับอ่านข้อมูลจากฟอร์ม (application/x-www-form-urlencoded)
app.use(express.urlencoded({ extended: true }));

let requestCount = 0;

// เชื่อมต่อ Database ผ่าน connection pool (ใช้ env vars จาก Kubernetes Secret)
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false } // Azure PostgreSQL บังคับใช้ SSL เสมอ
});

app.get('/', async (req, res) => {
  requestCount++;
  const info = {
    message: 'สวัสดีจาก AKS Test App 👋55555',
    version: APP_VERSION,
    hostname: os.hostname(),
    podIP: process.env.POD_IP || 'N/A',
    nodeName: process.env.NODE_NAME || 'N/A',
    namespace: process.env.POD_NAMESPACE || 'N/A',
    requestCount,
    timestamp: new Date().toISOString(),
    uptimeSeconds: process.uptime().toFixed(1)
  };

  // ดึงข้อมูลล่าสุดจากตาราง users มาแสดงด้วย (5 รายการล่าสุด)
  let usersRows = '';
  try {
    const result = await pool.query('SELECT id, name, email, phone FROM users ORDER BY id DESC LIMIT 5');
    usersRows = result.rows.map(u => `
      <tr>
        <td>${u.id}</td>
        <td>${u.name}</td>
        <td>${u.email}</td>
        <td>${u.phone || '-'}</td>
      </tr>
    `).join('');
  } catch (err) {
    usersRows = `<tr><td colspan="4">โหลดข้อมูลไม่สำเร็จ: ${err.message}</td></tr>`;
  }

  res.send(`
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="UTF-8" />
      <title>AKS Test App</title>
      <style>
        body { font-family: 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0;
               display: flex; align-items: center; justify-content: center; min-height: 100vh; margin:0; padding: 2rem 0; }
        .card { background: #1e293b; padding: 2.5rem 3rem; border-radius: 16px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.4); max-width: 480px; width: 90%; }
        h1 { color: #38bdf8; margin-top: 0; font-size: 1.5rem; }
        h2 { color: #38bdf8; font-size: 1.1rem; margin-top: 2rem; }
        table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
        td, th { padding: 8px 6px; border-bottom: 1px solid #334155; font-size: 0.9rem; }
        td:first-child { color: #94a3b8; }
        th { color: #94a3b8; text-align: left; }
        .badge { display:inline-block; background:#0ea5e9; color:#fff; padding:2px 10px;
                 border-radius:999px; font-size:0.75rem; margin-left:8px; }
        form { margin-top: 1.5rem; display: flex; flex-direction: column; gap: 0.75rem; }
        input { padding: 10px; border-radius: 8px; border: 1px solid #334155;
                background: #0f172a; color: #e2e8f0; font-size: 0.9rem; }
        button { padding: 10px; border-radius: 8px; border: none; background: #0ea5e9;
                 color: #fff; font-weight: bold; cursor: pointer; }
        button:hover { background: #38bdf8; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>${info.message} <span class="badge">${info.version}</span></h1>
        <table>
          <tr><td>Pod Hostname :</td><td>${info.hostname}</td></tr>
          <tr><td>Pod IP :</td><td>${info.podIP}</td></tr>
          <tr><td>Node Name :</td><td>${info.nodeName}</td></tr>
          <tr><td>Namespace :</td><td>${info.namespace}</td></tr>
          <tr><td>Request # (ตั้งแต่เริ่ม pod นี้)</td><td>${info.requestCount}</td></tr>
          <tr><td>Uptime (s) :</td><td>${info.uptimeSeconds}</td></tr>
          <tr><td>Timestamp :</td><td>${info.timestamp}</td></tr>
        </table>

        <h2>เพิ่มข้อมูลผู้ใช้</h2>
        <form method="POST" action="/submit">
          <input type="text" name="name" placeholder="ชื่อ" required />
          <input type="email" name="email" placeholder="อีเมล" required />
          <input type="text" name="phone" placeholder="เบอร์โทร" />
          <button type="submit">บันทึกข้อมูล</button>
        </form>

        <h2>ข้อมูลล่าสุด</h2>
        <table>
          <tr><th>ID</th><th>ชื่อ</th><th>อีเมล</th><th>เบอร์โทร</th></tr>
          ${usersRows}
        </table>
      </div>

      <div class="card-image">
      321.jpg
      </div>
    </body>
    </html>
  `);
});

// Endpoint รับข้อมูลจากฟอร์มแล้วบันทึกลง database
app.post('/submit', async (req, res) => {
  const { name, email, phone } = req.body;

  if (!name || !email) {
    return res.status(400).send('กรุณากรอกชื่อและอีเมล');
  }

  try {
    await pool.query(
      'INSERT INTO users (name, email, phone) VALUES ($1, $2, $3)',
      [name, email, phone || null]
    );
    res.redirect('/');
  } catch (err) {
    console.error('Insert error (full):', err);   // <-- เปลี่ยนตรงนี้ log ทั้งก้อน
    res.status(500).send(`บันทึกข้อมูลไม่สำเร็จ: ${err.message || JSON.stringify(err)}`);
  }
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
