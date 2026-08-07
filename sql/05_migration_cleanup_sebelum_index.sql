-- ============================================================================
-- Cleanup data KOTOR sebelum sql/02_migration_ujian_race_guard.sql bisa
-- di-apply — migrasi 02 itu ternyata BELUM PERNAH benar-benar dijalankan di
-- database ini (dikonfirmasi lewat SHOW INDEX: tbh_jawaban cuma punya
-- PRIMARY KEY, tidak ada UNIQUE(idh_tes, idm_soal) atau ongoing_guard sama
-- sekali), dan ada data lama yang bakal bikin ALTER TABLE-nya gagal:
--
-- 1. 49 grup (idh_tes, idm_soal) di tbh_jawaban punya jawaban DOBEL/lebih
--    (bekas bug sebelum jawab() dibetulkan pakai INSERT...ON DUPLICATE KEY
--    UPDATE) — bikin ADD UNIQUE KEY uq_jawaban_soal gagal kalau tidak
--    dibersihkan dulu.
-- 2. 26 baris tbh_tes berstatus "sedang berjalan" (status=1) yang sebenarnya
--    HANTU (dobel akun+ujian yang sama, semuanya 0 jawaban — dikonfirmasi
--    manual sebelum nulis migrasi ini) — bikin ADD UNIQUE KEY uq_tes_ongoing
--    gagal.
--
-- SETELAH migrasi ini sukses, lanjutkan jalankan sql/02_migration_ujian_race_guard.sql
-- (isinya TIDAK diulang di sini, cuma fase cleanup-nya).
--
-- ── SEBELUM MENJALANKAN INI ─────────────────────────────────────────────────
--   1. BACKUP DULU:
--        mysqldump -u <user> -p <db> tbh_jawaban tbh_tes > backup_sebelum_cleanup_percobaan.sql
--   2. Jalankan blok DIAGNOSTIK (#1) dulu, cek angkanya masuk akal
--      (harus 49 grup jawaban dobel, 26 baris ongoing hantu) sebelum lanjut
--      ke blok DELETE (#2). Kalau angkanya beda jauh dari itu, STOP, jangan
--      lanjut — data mungkin sudah berubah sejak migrasi ini ditulis,
--      tinjau ulang dulu.
--   3. Cek SELECT DATABASE(); pastikan database yang benar.
-- ============================================================================


-- ── 1. Diagnostik (jalankan & baca dulu, jangan skip) ───────────────────────

-- Harus menunjukkan 49 (per temuan investigasi):
SELECT COUNT(*) AS jumlah_grup_jawaban_dobel FROM (
  SELECT idh_tes, idm_soal FROM tbh_jawaban
  WHERE idm_soal IS NOT NULL
  GROUP BY idh_tes, idm_soal HAVING COUNT(*) > 1
) x;

-- Harus menunjukkan 26 (per temuan investigasi) — dan `jumlah_jawab` SEMUA
-- baris kandidat-hapus (winner=0) harus 0 juga, sama seperti dry-run yang
-- sudah dikonfirmasi manual sebelum menulis migrasi ini:
SELECT t.idh_tes, t.idm_tes, t.created_by, t.waktu_mulai,
       (SELECT COUNT(*) FROM tbh_jawaban j WHERE j.idh_tes = t.idh_tes) AS jumlah_jawab
FROM tbh_tes t
WHERE t.status = 1
  AND (t.idm_tes, t.created_by) IN (
    SELECT idm_tes, created_by FROM tbh_tes WHERE status = 1
    GROUP BY idm_tes, created_by HAVING COUNT(*) > 1
  )
ORDER BY t.idm_tes, t.created_by, jumlah_jawab DESC, t.idh_tes DESC;


-- ── 2. Cleanup tbh_jawaban — simpan baris TERBARU per (idh_tes, idm_soal),
--       hapus sisanya. Tie-break: updated_at terbaru, lalu idh_jawaban
--       tertinggi kalau updated_at sama persis. ───────────────────────────────

DELETE j1 FROM tbh_jawaban j1
INNER JOIN tbh_jawaban j2
  ON j1.idh_tes = j2.idh_tes
  AND j1.idm_soal = j2.idm_soal
  AND j1.idm_soal IS NOT NULL
  AND (
    j1.updated_at < j2.updated_at
    OR (j1.updated_at = j2.updated_at AND j1.idh_jawaban < j2.idh_jawaban)
  );

-- Verifikasi — harus 0 sekarang:
SELECT COUNT(*) AS sisa_grup_dobel FROM (
  SELECT idh_tes, idm_soal FROM tbh_jawaban
  WHERE idm_soal IS NOT NULL
  GROUP BY idh_tes, idm_soal HAVING COUNT(*) > 1
) x;


-- ── 3. Cleanup tbh_tes — simpan 1 attempt "ongoing" per (idm_tes,
--       created_by): yang jumlah jawabannya TERBANYAK, tie-break idh_tes
--       TERBARU. Hapus jawaban + baris tbh_tes punya attempt yang kalah. ────

CREATE TEMPORARY TABLE tmp_ongoing_winner AS
SELECT idm_tes, created_by,
       SUBSTRING_INDEX(
         GROUP_CONCAT(idh_tes ORDER BY
           (SELECT COUNT(*) FROM tbh_jawaban j WHERE j.idh_tes = t.idh_tes) DESC,
           idh_tes DESC
         ),
         ',', 1
       ) AS winner_idh_tes
FROM tbh_tes t
WHERE status = 1
GROUP BY idm_tes, created_by;

DELETE j FROM tbh_jawaban j
INNER JOIN tbh_tes t ON j.idh_tes = t.idh_tes
WHERE t.status = 1
  AND t.idh_tes NOT IN (SELECT winner_idh_tes FROM tmp_ongoing_winner);

DELETE t FROM tbh_tes t
INNER JOIN tmp_ongoing_winner w ON w.idm_tes = t.idm_tes AND w.created_by = t.created_by
WHERE t.status = 1
  AND t.idh_tes <> w.winner_idh_tes;

DROP TEMPORARY TABLE tmp_ongoing_winner;

-- Verifikasi — harus 0 sekarang:
SELECT COUNT(*) AS sisa_ongoing_dobel FROM (
  SELECT idm_tes, created_by FROM tbh_tes WHERE status = 1
  GROUP BY idm_tes, created_by HAVING COUNT(*) > 1
) x;


-- ============================================================================
-- Setelah kedua verifikasi di atas menunjukkan 0, lanjutkan jalankan
-- sql/02_migration_ujian_race_guard.sql seperti biasa.
-- ============================================================================
