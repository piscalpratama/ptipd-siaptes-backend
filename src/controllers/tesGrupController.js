const Joi = require('joi');
const tesGrupService = require('../services/tesGrupService');

const addGrupSchema = Joi.object({ idm_grup: Joi.number().integer().required() });
const tokenSchema = Joi.object({ expired_minutes: Joi.number().integer().min(1).optional() });

const listByTes = async (req, res, next) => {
  try {
    const data = await tesGrupService.listByTes(req.params.idmTes);
    return res.success(data, 'Data grup ujian berhasil diambil.');
  } catch (err) { next(err); }
};

const addGrup = async (req, res, next) => {
  try {
    const { error, value } = addGrupSchema.validate(req.body, { abortEarly: false });
    if (error) return next(Object.assign(error, { isJoi: true }));
    const result = await tesGrupService.addGrup(req.params.idmTes, value.idm_grup, req.user.user_id);
    return res.success(result, 'Grup berhasil ditambahkan ke ujian.', 201);
  } catch (err) { next(err); }
};

const removeGrup = async (req, res, next) => {
  try {
    await tesGrupService.removeGrup(req.params.idrTesGrup);
    return res.success(null, 'Grup berhasil dilepas dari ujian.');
  } catch (err) { next(err); }
};

const listToken = async (req, res, next) => {
  try {
    const data = await tesGrupService.listToken(req.params.idrTesGrup);
    return res.success(data, 'Data token berhasil diambil.');
  } catch (err) { next(err); }
};

const generateToken = async (req, res, next) => {
  try {
    const { error, value } = tokenSchema.validate(req.body, { abortEarly: false });
    if (error) return next(Object.assign(error, { isJoi: true }));
    const result = await tesGrupService.generateToken(req.params.idrTesGrup, value.expired_minutes, req.user.user_id);
    return res.success(result, 'Token berhasil dibuat.', 201);
  } catch (err) { next(err); }
};

const revokeToken = async (req, res, next) => {
  try {
    await tesGrupService.revokeToken(req.params.idmToken);
    return res.success(null, 'Token berhasil dicabut.');
  } catch (err) { next(err); }
};

module.exports = { listByTes, addGrup, removeGrup, listToken, generateToken, revokeToken };
