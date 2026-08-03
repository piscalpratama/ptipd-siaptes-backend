/**
 * Auth untuk endpoint server-to-server (dipanggil BE ICT, bukan user login).
 * Pakai shared secret key di header `x-service-key`, dicocokkan ke env
 * ICT_SERVICE_KEY.
 *
 * Endpoint /tes-grup/histori SENGAJA tidak dipasangi middleware ini —
 * itu kontrak lama yang sudah dipakai syncNilaiService.js di BE ICT tanpa
 * header auth. Kalau mau diamankan juga, update dulu fetchFromSiaptes()
 * di BE ICT supaya kirim header ini, baru pasang middleware di endpoint itu.
 */
const serviceAuth = (req, res, next) => {
  const key = req.headers['x-service-key'];
  const expected = process.env.ICT_SERVICE_KEY;

  if (!expected) {
    return res.fail('ICT_SERVICE_KEY belum dikonfigurasi di server.', 500);
  }
  if (!key || key !== expected) {
    return res.fail('Akses ditolak. Service key tidak valid.', 401);
  }
  next();
};

module.exports = serviceAuth;
