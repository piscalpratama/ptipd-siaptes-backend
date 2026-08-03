const Joi = require('joi');
const penilaianService = require('../services/penilaianService');

const gradeSchema = Joi.object({ nilai: Joi.number().required() });

const getPengumpulan = async (req, res, next) => {
  try {
    const data = await penilaianService.getPengumpulan(req.params.idmTes);
    return res.success(data, 'Data pengumpulan berhasil diambil.');
  } catch (err) { next(err); }
};

const getAttemptDetail = async (req, res, next) => {
  try {
    const data = await penilaianService.getAttemptDetail(req.params.idhTes);
    return res.success(data, 'Detail jawaban berhasil diambil.');
  } catch (err) { next(err); }
};

const gradeJawaban = async (req, res, next) => {
  try {
    const { error, value } = gradeSchema.validate(req.body, { abortEarly: false });
    if (error) return next(Object.assign(error, { isJoi: true }));
    const result = await penilaianService.gradeJawaban(req.params.idhJawaban, value.nilai, req.user.user_id);
    return res.success(result, 'Nilai berhasil disimpan.');
  } catch (err) { next(err); }
};

module.exports = { getPengumpulan, getAttemptDetail, gradeJawaban };
