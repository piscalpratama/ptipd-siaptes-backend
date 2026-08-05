-- ============================================================================
-- Migrasi: Kontrol Admin atas Attempt Ujian (monitoring)
-- ============================================================================
-- Menambah kemampuan admin buat kontrol attempt peserta langsung dari
-- halaman Monitoring: Pause, Lanjutkan, Hentikan, Tambah Durasi, Mulai Ulang,
-- Hapus (lihat ujianService.js: adminPause/adminResume/adminStop/
-- adminAddDurasi/adminRestart/adminDelete).
--
-- Kolom baru:
--   - paused_at        : kapan attempt di-pause admin (NULL kalau tidak
--                         sedang di-pause). status jadi 3 = "dipause".
--   - durasi_tambahan  : total menit tambahan yang sudah diberikan ke attempt
--                         ini (dari aksi "Tambah Durasi" ATAU kompensasi
--                         otomatis lama waktu di-pause saat resume) — dipakai
--                         di semua perhitungan deadline (bukan mengubah
--                         waktu_mulai asli, supaya waktu_mulai tetap catatan
--                         akurat kapan peserta BENERAN mulai mengerjakan).
--
-- Additive-only, aman dijalankan di dev maupun prod (backup dulu, jalankan
-- di jam sepi kalau ke prod).
--
-- SEBELUM MENJALANKAN INI: cek SELECT DATABASE(); pastikan database yang
-- benar.
-- ============================================================================

ALTER TABLE `tbh_tes`
  ADD COLUMN `paused_at` DATETIME DEFAULT NULL AFTER `waktu_akhir`,
  ADD COLUMN `durasi_tambahan` INT NOT NULL DEFAULT 0 COMMENT 'Menit tambahan dari admin (tambah-durasi atau kompensasi pause)' AFTER `paused_at`,
  MODIFY COLUMN `status` int NOT NULL DEFAULT '0' COMMENT '0=belum selesai, 1=mulai, 2=selesai, 3=dipause';
