const db = require('../config/db');
const { createError } = require('../middleware/errorHandler');
const { parseGrupIds } = require('../utils/grupUtil');

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// deadline efektif = waktu_mulai + (durasi tes + durasi_tambahan). Sengaja
// TIDAK mengubah waktu_mulai buat nambah waktu (lihat adminAddDurasi/
// adminResume) — waktu_mulai tetap catatan akurat kapan peserta BENERAN
// mulai, durasi_tambahan yang nampung semua penyesuaian waktu dari admin.
const computeDeadline = (waktuMulai, durasi, durasiTambahan = 0) =>
  new Date(new Date(waktuMulai).getTime() + (Number(durasi) + Number(durasiTambahan || 0)) * 60 * 1000);

// ─── Auto-finalisasi attempt yang lewat deadline tapi belum "selesai" ────────
// Kalau peserta tutup tab/koneksi putus pas waktu habis, tidak ada request
// /selesai yang pernah datang — attempt bisa nyangkut selamanya di status 1
// ("sedang mengerjakan"). Dipanggil lazy setiap kali attempt itu disentuh
// lagi (getSaya, getAttempt, jawab, getHasil) dari device/tab MANA PUN, jadi
// tidak bergantung ke tab browser yang sama masih terbuka pas waktu habis.
// waktu_akhir dicatat SEBAGAI deadline (bukan NOW()) supaya durasi tercatat
// tetap akurat sesuai durasi tes, bukan kapan server kebetulan baru nyadar.
// Status 3 (dipause) SENGAJA tidak disentuh di sini — attempt yang dipause
// admin tidak boleh auto-selesai lewat wall-clock, waktunya "beku" sampai
// admin resume (lihat adminResume).
const finalizeIfExpired = async (idhTes, waktuMulai, durasi, status, durasiTambahan = 0) => {
  if (status !== 1) return status;
  const deadline = computeDeadline(waktuMulai, durasi, durasiTambahan);
  if (new Date() <= deadline) return status;

  const [result] = await db.execute(
    `UPDATE tbh_tes SET status = 2, waktu_akhir = ? WHERE idh_tes = ? AND status = 1`,
    [deadline, idhTes],
  );
  if (result.affectedRows) await computeNilai(idhTes);
  return 2;
};

// ─── Daftar ujian yang tersedia buat peserta ─────────────────────────────────

const getSaya = async (pesertaId) => {
  const [[user]] = await db.execute(`SELECT idm_grup FROM tbs_user WHERE ids_user = ? LIMIT 1`, [pesertaId]);
  const grupIds = parseGrupIds(user?.idm_grup);
  if (!grupIds.length) return [];

  const placeholders = grupIds.map(() => '?').join(',');
  const [tesList] = await db.query(
    `SELECT DISTINCT t.idm_tes, t.nama_tes, t.keterangan, t.tgl_mulai, t.tgl_akhir,
            t.durasi, t.skor_maksimal, t.status_hasil, t.status_token
     FROM tbr_tes_grup rg
     JOIN tbm_tes t ON rg.idm_tes = t.idm_tes
     WHERE rg.idm_grup IN (${placeholders}) AND t.is_deleted = 0
     ORDER BY t.tgl_mulai DESC`,
    grupIds,
  );

  for (const tes of tesList) {
    const [attempts] = await db.execute(
      `SELECT idh_tes, percobaan, nilai, waktu_mulai, waktu_akhir, status, durasi_tambahan
       FROM tbh_tes WHERE idm_tes = ? AND created_by = ? ORDER BY idh_tes DESC LIMIT 1`,
      [tes.idm_tes, pesertaId],
    );
    const attempt = attempts[0] || null;
    if (attempt) {
      attempt.status = await finalizeIfExpired(attempt.idh_tes, attempt.waktu_mulai, tes.durasi, attempt.status, attempt.durasi_tambahan);
    }
    tes.attempt = attempt;
  }

  return tesList;
};

// ─── Cari idr_tes_grup peserta buat 1 tes tertentu (buat validasi token) ─────

const findTesGrupForPeserta = async (idmTes, pesertaId) => {
  const [[user]] = await db.execute(`SELECT idm_grup FROM tbs_user WHERE ids_user = ? LIMIT 1`, [pesertaId]);
  const grupIds = parseGrupIds(user?.idm_grup);
  if (!grupIds.length) return null;

  const placeholders = grupIds.map(() => '?').join(',');
  const [rows] = await db.query(
    `SELECT idr_tes_grup, idm_grup FROM tbr_tes_grup WHERE idm_tes = ? AND idm_grup IN (${placeholders}) LIMIT 1`,
    [idmTes, ...grupIds],
  );
  return rows[0] || null;
};

