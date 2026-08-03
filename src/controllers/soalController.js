const Joi = require('joi');
const soalService = require('../services/soalService');

const TIPE_SOAL = ['PILIHAN GANDA', 'JAWABAN SINGKAT', 'ESSAI', 'SKALA'];

const pilihanSchema = Joi.object({
  pilihan: Joi.string().required(),
  media: Joi.string().allow('', null).optional(),
  jawaban: Joi.boolean().optional(),
  is_visible: Joi.number().valid(0, 1).optional(),
});

const createSchema = Joi.object({
  idm_topik: Joi.number().integer().required(),
  soal: Joi.string().required(),
  media: Joi.string().allow('', null).optional(),
  tipe_soal: Joi.string().valid(...TIPE_SOAL).required(),
  jawaban: Joi.string().allow('', null).optional(),
  tingkat_kesulitan: Joi.number().integer().min(1).max(5).optional(),
  is_visible: Joi.number().valid(0, 1).optional(),
  pilihan: Joi.array().items(pilihanSchema).optional(),
});

const updateSchema = Joi.object({
  idm_topik: Joi.number().integer().optional(),
  soal: Joi.string().optional(),
  media: Joi.string().allow('', null).optional(),
  tipe_soal: Joi.string().valid(...TIPE_SOAL).optional(),
  jawaban: Joi.string().allow('', null).optional(),
  tingkat_kesulitan: Joi.number().integer().min(1).max(5).optional(),
  is_visible: Joi.number().valid(0, 1).optional(),
  pilihan: Joi.array().items(pilihanSchema).optional(),
}).min(1);

const getAll = async (req, res, next) => {
  try {
    const { rows, pagination } = await soalService.getAll(req.query);
    return res.paginate(rows, pagination, 'Data soal berhasil diambil.');
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const data = await soalService.getById(req.params.id);
    return res.success(data, 'Data soal berhasil diambil.');
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const { error, value } = createSchema.validate(req.body, { abortEarly: false });
    if (error) return next(Object.assign(error, { isJoi: true }));
    const result = await soalService.create(value, req.user.user_id);
    return res.success(result, 'Soal berhasil ditambahkan.', 201);
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const { error, value } = updateSchema.validate(req.body, { abortEarly: false });
    if (error) return next(Object.assign(error, { isJoi: true }));
    await soalService.update(req.params.id, value, req.user.user_id);
    return res.success(null, 'Soal berhasil diperbarui.');
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    await soalService.remove(req.params.id);
    return res.success(null, 'Soal berhasil dihapus.');
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, create, update, remove };
