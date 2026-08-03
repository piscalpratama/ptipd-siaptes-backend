const jwt = require('jsonwebtoken');
const db = require('../config/db');

/**
 * Verify JWT token from Authorization header.
 * Attach decoded payload to req.user.
 *
 * NOTE: tabel ci_jwt di prod_siaptes tidak punya kolom user_id/refresh_token
 * (beda dengan versi di BE ICT) — jadi validasi token cukup by `token` saja.
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.fail('Akses ditolak. Token tidak ditemukan.', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const [rows] = await db.execute(
      `SELECT id_jwt FROM ci_jwt WHERE token = ? AND expired = 'TIDAK' LIMIT 1`,
      [token],
    );

    if (!rows.length) {
      return res.fail('Token tidak valid atau sudah logout.', 401);
    }

    req.user = decoded;
    req.token = token;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Role-based access control.
 * Usage: authorize('SUPERADMIN', 'ADMIN - TES')
 */
const authorize = (...levels) => {
  return (req, res, next) => {
    if (!req.user) return res.fail('Tidak terautentikasi.', 401);
    if (!levels.includes(req.user.level)) {
      return res.fail('Akses ditolak. Anda tidak memiliki izin.', 403);
    }
    next();
  };
};

module.exports = { authenticate, authorize };