// ─── Generate soal sesuai aturan tbr_tes_topik ───────────────────────────────

const generateDataSoal = async (idmTes) => {
  const [rules] = await db.execute(`SELECT * FROM tbr_tes_topik WHERE idm_tes = ?`, [idmTes]);
  if (!rules.length) throw createError('Ujian ini belum punya aturan soal (tes_topik). Hubungi admin.', 400);

  const soalFinal = [];

  for (const rule of rules) {
    const [soalList] = await db.query(
      `SELECT idm_soal, soal, media, tipe_soal FROM tbm_soal
       WHERE idm_topik = ? AND tipe_soal = ? AND is_visible = 1
       ORDER BY RAND() LIMIT ${Number(rule.jumlah_soal)}`,
      [rule.idm_topik, rule.tipe_soal],
    );

    for (const s of soalList) {
      const item = {
        idm_soal: s.idm_soal,
        idm_topik: rule.idm_topik,
        soal: s.soal,
        media: s.media,
        tipe_soal: s.tipe_soal,
        skor_benar: Number(rule.skor_benar),
        skor_salah: Number(rule.skor_salah),
        skor_tidak_jawab: Number(rule.skor_tidak_jawab),
      };

      if (s.tipe_soal === 'PILIHAN GANDA') {
        const [pilihan] = await db.execute(
          `SELECT idm_pilihan, pilihan, media FROM tbm_pilihan
           WHERE idm_soal = ? AND is_visible = 1 ORDER BY idm_pilihan ASC`,
          [s.idm_soal],
        );
        item.pilihan = rule.acak_pilihan ? shuffle(pilihan) : pilihan;
      }

      soalFinal.push(item);
    }
  }

  return rules[0] && rules.some((r) => r.acak_soal) ? shuffle(soalFinal) : soalFinal;
};

// ─── Mulai ujian ──────────────────────────────────────────────────────────────

const mulai = async (idmTes, pesertaId, token) => {
  const [[tes]] = await db.execute(`SELECT * FROM tbm_tes WHERE idm_tes = ? AND is_deleted = 0 LIMIT 1`, [idmTes]);
  if (!tes) throw createError('Ujian tidak ditemukan.', 404);

  const now = new Date();
  if (now < new Date(tes.tgl_mulai) || now > new Date(tes.tgl_akhir)) {
    throw createError('Ujian ini di luar periode waktu yang ditentukan.', 403);
  }

  const tesGrup = await findTesGrupForPeserta(idmTes, pesertaId);
  if (!tesGrup) throw createError('Anda tidak terdaftar di grup peserta ujian ini.', 403);

  if (tes.status_token === 1) {
    if (!token) throw createError('Token akses wajib diisi.', 400);
    const [[tokenRow]] = await db.execute(
      `SELECT idm_token FROM tbm_token
       WHERE idr_tes_grup = ? AND token = ? AND (expired IS NULL OR expired > NOW()) LIMIT 1`,
      [tesGrup.idr_tes_grup, token],
    );
    if (!tokenRow) throw createError('Token akses tidak valid atau sudah kedaluwarsa.', 403);
  }

  // Attempt yang belum selesai -> lanjutkan, jangan bikin baru
  const [ongoing] = await db.execute(
    `SELECT idh_tes FROM tbh_tes WHERE idm_tes = ? AND created_by = ? AND status = 1 LIMIT 1`,
    [idmTes, pesertaId],
  );
  if (ongoing.length) return { idh_tes: ongoing[0].idh_tes, resumed: true };

  // Sudah pernah selesai -> tidak boleh ulang (percobaan tunggal untuk saat ini)
  const [selesai] = await db.execute(
    `SELECT idh_tes FROM tbh_tes WHERE idm_tes = ? AND created_by = ? AND status = 2 LIMIT 1`,
    [idmTes, pesertaId],
  );
  if (selesai.length) throw createError('Anda sudah menyelesaikan ujian ini sebelumnya.', 403);

  const dataSoal = await generateDataSoal(idmTes);

  try {
    const [result] = await db.execute(
      `INSERT INTO tbh_tes (idm_tes, percobaan, data_soal, nilai, waktu_mulai, status, created_by, updated_by)
       VALUES (?, 1, ?, 0, NOW(), 1, ?, ?)`,
      [idmTes, JSON.stringify(dataSoal), pesertaId, pesertaId],
    );
    return { idh_tes: result.insertId, resumed: false };
  } catch (err) {
    // Race window antara cek "ongoing" di atas dan insert ini (mis. 2 klik
    // "Mulai Ujian" nyaris bersamaan) — kalau DB tolak karena constraint
    // uq_tes_ongoing (lihat sql/02_migration_ujian_race_guard.sql), berarti request
    // lain sudah menang duluan bikin attempt-nya. Ambil & lanjutkan attempt
    // itu alih-alih gagal total.
    if (err.code === 'ER_DUP_ENTRY') {
      const [race] = await db.execute(
        `SELECT idh_tes FROM tbh_tes WHERE idm_tes = ? AND created_by = ? AND status = 1 LIMIT 1`,
        [idmTes, pesertaId],
      );
      if (race.length) return { idh_tes: race[0].idh_tes, resumed: true };
    }
    throw err;
  }
};

