-- ============================================================================
-- Multi-percobaan ujian — peserta bisa coba ulang sampai nilai maksimal
-- (skor_maksimal) tercapai, dibatasi jumlah percobaan per-ujian (opsional).
--
-- Kolom `percobaan` di tbh_tes SUDAH ADA dari skema lama tapi tidak pernah
-- dipakai (selalu ditulis 1) — sekarang benar-benar dipakai buat nomor
-- urut percobaan. Unique constraint `uq_tes_ongoing` dari
-- sql/02_migration_ujian_race_guard.sql SUDAH dirancang kompatibel (cuma
-- unique pada attempt yang sedang berjalan, bukan seluruh riwayat), jadi
-- TIDAK perlu diubah.
-- ============================================================================

ALTER TABLE tbm_tes
  ADD COLUMN max_percobaan INT NULL COMMENT 'NULL = tanpa batas jumlah percobaan' AFTER skor_maksimal;
