const Joi = require('joi');
const tesService = require('../services/tesService');

const createSchema = Joi.object({
  nama_tes: Joi.string().max(255).required(),
  keterangan: Joi.string().allow('', null).optional(),
  tgl_mulai: Joi.string().isoDate().required(),
  tgl_akhir: Joi.string().isoDate().required(),
  durasi: Joi.number().integer().min(1).required(),
  skor_maksimal: Joi.number().required(),
  status_hasil: Joi.number().valid(0, 1).optional(),
  status_detail_tes: Joi.number().valid(0, 1).optional(),
  status_token: Joi.number().valid(0, 1).optional(),
});

const updateSchema = Joi.object({
  nama_tes: Joi.string().max(255).optional(),
  keterangan: Joi.string().allow('', null).optional(),
  tgl_mulai: Joi.string().isoDate().optional(),
  tgl_akhir: Joi.string().isoDate().optional(),
  durasi: Joi.number().integer().min(1).optional(),
  skor_maksimal: Joi.number().optional(),
  status_hasil: Joi.number().valid(0, 1).optional(),
  status_detail_tes: Joi.number().valid(0, 1).optional(),
  status_token: Joi.number().valid(0, 1).optional(),
}).min(1);

const getAll = async (req, res, next) => {
  try {
    const { rows, pagination } = await tesService.getAll(req.query);
    return res.paginate(rows, pagination, 'Data ujian berhasil diambil.');
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const data = await tesService.getById(req.params.id);
    return res.success(data, 'Data ujian berhasil diambil.');
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const { error, value } = createSchema.validate(req.body, { abortEarly: false });
    if (error) return next(Object.assign(error, { isJoi: true }));
    const result = await tesService.create(value, req.user.user_id);
    return res.success(result, 'Ujian berhasil ditambahkan.', 201);
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const { error, value } = updateSchema.validate(req.body, { abortEarly: false });
    if (error) return next(Object.assign(error, { isJoi: true }));
    await tesService.update(req.params.id, value, req.user.user_id);
    return res.success(null, 'Ujian berhasil diperbarui.');
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    await tesService.remove(req.params.id);
    return res.success(null, 'Ujian berhasil dihapus.');
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, create, update, remove };