// ─── Ambil detail attempt (soal + jawaban tersimpan sejauh ini) ──────────────

const getAttempt = async (idhTes, pesertaId) => {
  const [[attempt]] = await db.execute(
    `SELECT idh_tes, idm_tes, percobaan, data_soal, waktu_mulai, waktu_akhir, status, durasi_tambahan
     FROM tbh_tes WHERE idh_tes = ? AND created_by = ? LIMIT 1`,
    [idhTes, pesertaId],
  );
  if (!attempt) throw createError('Attempt ujian tidak ditemukan.', 404);

  const [[tes]] = await db.execute(
    `SELECT nama_tes, durasi, skor_maksimal FROM tbm_tes WHERE idm_tes = ? LIMIT 1`,
    [attempt.idm_tes],
  );

  attempt.status = await finalizeIfExpired(attempt.idh_tes, attempt.waktu_mulai, tes.durasi, attempt.status, attempt.durasi_tambahan);

  // Attempt di-pause admin — jangan kirim soal/deadline sama sekali, cukup
  // status-nya. Frontend nampilin layar blokir penuh + poll berkala nunggu
  // admin resume, BUKAN timer yang jalan (waktu memang sengaja dibekukan).
  if (attempt.status === 3) {
    return { idh_tes: attempt.idh_tes, nama_tes: tes.nama_tes, status: attempt.status };
  }

  const [jawabanRows] = await db.execute(
    `SELECT idm_soal, idm_pilihan, jawaban_essai FROM tbh_jawaban WHERE idh_tes = ?`,
    [idhTes],
  );
  const jawabanMap = {};
  jawabanRows.forEach((j) => { jawabanMap[j.idm_soal] = { idm_pilihan: j.idm_pilihan, jawaban_essai: j.jawaban_essai }; });

  const dataSoal = (typeof attempt.data_soal === 'string' ? JSON.parse(attempt.data_soal) : attempt.data_soal) || [];
  // Sanitasi — jangan expose skor ke peserta
  const soalSanitized = dataSoal.map(({ skor_benar, skor_salah, skor_tidak_jawab, ...rest }) => rest);

  const deadline = computeDeadline(attempt.waktu_mulai, tes.durasi, attempt.durasi_tambahan);

  return {
    idh_tes: attempt.idh_tes,
    nama_tes: tes.nama_tes,
    durasi: tes.durasi,
    waktu_mulai: attempt.waktu_mulai,
    deadline,
    status: attempt.status,
    soal: soalSanitized,
    jawaban_saya: jawabanMap,
  };
};

// ─── Submit jawaban 1 soal ────────────────────────────────────────────────────

