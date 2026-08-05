-- ============================================================================
-- Seed setting Maintenance Mode ke tbs_sistem (tabel sudah ada di skema,
-- belum pernah dipakai kode manapun sebelum fitur ini).
-- ============================================================================
-- MAINTENANCE MODE = 'AKTIF' / 'NONAKTIF'
-- MAINTENANCE SAMPAI = datetime 'YYYY-MM-DD HH:mm:ss'
--
-- Tidak wajib dijalankan — maintenanceService.setStatus() sudah upsert
-- otomatis (insert kalau belum ada, update kalau sudah ada) saat admin
-- toggle pertama kali lewat PUT /sistem/maintenance. File ini cuma buat
-- seed awal supaya row-nya kelihatan di DB sebelum toggle pertama.
--
-- Idempotent — aman dijalankan ulang.
-- ============================================================================

INSERT INTO tbs_sistem (nama_setting, setting, created_by, updated_by)
SELECT 'MAINTENANCE MODE', 'NONAKTIF', 1, 1
WHERE NOT EXISTS (
  SELECT 1 FROM tbs_sistem WHERE nama_setting = 'MAINTENANCE MODE'
);

INSERT INTO tbs_sistem (nama_setting, setting, created_by, updated_by)
SELECT 'MAINTENANCE SAMPAI', '', 1, 1
WHERE NOT EXISTS (
  SELECT 1 FROM tbs_sistem WHERE nama_setting = 'MAINTENANCE SAMPAI'
);

-- Verifikasi
SELECT nama_setting, setting FROM tbs_sistem
WHERE nama_setting IN ('MAINTENANCE MODE', 'MAINTENANCE SAMPAI');
