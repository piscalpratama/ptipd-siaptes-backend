const db = require('../config/db');

// tbs_sistem sudah ada di skema tapi belum pernah dipakai kode manapun —
// dipakai di sini sebagai key-value setting generik (nama_setting/setting),
// sama polanya dengan tbl_ict_setting di BE ICT.
const NAMA_MODE = 'MAINTENANCE MODE'; // 'AKTIF' | 'NONAKTIF'
const NAMA_SAMPAI = 'MAINTENANCE SAMPAI'; // datetime string

const getStatus = async () => {
  const [rows] = await db.execute(
    `SELECT nama_setting, setting FROM tbs_sistem WHERE nama_setting IN (?, ?)`,
    [NAMA_MODE, NAMA_SAMPAI],
  );
  const map = {};
  rows.forEach((r) => { map[r.nama_setting] = r.setting; });
  return {
    active: map[NAMA_MODE] === 'AKTIF',
    sampai: map[NAMA_SAMPAI] || null,
  };
};

const setStatus = async ({ active, sampai }, userId) => {
  const upsert = async (nama, value) => {
    const [existing] = await db.execute(
      `SELECT ids_sistem FROM tbs_sistem WHERE nama_setting = ? LIMIT 1`,
      [nama],
    );
    if (existing.length) {
      await db.execute(
        `UPDATE tbs_sistem SET setting = ?, updated_by = ? WHERE ids_sistem = ?`,
        [value, userId, existing[0].ids_sistem],
      );
    } else {
      await db.execute(
        `INSERT INTO tbs_sistem (nama_setting, setting, created_by, updated_by) VALUES (?, ?, ?, ?)`,
        [nama, value, userId, userId],
      );
    }
  };

  await upsert(NAMA_MODE, active ? 'AKTIF' : 'NONAKTIF');
  await upsert(NAMA_SAMPAI, sampai || '');

  return getStatus();
};

module.exports = { getStatus, setStatus };
