const monitoringService = require('../services/monitoringService');

const getMonitoring = async (req, res, next) => {
  try {
    const data = await monitoringService.getMonitoring(req.params.idmTes);
    return res.success(data, 'Data monitoring berhasil diambil.');
  } catch (err) { next(err); }
};

module.exports = { getMonitoring };
