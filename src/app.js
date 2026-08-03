require('dotenv').config();

const express = require('express');
const cors = require('cors');

const { version: APP_VERSION } = require('../package.json');
const responseHandler = require('./middleware/responseHandler');
const { errorHandler } = require('./middleware/errorHandler');
const maintenanceGate = require('./middleware/maintenance');
const routes = require('./routes');

const app = express();

// ─── CORS ─────────────────────────────────────────────────────────────────────
// CORS_ORIGIN boleh berisi lebih dari 1 origin, dipisah koma — dipakai karena
// ada 2 FE yang manggil backend ini: FE ICT admin (manajemen ujian) dan
// FE Siaptes (mahasiswa mengerjakan ujian), masing-masing beda port saat dev.
//
// Tiap origin localhost:<port> otomatis ditambahin varian 127.0.0.1:<port>
// (dan sebaliknya) — browser ngirim origin persis sesuai alamat yg diketik
// di address bar, jadi kalau devnya buka lewat 127.0.0.1 tapi env cuma
// nyebut "localhost", bakal ketolak CORS meskipun sebenarnya localhost yg
// dimaksud sama.
const rawOrigins = (process.env.CORS_ORIGIN || '*')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const allowedOrigins = new Set(rawOrigins);
for (const o of rawOrigins) {
  if (o.includes('localhost')) allowedOrigins.add(o.replace('localhost', '127.0.0.1'));
  if (o.includes('127.0.0.1')) allowedOrigins.add(o.replace('127.0.0.1', 'localhost'));
}

app.use(
  cors({
    origin: allowedOrigins.has('*')
      ? '*'
      : (origin, callback) => {
          if (!origin || allowedOrigins.has(origin)) return callback(null, true);
          console.warn(`[CORS] Origin ditolak: "${origin}". Origin yang diizinkan: ${[...allowedOrigins].join(', ')}`);
          callback(new Error('Not allowed by CORS'));
        },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-service-key'],
  }),
);

// ─── Body Parser ──────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Response Handler ─────────────────────────────────────────────────────────
app.use(responseHandler);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running.',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: APP_VERSION,
    // Short commit SHA di-inject via Dockerfile ARG/ENV saat build (kalau/pas
    // Docker setup dibuat untuk repo ini) — sama dengan tag image "sha-<7char>".
    commit: process.env.GIT_COMMIT || 'unknown',
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
// NOTE: dipasang di root (bukan /api/v1) karena SIAPTES_HOST di .env BE ICT
// sudah mengarah ke ".../siaptes/api/" sebagai base URL, dan endpoint lama
// (/tes-grup/histori) sudah dipanggil persis dari root itu — jadi biar
// kontraknya nggak berubah, semua route di sini juga dipasang di root.
app.use('/', maintenanceGate, routes);

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} tidak ditemukan.`,
  });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3100;
const ENV = process.env.NODE_ENV || 'development';
const BASE = `http://localhost:${PORT}`;

app.listen(PORT, () => {
  const line = '─'.repeat(56);

  console.log(`\n  ┌${line}┐`);
  console.log(`  │${'  🎓  siaptes API'.padEnd(56)}│`);
  console.log(`  ├${line}┤`);
  console.log(`  │  ${'Environment'.padEnd(16)}: ${ENV.padEnd(36)}│`);
  console.log(`  │  ${'Port'.padEnd(16)}: ${String(PORT).padEnd(36)}│`);
  console.log(`  │  ${'Base URL'.padEnd(16)}: ${BASE.padEnd(36)}│`);
  console.log(
    `  │  ${'Health Check'.padEnd(16)}: ${(BASE + '/health').padEnd(36)}│`,
  );
  console.log(
    `  │  ${'CORS Origin'.padEnd(16)}: ${(process.env.CORS_ORIGIN || '*').padEnd(36)}│`,
  );
  console.log(
    `  │  ${'DB'.padEnd(16)}: ${(process.env.DB_NAME + '@' + process.env.DB_HOST).padEnd(36)}│`,
  );
  console.log(`  └${line}┘\n`);
});

module.exports = app;
