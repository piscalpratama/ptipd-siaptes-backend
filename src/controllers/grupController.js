const Joi = require('joi');
const grupService = require('../services/grupService');

const createSchema = Joi.object({ nama_grup: Joi.string().max(255).required() });
const updateSchema = Joi.object({ nama_grup: Joi.string().max(255).required() });
const anggotaSchema = Joi.object({
  nim: Joi.array().items(Joi.string()).min(1).required(),
});

const getAll = async (req, res, next) => {
  try {
    const { rows, pagination } = await grupService.getAll(req.query);
    return res.paginate(rows, pagination, 'Data grup berhasil diambil.');
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const data = await grupService.getById(req.params.id);
    return res.success(data, 'Data grup berhasil diambil.');
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const { error, value } = createSchema.validate(req.body, { abortEarly: false });
    if (error) return next(Object.assign(error, { isJoi: true }));
    const result = await grupService.create(value, req.user.user_id);
    return res.success(result, 'Grup berhasil ditambahkan.', 201);
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const { error, value } = updateSchema.validate(req.body, { abortEarly: false });
    if (error) return next(Object.assign(error, { isJoi: true }));
    await grupService.update(req.params.id, value, req.user.user_id);
    return res.success(null, 'Grup berhasil diperbarui.');
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    await grupService.remove(req.params.id);
    return res.success(null, 'Grup berhasil dihapus.');
  } catch (err) { next(err); }
};

const getAnggota = async (req, res, next) => {
  try {
    const data = await grupService.getAnggota(req.params.id);
    return res.success(data, 'Data anggota grup berhasil diambil.');
  } catch (err) { next(err); }
};

const addAnggota = async (req, res, next) => {
  try {
    const { error, value } = anggotaSchema.validate(req.body, { abortEarly: false });
    if (error) return next(Object.assign(error, { isJoi: true }));
    const results = await grupService.addAnggotaByNim(req.params.id, value.nim, req.user.user_id);
    const success = results.filter((r) => r.status !== 'error').length;
    return res.success(results, `${success} dari ${results.length} peserta berhasil ditambahkan ke grup.`);
  } catch (err) { next(err); }
};

const removeAnggota = async (req, res, next) => {
  try {
    await grupService.removeAnggota(req.params.id, req.params.idsUser);
    return res.success(null, 'Peserta berhasil dikeluarkan dari grup.');
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, create, update, remove, getAnggota, addAnggota, removeAnggota };
