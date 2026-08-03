const jwt = require('jsonwebtoken');
const { LEVELS } = require('../config/roles');
const maintenanceService = require('../services/maintenanceService');

// Soft-gate: hanya menolak request yang bawa JWT PESERTA valid selama
// maintenance aktif. Tanpa token, token invalid, atau level ADMIN/SUPERADMIN
// dibiarkan lewat apa adanya — authenticate() di masing-masing route yang
// menentukan nasibnya.
const maintenanceGate = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return next();

  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
    if (decoded.level !== LEVELS.PESERTA) return next();

    const status = await maintenanceService.getStatus();
    if (status.active) {
      return res.fail(
        `Sistem sedang maintenance${status.sampai ? ` sampai ${status.sampai}` : ''}.`,
        503,
      );
    }
    return next();
  } catch {
    return next();
  }
};

module.exports = maintenanceGate;
