// Bangun klausa ORDER BY dari query param `sort` yang aman (whitelist-only —
// TIDAK PERNAH interpolasi nama kolom dari input user langsung, supaya tidak
// ada celah SQL injection lewat parameter sort). `allowlist` berupa
// { kode_sort: "kolom_sql ASC/DESC" }; kalau `sort` tidak dikirim atau
// tidak cocok satupun kode di allowlist, fallback ke default lama.
const buildOrderBy = (sort, allowlist, fallback) => {
  const clause = (sort && allowlist[sort]) || fallback;
  return `ORDER BY ${clause}`;
};

module.exports = { buildOrderBy };