const jawab = async (idhTes, pesertaId, { idm_soal, idm_pilihan, jawaban_essai }) => {
  const [[attempt]] = await db.execute(
    `SELECT idh_tes, idm_tes, data_soal, waktu_mulai, status, durasi_tambahan FROM tbh_tes
     WHERE idh_tes = ? AND created_by = ? LIMIT 1`,
    [idhTes, pesertaId],
  );
  if (!attempt) throw createError('Attempt ujian tidak ditemukan.', 404);

  const [[tes]] = await db.execute(`SELECT durasi FROM tbm_tes WHERE idm_tes = ? LIMIT 1`, [attempt.idm_tes]);
  attempt.status = await finalizeIfExpired(attempt.idh_tes, attempt.waktu_mulai, tes.durasi, attempt.status, attempt.durasi_tambahan);
  if (attempt.status === 3) throw createError('Ujian ini sedang di-pause oleh admin, tidak bisa menjawab dulu.', 403);
  if (attempt.status !== 1) throw createError('Ujian ini sudah selesai, tidak bisa menjawab lagi.', 403);

  const dataSoal = (typeof attempt.data_soal === 'string' ? JSON.parse(attempt.data_soal) : attempt.data_soal) || [];
  const soalDef = dataSoal.find((s) => Number(s.idm_soal) === Number(idm_soal));
  if (!soalDef) throw createError('Soal tidak ditemukan dalam attempt ini.', 400);

  let nilai = null;

  if (soalDef.tipe_soal === 'PILIHAN GANDA') {
    if (!idm_pilihan) {
      nilai = soalDef.skor_tidak_jawab;
    } else {
      const [[correct]] = await db.execute(
        `SELECT idm_pilihan FROM tbm_pilihan WHERE idm_soal = ? AND jawaban = 1 LIMIT 1`,
        [idm_soal],
      );
      nilai = correct && Number(correct.idm_pilihan) === Number(idm_pilihan) ? soalDef.skor_benar : soalDef.skor_salah;
    }
  } else if (soalDef.tipe_soal === 'JAWABAN SINGKAT') {
    const [[soalRow]] = await db.execute(`SELECT jawaban FROM tbm_soal WHERE idm_soal = ? LIMIT 1`, [idm_soal]);
    const benar = String(soalRow?.jawaban || '').trim().toLowerCase();
    const jawab_ = String(jawaban_essai || '').trim().toLowerCase();
    nilai = jawab_ && jawab_ === benar ? soalDef.skor_benar : (jawab_ ? soalDef.skor_salah : soalDef.skor_tidak_jawab);
  }
  // ESSAI / SKALA -> nilai tetap null, nunggu dinilai manual oleh admin

  // Atomic upsert (bukan lagi SELECT-lalu-branch) — mengandalkan UNIQUE
  // (idh_tes, idm_soal) di sql/02_migration_ujian_race_guard.sql, jadi 2 request
  // simpan jawaban nyaris bersamaan untuk soal yang sama tidak bisa lagi
  // bikin 2 baris atau saling salip tanpa terdeteksi.
  await db.execute(
    `INSERT INTO tbh_jawaban (idh_tes, idm_pilihan, idm_soal, jawaban_essai, nilai, created_by, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE idm_pilihan = VALUES(idm_pilihan), jawaban_essai = VALUES(jawaban_essai),
       nilai = VALUES(nilai), updated_by = VALUES(updated_by)`,
    [idhTes, idm_pilihan || null, idm_soal, jawaban_essai || null, nilai, pesertaId, pesertaId],
  );

  return { tersimpan: true };
};

// ─── Hitung ulang nilai total 1 attempt (dipakai selesai() & grading manual) ─

const computeNilai = async (idhTes) => {
  const [jawaban] = await db.execute(
    `SELECT idm_soal, nilai FROM tbh_jawaban WHERE idh_tes = ?`,
    [idhTes],
  );
  const total = jawaban.reduce((sum, j) => sum + (Number(j.nilai) || 0), 0);
  const detail = jawaban.map((j) => ({ idm_soal: j.idm_soal, nilai: j.nilai }));

  await db.execute(`UPDATE tbh_tes SET nilai = ?, detail_nilai = ? WHERE idh_tes = ?`, [
    total,
    JSON.stringify(detail),
    idhTes,
  ]);

  return total;
};

// ─── Selesaikan ujian ─────────────────────────────────────────────────────────

const selesai = async (idhTes, pesertaId) => {
  const [[attempt]] = await db.execute(
    `SELECT idh_tes, status FROM tbh_tes WHERE idh_tes = ? AND created_by = ? LIMIT 1`,
    [idhTes, pesertaId],
  );
  if (!attempt) throw createError('Attempt ujian tidak ditemukan.', 404);
  if (attempt.status === 2) throw createError('Ujian ini sudah diselesaikan sebelumnya.', 403);

  await db.execute(
    `UPDATE tbh_tes SET status = 2, waktu_akhir = NOW(), updated_by = ? WHERE idh_tes = ?`,
    [pesertaId, idhTes],
  );
  const total = await computeNilai(idhTes);
  return { idh_tes: idhTes, nilai: total };
};

// ─── Lihat hasil ──────────────────────────────────────────────────────────────

