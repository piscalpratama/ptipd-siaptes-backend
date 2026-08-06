const Joi = require('joi');
const statistikService = require('../services/statistikService');

const querySchema = Joi.object({
  tgl_dari: Joi.date().iso().optional(),
  tgl_sampai: Joi.date().iso().optional(),
  idm_tes: Joi.number().integer().optional(),
});

const get = async (req, res, next) => {
  try {
    const { error, value } = querySchema.validate(req.query, { abortEarly: false });
    if (error) return next(Object.assign(error, { isJoi: true }));

    const data = await statistikService.getStatistik({
      tglDari: value.tgl_dari,
      tglSampai: value.tgl_sampai,
      idmTes: value.idm_tes,
    });
    return res.success(data, 'Statistik berhasil diambil.');
  } catch (err) {
    next(err);
  }
};

module.exports = { get };
