const db = require('../config/db');
const { createError } = require('../middleware/errorHandler');

const listByTes = async (idmTes) => {
  const [rows] = await db.execute(
    `SELECT idr_tes_topik, idm_topik, topik, tipe_soal, tingkat_kesulitan, jumlah_soal,
            jumlah_pilihan, acak_soal, acak_pilihan, skor_benar, skor_salah, skor_tidak_jawab
     FROM viewr_tes_topik WHERE idm_tes = ?`,
    [idmTes],
  );
  return rows;
};

const create = async (idmTes, data, userId) => {
  const {
    idm_topik, tipe_soal, tingkat_kesulitan, jumlah_soal, jumlah_pilihan,
    acak_soal, acak_pilihan, skor_benar, skor_salah, skor_tidak_jawab,
  } = data;

  // Pastikan cukup soal tersedia di topik itu buat tipe_soal yang diminta
  const [[{ tersedia }]] = await db.execute(
    `SELECT COUNT(*) as tersedia FROM tbm_soal WHERE idm_topik = ? AND tipe_soal = ? AND is_visible = 1`,
    [idm_topik, tipe_soal],
  );
  if (tersedia < jumlah_soal) {
    throw createError(
      `Soal tersedia di topik ini cuma ${tersedia}, tapi diminta ${jumlah_soal}.`,
      400,
    );
  }

  const [result] = await db.execute(
    `INSERT INTO tbr_tes_topik
     (idm_topik, idm_tes, tipe_soal, tingkat_kesulitan, jumlah_soal, jumlah_pilihan,
      acak_soal, acak_pilihan, skor_benar, skor_salah, skor_tidak_jawab, created_by, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      idm_topik, idmTes, tipe_soal, tingkat_kesulitan ?? 1, jumlah_soal, jumlah_pilihan ?? 4,
      acak_soal ? 1 : 0, acak_pilihan ? 1 : 0, skor_benar, skor_salah ?? 0, skor_tidak_jawab ?? 0,
      userId, userId,
    ],
  );
  return { idr_tes_topik: result.insertId };
};

const update = async (idrTesTopik, data, userId) => {
  const [existing] = await db.execute(
    `SELECT idr_tes_topik FROM tbr_tes_topik WHERE idr_tes_topik = ? LIMIT 1`,
    [idrTesTopik],
  );
  if (!existing.length) throw createError('Data tidak ditemukan.', 404);

  const fields = [];
  const params = [];
  const allowed = [
    'idm_topik', 'tipe_soal', 'tingkat_kesulitan', 'jumlah_soal', 'jumlah_pilihan',
    'acak_soal', 'acak_pilihan', 'skor_benar', 'skor_salah', 'skor_tidak_jawab',
  ];
  allowed.forEach((k) => {
    if (data[k] !== undefined) { fields.push(`${k} = ?`); params.push(data[k]); }
  });
  if (!fields.length) throw createError('Tidak ada data yang diperbarui.', 400);

  fields.push('updated_by = ?');
  params.push(userId, idrTesTopik);
  await db.execute(`UPDATE tbr_tes_topik SET ${fields.join(', ')} WHERE idr_tes_topik = ?`, params);
};

const remove = async (idrTesTopik) => {
  const [existing] = await db.execute(
    `SELECT idr_tes_topik FROM tbr_tes_topik WHERE idr_tes_topik = ? LIMIT 1`,
    [idrTesTopik],
  );
  if (!existing.length) throw createError('Data tidak ditemukan.', 404);
  await db.execute(`DELETE FROM tbr_tes_topik WHERE idr_tes_topik = ?`, [idrTesTopik]);
};

module.exports = { listByTes, create, update, remove };
