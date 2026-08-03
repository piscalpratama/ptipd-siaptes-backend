const Joi = require('joi');
const tesTopikService = require('../services/tesTopikService');

const TIPE_SOAL = ['PILIHAN GANDA', 'SKALA', 'JAWABAN SINGKAT', 'ESSAI'];

const createSchema = Joi.object({
  idm_topik: Joi.number().integer().required(),
  tipe_soal: Joi.string().valid(...TIPE_SOAL).required(),
  tingkat_kesulitan: Joi.number().integer().min(1).max(5).optional(),
  jumlah_soal: Joi.number().integer().min(1).required(),
  jumlah_pilihan: Joi.number().integer().min(2).max(10).optional(),
  acak_soal: Joi.boolean().optional(),
  acak_pilihan: Joi.boolean().optional(),
  skor_benar: Joi.number().required(),
  skor_salah: Joi.number().optional(),
  skor_tidak_jawab: Joi.number().optional(),
});

const updateSchema = createSchema.fork(
  ['idm_topik', 'tipe_soal', 'jumlah_soal', 'skor_benar'],
  (s) => s.optional(),
).min(1);

const listByTes = async (req, res, next) => {
  try {
    const data = await tesTopikService.listByTes(req.params.idmTes);
    return res.success(data, 'Data aturan soal berhasil diambil.');
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const { error, value } = createSchema.validate(req.body, { abortEarly: false });
    if (error) return next(Object.assign(error, { isJoi: true }));
    const result = await tesTopikService.create(req.params.idmTes, value, req.user.user_id);
    return res.success(result, 'Aturan soal berhasil ditambahkan.', 201);
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const { error, value } = updateSchema.validate(req.body, { abortEarly: false });
    if (error) return next(Object.assign(error, { isJoi: true }));
    await tesTopikService.update(req.params.idrTesTopik, value, req.user.user_id);
    return res.success(null, 'Aturan soal berhasil diperbarui.');
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    await tesTopikService.remove(req.params.idrTesTopik);
    return res.success(null, 'Aturan soal berhasil dihapus.');
  } catch (err) { next(err); }
};

module.exports = { listByTes, create, update, remove };
