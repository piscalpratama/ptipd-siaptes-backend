const Joi = require('joi');
const integrasiService = require('../services/integrasiService');

const pushSchema = Joi.object({
  idm_grup: Joi.number().integer().required(),
  peserta: Joi.array()
    .items(
      Joi.object({
        nim: Joi.string().required(),
        nama: Joi.string().allow('', null).optional(),
      }),
    )
    .min(1)
    .required(),
});

const pushPeserta = async (req, res, next) => {
  try {
    const { error, value } = pushSchema.validate(req.body, { abortEarly: false });
    if (error) return next(Object.assign(error, { isJoi: true }));
    const results = await integrasiService.pushPeserta(value.idm_grup, value.peserta);
    const success = results.filter((r) => r.status !== 'error').length;
    return res.success(results, `${success} dari ${results.length} peserta berhasil didaftarkan ke grup ujian.`);
  } catch (err) { next(err); }
};

const getHistori = async (req, res, next) => {
  try {
    const { rows, pagination } = await integrasiService.getHistori(req.query);
    return res.paginate(rows, pagination, `${rows.length} hasil ujian ditemukan.`);
  } catch (err) { next(err); }
};

const upsertGrupSchema = Joi.object({
  nama_grup: Joi.string().max(255).required(),
});

const upsertGrup = async (req, res, next) => {
  try {
    const { error, value } = upsertGrupSchema.validate(req.body, { abortEarly: false });
    if (error) return next(Object.assign(error, { isJoi: true }));
    const result = await integrasiService.upsertGrupByNama(value.nama_grup);
    return res.success(
      result,
      result.created ? 'Grup ujian baru berhasil dibuat.' : 'Grup ujian sudah ada, dipakai kembali.',
    );
  } catch (err) { next(err); }
};

module.exports = { pushPeserta, getHistori, upsertGrup };
