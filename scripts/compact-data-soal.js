// Backfill tbh_tes.data_soal dari bentuk LAMA (teks soal+pilihan lengkap
// per baris, ~47KB/attempt) ke bentuk RINGKAS (idm_soal + skor +
// pilihan_order, ~12-15KB/attempt) — lihat plan/diskusi soal kenapa
// tbh_tes bisa 1,6GB cuma dari 13rb baris.
//
// Kode BARU (generateDataSoal di src/services/ujianService.js) sudah
// otomatis nulis bentuk ringkas ini buat attempt BARU — script ini cuma
// buat ngecilin data LAMA yang masih kesimpen bentuk penuh.
//
// Pakai --dry-run dulu (tidak nulis apa pun, cuma laporan estimasi),
// baru jalankan tanpa flag itu kalau sudah yakin.
//
//   node scripts/compact-data-soal.js --dry-run
//   node scripts/compact-data-soal.js
//
// Setelah backfill BENERAN (bukan dry-run) selesai, jalankan manual di DB:
//   OPTIMIZE TABLE tbh_tes;
// supaya InnoDB beneran mengecilkan file .ibd di disk (UPDATE yang
// memperkecil isi baris TIDAK otomatis mengecilkan file tanpa ini).
//
// Aman di-Ctrl+C / putus koneksi di tengah jalan dan dijalankan ulang dari
// awal — baris yang sudah dikecilkan otomatis kedeteksi & dilewati (lihat
// `parsed[0].soal === undefined`), jadi tidak akan diproses dobel. Query DB
// juga sudah dibungkus retry otomatis (lihat withRetry) buat network blip.

require('dotenv').config();
const db = require('../src/config/db');

const DRY_RUN = process.argv.includes('--dry-run');
const BATCH_SIZE = 200;
const MAX_RETRY = 5;

// Koneksi DB sempat putus di tengah jalan waktu dry-run pertama kali
// (network blip, sekitar 3.800/13.715 baris) — bungkus tiap query DB pakai
// retry dgn backoff supaya run yang lebih lama (mode nulis beneran) tidak
// gampang gagal total gara-gara 1 hiccup jaringan sesaat.
async function withRetry(fn, label) {
  let lastErr;
  for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const retriable = ['PROTOCOL_CONNECTION_LOST', 'ECONNRESET', 'ETIMEDOUT', 'ER_LOCK_WAIT_TIMEOUT'].includes(e.code);
      if (!retriable || attempt === MAX_RETRY) throw e;
      const delayMs = attempt * 2000;
      console.warn(`  [retry ${attempt}/${MAX_RETRY}] ${label} gagal (${e.code}), coba lagi dalam ${delayMs / 1000}s...`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}

async function run() {
  let lastId = 0;
  let totalBefore = 0;
  let totalAfter = 0;
  let totalRows = 0;
  let totalSkipped = 0;

  for (;;) {
    const [rows] = await withRetry(
      () => db.query(
        `SELECT idh_tes, data_soal FROM tbh_tes WHERE idh_tes > ? AND data_soal IS NOT NULL ORDER BY idh_tes ASC LIMIT ${BATCH_SIZE}`,
        [lastId],
      ),
      `SELECT batch (setelah idh_tes=${lastId})`,
    );
    if (!rows.length) break;

    for (const row of rows) {
      lastId = row.idh_tes;

      let parsed;
      try {
        parsed = JSON.parse(row.data_soal);
      } catch {
        console.warn(`SKIP idh_tes=${row.idh_tes}: data_soal bukan JSON valid.`);
        totalSkipped++;
        continue;
      }

      // Sudah bentuk ringkas (atau kosong) -> skip, tidak ada yang perlu dikecilkan.
      if (!parsed.length || parsed[0].soal === undefined) {
        totalSkipped++;
        continue;
      }

      const compact = parsed.map((s) => ({
        idm_soal: s.idm_soal,
        tipe_soal: s.tipe_soal,
        skor_benar: s.skor_benar,
        skor_salah: s.skor_salah,
        skor_tidak_jawab: s.skor_tidak_jawab,
        ...(s.pilihan ? { pilihan_order: s.pilihan.map((p) => p.idm_pilihan) } : {}),
      }));
      const compactStr = JSON.stringify(compact);

      totalBefore += Buffer.byteLength(row.data_soal, 'utf8');
      totalAfter += Buffer.byteLength(compactStr, 'utf8');
      totalRows++;

      if (!DRY_RUN) {
        await withRetry(
          () => db.execute(`UPDATE tbh_tes SET data_soal = ? WHERE idh_tes = ?`, [compactStr, row.idh_tes]),
          `UPDATE idh_tes=${row.idh_tes}`,
        );
      }
    }
    console.log(`... sampai idh_tes=${lastId}, ${totalRows} baris dikecilkan, ${totalSkipped} dilewati`);
  }

  const beforeMb = (totalBefore / 1024 / 1024).toFixed(1);
  const afterMb = (totalAfter / 1024 / 1024).toFixed(1);
  const savedMb = ((totalBefore - totalAfter) / 1024 / 1024).toFixed(1);
  console.log('');
  console.log('=== SELESAI ===');
  console.log(`Baris dikecilkan : ${totalRows}`);
  console.log(`Baris dilewati   : ${totalSkipped} (sudah ringkas / kosong / invalid)`);
  console.log(`Ukuran sebelum   : ${beforeMb} MB`);
  console.log(`Ukuran sesudah   : ${afterMb} MB`);
  console.log(`Hemat            : ${savedMb} MB`);
  if (DRY_RUN) {
    console.log('');
    console.log('DRY RUN — tidak ada data yang ditulis. Jalankan tanpa --dry-run untuk beneran menyimpan.');
  } else {
    console.log('');
    console.log('Jangan lupa jalankan manual: OPTIMIZE TABLE tbh_tes;');
  }
  process.exit(0);
}

run().catch((e) => {
  console.error('ERROR:', e);
  process.exit(1);
});
