const db = require('../config/db');
const { createError } = require('../middleware/errorHandler');
const { computeNilai } = require('./ujianService');

const getPengumpulan = async (idmTes) => {
  const [attempts] = await db.execute(
    `SELECT a.idh_tes, a.percobaan, a.nilai, a.waktu_mulai, a.waktu_akhir, a.status,
            u.ids_user, u.nama, u.username
     FROM tbh_tes a
     JOIN tbs_user u ON a.created_by = u.ids_user
     WHERE a.idm_tes = ?
     ORDER BY a.waktu_mulai DESC`,
    [idmTes],
  );

  for (const a of attempts) {
    const [[{ belum_dinilai }]] = await db.execute(
      `SELECT COUNT(*) as belum_dinilai FROM tbh_jawaban WHERE idh_tes = ? AND nilai IS NULL`,
      [a.idh_tes],
    );
    a.belum_dinilai = belum_dinilai;
  }

  const total = attempts.length;
  const selesai = attempts.filter((a) => a.status === 2).length;
  const sedang = attempts.filter((a) => a.status === 1).length;
  const perluDinilai = attempts.filter((a) => a.belum_dinilai > 0).length;

  return { attempts, summary: { total, selesai, sedang, perlu_dinilai: perluDinilai } };
};

const getAttemptDetail = async (idhTes) => {
  const [[attempt]] = await db.execute(
    `SELECT a.idh_tes, a.idm_tes, a.data_soal, a.nilai, a.status, u.nama, u.username
     FROM tbh_tes a JOIN tbs_user u ON a.created_by = u.ids_user
     WHERE a.idh_tes = ? LIMIT 1`,
    [idhTes],
  );
  if (!attempt) throw createError('Attempt tidak ditemukan.', 404);

  const dataSoal = (typeof attempt.data_soal === 'string' ? JSON.parse(attempt.data_soal) : attempt.data_soal) || [];
  const [jawabanRows] = await db.execute(
    `SELECT idh_jawaban, idm_soal, idm_pilihan, jawaban_essai, nilai FROM tbh_jawaban WHERE idh_tes = ?`,
    [idhTes],
  );
  const jawabanMap = new Map(jawabanRows.map((j) => [Number(j.idm_soal), j]));

  const soalDetail = dataSoal.map((s) => {
    const j = jawabanMap.get(Number(s.idm_soal));
    return {
      idm_soal: s.idm_soal,
      soal: s.soal,
      tipe_soal: s.tipe_soal,
      pilihan: s.pilihan || null,
      idh_jawaban: j?.idh_jawaban ?? null,
      idm_pilihan: j?.idm_pilihan ?? null,
      jawaban_essai: j?.jawaban_essai ?? null,
      nilai: j?.nilai ?? null,
      perlu_dinilai: (s.tipe_soal === 'ESSAI' || s.tipe_soal === 'SKALA') && (j?.nilai === null || j?.nilai === undefined) && !!j,
    };
  });

  return {
    idh_tes: attempt.idh_tes,
    nama: attempt.nama,
    username: attempt.username,
    nilai_total: attempt.nilai,
    soal: soalDetail,
  };
};

const gradeJawaban = async (idhJawaban, nilai, userId) => {
  const [[jawaban]] = await db.execute(
    `SELECT idh_jawaban, idh_tes FROM tbh_jawaban WHERE idh_jawaban = ? LIMIT 1`,
    [idhJawaban],
  );
  if (!jawaban) throw createError('Jawaban tidak ditemukan.', 404);

  await db.execute(`UPDATE tbh_jawaban SET nilai = ?, updated_by = ? WHERE idh_jawaban = ?`, [
    nilai,
    userId,
    idhJawaban,
  ]);

  const total = await computeNilai(jawaban.idh_tes);
  return { idh_tes: jawaban.idh_tes, nilai_total: total };
};

module.exports = { getPengumpulan, getAttemptDetail, gradeJawaban };
