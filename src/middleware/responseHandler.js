/**
 * Attach helper methods to res object:
 *   res.success(data, message, statusCode)
 *   res.paginate(data, pagination, message)
 *   res.fail(message, statusCode, errors)
 */
const responseHandler = (req, res, next) => {
  res.success = (data = null, message = 'Berhasil.', statusCode = 200) => {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  };

  res.paginate = (data = [], pagination = {}, message = 'Berhasil.') => {
    return res.status(200).json({
      success: true,
      message,
      data: { data, ...pagination },
    });
  };

  res.fail = (message = 'Terjadi kesalahan.', statusCode = 400, errors = null) => {
    const body = { success: false, message };
    if (errors) body.errors = errors;
    return res.status(statusCode).json(body);
  };

  next();
};

module.exports = responseHandler;
