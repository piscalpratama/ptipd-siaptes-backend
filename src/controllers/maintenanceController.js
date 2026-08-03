const Joi = require('joi');
const maintenanceService = require('../services/maintenanceService');

const setSchema = Joi.object({
  active: Joi.boolean().required(),
  sampai: Joi.string().allow('', null).optional(),
});

const getStatus = async (req, res, next) => {
  try {
    const data = await maintenanceService.getStatus();
    return res.success(data, 'Status maintenance berhasil diambil.');
  } catch (err) { next(err); }
};

const setStatus = async (req, res, next) => {
  try {
    const { error, value } = setSchema.validate(req.body, { abortEarly: false });
    if (error) return next(Object.assign(error, { isJoi: true }));
    const data = await maintenanceService.setStatus(value, req.user.user_id);
    return res.success(data, 'Status maintenance berhasil diperbarui.');
  } catch (err) { next(err); }
};

module.exports = { getStatus, setStatus };
