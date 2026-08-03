const Joi = require('joi');
const authService = require('../services/authService');

const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required(),
});

const login = async (req, res, next) => {
  try {
    const { error, value } = loginSchema.validate(req.body, { abortEarly: false });
    if (error) return next(Object.assign(error, { isJoi: true }));
    const result = await authService.login(value, req);
    return res.success(result, 'Login berhasil.');
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    await authService.logout(req.token, req);
    return res.success(null, 'Logout berhasil.');
  } catch (err) {
    next(err);
  }
};

const me = async (req, res, next) => {
  try {
    const data = await authService.me(req.user.user_id);
    return res.success(data, 'Data user berhasil diambil.');
  } catch (err) {
    next(err);
  }
};

module.exports = { login, logout, me };
