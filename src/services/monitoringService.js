const db = require('../config/db');
const { createError } = require('../middleware/errorHandler');

const IDLE_THRESHOLD_MS = 3 * 60 * 1000;

// Monitoring real-time peserta 1 tes — siapa sudah mulai, progress soal
// terjawab, sisa waktu, dan indikator aktif/idle. Beda dari
// penilaianService.getPengumpulan yang cuma buat keperluan grading (status
// kasar, tanpa peserta yang belum mulai sama sekali).
const getMonitoring = async (idmTes) => {
  const [[tes]] = await db.execute(
    `SELECT idm_tes, nama_tes, durasi FROM tbm_tes WHERE idm_tes = ? LIMIT 1`,
    [idmTes],
  );
  if (!tes) throw createError('Ujian tidak ditemukan.', 404);

  // Semua peserta yang di-assign ke tes ini lewat grup manapun yang tertaut.
  // Sejak multi-percobaan aktif, peserta bisa punya LEBIH DARI 1 baris
  // tbh_tes untuk tes yang sama — join lewat correlated subquery yang
  // prioritaskan attempt yang SEDANG BERJALAN, else attempt PALING TERAKHIR,
  // supaya tetap tepat 1 baris per peserta di sini (bukan fan-out).
  const [rows] = await db.query(
    `SELECT u.ids_user, u.nama, u.username,
            a.idh_tes, a.waktu_mulai, a.waktu_akhir, a.status, a.nilai, a.data_soal, a.durasi_tambahan,
            (SELECT COUNT(*) FROM tbh_tes t3 WHERE t3.idm_tes = ? AND t3.created_by = u.ids_user AND t3.status = 2) AS jumlah_percobaan
     FROM (
       SELECT DISTINCT u2.ids_user, u2.nama, u2.username
       FROM tbr_tes_grup tg
       JOIN tbs_user u2 ON FIND_IN_SET(tg.idm_grup, u2.idm_grup) AND u2.level = 'PESERTA'
       WHERE tg.idm_tes = ?
     ) u
     LEFT JOIN tbh_tes a ON a.idh_tes = (
       SELECT t2.idh_tes FROM tbh_tes t2
       WHERE t2.idm_tes = ? AND t2.created_by = u.ids_user
       ORDER BY (t2.status = 1) DESC, t2.idh_tes DESC
       LIMIT 1
     )
     ORDER BY u.nama ASC`,
    [idmTes, idmTes, idmTes],
  );

  const now = Date.now();
  const peserta = [];

  for (const r of rows) {
    if (!r.idh_tes) {
      peserta.push({
        ids_user: r.ids_user,
        nama: r.nama,
        username: r.username,
        idh_tes: null,
        status: 'belum_mulai',
        status_aktivitas: null,
        waktu_mulai: null,
        waktu_akhir: null,
        nilai: null,
        jumlah_dijawab: 0,
        total_soal: 0,
        sisa_detik: null,
        terakhir_aktif: null,
        jumlah_percobaan: r.jumlah_percobaan,
      });
      continue;
    }

    const dataSoal = (typeof r.data_soal === 'string' ? JSON.parse(r.data_soal) : r.data_soal) || [];
    const totalSoal = dataSoal.length;

    const [[{ jumlah_dijawab, terakhir_aktif }]] = await db.execute(
      `SELECT COUNT(*) as jumlah_dijawab, MAX(updated_at) as terakhir_aktif
       FROM tbh_jawaban WHERE idh_tes = ?`,
      [r.idh_tes],
    );

    const deadline = new Date(r.waktu_mulai).getTime() + (tes.durasi + Number(r.durasi_tambahan || 0)) * 60 * 1000;
    const status = r.status === 2 ? 'selesai' : r.status === 3 ? 'dipause' : now > deadline ? 'waktu_habis' : 'sedang';

    let statusAktivitas = null;
    if (status === 'sedang') {
      const lastActive = terakhir_aktif
        ? new Date(terakhir_aktif).getTime()
        : new Date(r.waktu_mulai).getTime();
      statusAktivitas = now - lastActive > IDLE_THRESHOLD_MS ? 'idle' : 'aktif';
    }

    peserta.push({
      ids_user: r.ids_user,
      nama: r.nama,
      username: r.username,
      idh_tes: r.idh_tes,
      status,
      status_aktivitas: statusAktivitas,
      waktu_mulai: r.waktu_mulai,
      waktu_akhir: r.waktu_akhir,
      nilai: r.status === 2 ? r.nilai : null,
      jumlah_dijawab,
      total_soal: totalSoal,
      sisa_detik: status === 'sedang' ? Math.max(0, Math.round((deadline - now) / 1000)) : null,
      terakhir_aktif,
      durasi_tambahan: r.durasi_tambahan || 0,
      jumlah_percobaan: r.jumlah_percobaan,
    });
  }

  const summary = {
    total: peserta.length,
    belum_mulai: peserta.filter((p) => p.status === 'belum_mulai').length,
    sedang: peserta.filter((p) => p.status === 'sedang').length,
    aktif: peserta.filter((p) => p.status_aktivitas === 'aktif').length,
    idle: peserta.filter((p) => p.status_aktivitas === 'idle').length,
    dipause: peserta.filter((p) => p.status === 'dipause').length,
    waktu_habis: peserta.filter((p) => p.status === 'waktu_habis').length,
    selesai: peserta.filter((p) => p.status === 'selesai').length,
  };

  return { nama_tes: tes.nama_tes, durasi: tes.durasi, peserta, summary };
};

module.exports = { getMonitoring };
