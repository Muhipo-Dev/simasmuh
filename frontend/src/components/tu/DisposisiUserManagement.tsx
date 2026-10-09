'use client'

import React, { useState, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { 
  FileText, CornerDownRight, CheckCircle2, Clock, Search, 
  ExternalLink, Eye, AlertCircle, ShieldCheck, Download,
  UserCheck, User, Calendar, Building2, Tag, RefreshCw,
  FolderArchive, Inbox, ArrowUpRight, Printer, Undo2, Send,
  Sparkles, Check, Filter
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { QRCodeSVG } from 'qrcode.react'
import Swal from 'sweetalert2'
import { getAppFeatureUrl } from '@/lib/api-config'

export function DisposisiUserManagement() {
  const { data: session } = useSession()
  const user = session?.user as any
  const userName = user?.name || ''
  const userRole = user?.role || ''
  const userSubRole = user?.subRole || ''
  const userSubRole2 = user?.subRole2 || ''
  const userSubRole3 = user?.subRole3 || ''

  const queryClient = useQueryClient()
  const authenticatedFetch = useAuthenticatedFetch()

  const [activeTab, setActiveTab] = useState<'aktif' | 'arsip' | 'semua'>('aktif')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterSifat, setFilterSifat] = useState('ALL')
  const [selectedSurat, setSelectedSurat] = useState<any | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [catatanTindakLanjut, setCatatanTindakLanjut] = useState('')

  const isSuperOrAdmin = useMemo(() => {
    return (
      ['SUPERADMIN', 'ADMIN_IT', 'ADMIN_TU', 'BAU', 'TATA_USAHA', 'KEPALA_SEKOLAH'].includes(userRole) ||
      ['SUPERADMIN', 'ADMIN_TU', 'BAU', 'KEPALA_SEKOLAH'].includes(userSubRole)
    )
  }, [userRole, userSubRole])

  // Fetch surat masuk yang memiliki disposisi
  const { data: dbSuratMasuk = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ['disposisi-user-list', activeTab],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/surat-masuk?forUser=true')
      if (!res.ok) return []
      const json = await res.json()
      return json.data || []
    }
  })

  // Filter khusus untuk user yang sedang login (Guru / Pegawai)
  const myDisposisiList = useMemo(() => {
    if (!Array.isArray(dbSuratMasuk)) return []

    return dbSuratMasuk.filter((item: any) => {
      if (!item.disposisi) return false
      
      // Jika Superadmin / Kepala Sekolah / TU dan memilih tab 'semua' -> tampilkan semua
      if (isSuperOrAdmin && activeTab === 'semua') return true

      const disp = item.disposisi
      const diteruskan = disp.diteruskanKepada || {}
      const targets = Array.isArray(diteruskan.targets) ? diteruskan.targets : []
      const targetUserIds = Array.isArray(diteruskan.targetUserIds) ? [...diteruskan.targetUserIds] : []
      if (diteruskan.guruId && !targetUserIds.includes(diteruskan.guruId)) targetUserIds.push(diteruskan.guruId)
      if (diteruskan.stafId && !targetUserIds.includes(diteruskan.stafId)) targetUserIds.push(diteruskan.stafId)
      if (diteruskan.bagianId && !targetUserIds.includes(diteruskan.bagianId)) targetUserIds.push(diteruskan.bagianId)
      if (diteruskan.userId && !targetUserIds.includes(diteruskan.userId)) targetUserIds.push(diteruskan.userId)
      if (diteruskan.pegawaiId && !targetUserIds.includes(diteruskan.pegawaiId)) targetUserIds.push(diteruskan.pegawaiId)

      const myNameLower = userName.toLowerCase().trim()

      if (user?.id && targetUserIds.includes(user.id)) return true

      // Kumpulkan nama penerima dan bersihkan dari sufiks (misal: "Nama - Guru" -> "Nama")
      const recipientNames: string[] = []
      for (const raw of [diteruskan.guruNama, diteruskan.bagianNama, diteruskan.stafNama, diteruskan.penerimaNama, diteruskan.nama]) {
        if (raw && typeof raw === 'string' && raw.trim().length > 0) {
          const clean = raw.split('-')[0].split('(')[0].trim().toLowerCase()
          if (clean.length >= 2 && !recipientNames.includes(clean)) {
            recipientNames.push(clean)
          }
        }
      }

      // Cek apakah ditugaskan ke nama user login
      const matchName = recipientNames.some(name => myNameLower.includes(name) || name.includes(myNameLower))

      const myRoles = [userRole, userSubRole, userSubRole2, userSubRole3, user?.subRole4, user?.subRole5].filter(Boolean).map(r => r.toLowerCase().trim())
      const isKurikulum = myRoles.some(r => r.includes('kurikulum') || r.includes('kur'))
      const isKesiswaan = myRoles.some(r => r.includes('kesiswaan') || r.includes('tatib') || r.includes('ketertiban'))
      const isSarpras = myRoles.some(r => r.includes('sarpras') || r.includes('sarana') || r.includes('inventaris'))
      const isHumas = myRoles.some(r => r.includes('humas') || r.includes('sdm'))
      const isIsmuba = myRoles.some(r => r.includes('ismuba') || r.includes('agama'))
      const isKeuangan = myRoles.some(r => r.includes('bendahara') || r.includes('keuangan'))
      const isBau = myRoles.some(r => r.includes('bau') || r.includes('tata_usaha') || r.includes('admin_tu'))
      const isPerpus = myRoles.some(r => r.includes('perpus') || r.includes('perpustakaan'))
      const isLab = myRoles.some(r => r.includes('lab') || r.includes('laboratorium'))
      const isBk = myRoles.some(r => r.includes('bk') || r.includes('konseling'))
      const isWaliKelas = myRoles.some(r => r.includes('wali_kelas'))
      const isGuru = userRole === 'GURU' || myRoles.some(r => r === 'guru')
      const isPegawai = userRole === 'PEGAWAI' || myRoles.some(r => r === 'pegawai' || r === 'staf' || r === 'karyawan' || r === 'admin_tu' || r === 'bau')

      const matchRole = 
        (isKurikulum && targets.some((t: string) => t.toLowerCase().includes('kurikulum'))) ||
        (isKesiswaan && targets.some((t: string) => t.toLowerCase().includes('kesiswaan'))) ||
        (isSarpras && targets.some((t: string) => t.toLowerCase().includes('sarana') || t.toLowerCase().includes('sarpras'))) ||
        (isHumas && targets.some((t: string) => t.toLowerCase().includes('humas') || t.toLowerCase().includes('sdm'))) ||
        (isIsmuba && targets.some((t: string) => t.toLowerCase().includes('ismuba'))) ||
        (isKeuangan && targets.some((t: string) => t.toLowerCase().includes('keuangan'))) ||
        (isBau && targets.some((t: string) => t.toLowerCase().includes('administrasi umum') || t.toLowerCase().includes('bau') || t.toLowerCase().includes('tata usaha'))) ||
        (isPerpus && targets.some((t: string) => t.toLowerCase().includes('perpustakaan'))) ||
        (isLab && targets.some((t: string) => t.toLowerCase().includes('lab'))) ||
        (isBk && targets.some((t: string) => t.toLowerCase().includes('bk'))) ||
        (isWaliKelas && targets.some((t: string) => t.toLowerCase().includes('wali kelas'))) ||
        (isGuru && targets.includes('Guru') && !diteruskan.guruNama && !diteruskan.guruId) ||
        (isPegawai && targets.includes('Staf') && !diteruskan.stafNama && !diteruskan.stafId)

      // Jika Superadmin/Kepsek/TU ingin melihat disposisi milik mereka di tab aktif/arsip
      if (isSuperOrAdmin) return true

      return matchName || matchRole
    })
  }, [dbSuratMasuk, userName, userRole, userSubRole, userSubRole2, userSubRole3, user?.id, isSuperOrAdmin, activeTab])

  // Pisahkan list berdasarkan status: Aktif vs Arsip Selesai
  const { aktifList, arsipList } = useMemo(() => {
    const aktif: any[] = []
    const arsip: any[] = []

    myDisposisiList.forEach((item: any) => {
      const isDone = item.statusDisposisi === 'DILAKSANAKAN' || item.statusDisposisi === 'SELESAI' || item.statusTahapan === 'PENYELESAIAN'
      if (isDone) {
        arsip.push(item)
      } else {
        aktif.push(item)
      }
    })

    return { aktifList: aktif, arsipList: arsip }
  }, [myDisposisiList])

  // Filter pencarian & sifat sesuai tab aktif
  const currentTabItems = useMemo(() => {
    const baseList = activeTab === 'aktif' ? aktifList : activeTab === 'arsip' ? arsipList : myDisposisiList

    return baseList.filter((item: any) => {
      const q = searchQuery.toLowerCase()
      const matchSearch = 
        (item.perihal || '').toLowerCase().includes(q) ||
        (item.nomorSurat || '').toLowerCase().includes(q) ||
        (item.nomorAgenda || '').toLowerCase().includes(q) ||
        (item.instansi || '').toLowerCase().includes(q) ||
        (item.disposisi?.diteruskanKepada?.guruNama || '').toLowerCase().includes(q)

      const matchSifat = filterSifat === 'ALL' || item.sifat === filterSifat
      return matchSearch && matchSifat
    })
  }, [activeTab, aktifList, arsipList, myDisposisiList, searchQuery, filterSifat])

  // Handler Update Status Progres Tindak Lanjut oleh Pengguna (PROSES, DILAKSANAKAN, PENDING)
  const handleUpdateStatusProgres = async (surat: any, newStatus: 'PROSES' | 'DILAKSANAKAN' | 'PENDING', note?: string) => {
    try {
      const statusTahapanMap = {
        PROSES: 'PENGECEKAN',
        DILAKSANAKAN: 'PENYELESAIAN',
        PENDING: 'DISAMPAIKAN',
      }

      const statusLabelMap = {
        PROSES: 'Sedang Diproses',
        DILAKSANAKAN: 'Telah Dilaksanakan & Masuk Arsip',
        PENDING: 'Pending / Tertunda',
      }

      const res = await authenticatedFetch(`/api-backend/surat-masuk/${surat.id}/status-tindak-lanjut`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          statusDisposisi: newStatus,
          statusTahapan: statusTahapanMap[newStatus],
          catatanTindakLanjut: note || undefined
        }),
      })

      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: `Status: ${newStatus === 'DILAKSANAKAN' ? 'Selesai & Diarsipkan' : statusLabelMap[newStatus]}`,
          text: `Progres disposisi agenda "${surat.nomorAgenda}" (${surat.perihal}) telah diperbarui.`,
          timer: 2000,
          showConfirmButton: false,
        })
        queryClient.invalidateQueries({ queryKey: ['disposisi-user-list'] })
        queryClient.invalidateQueries({ queryKey: ['persuratan-surat-masuk-list'] })
        if (selectedSurat?.id === surat.id) {
          setSelectedSurat((prev: any) => ({
            ...prev,
            statusTahapan: statusTahapanMap[newStatus],
            statusDisposisi: newStatus,
          }))
        }
      } else {
        Swal.fire('Gagal', 'Tidak dapat memperbarui status disposisi.', 'error')
      }
    } catch (e) {
      console.error(e)
      Swal.fire('Error', 'Terjadi kesalahan sistem saat memperbarui status.', 'error')
    }
  }

  // Handler Keluarkan dari Arsip (Kembalikan ke Aktif)
  const handleUnarchive = async (surat: any) => {
    await handleUpdateStatusProgres(surat, 'PROSES', 'Dikeluarkan dari arsip untuk ditindaklanjuti kembali.')
  }

  // Handle Cetak Lembar Disposisi Presisi Standar Resmi
  const handleCetakLembarDisposisi = (surat: any) => {
    const disp = surat.disposisi || {}
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const sifatVal = disp.sifat || surat.sifat || 'PENTING'
    const isSifat = (val: string) => (sifatVal === val ? '☑' : '☐')
    
    const instruksiList = Array.isArray(disp.instruksi) ? disp.instruksi : (disp.instruksi ? [disp.instruksi] : ['Ditindak Lanjuti'])
    const isInstruksi = (val: string) => (instruksiList.includes(val) ? '✓' : '')

    const targetObj = disp.diteruskanKepada || {}
    const targetList = Array.isArray(targetObj.targets) ? targetObj.targets : ['Wakasek Kurikulum', 'Guru']
    const isTarget = (val: string) => (targetList.includes(val) ? '✓' : '')

    const tokenEsign = disp.eSignToken || 'DSP8492'
    const verifyUrl = getAppFeatureUrl(`/verifikasi-ttd?token=${tokenEsign}`)

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title></title>
          <style>
            @page { size: A4 portrait; margin: 15mm; }
            @media print { html, body { width: 100%; height: 100%; margin: 0 !important; padding: 0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
            body { font-family: 'Times New Roman', serif; font-size: 10pt; color: #000; margin: 0; padding: 0; line-height: 1.2; }
            .header-kop { display: flex; align-items: center; justify-content: space-between; border-bottom: 2.5pt double #000; padding-bottom: 5px; margin-bottom: 7px; }
            .logo-box { width: 70px; text-align: center; }
            .logo-box img { max-width: 65px; height: auto; display: block; margin: 0 auto; }
            .kop-text { text-align: center; flex: 1; padding: 0 8px; }
            .kop-text .org { font-size: 9.5pt; font-weight: bold; text-transform: uppercase; margin: 0; }
            .kop-text .school { font-size: 14.5pt; font-weight: bold; text-transform: uppercase; margin: 1.5px 0; }
            .kop-text .status { font-size: 9pt; font-weight: bold; margin: 0; }
            .kop-text .addr { font-size: 8.5pt; margin-top: 1.5px; }
            .agenda-box { border: 1pt solid #000; padding: 2px 8px; font-weight: bold; font-size: 9pt; text-align: right; width: fit-content; margin-left: auto; margin-bottom: 3px; }
            .title { text-align: center; font-size: 12pt; font-weight: bold; letter-spacing: 1px; margin: 2px 0 6px 0; }
            table.bordered-table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
            table.bordered-table th, table.bordered-table td { border: 1pt solid #000; padding: 3.5px 5px; vertical-align: top; font-size: 9pt; }
            .checkbox-row { display: flex; justify-content: space-around; font-weight: bold; padding: 1px 0; }
            .status-table { width: 100%; border-collapse: collapse; text-align: center; margin: 0; }
            .status-table th { background: #f2f2f2; font-weight: bold; border: 1pt solid #000; padding: 2.5px; font-size: 8pt; width: 25%; }
            .status-table td { border: 1pt solid #000; padding: 3px; font-size: 8.5pt; }
            .split-table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
            .split-table th { border: 1pt solid #000; padding: 3.5px 5px; text-align: left; font-weight: bold; background-color: #f8f8f8; font-size: 9pt; }
            .split-table td { border: 1pt solid #000; padding: 3.5px 5px; vertical-align: top; font-size: 9pt; }
            .check-item { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5px; border-bottom: 0.5pt dashed #eee; padding-bottom: 0.5px; }
            .check-box-square { width: 12px; height: 12px; border: 1pt solid #000; display: inline-flex; align-items: center; justify-content: center; font-size: 8.5pt; font-weight: bold; }
            .catatan-box { border: 1pt solid #000; min-height: 60px; padding: 5px; font-size: 9pt; line-height: 1.25; }
            .signature-section { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 8px; }
            .signature-box { width: 230px; font-size: 9pt; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header-kop">
            <div class="logo-box"><img src="/muhammadiyah-logo-40493.png" alt="Logo Dikdasmen" /></div>
            <div class="kop-text">
              <p class="org">MAJELIS PENDIDIKAN DASAR DAN MENENGAH<br/>PIMPINAN DAERAH MUHAMMADIYAH PONOROGO</p>
              <p class="school">SMA MUHAMMADIYAH 1 PONOROGO</p>
              <p class="status">Status : Terakreditasi A &nbsp;&nbsp;&nbsp;&nbsp; NPSN : 20510139</p>
              <p class="addr">Jl. Batoro Katong No. 6B Telp/Fax (0352) 481521 Ponorogo 63411</p>
            </div>
            <div class="logo-box"><img src="/pic_logo.png" alt="Logo Sekolah" /></div>
          </div>

          <div class="agenda-box">NOMOR AGENDA : ${surat.nomorAgenda || disp.nomorAgenda || '-'}</div>
          <div class="title">LEMBAR DISPOSISI</div>

          <table class="bordered-table">
            <tr>
              <td colspan="4">
                <div class="checkbox-row">
                  <span>${isSifat('RAHASIA')} RAHASIA</span>
                  <span>${isSifat('PENTING')} PENTING</span>
                  <span>${isSifat('RUTIN')} RUTIN</span>
                </div>
              </td>
            </tr>
            <tr>
              <td colspan="4" style="padding:0;">
                <table class="status-table">
                  <tr>
                    <th>DITERIMA</th>
                    <th>DISAMPAIKAN</th>
                    <th>PENGECEKAN</th>
                    <th>PENYELESAIAN</th>
                  </tr>
                  <tr>
                    <td>${surat.tanggalDiterima ? new Date(surat.tanggalDiterima).toLocaleDateString('id-ID') : '-'}</td>
                    <td>${surat.statusTahapan === 'DISAMPAIKAN' || surat.statusTahapan === 'PENGECEKAN' || surat.statusTahapan === 'PENYELESAIAN' ? '✓' : '-'}</td>
                    <td>${surat.statusTahapan === 'PENGECEKAN' || surat.statusTahapan === 'PENYELESAIAN' ? '✓' : '-'}</td>
                    <td>${surat.statusTahapan === 'PENYELESAIAN' ? '✓' : '-'}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="width: 22%; font-weight: bold; background: #fafafa;">PERIHAL</td>
              <td colspan="3">${surat.perihal}</td>
            </tr>
            <tr>
              <td style="font-weight: bold; background: #fafafa;">TANGGAL/NO</td>
              <td colspan="3">${surat.tanggalSurat ? new Date(surat.tanggalSurat).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}; ${surat.nomorSurat}</td>
            </tr>
            <tr>
              <td style="font-weight: bold; background: #fafafa;">ASAL</td>
              <td colspan="3">${surat.instansi || surat.pengirim}</td>
            </tr>
          </table>

          <table class="split-table">
            <tr>
              <th style="width: 50%;">INSTRUKSI / INFORMASI :</th>
              <th style="width: 50%;">DITERUSKAN KEPADA :</th>
            </tr>
            <tr>
              <td>
                ${['Arsip', 'Ditindak Lanjuti', 'Dipertimbangkan', 'Berpartisipasi', 'Dicukupi', 'Diijinkan', 'Dihadiri'].map(item => `
                  <div class="check-item">
                    <span>${item}</span>
                    <span class="check-box-square">${isInstruksi(item)}</span>
                  </div>
                `).join('')}
              </td>
              <td>
                ${[
                  { key: 'Wakasek Kurikulum', label: 'Wakasek Kurikulum' },
                  { key: 'Wakasek Kesiswaan', label: 'Wakasek Kesiswaan' },
                  { key: 'Wakasek Sarana Prasarana', label: 'Wakasek Sarana Prasarana' },
                  { key: 'Waka Humas dan SDM', label: 'Waka Humas dan SDM' },
                  { key: 'Waka ISMUBA', label: 'Waka ISMUBA' },
                  { key: 'Biro Administrasi Keuangan', label: 'Biro Administrasi Keuangan' },
                  { key: 'Biro Administrasi Umum', label: 'Biro Administrasi Umum' },
                  { key: 'Biro Kerumahtanggaan', label: 'Biro Kerumahtanggaan' },
                  { key: 'Guru', label: `Guru ${targetObj.guruNama ? ': ' + targetObj.guruNama : '.....'}` },
                  { key: 'Bagian', label: `Bagian ${targetObj.bagianNama ? ': ' + targetObj.bagianNama : '.....'}` },
                  { key: 'Staf', label: `Staf ${targetObj.stafNama ? ': ' + targetObj.stafNama : '.....'}` }
                ].map(t => `
                  <div class="check-item">
                    <span>${t.label}</span>
                    <span class="check-box-square">${isTarget(t.key)}</span>
                  </div>
                `).join('')}
              </td>
            </tr>
          </table>

          <div style="font-weight: bold; margin-bottom: 2px; font-size: 9pt;">CATATAN KEPALA SEKOLAH:</div>
          <div class="catatan-box">
            ${disp.catatan || 'Segera koordinasikan dan tindak lanjuti sesuai arahan pimpinan.'}
          </div>

          <div class="signature-section">
            <div style="font-size: 8.5pt; color: #333;">
              <p style="margin: 0;">Disposisi SIMASMUH E-Sign</p>
              <p style="margin: 0; font-family: monospace;">Token: ${tokenEsign}</p>
            </div>
            <div class="signature-box">
              <p style="margin-bottom: 3px;">Kepala Sekolah,</p>
              ${disp.signatureImage ? `<img src="${disp.signatureImage}" style="max-height: 48px; margin: 2px auto; display: block;" />` : `<div style="height: 45px;"></div>`}
              <p style="font-weight: bold; text-decoration: underline; margin-bottom: 0;">${disp.signerName || 'Sugeng Riadi, M.Pd.'}</p>
              <p style="margin-top: 1px; font-weight: bold;">${disp.signerNbm || 'NBM. 974.501'}</p>
            </div>
          </div>

          <script>
            window.onload = function() {
              document.title = '';
              setTimeout(function() { window.print(); }, 300);
            }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <div className="space-y-4">
      {/* Navigation Tabs & Controls - Touchscreen Optimized */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <Button
            size="sm"
            variant={activeTab === 'aktif' ? 'default' : 'outline'}
            onClick={() => setActiveTab('aktif')}
            className={`min-h-[40px] px-3.5 text-xs font-bold rounded-xl gap-2 transition-all cursor-pointer ${
              activeTab === 'aktif' ? 'bg-purple-700 hover:bg-purple-800 text-white shadow-sm' : 'hover:bg-purple-50 dark:hover:bg-purple-950/30'
            }`}
          >
            <Inbox className="w-4 h-4 text-amber-300" />
            <span>Disposisi Aktif</span>
            <Badge variant="secondary" className="ml-1 text-[11px] px-2 py-0.5 bg-white/20 text-white font-bold rounded-lg">
              {aktifList.length}
            </Badge>
          </Button>

          <Button
            size="sm"
            variant={activeTab === 'arsip' ? 'default' : 'outline'}
            onClick={() => setActiveTab('arsip')}
            className={`min-h-[40px] px-3.5 text-xs font-bold rounded-xl gap-2 transition-all cursor-pointer ${
              activeTab === 'arsip' ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm' : 'hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
            }`}
          >
            <FolderArchive className="w-4 h-4" />
            <span>Arsip Selesai</span>
            <Badge variant="secondary" className="ml-1 text-[11px] px-2 py-0.5 bg-white/20 text-white font-bold rounded-lg">
              {arsipList.length}
            </Badge>
          </Button>

          {isSuperOrAdmin && (
            <Button
              size="sm"
              variant={activeTab === 'semua' ? 'default' : 'outline'}
              onClick={() => setActiveTab('semua')}
              className={`min-h-[40px] px-3.5 text-xs font-bold rounded-xl gap-2 transition-all cursor-pointer ${
                activeTab === 'semua' ? 'bg-slate-800 hover:bg-slate-900 text-white shadow-sm' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <UserCheck className="w-4 h-4 text-blue-300" />
              <span>Semua Disposisi Sekolah</span>
              <Badge variant="secondary" className="ml-1 text-[11px] px-2 py-0.5 bg-white/20 text-white font-bold rounded-lg">
                {myDisposisiList.length}
              </Badge>
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="min-h-[40px] px-3.5 text-xs text-slate-700 dark:text-slate-200 font-bold gap-1.5 rounded-xl border-slate-200 dark:border-slate-800 hover:bg-slate-100 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 text-purple-600" />
            <span>Segarkan</span>
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar - Touchscreen Friendly */}
      <div className="flex flex-col sm:flex-row items-center gap-2.5 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Cari perihal, nomor surat, nomor agenda, atau instansi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
          />
        </div>

        <Select value={filterSifat} onValueChange={(val) => setFilterSifat(val || 'ALL')}>
          <SelectTrigger className="h-10 text-xs w-full sm:w-[160px] rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 cursor-pointer">
            <SelectValue placeholder="Sifat Surat" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="ALL">Semua Sifat</SelectItem>
            <SelectItem value="RAHASIA">Rahasia</SelectItem>
            <SelectItem value="PENTING">Penting</SelectItem>
            <SelectItem value="RUTIN">Rutin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid List Card Disposisi */}
      {isLoading ? (
        <div className="p-10 text-center text-xs font-bold text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200">
          Memuat data lembar disposisi...
        </div>
      ) : currentTabItems.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 space-y-2">
          <CornerDownRight className="w-9 h-9 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm">
            {activeTab === 'aktif' ? 'Tidak Ada Disposisi Aktif yang Ditujukan Kepada Anda' : activeTab === 'arsip' ? 'Belum Ada Arsip Disposisi Selesai' : 'Tidak Ada Data Disposisi'}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Disposisi dari Kepala Sekolah yang menugaskan Anda atau unit kerja Anda akan muncul di sini.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {currentTabItems.map((item: any) => {
            const disp = item.disposisi || {}
            const isApproved = disp.statusEsign === 'DISETUJUI' || item.statusDisposisi === 'DISPOSISI_DISETUJUI' || item.statusDisposisi === 'DILAKSANAKAN'
            const isDone = item.statusDisposisi === 'DILAKSANAKAN' || item.statusDisposisi === 'SELESAI' || item.statusTahapan === 'PENYELESAIAN'

            return (
              <Card 
                key={item.id} 
                className="border-slate-200/90 dark:border-slate-800 hover:border-purple-400 transition-all shadow-xs rounded-2xl bg-white dark:bg-slate-900 flex flex-col justify-between"
              >
                <CardHeader className="p-4 pb-2.5 space-y-2">
                  <div className="flex items-center justify-between gap-1.5 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md">
                        Agenda: {item.nomorAgenda || '-'}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0.5 rounded-md">
                        {item.sifat || 'RUTIN'}
                      </Badge>
                      {isApproved ? (
                        <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Disetujui
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-md">
                          Menunggu E-Sign
                        </Badge>
                      )}
                    </div>

                    <span className="text-[11px] text-slate-400 font-medium">
                      {item.tanggalDiterima ? new Date(item.tanggalDiterima).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2 leading-snug">
                      {item.perihal}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 truncate">
                      Asal: <strong>{item.instansi}</strong> ({item.nomorSurat})
                    </p>
                  </div>
                </CardHeader>

                <CardContent className="p-4 pt-1 space-y-3">
                  {/* Instruksi & Target */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
                    <div className="flex items-start gap-1.5">
                      <span className="font-bold text-purple-800 dark:text-purple-300 shrink-0">Instruksi:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {Array.isArray(disp.instruksi) ? disp.instruksi.join(', ') : 'Ditindak Lanjuti'}
                      </span>
                    </div>

                    {disp.diteruskanKepada && (
                      <div className="flex items-start gap-1.5 text-slate-600 dark:text-slate-400">
                        <span className="font-semibold shrink-0">Ditugaskan:</span>
                        <span className="truncate font-medium">
                          {[
                            ...(Array.isArray(disp.diteruskanKepada.targets) ? disp.diteruskanKepada.targets : []),
                            disp.diteruskanKepada.guruNama,
                            disp.diteruskanKepada.stafNama
                          ].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}

                    {disp.catatan && (
                      <p className="text-slate-500 dark:text-slate-400 italic line-clamp-2 text-[11px] pt-0.5 border-t border-slate-200/50 dark:border-slate-800/50">
                        &ldquo;{disp.catatan}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Status Badge & Action Controls - Touch Friendly Minimal 40px */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedSurat(item)
                          setCatatanTindakLanjut('')
                          setIsDetailModalOpen(true)
                        }}
                        className="min-h-[38px] px-3 text-xs font-bold text-purple-700 dark:text-purple-300 border-purple-200 hover:bg-purple-50 dark:hover:bg-purple-950/40 gap-1.5 rounded-xl cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> Detail
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCetakLembarDisposisi(item)}
                        className="min-h-[38px] px-3 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 gap-1.5 rounded-xl cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" /> Cetak
                      </Button>
                    </div>

                    {isApproved && (
                      <div className="flex items-center gap-1.5">
                        {isDone ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUnarchive(item)}
                            className="min-h-[38px] px-3 text-xs font-bold rounded-xl text-indigo-700 border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 gap-1.5 cursor-pointer"
                          >
                            <Undo2 className="w-3.5 h-3.5" /> Buka Arsip
                          </Button>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant={item.statusDisposisi === 'PROSES' ? 'default' : 'outline'}
                              onClick={() => handleUpdateStatusProgres(item, 'PROSES')}
                              className={`min-h-[38px] px-3 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                                item.statusDisposisi === 'PROSES' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'text-blue-700 border-blue-200 hover:bg-blue-50'
                              }`}
                            >
                              Proses
                            </Button>
                            <Button
                              size="sm"
                              variant={item.statusDisposisi === 'DILAKSANAKAN' ? 'default' : 'outline'}
                              onClick={() => handleUpdateStatusProgres(item, 'DILAKSANAKAN')}
                              className="min-h-[38px] px-3.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
                            >
                              Selesai
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal Detail Lembar Disposisi & Tindak Lanjut */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto rounded-2xl p-4 sm:p-5">
          <DialogHeader className="border-b pb-2.5">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-sm font-black flex items-center gap-1.5 text-purple-800 dark:text-purple-300">
                <CornerDownRight className="w-4 h-4 text-purple-600" /> LEMBAR DISPOSISI RESMI
              </DialogTitle>
              {selectedSurat && (
                <Badge className="bg-purple-100 text-purple-800 font-mono text-[10px] font-bold">
                  Agenda: {selectedSurat.nomorAgenda || '-'}
                </Badge>
              )}
            </div>
            <DialogDescription className="text-[11px]">
              SMA Muhammadiyah 1 Ponorogo — Dokumen Disposisi Terverifikasi E-Sign Sah
            </DialogDescription>
          </DialogHeader>

          {selectedSurat && (
            <div className="space-y-3 py-1 text-xs">
              {/* Info Surat Masuk */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="flex items-center justify-between font-mono font-bold text-[11px] text-purple-700 dark:text-purple-300">
                  <span>SIFAT: {selectedSurat.sifat || 'RUTIN'}</span>
                  <span>TGL: {selectedSurat.tanggalSurat ? new Date(selectedSurat.tanggalSurat).toLocaleDateString('id-ID') : '-'}</span>
                </div>
                <p className="font-extrabold text-xs text-slate-900 dark:text-white">
                  {selectedSurat.perihal}
                </p>
                <div className="text-slate-600 dark:text-slate-400 space-y-0.5 text-[11px]">
                  <p>Asal Instansi: <strong>{selectedSurat.instansi}</strong></p>
                  <p>Nomor Surat: <strong>{selectedSurat.nomorSurat}</strong></p>
                </div>

                {selectedSurat.fileUrl && (
                  <div className="pt-1.5 border-t mt-1.5">
                    <a
                      href={selectedSurat.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-[11px]"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Buka Berkas Surat Asli
                    </a>
                  </div>
                )}
              </div>

              {/* Arahan Disposisi Kepala Sekolah */}
              <div className="p-3 bg-purple-50/70 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-800 space-y-1.5">
                <h4 className="font-black text-purple-950 dark:text-purple-200 uppercase tracking-wider text-[10px]">
                  📌 Arahan & Instruksi Kepala Sekolah:
                </h4>
                <div className="space-y-1 text-slate-800 dark:text-slate-200 text-[11px]">
                  <p>Instruksi: <strong>{Array.isArray(selectedSurat.disposisi?.instruksi) ? selectedSurat.disposisi.instruksi.join(', ') : 'Ditindak Lanjuti'}</strong></p>
                  <p>Diteruskan Kepada: <strong>{[
                    ...(Array.isArray(selectedSurat.disposisi?.diteruskanKepada?.targets) ? selectedSurat.disposisi.diteruskanKepada.targets : []),
                    selectedSurat.disposisi?.diteruskanKepada?.guruNama,
                    selectedSurat.disposisi?.diteruskanKepada?.stafNama
                  ].filter(Boolean).join(', ')}</strong></p>
                  {selectedSurat.disposisi?.catatan && (
                    <p className="italic bg-white dark:bg-slate-900 p-2 rounded-lg border text-slate-700 dark:text-slate-300 text-[11px]">
                      &ldquo;{selectedSurat.disposisi.catatan}&rdquo;
                    </p>
                  )}
                </div>
              </div>

              {/* Tanda Tangan Digital & Verifikasi E-Sign */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border flex items-center justify-between gap-3">
                <div className="space-y-0.5 text-[11px]">
                  <div className="flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>E-Sign Terverifikasi Resmi</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400">
                    Penandatangan: <strong>{selectedSurat.disposisi?.signerName || 'Sugeng Riadi, M.Pd.'}</strong> ({selectedSurat.disposisi?.signerNbm || 'NBM. 974.501'})
                  </p>
                  {selectedSurat.disposisi?.eSignToken && (
                    <p className="font-mono text-[10px] text-purple-700 font-bold">
                      Token QR: {selectedSurat.disposisi.eSignToken}
                    </p>
                  )}
                </div>

                {selectedSurat.disposisi?.eSignToken && (
                  <div className="p-1 bg-white rounded-lg border shadow-2xs">
                    <QRCodeSVG
                      value={JSON.stringify({
                        issuer: 'SIMASMUH E-Sign Disposisi',
                        agenda: selectedSurat.nomorAgenda,
                        perihal: selectedSurat.perihal,
                        token: selectedSurat.disposisi.eSignToken
                      })}
                      size={52}
                      level="M"
                    />
                  </div>
                )}
              </div>

              {/* Form Tambah Catatan Tindak Lanjut */}
              <div className="space-y-1 pt-1">
                <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Catatan Laporan Tindak Lanjut (Opsional):
                </Label>
                <Textarea
                  rows={2}
                  placeholder="Tuliskan keterangan tindak lanjut hasil pelaksanaan disposisi..."
                  value={catatanTindakLanjut}
                  onChange={(e) => setCatatanTindakLanjut(e.target.value)}
                  className="text-xs rounded-xl"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t pt-2.5">
            <div className="flex items-center gap-1.5 self-start sm:self-center">
              <Button variant="outline" size="sm" onClick={() => setIsDetailModalOpen(false)} className="rounded-xl h-8 text-xs">
                Tutup
              </Button>
              {selectedSurat && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => handleCetakLembarDisposisi(selectedSurat)}
                  className="rounded-xl h-8 text-xs font-bold gap-1"
                >
                  <Printer className="w-3.5 h-3.5" /> Cetak Lembar
                </Button>
              )}
            </div>
            
            {selectedSurat && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <Button
                  size="sm"
                  variant={selectedSurat.statusDisposisi === 'PROSES' ? 'default' : 'outline'}
                  onClick={() => handleUpdateStatusProgres(selectedSurat, 'PROSES', catatanTindakLanjut)}
                  className={`h-8 px-2.5 text-xs font-bold rounded-xl ${
                    selectedSurat.statusDisposisi === 'PROSES' ? 'bg-blue-600 text-white' : 'text-blue-700 border-blue-200'
                  }`}
                >
                  Proses
                </Button>
                <Button
                  size="sm"
                  variant={selectedSurat.statusDisposisi === 'DILAKSANAKAN' ? 'default' : 'outline'}
                  onClick={() => handleUpdateStatusProgres(selectedSurat, 'DILAKSANAKAN', catatanTindakLanjut)}
                  className="h-8 px-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Selesai & Arsipkan
                </Button>
                <Button
                  size="sm"
                  variant={selectedSurat.statusDisposisi === 'PENDING' ? 'default' : 'outline'}
                  onClick={() => handleUpdateStatusProgres(selectedSurat, 'PENDING', catatanTindakLanjut)}
                  className={`h-8 px-2.5 text-xs font-bold rounded-xl ${
                    selectedSurat.statusDisposisi === 'PENDING' ? 'bg-rose-600 text-white' : 'text-rose-700 border-rose-200'
                  }`}
                >
                  Pending
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
