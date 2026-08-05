-- ============================================================================
-- Migrasi: Guard Race Condition Alur Ujian (mulai & jawab)
-- ============================================================================
-- 1. tbh_jawaban: UNIQUE (idh_tes, idm_soal) — mencegah 2 baris jawaban buat
--    soal yang sama dalam 1 attempt kalau ada request nyaris bersamaan
--    (double-klik pilihan ganda pas autosave esai lagi jalan, dst). Kode
--    jawab() di ujianService.js diubah pakai INSERT ... ON DUPLICATE KEY
--    UPDATE (atomic), bukan lagi SELECT-lalu-branch yang ada celah race-nya.
--
-- 2. tbh_tes: kolom virtual `ongoing_guard` (NULL kecuali status=1) + UNIQUE
--    (idm_tes, created_by, ongoing_guard) — mencegah 2 attempt "sedang
--    mengerjakan" (status=1) sekaligus buat peserta+tes yang sama kalau ada
--    2 klik "Mulai Ujian" nyaris bersamaan. Sengaja TIDAK unique-kan
--    (idm_tes, created_by) secara penuh supaya tidak menutup kemungkinan
--    multi-percobaan di masa depan (lihat kolom `percobaan` yang sudah ada
--    tapi belum dipakai) — attempt yang statusnya sudah selesai (status=2)
--    ongoing_guard-nya NULL, jadi tidak ikut dicek unique (MySQL: unique key
--    yang mengandung NULL tidak dianggap duplikat).
--
-- SEBELUM MENJALANKAN INI:
--   1. Cek SELECT DATABASE(); pastikan database yang benar.
--   2. Cek dulu tidak ada duplikat yang bakal bikin ALTER TABLE gagal:
--        SELECT idh_tes, idm_soal, COUNT(*) FROM tbh_jawaban
--          GROUP BY idh_tes, idm_soal HAVING COUNT(*) > 1;
--        SELECT idm_tes, created_by, COUNT(*) FROM tbh_tes
--          WHERE status = 1 GROUP BY idm_tes, created_by HAVING COUNT(*) > 1;
--      Kalau ada, tangani manual dulu (gabung/hapus baris duplikat — baris
--      yang idh_tes-nya lebih besar/lebih baru biasanya yang dipertahankan,
--      tapi cek dulu isinya sebelum hapus) sebelum lanjut ALTER.
-- ============================================================================

ALTER TABLE `tbh_jawaban`
  ADD UNIQUE KEY `uq_jawaban_soal` (`idh_tes`, `idm_soal`);

ALTER TABLE `tbh_tes`
  ADD COLUMN `ongoing_guard` TINYINT GENERATED ALWAYS AS (CASE WHEN `status` = 1 THEN 1 ELSE NULL END) VIRTUAL AFTER `status`,
  ADD UNIQUE KEY `uq_tes_ongoing` (`idm_tes`, `created_by`, `ongoing_guard`);
