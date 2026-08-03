// tbs_user.idm_grup adalah kolom text — bisa berisi beberapa idm_grup
// dipisah koma (bukan tabel relasi terpisah). Helper ini yang jaga format-nya
// konsisten di seluruh service yang baca/tulis kolom ini.

const parseGrupIds = (idmGrupText) => {
  if (!idmGrupText) return [];
  return String(idmGrupText)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
};

const serializeGrupIds = (ids) => ids.filter(Boolean).join(',');

const addGrupId = (idmGrupText, idmGrup) => {
  const ids = parseGrupIds(idmGrupText);
  const idStr = String(idmGrup);
  if (!ids.includes(idStr)) ids.push(idStr);
  return serializeGrupIds(ids);
};

const removeGrupId = (idmGrupText, idmGrup) => {
  const ids = parseGrupIds(idmGrupText).filter((id) => id !== String(idmGrup));
  return serializeGrupIds(ids);
};

module.exports = { parseGrupIds, serializeGrupIds, addGrupId, removeGrupId };
