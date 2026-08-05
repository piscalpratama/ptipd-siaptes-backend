// Subset-sum DP — dari array `deltas` (keuntungan per soal kalau dijawab
// "benar" alih-alih "salah"), cari subset dengan jumlah PALING KECIL yang
// >= `needed` (overshoot minimal, bukan exact subset-sum). Dipakai
// ujianService.adminLuluskanManual buat pilih soal mana yang dijawab benar
// supaya nilai akhir ujian sintetis pas mendekati (dari atas) target nilai
// yang diminta admin, tidak pernah kurang dari itu.
function pickMinimalOvershoot(deltas, needed) {
  if (needed <= 0) return new Set();

  const positive = deltas
    .map((d, i) => ({ d: Math.max(0, d), i }))
    .filter((x) => x.d > 0);

  const maxSum = positive.reduce((sum, x) => sum + x.d, 0);
  if (maxSum < needed) {
    // Tidak mungkin mencapai target walau semua soal dijawab benar — ambil
    // semua yang ada (hasil terbaik yang bisa dicapai).
    return new Set(positive.map((x) => x.i));
  }

  // achievable[s] = daftar index (dalam `positive`) yang dipakai buat capai
  // sum s, atau null kalau sum itu belum tercapai.
  const achievable = new Array(maxSum + 1).fill(null);
  achievable[0] = [];
  for (const { d, i } of positive) {
    for (let s = maxSum; s >= d; s--) {
      if (achievable[s] === null && achievable[s - d] !== null) {
        achievable[s] = [...achievable[s - d], i];
      }
    }
  }

  for (let s = needed; s <= maxSum; s++) {
    if (achievable[s] !== null) return new Set(achievable[s]);
  }
  return new Set(positive.map((x) => x.i)); // fallback, seharusnya tidak pernah sampai sini
}

module.exports = { pickMinimalOvershoot };
