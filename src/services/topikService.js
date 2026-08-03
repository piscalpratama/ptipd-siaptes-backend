const db = require('../config/db');
const { parsePagination, buildPaginationMeta } = require('../config/pagination');
const { createError } = require('../middleware/errorHandler');

const getAll = async (query) => {
  const { page, limit, offset } = parsePagination(query);
  const { idm_modul, search } = query;

  const conditions = [];
  const params = [];
  if (idm_modul) { conditions.push('a.idm_modul = ?'); params.push(idm_modul); }
  if (search) { conditions.push('a.topik LIKE ?'); params.push(`%${search}%`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [[{ total }]] = await db.execute(
    `SELECT COUNT(*) as total FROM tbm_topik a ${where}`,
    params,
  );
  const [rows] = await db.query(
    `SELECT a.idm_topik, a.idm_modul, b.modul, a.topik, a.deskripsi, a.is_visible,
            a.created_by, a.updated_by, a.created_at, a.updated_at
     FROM tbm_topik a JOIN tbm_modul b ON a.idm_modul = b.idm_modul
     ${where} ORDER BY a.topik ASC LIMIT ${limit} OFFSET ${offset}`,
    params,
  );

  return { rows, pagination: buildPaginationMeta(total, page, limit) };
};

const getById = async (id) => {
  const [rows] = await db.execute(`SELECT * FROM viewm_topik WHERE idm_topik = ? LIMIT 1`, [id]);
  if (!rows.length) throw createError('Topik tidak ditemukan.', 404);
  return rows[0];
};

const create = async (data, userId) => {
  const { idm_modul, topik, deskripsi, is_visible } = data;
  const [result] = await db.execute(
    `INSERT INTO tbm_topik (idm_modul, topik, deskripsi, is_visible, created_by, updated_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [idm_modul, topik, deskripsi || null, is_visible ?? 1, userId, userId],
  );
  return { idm_topik: result.insertId };
};

const update = async (id, data, userId) => {
  const [existing] = await db.execute(`SELECT idm_topik FROM tbm_topik WHERE idm_topik = ? LIMIT 1`, [id]);
  if (!existing.length) throw createError('Topik tidak ditemukan.', 404);

  const fields = [];
  const params = [];
  const allowed = ['idm_modul', 'topik', 'deskripsi', 'is_visible'];
  allowed.forEach((k) => {
    if (data[k] !== undefined) { fields.push(`${k} = ?`); params.push(data[k]); }
  });
  if (!fields.length) throw createError('Tidak ada data yang diperbarui.', 400);

  fields.push('updated_by = ?');
  params.push(userId, id);
  await db.execute(`UPDATE tbm_topik SET ${fields.join(', ')} WHERE idm_topik = ?`, params);
};

const remove = async (id) => {
  const [existing] = await db.execute(`SELECT idm_topik FROM tbm_topik WHERE idm_topik = ? LIMIT 1`, [id]);
  if (!existing.length) throw createError('Topik tidak ditemukan.', 404);
  const [dipakaiSoal] = await db.execute(`SELECT idm_soal FROM tbm_soal WHERE idm_topik = ? LIMIT 1`, [id]);
  if (dipakaiSoal.length) throw createError('Topik masih punya soal di dalamnya, hapus soalnya dulu.', 409);
  const [dipakaiTes] = await db.execute(`SELECT idr_tes_topik FROM tbr_tes_topik WHERE idm_topik = ? LIMIT 1`, [id]);
  if (dipakaiTes.length) throw createError('Topik ini masih dipakai di aturan soal salah satu ujian.', 409);
  await db.execute(`DELETE FROM tbm_topik WHERE idm_topik = ?`, [id]);
};

module.exports = { getAll, getById, create, update, remove };
