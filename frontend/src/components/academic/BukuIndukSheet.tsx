'use client'

import React from 'react'

export interface BukuIndukData {
  // Data Pokok
  name: string
  nisn: string
  nis: string
  gender: string
  program?: string | null
  className?: string | null
  userAvatar?: string | null

  // A. DIRI PESERTA DIDIK
  namaPanggilan?: string
  tempatLahir?: string
  tglLahir?: string
  agama?: string
  kewarganegaraan?: string
  anakKe?: string | number
  jmlSaudaraKandung?: string | number
  jmlSaudaraTiri?: string | number
  jmlSaudaraAngkat?: string | number
  statusYatim?: string
  bahasa?: string

  // B. TEMPAT TINGGAL
  alamat?: string
  telp?: string
  tinggalDengan?: string
  jarakSekolah?: string

  // C. KESEHATAN
  golDarah?: string
  penyakitPernah?: string
  kelainanJasmani?: string
  tinggiBadan?: string | number
  beratBadan?: string | number

  // D. PENDIDIKAN
  lulusanDari?: string
  tamatanDari?: string
  tglIjazahSmp?: string
  noIjazahSmp?: string
  noSttb?: string
  tglSttb?: string
  tglStlSmp?: string
  noStlSmp?: string
  noSkhun?: string
  tglSkhun?: string
  lamaBelajar?: string | number
  pindahanDariSekolah?: string
  alasanPindah?: string
  diterimaDiKelas?: string
  kelompokProgStudi?: string
  tglDiterima?: string

  // E. AYAH KANDUNG
  namaAyah?: string
  ttlAyah?: string
  tempatLahirAyah?: string
  tglLahirAyah?: string
  agamaAyah?: string
  kewarganegaraanAyah?: string
  pendidikanAyah?: string
  pekerjaanAyah?: string
  pengeluaranAyah?: string
  penghasilanAyah?: string
  alamatAyah?: string
  telpAyah?: string
  statusAyah?: string

  // F. IBU KANDUNG
  namaIbu?: string
  ttlIbu?: string
  tempatLahirIbu?: string
  tglLahirIbu?: string
  agamaIbu?: string
  kewarganegaraanIbu?: string
  pendidikanIbu?: string
  pekerjaanIbu?: string
  pengeluaranIbu?: string
  penghasilanIbu?: string
  alamatIbu?: string
  telpIbu?: string
  statusIbu?: string

  // G. WALI
  namaWali?: string
  ttlWali?: string
  agamaWali?: string
  kewarganegaraanWali?: string
  pendidikanWali?: string
  pekerjaanWali?: string
  pengeluaranWali?: string
  alamatWali?: string
  telpWali?: string

  // H. KEGEMARAN
  kesenian?: string
  olahRaga?: string
  organisasi?: string
  kemasyarakatan?: string
  kegemaranLain?: string

  // I. PERKEMBANGAN
  menerimaBeasiswa?: string
  tglMeninggalkanSekolah?: string
  alasanMeninggalkan?: string
  tamatBelajar?: string
  noIjazahLulus?: string
  sttbNomor?: string
  noStlLulus?: string
  nilaiRataRata?: string

  // J. PASCA PENDIDIKAN
  melanjutkanDi?: string
  bekerja?: string
  tglMulaiBekerja?: string
  namaPerusahaan?: string
  penghasilanKerja?: string

  // 4 FOTO BUKU INDUK
  fotoMendaftar?: string
  fotoDiterima?: string
  fotoLulus?: string
  fotoMeninggalkan?: string
}

const formatIndoDate = (dateStr?: string | null) => {
  if (!dateStr || dateStr.trim() === '' || dateStr === '-') return ''
  try {
    const parts = dateStr.split('-')
    if (parts.length === 3 && parts[0].length === 4) {
      const d = new Date(dateStr)
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })
      }
    }
    return dateStr
  } catch {
    return dateStr
  }
}

