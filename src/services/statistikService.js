const db = require('../config/db');

const STATUS_LABEL = { 0: 'Belum Selesai', 1: 'Sedang Berjalan', 2: 'Selesai' };
const RENTANG_NILAI = ['0-20', '21-40', '41-60', '61-80', '81-100'];

const dateCondition = (col, tglDari, tglSampai) => {
  const conditions = [];
  const params = [];
  if (tglDari) {
    conditions.push(`${col} >= ?`);
    params.push(`${tglDari} 00:00:00`);
  }
  if (tglSampai) {
    conditions.push(`${col} <= ?`);
    params.push(`${tglSampai} 23:59:59`);
  }
  return { conditions, params };
};

const whereOf = (conditions) => (conditions.length ? `WHERE ${conditions.join(' AND ')}` : '');

const getStatistik = async ({ tglDari, tglSampai, idmTes } = {}) => {
  const dateFilter = dateCondition('waktu_mulai', tglDari, tglSampai);

  const [[ringkasanRaw]] = await db.query(
    `SELECT COUNT(*) as total_attempt,
            SUM(status = 2) as total_selesai,
            AVG(CASE WHEN status = 2 THEN nilai END) as rata_rata_nilai,
            AVG(CASE WHEN status = 2 AND waktu_akhir IS NOT NULL
                     THEN TIMESTAMPDIFF(MINUTE, waktu_mulai, waktu_akhir) END) as rata_rata_durasi_menit
     FROM tbh_tes ${whereOf(dateFilter.conditions)}`,
    dateFilter.params,
  );
  const [[{ total_tes }]] = await db.query(`SELECT COUNT(*) as total_tes FROM tbm_tes WHERE is_deleted = 0`);
  const [[{ total_peserta_terdaftar }]] = await db.query(
    `SELECT COUNT(*) as total_peserta_terdaftar FROM tbs_user WHERE level = 'PESERTA'`,
  );

  const [trenBulananAttempt] = await db.query(
    `SELECT DATE_FORMAT(waktu_mulai, '%Y-%m') as bulan, COUNT(*) as total
     FROM tbh_tes
     WHERE waktu_mulai >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
     GROUP BY bulan
     ORDER BY bulan ASC`,
  );

  const [distribusiStatusRaw] = await db.query(
    `SELECT status, COUNT(*) as total FROM tbh_tes ${whereOf(dateFilter.conditions)} GROUP BY status`,
    dateFilter.params,
  );
  const distribusiStatus = distribusiStatusRaw.map((r) => ({
    status: r.status,
    label: STATUS_LABEL[r.status] ?? String(r.status),
    total: Number(r.total),
  }));

  const [distribusiNilaiRaw] = await db.query(
    `SELECT
        CASE WHEN nilai <= 20 THEN '0-20'
             WHEN nilai <= 40 THEN '21-40'
             WHEN nilai <= 60 THEN '41-60'
             WHEN nilai <= 80 THEN '61-80'
             ELSE '81-100' END as rentang,
        COUNT(*) as total
     FROM tbh_tes
     ${whereOf(['status = 2', ...dateFilter.conditions])}
     GROUP BY rentang`,
    dateFilter.params,
  );
  const distribusiNilai = RENTANG_NILAI.map((rentang) => ({
    rentang,
    total: Number(distribusiNilaiRaw.find((r) => r.rentang === rentang)?.total || 0),
  }));

  const [perTesRaw] = await db.query(
    `SELECT t.idm_tes, t.nama_tes,
            COUNT(h.idh_tes) as total_peserta,
            AVG(CASE WHEN h.status = 2 THEN h.nilai END) as rata_rata_nilai
     FROM tbm_tes t
     LEFT JOIN tbh_tes h ON h.idm_tes = t.idm_tes
     WHERE t.is_deleted = 0
     GROUP BY t.idm_tes, t.nama_tes, t.tgl_mulai
     ORDER BY t.tgl_mulai DESC
     LIMIT 10`,
  );

  // ─── Soal tersulit ──────────────────────────────────────────────────────
  // tbh_jawaban ~1.3jt baris & belum ada index di idh_tes/idm_soal (temuan
  // audit sebelumnya, belum diterapkan) — query ini WAJIB di-scope supaya
  // tidak full-scan: kalau admin pilih satu idm_tes spesifik, scope ke situ;
  // kalau tidak, default 90 hari terakhir lewat waktu_mulai attempt-nya.
  // JOIN ke tbm_pilihan otomatis membatasi ke soal Pilihan Ganda saja (soal
  // esai/jawaban-singkat tidak punya idm_pilihan terisi).
  const soalConditions = ['j.idm_pilihan IS NOT NULL'];
  const soalParams = [];
  if (idmTes) {
    soalConditions.push('h.idm_tes = ?');
    soalParams.push(idmTes);
  } else {
    soalConditions.push('h.waktu_mulai >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)');
  }
  const [soalTersulitRaw] = await db.query(
    `SELECT j.idm_soal, s.soal as pertanyaan,
            COUNT(*) as total_dijawab,
            SUM(p.jawaban = 0) as total_salah
     FROM tbh_jawaban j
     JOIN tbh_tes h ON h.idh_tes = j.idh_tes
     JOIN tbm_soal s ON s.idm_soal = j.idm_soal
     JOIN tbm_pilihan p ON p.idm_pilihan = j.idm_pilihan
     WHERE ${soalConditions.join(' AND ')}
     GROUP BY j.idm_soal, s.soal
     HAVING total_dijawab >= 3
     ORDER BY (total_salah / total_dijawab) DESC
     LIMIT 10`,
    soalParams,
  );
  const soalTersulit = soalTersulitRaw.map((r) => ({
    idm_soal: r.idm_soal,
    pertanyaan: r.pertanyaan,
    total_dijawab: Number(r.total_dijawab),
    total_salah: Number(r.total_salah),
    persen_salah: Number(r.total_dijawab) ? Number(r.total_salah) / Number(r.total_dijawab) : 0,
  }));

  const totalAttempt = Number(ringkasanRaw.total_attempt || 0);
  const totalSelesai = Number(ringkasanRaw.total_selesai || 0);

  return {
    ringkasan: {
      total_tes: Number(total_tes),
      total_attempt: totalAttempt,
      total_peserta_terdaftar: Number(total_peserta_terdaftar),
      rata_rata_nilai: Number(ringkasanRaw.rata_rata_nilai || 0),
      rata_rata_durasi_menit: Number(ringkasanRaw.rata_rata_durasi_menit || 0),
      tingkat_selesai: totalAttempt ? totalSelesai / totalAttempt : 0,
    },
    tren_bulanan_attempt: trenBulananAttempt.map((r) => ({ bulan: r.bulan, total: Number(r.total) })),
    distribusi_status: distribusiStatus,
    distribusi_nilai: distribusiNilai,
    per_tes: perTesRaw.map((r) => ({
      idm_tes: r.idm_tes,
      nama_tes: r.nama_tes,
      total_peserta: Number(r.total_peserta),
      rata_rata_nilai: r.rata_rata_nilai !== null ? Number(r.rata_rata_nilai) : null,
    })),
    soal_tersulit: soalTersulit,
  };
};

module.exports = { getStatistik };