const getHasil = async (idhTes, pesertaId) => {
  const [[attempt]] = await db.execute(
    `SELECT idh_tes, idm_tes, nilai, detail_nilai, waktu_mulai, waktu_akhir, status, durasi_tambahan, data_soal
     FROM tbh_tes WHERE idh_tes = ? AND created_by = ? LIMIT 1`,
    [idhTes, pesertaId],
  );
  if (!attempt) throw createError('Attempt ujian tidak ditemukan.', 404);

  const [[tes]] = await db.execute(
    `SELECT nama_tes, durasi, skor_maksimal, status_hasil, status_detail_tes FROM tbm_tes WHERE idm_tes = ? LIMIT 1`,
    [attempt.idm_tes],
  );

  const wasOngoing = attempt.status === 1;
  attempt.status = await finalizeIfExpired(attempt.idh_tes, attempt.waktu_mulai, tes.durasi, attempt.status, attempt.durasi_tambahan);
  if (wasOngoing && attempt.status === 2) {
    // Baru saja auto-finalized — nilai/detail_nilai/waktu_akhir di memori
    // masih data lama (dari sebelum computeNilai jalan), ambil ulang.
    const [[fresh]] = await db.execute(
      `SELECT nilai, detail_nilai, waktu_akhir FROM tbh_tes WHERE idh_tes = ? LIMIT 1`,
      [idhTes],
    );
    Object.assign(attempt, fresh);
  }
  if (attempt.status !== 2) throw createError('Ujian belum diselesaikan.', 400);

  if (tes.status_hasil !== 1) {
    // status_hasil ini toggle ON/OFF biasa di setting tes ("Tampilkan nilai ke
    // peserta setelah selesai") — BUKAN status "belum diumumkan" yang
    // menyiratkan bakal muncul nanti. Jangan pakai redaksi menunggu/nanti di
    // sini, karena admin bisa saja memang sengaja tidak pernah menampilkannya.
    // Nilai memang disembunyikan, tapi info non-nilai (jadwal pengerjaan,
    // jumlah soal terjawab) tetap ditampilkan supaya peserta yakin ujiannya
    // benar-benar sudah tercatat selesai di server.
    const dataSoal = (typeof attempt.data_soal === 'string' ? JSON.parse(attempt.data_soal) : attempt.data_soal) || [];
    const [[{ jumlah_dijawab }]] = await db.execute(
      `SELECT COUNT(*) as jumlah_dijawab FROM tbh_jawaban WHERE idh_tes = ?`,
      [idhTes],
    );
    return {
      nama_tes: tes.nama_tes,
      status: attempt.status,
      waktu_mulai: attempt.waktu_mulai,
      waktu_akhir: attempt.waktu_akhir,
      jumlah_dijawab,
      total_soal: dataSoal.length,
      pesan: 'Nilai untuk ujian ini tidak ditampilkan kepada peserta.',
    };
  }

  const result = {
    nama_tes: tes.nama_tes,
    skor_maksimal: tes.skor_maksimal,
    nilai: attempt.nilai,
    waktu_mulai: attempt.waktu_mulai,
    waktu_akhir: attempt.waktu_akhir,
  };
  if (tes.status_detail_tes === 1) {
    result.detail_nilai = typeof attempt.detail_nilai === 'string' ? JSON.parse(attempt.detail_nilai) : attempt.detail_nilai;
  }
  return result;
};

// ═══ Admin: kontrol attempt dari halaman Monitoring ══════════════════════════
// Semua fungsi di bawah ini dipicu admin (bukan peserta sendiri), dipakai di
// halaman Monitoring buat: Pause, Lanjutkan, Hentikan, Tambah Durasi, Mulai
// Ulang, Hapus. Tidak ada cek `created_by = pesertaId` di sini karena
// caller-nya memang admin, bukan peserta ybs — ownership by pesertaId hanya
// relevan buat endpoint yang dipanggil peserta sendiri (mulai/jawab/dst).

// ─── Pause — bekukan waktu & tolak jawaban sampai di-resume ─────────────────
const adminPause = async (idhTes, adminId) => {
  const [result] = await db.execute(
    `UPDATE tbh_tes SET status = 3, paused_at = NOW(), updated_by = ? WHERE idh_tes = ? AND status = 1`,
    [adminId, idhTes],
  );
  if (!result.affectedRows) {
    throw createError('Attempt ini tidak sedang berjalan, tidak bisa di-pause.', 409);
  }
};

