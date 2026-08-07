const Joi = require('joi');
const monitoringService = require('../services/monitoringService');
const ujianService = require('../services/ujianService');

const getMonitoring = async (req, res, next) => {
  try {
    const data = await monitoringService.getMonitoring(req.params.idmTes);
    return res.success(data, 'Data monitoring berhasil diambil.');
  } catch (err) { next(err); }
};

// ═══ Aksi admin atas 1 attempt (dipicu dari halaman Monitoring) ═════════════

const pauseAttempt = async (req, res, next) => {
  try {
    await ujianService.adminPause(req.params.idhTes, req.user.user_id);
    return res.success(null, 'Ujian peserta berhasil di-pause.');
  } catch (err) { next(err); }
};

const resumeAttempt = async (req, res, next) => {
  try {
    await ujianService.adminResume(req.params.idhTes, req.user.user_id);
    return res.success(null, 'Ujian peserta berhasil dilanjutkan.');
  } catch (err) { next(err); }
};

const stopAttempt = async (req, res, next) => {
  try {
    await ujianService.adminStop(req.params.idhTes, req.user.user_id);
    return res.success(null, 'Ujian peserta berhasil dihentikan.');
  } catch (err) { next(err); }
};

const tambahDurasiSchema = Joi.object({
  menit: Joi.number().integer().min(1).max(600).required(),
});

const tambahDurasi = async (req, res, next) => {
  try {
    const { error, value } = tambahDurasiSchema.validate(req.body, { abortEarly: false });
    if (error) return next(Object.assign(error, { isJoi: true }));
    await ujianService.adminAddDurasi(req.params.idhTes, value.menit, req.user.user_id);
    return res.success(null, `Durasi peserta berhasil ditambah ${value.menit} menit.`);
  } catch (err) { next(err); }
};

const restartAttempt = async (req, res, next) => {
  try {
    await ujianService.adminRestart(req.params.idhTes, req.user.user_id);
    return res.success(null, 'Ujian peserta berhasil dimulai ulang. Jawaban sebelumnya dihapus.');
  } catch (err) { next(err); }
};

const deleteAttempt = async (req, res, next) => {
  try {
    await ujianService.adminDelete(req.params.idhTes);
    return res.success(null, 'Attempt peserta berhasil dihapus. Peserta bisa mulai ujian dari nol.');
  } catch (err) { next(err); }
};

// Reset SEMUA riwayat percobaan peserta utk 1 ujian (bukan cuma 1 attempt
// yang lagi tampil) — beda dari deleteAttempt yang keyed per idh_tes.
const resetPercobaan = async (req, res, next) => {
  try {
    const result = await ujianService.adminResetPercobaan(req.params.idmTes, req.params.idsUser);
    return res.success(result, `${result.dihapus} riwayat percobaan peserta berhasil dihapus. Peserta bisa mulai dari percobaan ke-1 lagi.`);
  } catch (err) { next(err); }
};

module.exports = {
  getMonitoring,
  pauseAttempt,
  resumeAttempt,
  stopAttempt,
  tambahDurasi,
  restartAttempt,
  deleteAttempt,
  resetPercobaan,
};
