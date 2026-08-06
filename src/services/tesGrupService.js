const crypto = require('crypto');
const db = require('../config/db');
const { createError } = require('../middleware/errorHandler');

const listByTes = async (idmTes) => {
  const [rows] = await db.execute(
    `SELECT idr_tes_grup, idm_grup, nama_grup FROM viewr_tes_grup WHERE idm_tes = ?`,
    [idmTes],
  );
  return rows;
};

const addGrup = async (idmTes, idmGrup, userId) => {
  const [existing] = await db.execute(
    `SELECT idr_tes_grup FROM tbr_tes_grup WHERE idm_tes = ? AND idm_grup = ? LIMIT 1`,
    [idmTes, idmGrup],
  );
  if (existing.length) throw createError('Grup ini sudah terdaftar di ujian tersebut.', 409);

  const [result] = await db.execute(
    `INSERT INTO tbr_tes_grup (idm_tes, idm_grup, created_by, updated_by) VALUES (?, ?, ?, ?)`,
    [idmTes, idmGrup, userId, userId],
  );
  return { idr_tes_grup: result.insertId };
};

const removeGrup = async (idrTesGrup) => {
  const [existing] = await db.execute(
    `SELECT idr_tes_grup FROM tbr_tes_grup WHERE idr_tes_grup = ? LIMIT 1`,
    [idrTesGrup],
  );
  if (!existing.length) throw createError('Data tidak ditemukan.', 404);
  await db.execute(`DELETE FROM tbm_token WHERE idr_tes_grup = ?`, [idrTesGrup]);
  await db.execute(`DELETE FROM tbr_tes_grup WHERE idr_tes_grup = ?`, [idrTesGrup]);
};

// ─── Token akses (tbm_token) ──────────────────────────────────────────────────

const generateTokenString = () =>
  crypto.randomBytes(5).toString('hex').toUpperCase().slice(0, 8);

const listToken = async (idrTesGrup) => {
  const [rows] = await db.execute(
    `SELECT idm_token, idr_tes_grup, token, expired, created_at FROM tbm_token
     WHERE idr_tes_grup = ? ORDER BY created_at DESC`,
    [idrTesGrup],
  );
  return rows;
};

const generateToken = async (idrTesGrup, expiredMinutes, userId) => {
  const [tg] = await db.execute(`SELECT idr_tes_grup FROM tbr_tes_grup WHERE idr_tes_grup = ? LIMIT 1`, [idrTesGrup]);
  if (!tg.length) throw createError('Data tes-grup tidak ditemukan.', 404);

  const token = generateTokenString();
  const expiredAt = expiredMinutes
    ? new Date(Date.now() + expiredMinutes * 60 * 1000)
    : null;

  const [result] = await db.execute(
    `INSERT INTO tbm_token (idr_tes_grup, token, expired, created_by, updated_by)
     VALUES (?, ?, ?, ?, ?)`,
    [idrTesGrup, token, expiredAt, userId, userId],
  );
  return { idm_token: result.insertId, token, expired: expiredAt };
};

const revokeToken = async (idmToken) => {
  const [existing] = await db.execute(`SELECT idm_token FROM tbm_token WHERE idm_token = ? LIMIT 1`, [idmToken]);
  if (!existing.length) throw createError('Token tidak ditemukan.', 404);
  await db.execute(`DELETE FROM tbm_token WHERE idm_token = ?`, [idmToken]);
};

// ─── Token per-tes (berlaku sama untuk SEMUA grup di ujian itu) ───────────────
// tbm_token secara skema tetap scoped per idr_tes_grup (tidak ada kolom
// idm_tes) — token "per tes" diimplementasikan dengan menyisipkan STRING
// TOKEN YANG SAMA ke setiap baris idr_tes_grup milik tes tsb sekaligus.
// Validasi di ujianService.mulai() tidak perlu berubah sama sekali, karena
// tetap mencocokkan token terhadap idr_tes_grup milik peserta seperti biasa
// — cuma sekarang beberapa grup punya baris token dengan nilai token yang
// identik.
const generateTokenForTes = async (idmTes, expiredMinutes, userId) => {
  const [grupRows] = await db.execute(`SELECT idr_tes_grup FROM tbr_tes_grup WHERE idm_tes = ?`, [idmTes]);
  if (!grupRows.length) throw createError('Ujian ini belum punya grup peserta.', 400);

  const token = generateTokenString();
  const expiredAt = expiredMinutes ? new Date(Date.now() + expiredMinutes * 60 * 1000) : null;

  for (const g of grupRows) {
    await db.execute(
      `INSERT INTO tbm_token (idr_tes_grup, token, expired, created_by, updated_by) VALUES (?, ?, ?, ?, ?)`,
      [g.idr_tes_grup, token, expiredAt, userId, userId],
    );
  }
  return { token, expired: expiredAt, jumlah_grup: grupRows.length };
};

const listTokenForTes = async (idmTes) => {
  const [rows] = await db.execute(
    `SELECT t.token, MAX(t.expired) as expired, MIN(t.created_at) as created_at, COUNT(*) as jumlah_grup
     FROM tbm_token t
     JOIN tbr_tes_grup tg ON tg.idr_tes_grup = t.idr_tes_grup
     WHERE tg.idm_tes = ?
     GROUP BY t.token
     ORDER BY created_at DESC`,
    [idmTes],
  );
  return rows;
};

const revokeTokenForTes = async (idmTes, token) => {
  const [result] = await db.execute(
    `DELETE t FROM tbm_token t
     JOIN tbr_tes_grup tg ON tg.idr_tes_grup = t.idr_tes_grup
     WHERE tg.idm_tes = ? AND t.token = ?`,
    [idmTes, token],
  );
  if (!result.affectedRows) throw createError('Token tidak ditemukan.', 404);
};

module.exports = {
  listByTes,
  addGrup,
  removeGrup,
  listToken,
  generateToken,
  revokeToken,
  generateTokenForTes,
  listTokenForTes,
  revokeTokenForTes,
};
