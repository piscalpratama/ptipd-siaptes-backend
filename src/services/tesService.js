const db = require('../config/db');
const { parsePagination, buildPaginationMeta } = require('../config/pagination');
const { createError } = require('../middleware/errorHandler');

const getAll = async (query) => {
  const { page, limit, offset } = parsePagination(query);
  const { search, tgl_dari, tgl_sampai } = query;

  const conditions = ['is_deleted = 0'];
  const params = [];
  if (search) { conditions.push('nama_tes LIKE ?'); params.push(`%${search}%`); }
  // Filter rentang tanggal berdasarkan tgl_mulai ujian
  if (tgl_dari) { conditions.push('tgl_mulai >= ?'); params.push(tgl_dari); }
  if (tgl_sampai) { conditions.push('tgl_mulai <= ?'); params.push(`${tgl_sampai} 23:59:59`); }
  const where = `WHERE ${conditions.join(' AND ')}`;

  const [[{ total }]] = await db.execute(
    `SELECT COUNT(*) as total FROM tbm_tes ${where}`,
    params,
  );
  const [rows] = await db.query(
    `SELECT idm_tes, nama_tes, keterangan, tgl_mulai, tgl_akhir, durasi, skor_maksimal,
            status_hasil, status_detail_tes, status_token, created_at, updated_at
     FROM tbm_tes ${where} ORDER BY tgl_mulai DESC LIMIT ${limit} OFFSET ${offset}`,
    params,
  );

  return { rows, pagination: buildPaginationMeta(total, page, limit) };
};

const getById = async (id) => {
  const [rows] = await db.execute(`SELECT * FROM tbm_tes WHERE idm_tes = ? AND is_deleted = 0 LIMIT 1`, [id]);
  if (!rows.length) throw createError('Ujian tidak ditemukan.', 404);
  const tes = rows[0];

  const [tesGrup] = await db.execute(
    `SELECT idr_tes_grup, idm_grup, nama_grup FROM viewr_tes_grup WHERE idm_tes = ?`,
    [id],
  );
  const [tesTopik] = await db.execute(
    `SELECT idr_tes_topik, idm_topik, topik, tipe_soal, tingkat_kesulitan, jumlah_soal,
            jumlah_pilihan, acak_soal, acak_pilihan, skor_benar, skor_salah, skor_tidak_jawab
     FROM viewr_tes_topik WHERE idm_tes = ?`,
    [id],
  );

  tes.tes_grup = tesGrup;
  tes.tes_topik = tesTopik;
  return tes;
};

const create = async (data, userId) => {
  const {
    nama_tes, keterangan, tgl_mulai, tgl_akhir, durasi,
    skor_maksimal, status_hasil, status_detail_tes, status_token,
  } = data;

  const [result] = await db.execute(
    `INSERT INTO tbm_tes
     (nama_tes, keterangan, tgl_mulai, tgl_akhir, durasi, skor_maksimal,
      status_hasil, status_detail_tes, status_token, is_deleted, created_by, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    [
      nama_tes,
      keterangan || '',
      new Date(tgl_mulai),
      new Date(tgl_akhir),
      durasi,
      skor_maksimal,
      status_hasil ?? 1,
      status_detail_tes ?? 0,
      status_token ?? 0,
      userId,
      userId,
    ],
  );
  return { idm_tes: result.insertId };
};

const update = async (id, data, userId) => {
  const [existing] = await db.execute(`SELECT idm_tes FROM tbm_tes WHERE idm_tes = ? AND is_deleted = 0 LIMIT 1`, [id]);
  if (!existing.length) throw createError('Ujian tidak ditemukan.', 404);

  const fields = [];
  const params = [];
  const dateFields = new Set(['tgl_mulai', 'tgl_akhir']);
  const allowed = [
    'nama_tes', 'keterangan', 'tgl_mulai', 'tgl_akhir', 'durasi',
    'skor_maksimal', 'status_hasil', 'status_detail_tes', 'status_token',
  ];
  allowed.forEach((k) => {
    if (data[k] !== undefined) {
      fields.push(`${k} = ?`);
      params.push(dateFields.has(k) ? new Date(data[k]) : data[k]);
    }
  });
  if (!fields.length) throw createError('Tidak ada data yang diperbarui.', 400);

  fields.push('updated_by = ?');
  params.push(userId, id);
  await db.execute(`UPDATE tbm_tes SET ${fields.join(', ')} WHERE idm_tes = ?`, params);
};

const remove = async (id) => {
  const [existing] = await db.execute(`SELECT idm_tes FROM tbm_tes WHERE idm_tes = ? AND is_deleted = 0 LIMIT 1`, [id]);
  if (!existing.length) throw createError('Ujian tidak ditemukan.', 404);
  await db.execute(`UPDATE tbm_tes SET is_deleted = 1 WHERE idm_tes = ?`, [id]);
};

module.exports = { getAll, getById, create, update, remove };
