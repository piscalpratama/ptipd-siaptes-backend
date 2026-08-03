const db = require('../config/db');
const { parsePagination, buildPaginationMeta } = require('../config/pagination');
const { createError } = require('../middleware/errorHandler');

const getAll = async (query) => {
  const { page, limit, offset } = parsePagination(query);
  const { idm_topik, tipe_soal, search } = query;

  const conditions = [];
  const params = [];
  if (idm_topik) { conditions.push('idm_topik = ?'); params.push(idm_topik); }
  if (tipe_soal) { conditions.push('tipe_soal = ?'); params.push(tipe_soal); }
  if (search) { conditions.push('soal LIKE ?'); params.push(`%${search}%`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [[{ total }]] = await db.execute(
    `SELECT COUNT(*) as total FROM tbm_soal ${where}`,
    params,
  );
  const [rows] = await db.query(
    `SELECT idm_soal, idm_topik, soal, media, tipe_soal, tingkat_kesulitan, is_visible,
            created_by, updated_by, created_at, updated_at
     FROM tbm_soal ${where} ORDER BY idm_soal DESC LIMIT ${limit} OFFSET ${offset}`,
    params,
  );

  return { rows, pagination: buildPaginationMeta(total, page, limit) };
};

const getById = async (id) => {
  const [rows] = await db.execute(`SELECT * FROM tbm_soal WHERE idm_soal = ? LIMIT 1`, [id]);
  if (!rows.length) throw createError('Soal tidak ditemukan.', 404);
  const soal = rows[0];

  if (soal.tipe_soal === 'PILIHAN GANDA') {
    const [pilihan] = await db.execute(
      `SELECT idm_pilihan, idm_soal, pilihan, media, jawaban, is_visible
       FROM tbm_pilihan WHERE idm_soal = ? ORDER BY idm_pilihan ASC`,
      [id],
    );
    soal.pilihan = pilihan;
  }
  return soal;
};

const insertPilihan = async (idmSoal, pilihanList, userId) => {
  for (const p of pilihanList) {
    await db.execute(
      `INSERT INTO tbm_pilihan (idm_soal, pilihan, media, jawaban, is_visible, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [idmSoal, p.pilihan, p.media || null, p.jawaban ? 1 : 0, p.is_visible ?? 1, userId, userId],
    );
  }
};

const create = async (data, userId) => {
  const { idm_topik, soal, media, tipe_soal, jawaban, tingkat_kesulitan, is_visible, pilihan } = data;

  if (tipe_soal === 'PILIHAN GANDA' && (!pilihan || pilihan.length < 2)) {
    throw createError('Soal pilihan ganda butuh minimal 2 pilihan jawaban.', 400);
  }
  if (tipe_soal === 'PILIHAN GANDA' && !pilihan.some((p) => p.jawaban)) {
    throw createError('Minimal 1 pilihan harus ditandai sebagai jawaban benar.', 400);
  }

  const [result] = await db.execute(
    `INSERT INTO tbm_soal
     (idm_topik, soal, media, tipe_soal, jawaban, tingkat_kesulitan, is_visible, created_by, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      idm_topik,
      soal,
      media || null,
      tipe_soal,
      tipe_soal === 'JAWABAN SINGKAT' ? jawaban || null : null,
      tingkat_kesulitan ?? 1,
      is_visible ?? 1,
      userId,
      userId,
    ],
  );

  if (tipe_soal === 'PILIHAN GANDA') {
    await insertPilihan(result.insertId, pilihan, userId);
  }

  return { idm_soal: result.insertId };
};

const update = async (id, data, userId) => {
  const [existing] = await db.execute(`SELECT idm_soal, tipe_soal FROM tbm_soal WHERE idm_soal = ? LIMIT 1`, [id]);
  if (!existing.length) throw createError('Soal tidak ditemukan.', 404);

  const fields = [];
  const params = [];
  const allowed = ['idm_topik', 'soal', 'media', 'tipe_soal', 'jawaban', 'tingkat_kesulitan', 'is_visible'];
  allowed.forEach((k) => {
    if (data[k] !== undefined) { fields.push(`${k} = ?`); params.push(data[k]); }
  });
  if (fields.length) {
    fields.push('updated_by = ?');
    params.push(userId, id);
    await db.execute(`UPDATE tbm_soal SET ${fields.join(', ')} WHERE idm_soal = ?`, params);
  }

  const tipeSoal = data.tipe_soal ?? existing[0].tipe_soal;
  if (tipeSoal === 'PILIHAN GANDA' && data.pilihan) {
    // Replace semua pilihan lama
    await db.execute(`DELETE FROM tbm_pilihan WHERE idm_soal = ?`, [id]);
    await insertPilihan(id, data.pilihan, userId);
  }
};

const remove = async (id) => {
  const [existing] = await db.execute(`SELECT idm_soal FROM tbm_soal WHERE idm_soal = ? LIMIT 1`, [id]);
  if (!existing.length) throw createError('Soal tidak ditemukan.', 404);
  await db.execute(`DELETE FROM tbm_pilihan WHERE idm_soal = ?`, [id]);
  await db.execute(`DELETE FROM tbm_soal WHERE idm_soal = ?`, [id]);
};

module.exports = { getAll, getById, create, update, remove };
