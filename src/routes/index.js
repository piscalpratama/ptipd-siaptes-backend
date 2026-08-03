const express = require('express');
const router = express.Router();

const { authenticate, authorize } = require('../middleware/auth');
const serviceAuth = require('../middleware/serviceAuth');
const { ALL_LEVELS, ADMIN_LEVELS, SOAL_LEVELS, TES_LEVELS, LEVELS } = require('../config/roles');

const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const modulController = require('../controllers/modulController');
const topikController = require('../controllers/topikController');
const soalController = require('../controllers/soalController');
const grupController = require('../controllers/grupController');
const tesController = require('../controllers/tesController');
const tesGrupController = require('../controllers/tesGrupController');
const tesTopikController = require('../controllers/tesTopikController');
const ujianController = require('../controllers/ujianController');
const penilaianController = require('../controllers/penilaianController');
const monitoringController = require('../controllers/monitoringController');
const integrasiController = require('../controllers/integrasiController');
const maintenanceController = require('../controllers/maintenanceController');

// ─── Auth ─────────────────────────────────────────────────────────────────────
router.post('/auth/login', authController.login);
router.post('/auth/logout', authenticate, authController.logout);
router.get('/auth/me', authenticate, authController.me);

// ─── Maintenance mode ─────────────────────────────────────────────────────────
router.get('/maintenance-status', maintenanceController.getStatus); // publik
router.put('/sistem/maintenance', authenticate, authorize(LEVELS.SUPERADMIN), maintenanceController.setStatus);

// ─── User Management (SUPERADMIN) ────────────────────────────────────────────
router.get('/users', authenticate, authorize(LEVELS.SUPERADMIN), userController.getAll);
router.get('/users/:id', authenticate, authorize(LEVELS.SUPERADMIN), userController.getById);
router.post('/users', authenticate, authorize(LEVELS.SUPERADMIN), userController.create);
router.put('/users/:id', authenticate, authorize(LEVELS.SUPERADMIN), userController.update);
router.delete('/users/:id', authenticate, authorize(LEVELS.SUPERADMIN), userController.remove);

// ─── Modul (ADMIN - SOAL) ─────────────────────────────────────────────────────
router.get('/modul', authenticate, authorize(...ADMIN_LEVELS), modulController.getAll);
router.get('/modul/:id', authenticate, authorize(...ADMIN_LEVELS), modulController.getById);
router.post('/modul', authenticate, authorize(...SOAL_LEVELS), modulController.create);
router.put('/modul/:id', authenticate, authorize(...SOAL_LEVELS), modulController.update);
router.delete('/modul/:id', authenticate, authorize(...SOAL_LEVELS), modulController.remove);

// ─── Topik ────────────────────────────────────────────────────────────────────
router.get('/topik', authenticate, authorize(...ADMIN_LEVELS), topikController.getAll);
router.get('/topik/:id', authenticate, authorize(...ADMIN_LEVELS), topikController.getById);
router.post('/topik', authenticate, authorize(...SOAL_LEVELS), topikController.create);
router.put('/topik/:id', authenticate, authorize(...SOAL_LEVELS), topikController.update);
router.delete('/topik/:id', authenticate, authorize(...SOAL_LEVELS), topikController.remove);

// ─── Soal ─────────────────────────────────────────────────────────────────────
router.get('/soal', authenticate, authorize(...ADMIN_LEVELS), soalController.getAll);
router.get('/soal/:id', authenticate, authorize(...ADMIN_LEVELS), soalController.getById);
router.post('/soal', authenticate, authorize(...SOAL_LEVELS), soalController.create);
router.put('/soal/:id', authenticate, authorize(...SOAL_LEVELS), soalController.update);
router.delete('/soal/:id', authenticate, authorize(...SOAL_LEVELS), soalController.remove);

// ─── Grup peserta (ADMIN - TES) ───────────────────────────────────────────────
router.get('/grup', authenticate, authorize(...ADMIN_LEVELS), grupController.getAll);
router.get('/grup/:id', authenticate, authorize(...ADMIN_LEVELS), grupController.getById);
router.post('/grup', authenticate, authorize(...TES_LEVELS), grupController.create);
router.put('/grup/:id', authenticate, authorize(...TES_LEVELS), grupController.update);
router.delete('/grup/:id', authenticate, authorize(...TES_LEVELS), grupController.remove);
router.get('/grup/:id/anggota', authenticate, authorize(...ADMIN_LEVELS), grupController.getAnggota);
router.post('/grup/:id/anggota', authenticate, authorize(...TES_LEVELS), grupController.addAnggota);
router.delete('/grup/:id/anggota/:idsUser', authenticate, authorize(...TES_LEVELS), grupController.removeAnggota);

