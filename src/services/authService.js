const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { createError } = require('../middleware/errorHandler');
const maintenanceService = require('./maintenanceService');

const signToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });
};

const saveJwtRecord = async (token, req) => {
  const decoded = jwt.decode(token);
  await db.execute(
    `INSERT INTO ci_jwt (headers, ip_address, token, expire_at, expired, keterangan)
     VALUES (?, ?, ?, ?, 'TIDAK', 'LOGIN')`,
    [
      JSON.stringify(req.headers || {}),
      req.ip || req.connection?.remoteAddress || '',
      token,
      String(decoded.exp),
    ],
  );
};

// ─── Verifikasi kredensial peserta lewat SALAM Akademik ──────────────────────
// Peserta ujian login pakai akun SALAM yang sama dengan mahasiswa di ICT,
// jadi passwordnya BUKAN password lokal tbs_user — divalidasi langsung ke
// SALAM tiap kali login (sama seperti authService.js di BE ICT).
const verifyViaSalam = async (nim, password) => {
  const salamUrl = process.env.SALAM_API_URL;
  if (!salamUrl) {
    console.error('[AUTH] SALAM_API_URL belum diset di .env');
    throw createError('Konfigurasi API SALAM tidak ditemukan.', 500);
  }

  let salamAuth;
  try {
    const res = await fetch(`${salamUrl}auth/mahasiswa/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: nim, password }),
    });
    salamAuth = await res.json();
  } catch (e) {
    console.error(`[AUTH] Gagal menghubungi SALAM untuk NIM ${nim}:`, e.message);
    throw createError('Gagal menghubungi API SALAM. Coba lagi nanti.', 502);
  }

  if (salamAuth.code !== 200) {
    console.warn(`[AUTH] SALAM menolak login NIM ${nim}. Response:`, JSON.stringify(salamAuth));
    throw createError('NIM atau password SALAM salah.', 400);
  }

  console.log(`[AUTH] SALAM sukses verifikasi NIM ${nim}`);
};

const login = async ({ username, password }, req) => {
  const [rows] = await db.execute(
    `SELECT ids_user, nama, username, password, level, idm_grup
     FROM tbs_user WHERE username = ? LIMIT 1`,
    [username],
  );

  if (!rows.length) {
    console.warn(`[AUTH] Login gagal: username "${username}" tidak ditemukan di tbs_user.`);
    // NIM belum pernah ditambahkan ke grup ujian manapun (belum di-push dari
    // ICT ataupun ditambah manual oleh admin) — bedakan pesannya dari salah
    // password supaya peserta tahu ini bukan soal lupa password.
    throw createError(
      'NIM Anda belum terdaftar sebagai peserta ujian apa pun. Hubungi admin/instruktur ICT Anda untuk didaftarkan.',
      404,
    );
  }

  const user = rows[0];
  console.log(`[AUTH] Login username "${username}" -> level="${user.level}"`);

  if (user.level === 'PESERTA') {
    // Cuma peserta yang diblokir selama maintenance — staff bank soal/tes
    // (cabang else di bawah) harus tetap bisa login buat matiin mode ini.
    const maintenance = await maintenanceService.getStatus();
    if (maintenance.active) {
      throw createError(
        `Sistem sedang maintenance${maintenance.sampai ? ` sampai ${maintenance.sampai}` : ''}. Coba lagi nanti.`,
        503,
      );
    }

    // Peserta = akun mahasiswa, wajib lewat SALAM. Baris tbs_user tetap harus
    // ada dulu (dibuat via push dari ICT atau ditambahkan admin) — ini yang
    // membatasi siapa saja yang boleh masuk portal ujian, bukan passwordnya.
    await verifyViaSalam(user.username, password);
  } else {
    // Staff bank soal & tes (SUPERADMIN/ADMIN - SOAL/ADMIN - TES) tetap pakai
    // password lokal tbs_user, bukan akun SALAM.
    const valid = await bcrypt.compare(password, user.password || '');
    if (!valid) {
      console.warn(`[AUTH] Login gagal: password lokal salah untuk "${username}" (level=${user.level}).`);
      throw createError('Username atau password salah.', 400);
    }
  }

  await db.execute(
    `UPDATE tbs_user SET login = NOW(), ip_login = ? WHERE ids_user = ?`,
    [req.ip || '', user.ids_user],
  );

  const payload = {
    user_id: user.ids_user,
    username: user.username,
    nama: user.nama,
    level: user.level,
  };

  const token = signToken(payload);
  await saveJwtRecord(token, req);

  return { token, user: payload };
};

const logout = async (token, req) => {
  await db.execute(
    `UPDATE ci_jwt SET expired = 'YA', keterangan = 'LOGOUT' WHERE token = ?`,
    [token],
  );
  if (req.user?.user_id) {
    await db.execute(`UPDATE tbs_user SET logout = NOW(), ip_logout = ? WHERE ids_user = ?`, [
      req.ip || '',
      req.user.user_id,
    ]);
  }
};

const me = async (userId) => {
  const [rows] = await db.execute(
    `SELECT ids_user, nama, username, level, idm_grup FROM tbs_user WHERE ids_user = ? LIMIT 1`,
    [userId],
  );
  if (!rows.length) throw createError('User tidak ditemukan.', 404);
  return rows[0];
};

module.exports = { login, logout, me };
