const Joi = require('joi');
const ujianService = require('../services/ujianService');

const mulaiSchema = Joi.object({ token: Joi.string().allow('', null).optional() });
const jawabSchema = Joi.object({
  idm_soal: Joi.number().integer().required(),
  idm_pilihan: Joi.number().integer().optional().allow(null),
  jawaban_essai: Joi.string().allow('', null).optional(),
});

const getSaya = async (req, res, next) => {
  try {
    const data = await ujianService.getSaya(req.user.user_id);
    return res.success(data, 'Data ujian berhasil diambil.');
  } catch (err) { next(err); }
};

const mulai = async (req, res, next) => {
  try {
    const { error, value } = mulaiSchema.validate(req.body, { abortEarly: false });
    if (error) return next(Object.assign(error, { isJoi: true }));
    const result = await ujianService.mulai(req.params.idmTes, req.user.user_id, value.token);
    return res.success(result, result.resumed ? 'Melanjutkan ujian yang sedang berjalan.' : 'Ujian dimulai.');
  } catch (err) { next(err); }
};

const getAttempt = async (req, res, next) => {
  try {
    const data = await ujianService.getAttempt(req.params.idhTes, req.user.user_id);
    return res.success(data, 'Data attempt berhasil diambil.');
  } catch (err) { next(err); }
};

const jawab = async (req, res, next) => {
  try {
    const { error, value } = jawabSchema.validate(req.body, { abortEarly: false });
    if (error) return next(Object.assign(error, { isJoi: true }));
    const result = await ujianService.jawab(req.params.idhTes, req.user.user_id, value);
    return res.success(result, 'Jawaban tersimpan.');
  } catch (err) { next(err); }
};

const selesai = async (req, res, next) => {
  try {
    const result = await ujianService.selesai(req.params.idhTes, req.user.user_id);
    return res.success(result, 'Ujian berhasil diselesaikan.');
  } catch (err) { next(err); }
};

const getHasil = async (req, res, next) => {
  try {
    const data = await ujianService.getHasil(req.params.idhTes, req.user.user_id);
    return res.success(data, 'Hasil ujian berhasil diambil.');
  } catch (err) { next(err); }
};

module.exports = { getSaya, mulai, getAttempt, jawab, selesai, getHasil };
