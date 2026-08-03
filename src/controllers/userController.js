const Joi = require('joi');
const userService = require('../services/userService');
const { ALL_LEVELS } = require('../config/roles');

const createSchema = Joi.object({
  nama: Joi.string().max(255).required(),
  username: Joi.string().max(255).required(),
  password: Joi.string().min(6).required(),
  level: Joi.string().valid(...ALL_LEVELS).required(),
  detail: Joi.string().allow('', null).optional(),
});

const updateSchema = Joi.object({
  nama: Joi.string().max(255).optional(),
  password: Joi.string().min(6).optional().allow(''),
  level: Joi.string().valid(...ALL_LEVELS).optional(),
  detail: Joi.string().allow('', null).optional(),
}).min(1);

const getAll = async (req, res, next) => {
  try {
    const { rows, pagination } = await userService.getAll(req.query);
    return res.paginate(rows, pagination, 'Data user berhasil diambil.');
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const data = await userService.getById(req.params.id);
    return res.success(data, 'Data user berhasil diambil.');
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const { error, value } = createSchema.validate(req.body, { abortEarly: false });
    if (error) return next(Object.assign(error, { isJoi: true }));
    const result = await userService.create(value);
    return res.success(result, 'User berhasil ditambahkan.', 201);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const { error, value } = updateSchema.validate(req.body, { abortEarly: false });
    if (error) return next(Object.assign(error, { isJoi: true }));
    await userService.update(req.params.id, value);
    return res.success(null, 'User berhasil diperbarui.');
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await userService.remove(req.params.id);
    return res.success(null, 'User berhasil dihapus.');
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getById, create, update, remove };
