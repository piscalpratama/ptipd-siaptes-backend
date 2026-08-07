const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { parsePagination, buildPaginationMeta } = require('../config/pagination');
const { createError } = require('../middleware/errorHandler');
const { addGrupId, removeGrupId } = require('../utils/grupUtil');
const { buildOrderBy } = require('../utils/buildOrderBy');

const GRUP_SORT = {
  nama_asc: 'nama_grup ASC',
  nama_desc: 'nama_grup DESC',
  terbaru: 'idm_grup DESC',
  terlama: 'idm_grup ASC',
};

const getAll = async (query) => {
  const { page, limit, offset } = parsePagination(query);
  const { search, sort } = query;

  const conditions = [];
  const params = [];
  if (search) { conditions.push('nama_grup LIKE ?'); params.push(`%${search}%`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderBy = buildOrderBy(sort, GRUP_SORT, 'idm_grup DESC');

  const [[{ total }]] = await db.execute(
    `SELECT COUNT(*) as total FROM tbm_grup ${where}`,
    params,
  );
  const [rows] = await db.query(
    `SELECT idm_grup, nama_grup, created_by, updated_by, created_at, updated_at
     FROM tbm_grup ${where} ${orderBy} LIMIT ${limit} OFFSET ${offset}`,
    params,
  );

  // Hitung jumlah anggota per grup sekalian (biar admin gampang lihat)
  for (const g of rows) {
    const [[{ jumlah }]] = await db.execute(
      `SELECT COUNT(*) as jumlah FROM tbs_user
       WHERE level = 'PESERTA' AND FIND_IN_SET(?, idm_grup)`,
      [String(g.idm_grup)],
    );
    g.jumlah_anggota = jumlah;
  }

  return { rows, pagination: buildPaginationMeta(total, page, limit) };
};

const getById = async (id) => {
  const [rows] = await db.execute(`SELECT * FROM tbm_grup WHERE idm_grup = ? LIMIT 1`, [id]);
  if (!rows.length) throw createError('Grup tidak ditemukan.', 404);
  return rows[0];
};

const create = async (data, userId) => {
  const { nama_grup } = data;
  const [result] = await db.execute(
    `INSERT INTO tbm_grup (nama_grup, created_by, updated_by) VALUES (?, ?, ?)`,
    [nama_grup, userId, userId],
  );
  return { idm_grup: result.insertId };
};

const update = async (id, data, userId) => {
  const [existing] = await db.execute(`SELECT idm_grup FROM tbm_grup WHERE idm_grup = ? LIMIT 1`, [id]);
  if (!existing.length) throw createError('Grup tidak ditemukan.', 404);
  if (data.nama_grup === undefined) throw createError('Tidak ada data yang diperbarui.', 400);
  await db.execute(`UPDATE tbm_grup SET nama_grup = ?, updated_by = ? WHERE idm_grup = ?`, [
    data.nama_grup,
    userId,
    id,
  ]);
};

const remove = async (id) => {
  const [existing] = await db.execute(`SELECT idm_grup FROM tbm_grup WHERE idm_grup = ? LIMIT 1`, [id]);
  if (!existing.length) throw createError('Grup tidak ditemukan.', 404);
  const [dipakai] = await db.execute(`SELECT idr_tes_grup FROM tbr_tes_grup WHERE idm_grup = ? LIMIT 1`, [id]);
  if (dipakai.length) throw createError('Grup masih dipakai di satu atau lebih ujian, tidak bisa dihapus.', 409);
  await db.execute(`DELETE FROM tbm_grup WHERE idm_grup = ?`, [id]);
};

// ─── Anggota ──────────────────────────────────────────────────────────────────

const getAnggota = async (idmGrup) => {
  const [rows] = await db.execute(
    `SELECT ids_user, nama, username, level, idm_grup
     FROM tbs_user WHERE level = 'PESERTA' AND FIND_IN_SET(?, idm_grup)
     ORDER BY nama ASC`,
    [String(idmGrup)],
  );
  return rows;
};

// Tambah peserta ke grup by NIM (username). Kalau belum ada akun, dibuatkan
// baru (level PESERTA). Login peserta divalidasi ke SALAM (lihat
// authService.js), jadi kolom `password` di sini cuma placeholder yang tidak
// pernah dipakai buat autentikasi — cukup diisi hash dari NIM supaya kolom
// NOT NULL terpenuhi.
const addAnggotaByNim = async (idmGrup, nimList, userId) => {
  const results = [];

  for (const nimRaw of nimList) {
    const nim = String(nimRaw).trim();
    if (!nim) continue;
    try {
      const [rows] = await db.execute(
        `SELECT ids_user, nama, idm_grup FROM tbs_user WHERE username = ? LIMIT 1`,
        [nim],
      );

      if (rows.length) {
        const user = rows[0];
        const updated = addGrupId(user.idm_grup, idmGrup);
        if (updated !== (user.idm_grup || '')) {
          await db.execute(`UPDATE tbs_user SET idm_grup = ? WHERE ids_user = ?`, [updated, user.ids_user]);
        }
        results.push({ nim, nama: user.nama, status: 'updated' });
      } else {
        const hash = await bcrypt.hash(nim, 10);
        const [result] = await db.execute(
          `INSERT INTO tbs_user (nama, username, password, level, idm_grup)
           VALUES (?, ?, ?, 'PESERTA', ?)`,
          [nim, nim, hash, String(idmGrup)],
        );
        results.push({ nim, nama: nim, status: 'created', ids_user: result.insertId });
      }
    } catch (e) {
      results.push({ nim, status: 'error', message: e.message });
    }
  }

  return results;
};

const removeAnggota = async (idmGrup, idsUser) => {
  const [rows] = await db.execute(`SELECT idm_grup FROM tbs_user WHERE ids_user = ? LIMIT 1`, [idsUser]);
  if (!rows.length) throw createError('Peserta tidak ditemukan.', 404);
  const updated = removeGrupId(rows[0].idm_grup, idmGrup);
  await db.execute(`UPDATE tbs_user SET idm_grup = ? WHERE ids_user = ?`, [updated, idsUser]);
};

module.exports = { getAll, getById, create, update, remove, getAnggota, addAnggotaByNim, removeAnggota };
