const errorHandler = (err, req, res, next) => {
  // Joi validation error (passed manually)
  if (err.isJoi) {
    return res.status(400).json({
      success: false,
      message: 'Validasi gagal.',
      errors: err.details.map((d) => ({
        field: d.context?.key || null,
        message: d.message.replace(/['"]/g, ''),
      })),
    });
  }

  // MySQL errors
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false,
      message: 'Data sudah ada / duplikat.',
    });
  }

  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({
      success: false,
      message: 'Referensi data tidak ditemukan.',
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Token tidak valid.',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token sudah kadaluarsa.',
    });
  }

  // Custom app errors
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  // Unexpected errors — don't leak internals
  console.error('[ERROR]', {
    url: req.originalUrl,
    method: req.method,
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  return res.status(500).json({
    success: false,
    message: 'Terjadi kesalahan pada server.',
  });
};

// Helper: create app error with status code
const createError = (message, statusCode = 400) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

module.exports = { errorHandler, createError };