export function BukuIndukSheet({ data }: { data: BukuIndukData }) {
  // Resolve Avatar fallback
  const fallbackAvatar = data.userAvatar
    ? data.userAvatar.startsWith('/uploads')
      ? `/api-backend${data.userAvatar}`
      : data.userAvatar
    : null

  // Resolusi Foto: Hanya Foto Waktu Diterima yang otomatis diambil dari Foto Profil Akun Siswa jika belum diunggah manual
  const fotoTerima = data.fotoDiterima || fallbackAvatar
  const fotoDaftar = data.fotoMendaftar || null
  const fotoLulus = data.fotoLulus || null
  const fotoMeninggalkan = data.fotoMeninggalkan || null

  // Format TTL Siswa
  const formattedTglLahir = formatIndoDate(data.tglLahir)
  const ttlSiswa = data.tempatLahir && formattedTglLahir
    ? `${data.tempatLahir}, ${formattedTglLahir}`
    : data.tempatLahir || formattedTglLahir || '-'

  // Format Ijazah SMP
  const tglIjazahSmpFormatted = formatIndoDate(data.tglIjazahSmp || data.tglSttb)
  const noIjazahSmpVal = data.noIjazahSmp || data.noSttb || ''
  const ijazahSmpCombined = tglIjazahSmpFormatted && noIjazahSmpVal
    ? `${tglIjazahSmpFormatted} / ${noIjazahSmpVal}`
    : (tglIjazahSmpFormatted || noIjazahSmpVal || '-')

  // Format SKHUN/STL SMP
  const tglStlSmpFormatted = formatIndoDate(data.tglStlSmp || data.tglSkhun)
  const noStlSmpVal = data.noStlSmp || data.noSkhun || ''
  const skhunSmpCombined = tglStlSmpFormatted || noStlSmpVal
    ? `${tglStlSmpFormatted || '-'} / ${noStlSmpVal}`
    : '- /'

  // Format Diterima
  const tglDiterimaFormatted = formatIndoDate(data.tglDiterima)

  // Ayah
  const ttlAyahVal = data.ttlAyah || (data.tempatLahirAyah && data.tglLahirAyah ? `${data.tempatLahirAyah}, ${formatIndoDate(data.tglLahirAyah)}` : '') || '-'
  const alamatAyahHp = data.alamatAyah || data.telpAyah
    ? `${data.alamatAyah || ''}${data.telpAyah ? ` / ${data.telpAyah}` : ''}`
    : '-'

  // Ibu
  const ttlIbuVal = data.ttlIbu || (data.tempatLahirIbu && data.tglLahirIbu ? `${data.tempatLahirIbu}, ${formatIndoDate(data.tglLahirIbu)}` : '') || '-'
  const alamatIbuHp = data.alamatIbu || data.telpIbu
    ? `${data.alamatIbu || ''}${data.telpIbu ? ` / ${data.telpIbu}` : ''}`
    : '/'

  // Wali
  const ttlWaliVal = data.ttlWali || ''
  const alamatWaliHp = data.alamatWali || data.telpWali
    ? `${data.alamatWali || ''}${data.telpWali ? ` / ${data.telpWali}` : ''}`
    : '/'

  // Organisasi
  const organisasiVal = data.organisasi || data.kemasyarakatan || ''

  // Status Anak
  const statusYatimVal = data.statusYatim && data.statusYatim !== 'Orang Tua Lengkap' ? data.statusYatim : '-'

  // Jarak Tempat Tinggal
  const jarakSekolahVal = data.jarakSekolah ? String(data.jarakSekolah).trim() : '2'

  return (
    <div
      className="buku-induk-page w-[330mm] max-w-[330mm] h-[215mm] max-h-[215mm] min-h-[215mm] mx-auto bg-white text-black font-sans leading-[1.20] p-[4mm_9mm_3mm_8mm] select-text text-[7.8pt] box-border overflow-hidden flex flex-col"
      style={{ fontFamily: "Arial, 'Helvetica Neue', Helvetica, sans-serif" }}
    >
      {/* Top Header */}
      <div className="relative mb-1 pb-1 border-b border-black shrink-0">
        {/* Top Right NIS */}
        <div className="absolute top-0 right-2 font-bold text-[13pt] text-black tracking-normal leading-none">
          {data.nis || ''}
        </div>

        {/* Title Center */}
        <div className="text-center pr-24 pl-4">
          <h2 className="font-bold text-[10.5pt] uppercase tracking-tight text-black leading-tight">
            II. LEMBAR BUKU INDUK PESERTA DIDIK SMA (K-MERDEKA)
          </h2>
          <div className="font-semibold text-[7.8pt] uppercase mt-0.5 tracking-tight text-black leading-tight">
            NOMOR INDUK SISWA NASIONAL / NOMOR INDUK PESERTA DIDIK : {data.nisn || '-'} / {data.nis || '-'}
          </div>
        </div>
      </div>

      {/* Main Grid: Kolom Kiri (1fr), Kolom Tengah (1fr), Kolom Foto (32mm) */}
      <div className="grid grid-cols-[1fr_1fr_32mm] gap-x-3 flex-1 items-start overflow-hidden">
        {/* ===================== KOLOM KIRI (Seksi A s.d. E) ===================== */}
        <div className="flex flex-col gap-y-1 overflow-hidden pr-0.5">
          {/* A. KETERANGAN TENTANG DIRI PESERTA DIDIK */}
          <div>
            <div className="font-bold text-[8pt] uppercase mb-[1px] text-black leading-tight">
              A. KETERANGAN TENTANG DIRI PESERTA DIDIK
            </div>
            <table className="w-full text-left border-collapse table-fixed">
              <colgroup>
                <col className="w-[146px]" />
                <col className="w-[8px]" />
                <col />
              </colgroup>
              <tbody>
                <tr>
                  <td className="align-top py-[0.2px]">1. Nama lengkap Peserta Didik</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="font-bold uppercase align-top py-[0.2px] truncate pl-0.5">{data.name || '-'}</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px] pl-3.5">Nama panggilan</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] truncate pl-0.5">{data.namaPanggilan || '-'}</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px]">2. Jenis kelamin</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] pl-0.5">
                    {data.gender === 'L' || data.gender === 'Laki-laki' || data.gender === 'Laki-Laki'
                      ? 'Laki-laki'
                      : data.gender === 'P' || data.gender === 'Perempuan'
                      ? 'Perempuan'
                      : data.gender || '-'}
                  </td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px]">3. Tempat dan tanggal lahir</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] truncate pl-0.5">{ttlSiswa}</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px]">4. Agama</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] pl-0.5">{data.agama || 'Islam'}</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px]">5. Kewarganegaraan</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] pl-0.5">{data.kewarganegaraan || 'WNI'}</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px]">6. Anak keberapa</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] pl-0.5">{data.anakKe || '-'}</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px]">7. Jumlah saudara kandung</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] pl-0.5">{data.jmlSaudaraKandung ?? '0'}</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px]">8. Jumlah saudara tiri</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] pl-0.5">{data.jmlSaudaraTiri ?? '0'}</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px]">9. Jumlah saudara angkat</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] pl-0.5">{data.jmlSaudaraAngkat ?? '0'}</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px]">10. Anak yatim/piatu/yatim piatu</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] pl-0.5">{statusYatimVal}</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px]">11. Bahasa sehari-hari di rumah</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] truncate pl-0.5">{data.bahasa || 'Indonesia / Jawa'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* B. KETERANGAN TEMPAT TINGGAL */}
          <div>
            <div className="font-bold text-[8pt] uppercase mb-[1px] text-black leading-tight">
              B. KETERANGAN TEMPAT TINGGAL
            </div>
            <table className="w-full text-left border-collapse table-fixed">
              <colgroup>
                <col className="w-[146px]" />
                <col className="w-[8px]" />
                <col />
              </colgroup>
              <tbody>
                <tr>
                  <td className="align-top py-[0.2px]">12. Alamat</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] truncate pl-0.5">{data.alamat || '-'}</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px]">13. Nomor telepon/HP</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] truncate pl-0.5">{data.telp || '-'}</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px] leading-tight">
                    14. Tinggal dgn Orang
                    <div className="pl-4">Tua/Saudara/</div>
                    <div className="pl-4">di Asrama/Kost</div>
                  </td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] pl-0.5">{data.tinggalDengan || 'Orang Tua'}</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px] leading-tight">
                    15. Jarak tempat tinggal ke
                    <div className="pl-4">sekolah</div>
                  </td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] pl-0.5">{jarakSekolahVal}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* C. KETERANGAN KESEHATAN */}
          <div>
            <div className="font-bold text-[8pt] uppercase mb-[1px] text-black leading-tight">
              C. KETERANGAN KESEHATAN
            </div>
            <table className="w-full text-left border-collapse table-fixed">
              <colgroup>
                <col className="w-[146px]" />
                <col className="w-[8px]" />
                <col />
              </colgroup>
              <tbody>
                <tr>
                  <td className="align-top py-[0.2px]">16. Golongan darah</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] pl-0.5">{data.golDarah || 'O'}</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px]">17. Penyakit yang pernah diderita</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] truncate pl-0.5">{data.penyakitPernah || 'Tidak Ada'}</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px]">18. Kelainan jasmani</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] truncate pl-0.5">{data.kelainanJasmani || 'Tidak Ada'}</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px]">19. Tinggi dan berat badan</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] pl-0.5">
                    {data.tinggiBadan ? `${data.tinggiBadan} Cm` : '160 Cm'}, {data.beratBadan ? `${data.beratBadan} Kg` : '50 Kg'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* D. KETERANGAN PENDIDIKAN */}
          <div>
            <div className="font-bold text-[8pt] uppercase mb-[1px] text-black leading-tight">
              D. KETERANGAN PENDIDIKAN
            </div>
            <table className="w-full text-left border-collapse table-fixed">
              <colgroup>
                <col className="w-[146px]" />
                <col className="w-[8px]" />
                <col />
              </colgroup>
              <tbody>
                <tr>
                  <td className="align-top py-[0.2px]" colSpan={3}>20. Pendidikan sebelumnya</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px] pl-4">a. Tamatan dari</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] truncate pl-0.5">{data.lulusanDari || data.tamatanDari || '-'}</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px] pl-4">b. Tgl & Nomor Ijazah</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] truncate pl-0.5">{ijazahSmpCombined}</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px] pl-4">c. Tgl & Nomor STL/SKHUN</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] truncate pl-0.5">{skhunSmpCombined}</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px] pl-4">d. Lama belajar</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] pl-0.5">
                    {data.lamaBelajar
                      ? String(data.lamaBelajar).includes('Tahun')
                        ? data.lamaBelajar
                        : `${data.lamaBelajar} Tahun`
                      : '3 Tahun'}
                  </td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px]" colSpan={3}>21. Pindahan</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px] pl-4">a. Dari sekolah</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] truncate pl-0.5">{data.pindahanDariSekolah || ''}</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px] pl-4">b. Alasan</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] truncate pl-0.5">{data.alasanPindah || ''}</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px]" colSpan={3}>22. Diterima di sekolah ini</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px] pl-4">a. Di kelas</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] pl-0.5">{data.diterimaDiKelas || data.className || 'X 1'}</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px] pl-4">b. Kelompok/PROG. STUDI</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] truncate pl-0.5">{data.kelompokProgStudi || data.program || ''}</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px] pl-4">c. Tanggal/Bulan/Tahun</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] pl-0.5">{tglDiterimaFormatted || ''}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* E. KETERANGAN TENTANG AYAH KANDUNG */}
          <div>
            <div className="font-bold text-[8pt] uppercase mb-[1px] text-black leading-tight">
              E. KETERANGAN TENTANG AYAH KANDUNG
            </div>
            <table className="w-full text-left border-collapse table-fixed">
              <colgroup>
                <col className="w-[146px]" />
                <col className="w-[8px]" />
                <col />
              </colgroup>
              <tbody>
                <tr>
                  <td className="align-top py-[0.2px]">23. Nama</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="font-bold uppercase align-top py-[0.2px] truncate pl-0.5">{data.namaAyah || '-'}</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px]">24. Tempat & tanggal lahir</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] truncate pl-0.5">{ttlAyahVal}</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px]">25. Agama</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] pl-0.5">{data.agamaAyah || 'Islam'}</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px]">26. Kewarganegaraan</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] pl-0.5">{data.kewarganegaraanAyah || 'WNI'}</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px]">27. Pendidikan</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] truncate pl-0.5">{data.pendidikanAyah || '-'}</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px]">28. Pekerjaan</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] truncate pl-0.5">{data.pekerjaanAyah || '-'}</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px]">29. Pengeluaran perbulan</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] pl-0.5">{data.pengeluaranAyah || data.penghasilanAyah || '-'}</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px]">30. Alamat rumah/No. HP</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] truncate pl-0.5">{alamatAyahHp}</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px]">31. Masih hidup/meninggal</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] pl-0.5">{data.statusAyah || 'Masih Hidup'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ===================== KOLOM TENGAH (Seksi F s.d. J) ===================== */}
        <div className="flex flex-col gap-y-1 overflow-hidden pr-0.5">
          {/* F. KETERANGAN TENTANG IBU KANDUNG */}
          <div>
            <div className="font-bold text-[8pt] uppercase mb-[1px] text-black leading-tight">
              F. KETERANGAN TENTANG IBU KANDUNG
            </div>
            <table className="w-full text-left border-collapse table-fixed">
              <colgroup>
                <col className="w-[146px]" />
                <col className="w-[8px]" />
                <col />
              </colgroup>
              <tbody>
                <tr>
                  <td className="align-top py-[0.2px]">32. Nama</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="font-bold uppercase align-top py-[0.2px] truncate pl-0.5">{data.namaIbu || '-'}</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px]">33. Tempat & tanggal lahir</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] truncate pl-0.5">{ttlIbuVal}</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px]">34. Agama</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] pl-0.5">{data.agamaIbu || 'Islam'}</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px]">35. Kewarganegaraan</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] pl-0.5">{data.kewarganegaraanIbu || 'WNI'}</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px]">36. Pendidikan</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] truncate pl-0.5">{data.pendidikanIbu || '-'}</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px]">37. Pekerjaan</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] truncate pl-0.5">{data.pekerjaanIbu || 'Ibu Rumah Tangga'}</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px]">38. Pengeluaran perbulan</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] pl-0.5">{data.pengeluaranIbu || data.penghasilanIbu || '-'}</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px]">39. Alamat rumah/No. HP</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] truncate pl-0.5">{alamatIbuHp}</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px]">40. Masih hidup/meninggal</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] pl-0.5">{data.statusIbu || 'Masih Hidup'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* G. KETERANGAN TENTANG WALI */}
          <div>
            <div className="font-bold text-[8pt] uppercase mb-[1px] text-black leading-tight">
              G. KETERANGAN TENTANG WALI
            </div>
            <table className="w-full text-left border-collapse table-fixed">
              <colgroup>
                <col className="w-[146px]" />
                <col className="w-[8px]" />
                <col />
              </colgroup>
              <tbody>
                <tr>
                  <td className="align-top py-[0.2px]">41. Nama</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] truncate pl-0.5">{data.namaWali || ''}</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px]">42. Tempat & Tanggal lahir</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] truncate pl-0.5">{ttlWaliVal}</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px]">43. Agama</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] pl-0.5">{data.agamaWali || ''}</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px]">44. Kewarganegaraan</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] pl-0.5">{data.kewarganegaraanWali || 'WNI'}</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px]">45. Pendidikan</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] truncate pl-0.5">{data.pendidikanWali || ''}</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px]">46. Pekerjaan</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] truncate pl-0.5">{data.pekerjaanWali || ''}</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px]">47. Pengeluaran perbulan</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] pl-0.5">{data.pengeluaranWali || ''}</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px]">48. Alamat rumah/No. HP</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] truncate pl-0.5">{alamatWaliHp}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* H. KEGEMARAN PESERTA DIDIK */}
          <div>
            <div className="font-bold text-[8pt] uppercase mb-[1px] text-black leading-tight">
              H. KEGEMARAN PESERTA DIDIK
            </div>
            <table className="w-full text-left border-collapse table-fixed">
              <colgroup>
                <col className="w-[146px]" />
                <col className="w-[8px]" />
                <col />
              </colgroup>
              <tbody>
                <tr>
                  <td className="align-top py-[0.2px]">49. Kesenian</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] truncate pl-0.5">{data.kesenian || 'Menyanyi'}</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px]">50. Olah raga</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] truncate pl-0.5">{data.olahRaga || 'Bulu Tangkis'}</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px]">51. Organisasi</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] truncate pl-0.5">{organisasiVal || 'Pramuka'}</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px]">52. Lain-lain</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] truncate pl-0.5">{data.kegemaranLain || ''}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* I. KETERANGAN PERKEMBANGAN PESERTA DIDIK */}
          <div>
            <div className="font-bold text-[8pt] uppercase mb-[1px] text-black leading-tight">
              I. KETERANGAN PERKEMBANGAN PESERTA DIDIK
            </div>
            <table className="w-full text-left border-collapse table-fixed">
              <colgroup>
                <col className="w-[146px]" />
                <col className="w-[8px]" />
                <col />
              </colgroup>
              <tbody>
                <tr>
                  <td className="align-top py-[0.2px]" colSpan={3}>
                    53. Menerima Bea Siswa : Thn / Kls dari {data.menerimaBeasiswa || ''}
                  </td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px]" colSpan={3}>54. Meninggalkan sekolah ini</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px] pl-4">a. Tgl meninggalkan</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] pl-0.5">{formatIndoDate(data.tglMeninggalkanSekolah) || '-'}</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px] pl-4">b. Alasan</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] truncate pl-0.5">{data.alasanMeninggalkan || ''}</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px]" colSpan={3}>55. Akhir Pendidikan</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px] pl-4">a. Tamat belajar / lulus</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] pl-0.5">{data.tamatBelajar || ''}</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px] pl-4">b. Ijazah</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] truncate pl-0.5">{data.noIjazahLulus || data.sttbNomor || ''}</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px] pl-4">c. Nomor STL</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] truncate pl-0.5">{data.noStlLulus || ''}</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px] pl-4">d. Nilai rata-rata</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] pl-0.5">{data.nilaiRataRata || ''}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* J. KETERANGAN SETELAH SELESAI PENDIDIKAN */}
          <div>
            <div className="font-bold text-[8pt] uppercase mb-[1px] text-black leading-tight">
              J. KETERANGAN SETELAH SELESAI PENDIDIKAN
            </div>
            <table className="w-full text-left border-collapse table-fixed">
              <colgroup>
                <col className="w-[146px]" />
                <col className="w-[8px]" />
                <col />
              </colgroup>
              <tbody>
                <tr>
                  <td className="align-top py-[0.2px]">56. Akan melanjutkan ke</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] truncate pl-0.5">{data.melanjutkanDi || ''}</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px]" colSpan={3}>57. Akan bekerja</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px] pl-4">a. Tgl mulai bekerja</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] pl-0.5">{formatIndoDate(data.tglMulaiBekerja) || '-'}</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px] pl-4">b. Nama Perusahaan</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] truncate pl-0.5">{data.namaPerusahaan || ''}</td>
                </tr>
                <tr>
                  <td className="align-top py-[0.2px] pl-4">c. Penghasilan</td>
                  <td className="align-top py-[0.2px] text-center">:</td>
                  <td className="align-top py-[0.2px] pl-0.5">{data.penghasilanKerja || ''}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ===================== KOLOM FOTO (32mm) ===================== */}
        <div className="w-[32mm] flex flex-col items-center justify-between h-full py-0 pr-1 pl-0 overflow-hidden">
          {/* Foto 1: waktu mendaftar */}
          <div className="flex flex-col items-center text-center">
            <div className="w-[27mm] h-[36mm] border border-black overflow-hidden bg-white flex items-center justify-center">
              {fotoDaftar ? (
                <img src={fotoDaftar} alt="Waktu Mendaftar" className="w-full h-full object-cover" />
              ) : null}
            </div>
            <span className="text-[6.8pt] leading-tight text-black mt-[1.5px] tracking-tight whitespace-nowrap">
              waktu mendaftar
            </span>
          </div>

          {/* Foto 2: waktu diterima di sekolah ini */}
          <div className="flex flex-col items-center text-center">
            <div className="w-[27mm] h-[36mm] border border-black overflow-hidden bg-white flex items-center justify-center">
              {fotoTerima ? (
                <img src={fotoTerima} alt="Waktu Diterima" className="w-full h-full object-cover" />
              ) : null}
            </div>
            <span className="text-[6.8pt] leading-tight text-black mt-[1.5px] tracking-tight">
              waktu diterima di<br />sekolah ini
            </span>
          </div>

          {/* Foto 3: waktu lulus di sekolah ini */}
          <div className="flex flex-col items-center text-center">
            <div className="w-[27mm] h-[36mm] border border-black overflow-hidden bg-white flex items-center justify-center">
              {fotoLulus ? (
                <img src={fotoLulus} alt="Waktu Lulus" className="w-full h-full object-cover" />
              ) : null}
            </div>
            <span className="text-[6.8pt] leading-tight text-black mt-[1.5px] tracking-tight">
              waktu lulus<br />di sekolah ini
            </span>
          </div>

          {/* Foto 4: waktu meninggalkan di sekolah ini */}
          <div className="flex flex-col items-center text-center">
            <div className="w-[27mm] h-[36mm] border border-black overflow-hidden bg-white flex items-center justify-center">
              {fotoMeninggalkan ? (
                <img src={fotoMeninggalkan} alt="Waktu Meninggalkan" className="w-full h-full object-cover" />
              ) : null}
            </div>
            <span className="text-[6.8pt] leading-tight text-black mt-[1.5px] tracking-tight">
              waktu meninggalkan<br />di sekolah ini
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