// ─── Resume — lanjutkan attempt yang di-pause, kompensasi lama pause-nya ────
// ke durasi_tambahan supaya sisa waktu peserta PERSIS sama seperti sebelum
// di-pause (bukan langsung dianggap habis begitu status balik ke 1).
const adminResume = async (idhTes, adminId) => {
  const [[attempt]] = await db.execute(
    `SELECT status, paused_at FROM tbh_tes WHERE idh_tes = ? LIMIT 1`,
    [idhTes],
  );
  if (!attempt) throw createError('Attempt tidak ditemukan.', 404);
  if (attempt.status !== 3) throw createError('Attempt ini tidak sedang di-pause.', 409);

  const pausedSeconds = Math.max(0, Math.round((Date.now() - new Date(attempt.paused_at).getTime()) / 1000));
  const pausedMinutes = Math.ceil(pausedSeconds / 60); // dibulatkan ke atas, jangan sampai peserta rugi detik

  await db.execute(
    `UPDATE tbh_tes SET status = 1, paused_at = NULL, durasi_tambahan = durasi_tambahan + ?, updated_by = ?
     WHERE idh_tes = ?`,
    [pausedMinutes, adminId, idhTes],
  );
};

// ─── Hentikan paksa — selesaikan attempt sekarang juga apa pun statusnya ────
const adminStop = async (idhTes, adminId) => {
  const [[attempt]] = await db.execute(`SELECT status FROM tbh_tes WHERE idh_tes = ? LIMIT 1`, [idhTes]);
  if (!attempt) throw createError('Attempt tidak ditemukan.', 404);
  if (attempt.status === 2) throw createError('Attempt ini sudah selesai.', 409);

  await db.execute(
    `UPDATE tbh_tes SET status = 2, waktu_akhir = NOW(), paused_at = NULL, updated_by = ? WHERE idh_tes = ?`,
    [adminId, idhTes],
  );
  await computeNilai(idhTes);
};

// ─── Tambah durasi — perpanjang deadline attempt INI SAJA (bukan tes-nya) ───
const adminAddDurasi = async (idhTes, menitTambahan, adminId) => {
  const [[attempt]] = await db.execute(`SELECT status FROM tbh_tes WHERE idh_tes = ? LIMIT 1`, [idhTes]);
  if (!attempt) throw createError('Attempt tidak ditemukan.', 404);
  if (attempt.status === 2) throw createError('Attempt ini sudah selesai, tidak bisa ditambah durasi.', 409);

  await db.execute(
    `UPDATE tbh_tes SET durasi_tambahan = durasi_tambahan + ?, updated_by = ? WHERE idh_tes = ?`,
    [menitTambahan, adminId, idhTes],
  );
};

// ─── Mulai ulang — reset attempt jadi kondisi baru mulai, hapus jawaban lama ─
// Soal (data_soal) sengaja DIPERTAHANKAN (bukan di-random ulang) supaya set
// soal yang dilihat admin/proctor konsisten dengan yang sudah dijelaskan ke
// peserta sebelum masalah teknis terjadi.
const adminRestart = async (idhTes, adminId) => {
  const [[attempt]] = await db.execute(`SELECT idh_tes FROM tbh_tes WHERE idh_tes = ? LIMIT 1`, [idhTes]);
  if (!attempt) throw createError('Attempt tidak ditemukan.', 404);

  await db.execute(`DELETE FROM tbh_jawaban WHERE idh_tes = ?`, [idhTes]);
  await db.execute(
    `UPDATE tbh_tes SET status = 1, waktu_mulai = NOW(), waktu_akhir = NULL, paused_at = NULL,
       durasi_tambahan = 0, nilai = 0, detail_nilai = NULL, updated_by = ?
     WHERE idh_tes = ?`,
    [adminId, idhTes],
  );
};

// ─── Hapus — buang attempt total, peserta bisa "Mulai Ujian" dari nol lagi ──
const adminDelete = async (idhTes) => {
  const [[attempt]] = await db.execute(`SELECT idh_tes FROM tbh_tes WHERE idh_tes = ? LIMIT 1`, [idhTes]);
  if (!attempt) throw createError('Attempt tidak ditemukan.', 404);

  await db.execute(`DELETE FROM tbh_jawaban WHERE idh_tes = ?`, [idhTes]);
  await db.execute(`DELETE FROM tbh_tes WHERE idh_tes = ?`, [idhTes]);
};

module.exports = {
  getSaya,
  mulai,
  getAttempt,
  jawab,
  selesai,
  getHasil,
  computeNilai,
  adminPause,
  adminResume,
  adminStop,
  adminAddDurasi,
  adminRestart,
  adminDelete,
};
