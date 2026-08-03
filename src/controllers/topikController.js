const Joi = require('joi');
const topikService = require('../services/topikService');

const createSchema = Joi.object({
  idm_modul: Joi.number().integer().required(),
  topik: Joi.string().max(255).required(),
  deskripsi: Joi.string().allow('', null).optional(),
  is_visible: Joi.number().valid(0, 1).optional(),
});

const updateSchema = Joi.object({
  idm_modul: Joi.number().integer().optional(),
  topik: Joi.string().max(255).optional(),
  deskripsi: Joi.string().allow('', null).optional(),
  is_visible: Joi.number().valid(0, 1).optional(),
}).min(1);

const getAll = async (req, res, next) => {
  try {
    const { rows, pagination } = await topikService.getAll(req.query);
    return res.paginate(rows, pagination, 'Data topik berhasil diambil.');
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const data = await topikService.getById(req.params.id);
    return res.success(data, 'Data topik berhasil diambil.');
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const { error, value } = createSchema.validate(req.body, { abortEarly: false });
    if (error) return next(Object.assign(error, { isJoi: true }));
    const result = await topikService.create(value, req.user.user_id);
    return res.success(result, 'Topik berhasil ditambahkan.', 201);
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const { error, value } = updateSchema.validate(req.body, { abortEarly: false });
    if (error) return next(Object.assign(error, { isJoi: true }));
    await topikService.update(req.params.id, value, req.user.user_id);
    return res.success(null, 'Topik berhasil diperbarui.');
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    await topikService.remove(req.params.id);
    return res.success(null, 'Topik berhasil dihapus.');
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, create, update, remove };