// ─── Tes (ujian) ──────────────────────────────────────────────────────────────
router.get('/tes', authenticate, authorize(...ADMIN_LEVELS), tesController.getAll);
router.get('/tes/:id', authenticate, authorize(...ADMIN_LEVELS), tesController.getById);
router.post('/tes', authenticate, authorize(...TES_LEVELS), tesController.create);
router.put('/tes/:id', authenticate, authorize(...TES_LEVELS), tesController.update);
router.delete('/tes/:id', authenticate, authorize(...TES_LEVELS), tesController.remove);

// ─── Tes ↔ Grup + Token akses ─────────────────────────────────────────────────
router.get('/tes/:idmTes/grup', authenticate, authorize(...ADMIN_LEVELS), tesGrupController.listByTes);
router.post('/tes/:idmTes/grup', authenticate, authorize(...TES_LEVELS), tesGrupController.addGrup);
router.delete('/tes-grup/:idrTesGrup', authenticate, authorize(...TES_LEVELS), tesGrupController.removeGrup);
router.get('/tes-grup/:idrTesGrup/token', authenticate, authorize(...ADMIN_LEVELS), tesGrupController.listToken);
router.post('/tes-grup/:idrTesGrup/token', authenticate, authorize(...TES_LEVELS), tesGrupController.generateToken);
router.delete('/token/:idmToken', authenticate, authorize(...TES_LEVELS), tesGrupController.revokeToken);

// ─── Tes ↔ Topik (aturan generate soal) ──────────────────────────────────────
router.get('/tes/:idmTes/topik', authenticate, authorize(...ADMIN_LEVELS), tesTopikController.listByTes);
router.post('/tes/:idmTes/topik', authenticate, authorize(...TES_LEVELS), tesTopikController.create);
router.put('/tes-topik/:idrTesTopik', authenticate, authorize(...TES_LEVELS), tesTopikController.update);
router.delete('/tes-topik/:idrTesTopik', authenticate, authorize(...TES_LEVELS), tesTopikController.remove);

// ─── Ujian — peserta ──────────────────────────────────────────────────────────
router.get('/ujian/saya', authenticate, authorize(LEVELS.PESERTA), ujianController.getSaya);
router.post('/ujian/:idmTes/mulai', authenticate, authorize(LEVELS.PESERTA), ujianController.mulai);
router.get('/ujian/attempt/:idhTes', authenticate, authorize(LEVELS.PESERTA), ujianController.getAttempt);
router.post('/ujian/attempt/:idhTes/jawab', authenticate, authorize(LEVELS.PESERTA), ujianController.jawab);
router.post('/ujian/attempt/:idhTes/selesai', authenticate, authorize(LEVELS.PESERTA), ujianController.selesai);
router.get('/ujian/attempt/:idhTes/hasil', authenticate, authorize(LEVELS.PESERTA), ujianController.getHasil);

// ─── Ujian — penilaian esai (admin/instruktur soal & tes) ────────────────────
router.get('/ujian/pengumpulan/:idmTes', authenticate, authorize(...ADMIN_LEVELS), penilaianController.getPengumpulan);
router.get('/ujian/admin/attempt/:idhTes', authenticate, authorize(...ADMIN_LEVELS), penilaianController.getAttemptDetail);
router.put('/ujian/admin/jawaban/:idhJawaban/nilai', authenticate, authorize(...ADMIN_LEVELS), penilaianController.gradeJawaban);
router.get('/ujian/monitoring/:idmTes', authenticate, authorize(...ADMIN_LEVELS), monitoringController.getMonitoring);

// ─── Integrasi ICT ────────────────────────────────────────────────────────────
// POST /integrasi/peserta — dipanggil BE ICT (server-to-server), pakai
// header x-service-key, BUKAN token JWT user.
router.post('/integrasi/peserta', serviceAuth, integrasiController.pushPeserta);

// POST /integrasi/grup — dipanggil BE ICT buat upsert grup ujian by nama dan
// sync-kan idm_grup hasilnya ke siaptes_idm_grup di tbl_setting_kelas.
router.post('/integrasi/grup', serviceAuth, integrasiController.upsertGrup);

// GET /tes-grup/histori — kontrak LAMA yang sudah dipakai syncNilaiService.js
// di BE ICT tanpa auth header sama sekali. Sengaja dibiarkan publik supaya
// tidak breaking change — kalau mau diamankan, update dulu pemanggilnya di
// BE ICT untuk kirim x-service-key, baru pasang serviceAuth di sini juga.
router.get('/tes-grup/histori', integrasiController.getHistori);

module.exports = router;
