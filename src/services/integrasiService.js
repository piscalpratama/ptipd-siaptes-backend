const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { parsePagination, buildPaginationMeta } = require('../config/pagination');
const { addGrupId } = require('../utils/grupUtil');

// ─── Push peserta dari ICT ke sebuah grup ujian ──────────────────────────────
// Kalau akun (by NIM/username) belum ada di tbs_user -> dibuat baru (level
// PESERTA). Login peserta divalidasi ke SALAM (lihat authService.js), jadi
// kolom `password` di sini cuma placeholder yang tidak pernah dipakai buat
// autentikasi — cukup diisi hash dari NIM supaya kolom NOT NULL terpenuhi.
// Kalau akun sudah ada -> tinggal ditambahkan idm_grup-nya (tidak menghapus
// grup lain yang sudah ada).
const pushPeserta = async (idmGrup, pesertaList) => {
  const results = [];

  for (const p of pesertaList) {
    const nim = String(p.nim || '').trim();
    const nama = String(p.nama || nim).trim();
    if (!nim) {
      results.push({ nim: p.nim, status: 'error', message: 'NIM kosong.' });
      continue;
    }

    try {
      const [rows] = await db.execute(
        `SELECT ids_user, nama, idm_grup FROM tbs_user WHERE username = ? LIMIT 1`,
        [nim],
      );

      if (rows.length) {
        const user = rows[0];
        const updatedGrup = addGrupId(user.idm_grup, idmGrup);
        const grupBerubah = updatedGrup !== (user.idm_grup || '');
        const namaBerubah = nama && nama !== user.nama;

        if (grupBerubah || namaBerubah) {
          await db.execute(`UPDATE tbs_user SET idm_grup = ?, nama = ? WHERE ids_user = ?`, [
            updatedGrup,
            nama || user.nama,
            user.ids_user,
          ]);
        }

        results.push({
          nim,
          nama: nama || user.nama,
          ids_user: user.ids_user,
          status: grupBerubah ? 'updated' : 'already_member',
        });
      } else {
        const hash = await bcrypt.hash(nim, 10);
        const [result] = await db.execute(
          `INSERT INTO tbs_user (nama, username, password, level, idm_grup)
           VALUES (?, ?, ?, 'PESERTA', ?)`,
          [nama, nim, hash, String(idmGrup)],
        );
        results.push({ nim, nama, ids_user: result.insertId, status: 'created' });
      }
    } catch (e) {
      results.push({ nim, status: 'error', message: e.message });
    }
  }

  return results;
};

// ─── Histori nilai — kontrak lama yang sudah dipakai syncNilaiService.js ─────
// di BE ICT. Response HARUS { data: { data: [...] } } dengan field
// `username`, `nilai`, `nama` minimal ada, karena itu yang dibaca di sana.
//
// Sejak multi-percobaan aktif, 1 peserta bisa punya BEBERAPA baris selesai
// (status=2) untuk 1 idm_tes yang sama — endpoint ini WAJIB dedup ke nilai
// TERTINGGI per (username, idm_tes), dihitung dari SEMUA attempt selesai
// (tanpa batas tanggal), supaya ICT tidak pernah nyimpen nilai yang lebih
// rendah dari nilai terbaik peserta cuma gara-gara urutan/window sync.
// Filter tanggal (`waktu_mulai`/`waktu_akhir`) cuma dipakai buat nentuin
// PASANGAN (username, idm_tes) mana yang "ada aktivitas baru" di window itu
// (lewat EXISTS) — begitu lolos, nilai yang dikembalikan tetap yang terbaik
// secara keseluruhan, bukan yang terbaik di dalam window saja.
const getHistori = async (query) => {
  const { page, limit, offset } = parsePagination(query);
  const { waktu_mulai, waktu_akhir } = query;

  const windowConditions = [];
  const windowParams = [];
  if (waktu_mulai) {
    windowConditions.push('w.waktu_akhir >= ?');
    windowParams.push(waktu_mulai);
  }
  if (waktu_akhir) {
    windowConditions.push('w.waktu_akhir <= ?');
    windowParams.push(waktu_akhir);
  }
  const windowWhere = windowConditions.length ? `AND ${windowConditions.join(' AND ')}` : '';

  const baseQuery = `
    FROM viewh_tes v
    JOIN (
      SELECT username, idm_tes, MAX(nilai) AS best_nilai
      FROM viewh_tes WHERE status = 2 GROUP BY username, idm_tes
    ) best ON best.username = v.username AND best.idm_tes = v.idm_tes AND best.best_nilai = v.nilai
    WHERE v.status = 2
      AND EXISTS (
        SELECT 1 FROM viewh_tes w
        WHERE w.username = v.username AND w.idm_tes = v.idm_tes AND w.status = 2 ${windowWhere}
      )
    GROUP BY v.username, v.idm_tes
  `;
  // params dipakai 2x (sekali di JOIN best tidak butuh param, sekali di EXISTS)
  const params = [...windowParams];

  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) as total FROM (SELECT 1 ${baseQuery}) x`,
    params,
  );
  const [rows] = await db.query(
    `SELECT v.idh_tes, v.idm_tes, v.nama, v.username, v.nama_tes, v.nilai, v.waktu_mulai, v.waktu_akhir
     ${baseQuery}
     ORDER BY v.waktu_akhir DESC LIMIT ${limit} OFFSET ${offset}`,
    params,
  );

  return { rows, pagination: buildPaginationMeta(total, page, limit) };
};

// ─── Upsert grup by nama — dipanggil BE ICT buat sync siaptes_idm_grup ──────
// tbm_grup.nama_grup tidak punya unique constraint di DB, jadi uniqueness
// dijaga manual di sini (SELECT dulu, baru INSERT kalau belum ada).
// created_by/updated_by diisi 0 (system) karena request ini service-to-service,
// tidak ada req.user.
const SYSTEM_USER_ID = 0;

const upsertGrupByNama = async (namaGrup) => {
  const [existing] = await db.execute(
    `SELECT idm_grup FROM tbm_grup WHERE nama_grup = ? LIMIT 1`,
    [namaGrup],
  );
  if (existing.length) {
    return { idm_grup: existing[0].idm_grup, created: false };
  }

  const [result] = await db.execute(
    `INSERT INTO tbm_grup (nama_grup, created_by, updated_by) VALUES (?, ?, ?)`,
    [namaGrup, SYSTEM_USER_ID, SYSTEM_USER_ID],
  );
  return { idm_grup: result.insertId, created: true };
};

module.exports = { pushPeserta, getHistori, upsertGrupByNama };
