const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { parsePagination, buildPaginationMeta } = require('../config/pagination');
const { createError } = require('../middleware/errorHandler');

const getAll = async (query) => {
  const { page, limit, offset } = parsePagination(query);
  const { level, search } = query;

  const conditions = [];
  const params = [];
  if (level) {
    conditions.push('level = ?');
    params.push(level);
  }
  if (search) {
    conditions.push('(nama LIKE ? OR username LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [[{ total }]] = await db.execute(
    `SELECT COUNT(*) as total FROM tbs_user ${where}`,
    params,
  );
  const [rows] = await db.query(
    `SELECT ids_user, nama, username, level, idm_grup, login, logout, created_at
     FROM tbs_user ${where} ORDER BY nama ASC LIMIT ${limit} OFFSET ${offset}`,
    params,
  );

  return { rows, pagination: buildPaginationMeta(total, page, limit) };
};

const getById = async (id) => {
  const [rows] = await db.execute(
    `SELECT ids_user, nama, username, level, detail, idm_grup, login, logout, created_at, updated_at
     FROM tbs_user WHERE ids_user = ? LIMIT 1`,
    [id],
  );
  if (!rows.length) throw createError('User tidak ditemukan.', 404);
  return rows[0];
};

const create = async (data) => {
  const { nama, username, password, level, detail } = data;

  const [existing] = await db.execute(
    `SELECT ids_user FROM tbs_user WHERE username = ? LIMIT 1`,
    [username],
  );
  if (existing.length) throw createError('Username sudah dipakai.', 409);

  const hash = await bcrypt.hash(password, 10);
  const [result] = await db.execute(
    `INSERT INTO tbs_user (nama, username, password, level, detail, idm_grup)
     VALUES (?, ?, ?, ?, ?, '')`,
    [nama, username, hash, level, detail || null],
  );
  return { ids_user: result.insertId };
};

const update = async (id, data) => {
  const [existing] = await db.execute(
    `SELECT ids_user FROM tbs_user WHERE ids_user = ? LIMIT 1`,
    [id],
  );
  if (!existing.length) throw createError('User tidak ditemukan.', 404);

  const fields = [];
  const params = [];

  if (data.nama !== undefined) {
    fields.push('nama = ?');
    params.push(data.nama);
  }
  if (data.level !== undefined) {
    fields.push('level = ?');
    params.push(data.level);
  }
  if (data.detail !== undefined) {
    fields.push('detail = ?');
    params.push(data.detail);
  }
  if (data.password) {
    const hash = await bcrypt.hash(data.password, 10);
    fields.push('password = ?');
    params.push(hash);
  }
  if (!fields.length) throw createError('Tidak ada data yang diperbarui.', 400);

  params.push(id);
  await db.execute(`UPDATE tbs_user SET ${fields.join(', ')} WHERE ids_user = ?`, params);
};

const remove = async (id) => {
  const [existing] = await db.execute(
    `SELECT ids_user FROM tbs_user WHERE ids_user = ? LIMIT 1`,
    [id],
  );
  if (!existing.length) throw createError('User tidak ditemukan.', 404);
  await db.execute(`DELETE FROM tbs_user WHERE ids_user = ?`, [id]);
};

module.exports = { getAll, getById, create, update, remove };
