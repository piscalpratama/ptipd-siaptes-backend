const Joi = require('joi');
const modulService = require('../services/modulService');

const createSchema = Joi.object({
  modul: Joi.string().max(250).required(),
  is_visible: Joi.number().valid(0, 1).optional(),
});

const updateSchema = Joi.object({
  modul: Joi.string().max(250).optional(),
  is_visible: Joi.number().valid(0, 1).optional(),
}).min(1);

const getAll = async (req, res, next) => {
  try {
    const { rows, pagination } = await modulService.getAll(req.query);
    return res.paginate(rows, pagination, 'Data modul berhasil diambil.');
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const data = await modulService.getById(req.params.id);
    return res.success(data, 'Data modul berhasil diambil.');
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const { error, value } = createSchema.validate(req.body, { abortEarly: false });
    if (error) return next(Object.assign(error, { isJoi: true }));
    const result = await modulService.create(value, req.user.user_id);
    return res.success(result, 'Modul berhasil ditambahkan.', 201);
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const { error, value } = updateSchema.validate(req.body, { abortEarly: false });
    if (error) return next(Object.assign(error, { isJoi: true }));
    await modulService.update(req.params.id, value, req.user.user_id);
    return res.success(null, 'Modul berhasil diperbarui.');
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    await modulService.remove(req.params.id);
    return res.success(null, 'Modul berhasil dihapus.');
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, create, update, remove };
