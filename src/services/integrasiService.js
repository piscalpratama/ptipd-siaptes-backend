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
const getHistori = async (query) => {
  const { page, limit, offset } = parsePagination(query);
  const { waktu_mulai, waktu_akhir } = query;

  const conditions = ['status = 2'];
  const params = [];
  if (waktu_mulai) {
    conditions.push('waktu_akhir >= ?');
    params.push(waktu_mulai);
  }
  if (waktu_akhir) {
    conditions.push('waktu_akhir <= ?');
    params.push(waktu_akhir);
  }
  const where = `WHERE ${conditions.join(' AND ')}`;

  const [[{ total }]] = await db.execute(
    `SELECT COUNT(*) as total FROM viewh_tes ${where}`,
    params,
  );
  const [rows] = await db.query(
    `SELECT idh_tes, idm_tes, nama, username, nama_tes, nilai, waktu_mulai, waktu_akhir
     FROM viewh_tes ${where} ORDER BY waktu_akhir DESC LIMIT ${limit} OFFSET ${offset}`,
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
