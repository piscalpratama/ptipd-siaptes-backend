const db = require('../config/db');

// Rehidrasi data_soal (bentuk RINGKAS ATAU bentuk LAMA) jadi soal lengkap
// siap tampil (teks + pilihan). Format-agnostic dengan sengaja — attempt
// LAMA yang belum di-backfill (masih simpan teks penuh, jadi punya key
// `soal`) langsung dipakai apa adanya, TIDAK perlu migrasi data selesai
// dulu sebelum kode ini di-deploy. Lihat scripts/compact-data-soal.js buat
// backfill opsional yang mengecilkan data lama ke bentuk ringkas juga.
const hydrateDataSoal = async (dataSoal) => {
  const needHydrate = dataSoal.filter((s) => s.soal === undefined);
  if (!needHydrate.length) return dataSoal; // semua sudah bentuk lama (ada teks)

  const idmSoalList = [...new Set(needHydrate.map((s) => s.idm_soal))];
  const [soalRows] = await db.query(
    `SELECT idm_soal, soal, media FROM tbm_soal WHERE idm_soal IN (${idmSoalList.map(() => '?').join(',')})`,
    idmSoalList,
  );
  const soalMap = new Map(soalRows.map((s) => [s.idm_soal, s]));

  const allPilihanIds = [...new Set(needHydrate.flatMap((s) => s.pilihan_order || []))];
  let pilihanMap = new Map();
  if (allPilihanIds.length) {
    const [pilihanRows] = await db.query(
      `SELECT idm_pilihan, pilihan, media FROM tbm_pilihan WHERE idm_pilihan IN (${allPilihanIds.map(() => '?').join(',')})`,
      allPilihanIds,
    );
    pilihanMap = new Map(pilihanRows.map((p) => [p.idm_pilihan, p]));
  }

  return dataSoal.map((s) => {
    if (s.soal !== undefined) return s; // bentuk lama, sudah lengkap
    const master = soalMap.get(s.idm_soal) || {};
    return {
      idm_soal: s.idm_soal,
      soal: master.soal,
      media: master.media,
      tipe_soal: s.tipe_soal,
      skor_benar: s.skor_benar,
      skor_salah: s.skor_salah,
      skor_tidak_jawab: s.skor_tidak_jawab,
      // Pasangkan by index dari pilihan_order (BUKAN Array.from(pilihanMap.values()))
      // supaya urutan acak attempt ini tetap sama persis tiap dibuka ulang.
      pilihan: (s.pilihan_order || [])
        .map((idmPilihan) => {
          const p = pilihanMap.get(idmPilihan);
          return p ? { idm_pilihan: idmPilihan, pilihan: p.pilihan, media: p.media } : null;
        })
        .filter(Boolean),
    };
  });
};

module.exports = { hydrateDataSoal };
