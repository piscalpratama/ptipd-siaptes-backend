const db = require('../config/db');
const { parsePagination, buildPaginationMeta } = require('../config/pagination');
const { createError } = require('../middleware/errorHandler');

const getAll = async (query) => {
  const { page, limit, offset } = parsePagination(query);
  const { search } = query;

  const conditions = [];
  const params = [];
  if (search) {
    conditions.push('modul LIKE ?');
    params.push(`%${search}%`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [[{ total }]] = await db.execute(
    `SELECT COUNT(*) as total FROM tbm_modul ${where}`,
    params,
  );
  const [rows] = await db.query(
    `SELECT idm_modul, modul, is_visible, created_by, updated_by, created_at, updated_at
     FROM tbm_modul ${where} ORDER BY modul ASC LIMIT ${limit} OFFSET ${offset}`,
    params,
  );

  return { rows, pagination: buildPaginationMeta(total, page, limit) };
};

const getById = async (id) => {
  const [rows] = await db.execute(`SELECT * FROM tbm_modul WHERE idm_modul = ? LIMIT 1`, [id]);
  if (!rows.length) throw createError('Modul tidak ditemukan.', 404);
  return rows[0];
};

const create = async (data, userId) => {
  const { modul, is_visible } = data;
  const [result] = await db.execute(
    `INSERT INTO tbm_modul (modul, is_visible, created_by, updated_by) VALUES (?, ?, ?, ?)`,
    [modul, is_visible ?? 1, userId, userId],
  );
  return { idm_modul: result.insertId };
};

const update = async (id, data, userId) => {
  const [existing] = await db.execute(`SELECT idm_modul FROM tbm_modul WHERE idm_modul = ? LIMIT 1`, [id]);
  if (!existing.length) throw createError('Modul tidak ditemukan.', 404);

  const fields = [];
  const params = [];
  if (data.modul !== undefined) { fields.push('modul = ?'); params.push(data.modul); }
  if (data.is_visible !== undefined) { fields.push('is_visible = ?'); params.push(data.is_visible); }
  if (!fields.length) throw createError('Tidak ada data yang diperbarui.', 400);

  fields.push('updated_by = ?', 'updated_at = NOW()');
  params.push(userId, id);
  await db.execute(`UPDATE tbm_modul SET ${fields.join(', ')} WHERE idm_modul = ?`, params);
};

const remove = async (id) => {
  const [existing] = await db.execute(`SELECT idm_modul FROM tbm_modul WHERE idm_modul = ? LIMIT 1`, [id]);
  if (!existing.length) throw createError('Modul tidak ditemukan.', 404);
  const [dipakai] = await db.execute(`SELECT idm_topik FROM tbm_topik WHERE idm_modul = ? LIMIT 1`, [id]);
  if (dipakai.length) throw createError('Modul masih punya topik di dalamnya, hapus topiknya dulu.', 409);
  await db.execute(`DELETE FROM tbm_modul WHERE idm_modul = ?`, [id]);
};

module.exports = { getAll, getById, create, update, remove };
