'use client'

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { 
  Loader2, Banknote, Settings, Download, CheckCircle2, DollarSign, Calculator,
  FileText, Printer, Plus, Trash2, Clock, Calendar, ShieldCheck, UserCheck, Eye, Sparkles
} from 'lucide-react'
import Swal from 'sweetalert2'
import { SortableTableHead, useSorting } from "@/components/SortableTableHead"
import { useAuthenticatedQuery, useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { TableSearch, filterDataBySearch } from '@/components/TableSearch'

type ManualItem = {
  name: string
  amount: number
}

type DailyDetail = {
  date: string
  checkInTime: string
  checkOutTime: string
  durationHours: number
  transportIn: number
  transportOut: number
  transportTotal: number
  mealAllowance: number
}

type PayrollStaff = {
  id: string
  name: string
  roles: string
  role: string
  nip: string
  phone: string
  employmentStatus: 'PTTP' | 'GTTP' | 'GTP' | 'PTP' | string
  masaKerja?: number
  bankName?: string
  bankAccountNumber?: string
  bankAccountHolder?: string
  totalHadir: number
  totalIzin: number
  totalHours: number
  hourlyRate: number
  baseSalary: number
  kelebihanJam?: number
  transportAllowance: number
  mealAllowance: number
  totalAllowance: number
  totalGrossSalary?: number
  totalDeduction: number
  netSalary: number
  manualAllowances: ManualItem[]
  manualDeductions: ManualItem[]
  notes?: string
  isConfigured?: boolean
  dailyDetails?: DailyDetail[]
}

const EMPLOYMENT_STATUS_OPTIONS = [
  { value: 'PTTP', label: 'PTTP (Pegawai Tidak Tetap)', badgeBg: 'bg-amber-100 text-amber-800 border-amber-300' },
  { value: 'GTTP', label: 'GTTP (Guru Tidak Tetap)', badgeBg: 'bg-sky-100 text-sky-800 border-sky-300' },
  { value: 'GTP', label: 'GTP (Guru Tetap)', badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { value: 'PTP', label: 'PTP (Pegawai Tetap)', badgeBg: 'bg-purple-100 text-purple-800 border-purple-300' },
]

// Standar List Komponen Tunjangan Sesuai Slip Fisik
const STANDARD_ALLOWANCES = [
  'Jabatan',
  'Berkala',
  'Keluarga',
  'Sembako',
  'Kom/Kin',
  'Jarak',
  'Fungsional',
]

// Standar List Komponen Potongan Sesuai Slip Fisik
const STANDARD_DEDUCTIONS = [
  'Infaq',
  'Dansos',
  'Tab.Krb',
  'Qurban',
  'BRI/MS',
  'IKS',
  'SumbSos',
  'Rek BNI',
  'Listrik',
  'Telp.',
  'Ars.Stnk',
  'Ars HRY',
  'Kas bon Hr',
  'BPJS',
  'Lain-lain',
]

export default function PenggajianPage() {
  const queryClient = useQueryClient()
  const authenticatedFetch = useAuthenticatedFetch()
  const authenticatedQuery = useAuthenticatedQuery()
  const printSlipRef = useRef<HTMLDivElement>(null)

  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString())
  const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString())
  const [searchQuery, setSearchQuery] = useState('')

  // State Modal Pengaturan Gaji Pegawai
  const [selectedStaff, setSelectedStaff] = useState<PayrollStaff | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [formMasaKerja, setFormMasaKerja] = useState<string>('0')
  const [formBankName, setFormBankName] = useState<string>('BNI')
  const [formBankAccountNumber, setFormBankAccountNumber] = useState<string>('')
  const [formBankAccountHolder, setFormBankAccountHolder] = useState<string>('')
  const [formHours, setFormHours] = useState<string>('0')
  const [formHourlyRate, setFormHourlyRate] = useState<string>('0')
  const [formKelebihanJam, setFormKelebihanJam] = useState<string>('0')
  const [formStatus, setFormStatus] = useState<string>('GTTP')
  const [allowanceValues, setAllowanceValues] = useState<Record<string, number>>({})
  const [deductionValues, setDeductionValues] = useState<Record<string, number>>({})
  const [customAllowances, setCustomAllowances] = useState<ManualItem[]>([])
  const [customDeductions, setCustomDeductions] = useState<ManualItem[]>([])
  const [formNotes, setFormNotes] = useState<string>('')

  // State Modal Slip Gaji
  const [showSlipModal, setShowSlipModal] = useState(false)
  const [slipData, setSlipData] = useState<any>(null)
  const [isLoadingSlip, setIsLoadingSlip] = useState(false)

  // State Pilihan Multi Slip Gaji (Cetak Terpilih / Semua)
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([])
  const [isBulkPrinting, setIsBulkPrinting] = useState(false)

  // Fetch Summary Penggajian
  const { data: payroll, isLoading } = useQuery<PayrollStaff[]>({
    queryKey: ['payroll-summary', selectedYear, selectedMonth],
    queryFn: async () => {
      const res = await authenticatedQuery(
        `/api-backend/finance/payroll-summary?year=${selectedYear}&month=${selectedMonth}`
      )
      if (!Array.isArray(res)) return []
      return res.filter((item: PayrollStaff) => 
        !['SISWA', 'WALI_MURID'].includes(item.role) &&
        !['SISWA', 'WALI_MURID'].includes(item.roles)
      )
    }
  })

  // Helper render HTML Card Slip Gaji untuk cetak (Presisi format fisik & hemat tempat)
  const renderSingleSlipHtml = (data: any) => {
    return `
      <div class="slip-card-print">
        <!-- Kop Sekolah -->
        <div class="header-kop">
          <div style="width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid #94a3b8; border-radius: 4px; font-size: 18px; font-weight: bold;">
            🏢
          </div>
          <div>
            <div class="kop-title">${data.schoolInfo?.schoolName || 'SMA MUHAMMADIYAH 1 PONOROGO'}</div>
            <div class="kop-subtitle">${data.schoolInfo?.address || 'Jln. Batoro Katong No. 6B Ponorogo'} | Telp. ${data.schoolInfo?.phone || '(0352) 481521'}</div>
          </div>
        </div>

        <!-- Info Biodata Pegawai -->
        <table class="staff-info-table">
          <tbody>
            <tr>
              <td style="width: 80px;">Nama</td>
              <td style="width: 10px;">:</td>
              <td style="font-weight: bold; text-transform: uppercase;">${data.staff?.name || '-'}</td>
            </tr>
            <tr>
              <td>Jabatan</td>
              <td>:</td>
              <td>
                <span style="font-weight: bold;">${data.staff?.employmentStatus || 'GTTP'}</span>
                <span style="margin-left: 28px;">Jumlah Jam</span>
                <span>: ${data.calculation?.totalHours ?? 0}</span>
              </td>
            </tr>
            <tr>
              <td>Masa Kerja</td>
              <td>:</td>
              <td>
                <span>${data.staff?.masaKerja ?? 0}</span>
                <span style="margin-left: 42px;">Nilai Satuan/JAM</span>
                <span>: ${formatRpSlip(data.calculation?.hourlyRate)}</span>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- GAJI -->
        <div class="section-title">GAJI</div>
        <div class="item-row">
          <span>1. Gaji Pokok</span>
          <span style="font-family: monospace;">: ${formatRpSlip(data.calculation?.baseSalary)}</span>
        </div>
        <div class="item-row">
          <span>2. Kelebihan Jam</span>
          <span style="font-family: monospace;">: ${formatRpSlip(data.calculation?.kelebihanJam)}</span>
        </div>

        <!-- 3. TUNJANGAN -->
        <div class="section-title" style="margin-top: 1px;">3. Tunjangan</div>
        <div class="two-column-grid">
          <div>
            <div class="sub-item-row">
              <span>1. Jabatan</span>
              <span style="font-family: monospace;">: ${formatRpSlip(data.calculation?.manualAllowances?.find((a: any) => a.name === 'Jabatan')?.amount)}</span>
            </div>
            <div class="sub-item-row">
              <span>2. Berkala</span>
              <span style="font-family: monospace;">: ${formatRpSlip(data.calculation?.manualAllowances?.find((a: any) => a.name === 'Berkala')?.amount)}</span>
            </div>
            <div class="sub-item-row">
              <span>3. Keluarga</span>
              <span style="font-family: monospace;">: ${formatRpSlip(data.calculation?.manualAllowances?.find((a: any) => a.name === 'Keluarga')?.amount)}</span>
            </div>
            <div class="sub-item-row">
              <span>4. Sembako</span>
              <span style="font-family: monospace;">: ${formatRpSlip(data.calculation?.manualAllowances?.find((a: any) => a.name === 'Sembako')?.amount)}</span>
            </div>
          </div>
          <div>
            <div class="sub-item-row">
              <span>5. Kom/Kin</span>
              <span style="font-family: monospace;">: ${formatRpSlip(data.calculation?.manualAllowances?.find((a: any) => a.name === 'Kom/Kin')?.amount)}</span>
            </div>
            <div class="sub-item-row">
              <span>6. Abs mkn</span>
              <span style="font-family: monospace;">: ${formatRpSlip((data.calculation?.mealAllowance || 0) + (data.calculation?.transportAllowance || 0))}</span>
            </div>
            <div class="sub-item-row">
              <span>7. Jarak</span>
              <span style="font-family: monospace;">: ${formatRpSlip(data.calculation?.manualAllowances?.find((a: any) => a.name === 'Jarak')?.amount)}</span>
            </div>
            <div class="sub-item-row">
              <span>8. Fungsional</span>
              <span style="font-family: monospace;">: ${formatRpSlip(data.calculation?.manualAllowances?.find((a: any) => a.name === 'Fungsional')?.amount)}</span>
            </div>
          </div>
        </div>

        <!-- TOTAL GAJI KOTOR -->
        <div class="total-block">
          <span>TOTAL</span>
          <span style="font-family: monospace;">: ${formatRpSlip(data.calculation?.totalGrossSalary)}</span>
        </div>

        <!-- POTONGAN -->
        <div class="section-title">POTONGAN</div>
        <div class="item-row">
          <span>1. Jumlah Gaji</span>
          <span style="font-family: monospace;">:</span>
        </div>
        <div class="section-title" style="margin-top: 1px;">2. Potongan</div>
        
        <div class="two-column-grid" style="padding-left: 8px;">
          <div>
            <div class="item-row">
              <span>1.Infaq</span>
              <span style="font-family: monospace;">: ${formatRpSlip(data.calculation?.manualDeductions?.find((d: any) => d.name === 'Infaq')?.amount)}</span>
            </div>
            <div class="item-row">
              <span>2.Dansos</span>
              <span style="font-family: monospace;">: ${formatRpSlip(data.calculation?.manualDeductions?.find((d: any) => d.name === 'Dansos')?.amount)}</span>
            </div>
            <div class="item-row">
              <span>3.Tab.Krb</span>
              <span style="font-family: monospace;">: ${formatRpSlip(data.calculation?.manualDeductions?.find((d: any) => d.name === 'Tab.Krb')?.amount)}</span>
            </div>
            <div class="item-row">
              <span>4.Qurban</span>
              <span style="font-family: monospace;">: ${formatRpSlip(data.calculation?.manualDeductions?.find((d: any) => d.name === 'Qurban')?.amount)}</span>
            </div>
            <div class="item-row">
              <span>5.BRI/MS</span>
              <span style="font-family: monospace;">: ${formatRpSlip(data.calculation?.manualDeductions?.find((d: any) => d.name === 'BRI/MS')?.amount)}</span>
            </div>
            <div class="item-row">
              <span>6.IKS</span>
              <span style="font-family: monospace;">: ${formatRpSlip(data.calculation?.manualDeductions?.find((d: any) => d.name === 'IKS')?.amount)}</span>
            </div>
            <div class="item-row">
              <span>7.SumbSos</span>
              <span style="font-family: monospace;">: ${formatRpSlip(data.calculation?.manualDeductions?.find((d: any) => d.name === 'SumbSos')?.amount)}</span>
            </div>
            <div class="item-row">
              <span>8.Rek BNI</span>
              <span style="font-family: monospace;">: ${formatRpSlip(data.calculation?.manualDeductions?.find((d: any) => d.name === 'Rek BNI')?.amount)}</span>
            </div>
          </div>
          <div>
            <div class="item-row">
              <span>9.Listrik</span>
              <span style="font-family: monospace;">: ${formatRpSlip(data.calculation?.manualDeductions?.find((d: any) => d.name === 'Listrik')?.amount)}</span>
            </div>
            <div class="item-row">
              <span>10.Telp.</span>
              <span style="font-family: monospace;">: ${formatRpSlip(data.calculation?.manualDeductions?.find((d: any) => d.name === 'Telp.')?.amount)}</span>
            </div>
            <div class="item-row">
              <span>11.Ars.Stnk</span>
              <span style="font-family: monospace;">: ${formatRpSlip(data.calculation?.manualDeductions?.find((d: any) => d.name === 'Ars.Stnk')?.amount)}</span>
            </div>
            <div class="item-row">
              <span>12.Ars HRY</span>
              <span style="font-family: monospace;">: ${formatRpSlip(data.calculation?.manualDeductions?.find((d: any) => d.name === 'Ars HRY')?.amount)}</span>
            </div>
            <div class="item-row">
              <span>13.Kas bon Hr</span>
              <span style="font-family: monospace;">: ${formatRpSlip(data.calculation?.manualDeductions?.find((d: any) => d.name === 'Kas bon Hr')?.amount)}</span>
            </div>
            <div class="item-row">
              <span>14.BPJS</span>
              <span style="font-family: monospace;">: ${formatRpSlip(data.calculation?.manualDeductions?.find((d: any) => d.name === 'BPJS')?.amount)}</span>
            </div>
            <div class="item-row">
              <span>15.Lain-lain</span>
              <span style="font-family: monospace;">: ${formatRpSlip(data.calculation?.manualDeductions?.find((d: any) => d.name === 'Lain-lain')?.amount)}</span>
            </div>
          </div>
        </div>

        <!-- TOTAL POTONGAN -->
        <div class="total-block">
          <span>TOTAL POTONGAN</span>
          <span style="font-family: monospace;">: ${formatRpSlip(data.calculation?.totalDeduction)}</span>
        </div>

        <!-- GAJI BERSIH -->
        <div class="net-block">
          <span>GAJI BERSIH</span>
          <span style="font-family: monospace;">: ${formatRpSlip(data.calculation?.netSalary)}</span>
        </div>
        <div style="font-size: 8.5px; color: #4b5563;">TOTAL GAJI-TOTALPOTONGAN</div>

        <!-- Tanda Tangan Bendahara -->
        <div class="ttd-container">
          <div class="ttd-box">
            <div>Ponorogo, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
            <div style="font-weight: bold;">Bendahara</div>
            <div class="stamp-area" style="font-style: italic; color: #9ca3af; font-size: 8.5px;">( Ttd & Cap )</div>
            <div style="font-weight: bold; border-bottom: 1px solid #000; display: inline-block; padding: 0 4px;">${data.schoolInfo?.treasurerName || 'AGUNG TRIBOWO, SE'}</div>
          </div>
        </div>
      </div>
    `
  }

  // Common Print Window Generator (A4 Portrait, 2 slip per lembar)
  const openPrintSlipsWindow = (slipsHtml: string, title = 'Cetak Slip Gaji') => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${title}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 0.7cm 1cm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            body { 
              font-family: 'Courier New', Courier, monospace, 'Arial', sans-serif; 
              font-size: 10px; 
              color: #111827; 
              line-height: 1.15;
              padding: 0;
              margin: 0;
              background: #fff;
            }
            .slip-card-print {
              border: 1px solid #475569;
              padding: 7px 12px;
              margin-bottom: 10px;
              page-break-inside: avoid;
              break-inside: avoid;
              background: #fff;
              border-radius: 4px;
            }
            /* Setiap 2 slip dalam 1 halaman A4 */
            .slip-card-print:nth-of-type(2n) {
              margin-bottom: 0px;
              page-break-after: always;
              break-after: page;
            }
            .header-kop {
              display: flex;
              align-items: center;
              gap: 8px;
              border-bottom: 1.5px solid #000;
              padding-bottom: 3px;
              margin-bottom: 4px;
            }
            .kop-title {
              font-size: 12px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              line-height: 1.1;
            }
            .kop-subtitle {
              font-size: 8.5px;
              font-weight: normal;
              margin-top: 1px;
              line-height: 1.1;
              color: #374151;
            }
            .staff-info-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 3px;
              font-size: 9.5px;
            }
            .staff-info-table td {
              padding: 0.5px 0;
              vertical-align: top;
            }
            .section-title {
              font-weight: bold;
              font-size: 10px;
              margin-top: 2px;
              margin-bottom: 1px;
              text-transform: uppercase;
            }
            .item-row {
              display: flex;
              justify-content: space-between;
              padding: 0;
              font-size: 9.5px;
            }
            .sub-item-row {
              display: flex;
              justify-content: space-between;
              padding-left: 10px;
              font-size: 9.5px;
            }
            .two-column-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              column-gap: 14px;
            }
            .total-block {
              display: flex;
              justify-content: space-between;
              font-weight: bold;
              border-top: 1px dashed #000;
              margin-top: 2px;
              padding-top: 1px;
              font-size: 10px;
            }
            .net-block {
              display: flex;
              justify-content: space-between;
              font-weight: 900;
              font-size: 11px;
              border-top: 1.5px solid #000;
              border-bottom: 1.5px solid #000;
              padding: 1.5px 0;
              margin-top: 2px;
            }
            .ttd-container {
              display: flex;
              justify-content: flex-end;
              margin-top: 6px;
              text-align: center;
              font-size: 9px;
            }
            .ttd-box {
              width: 160px;
            }
            .stamp-area {
              height: 24px;
              display: flex;
              align-items: center;
              justify-content: center;
            }
          </style>
        </head>
        <body>
          ${slipsHtml}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  // Handler Cetak Slip Gaji Single
  const handlePrintSlip = () => {
    if (!slipData) return
    const slipHtml = renderSingleSlipHtml(slipData)
    openPrintSlipsWindow(slipHtml, `Slip Gaji - ${slipData?.staff?.name || 'Pegawai'}`)
  }

  // Handler Cetak Banyak Slip Gaji (Semua / Terpilih)
  const handlePrintBulkSlips = async (targetStaffIds: string[]) => {
    if (!targetStaffIds || targetStaffIds.length === 0) {
      Swal.fire({
        title: 'Pilih Pegawai',
        text: 'Pilih minimal satu pegawai untuk mencetak slip gaji.',
        icon: 'warning',
      })
      return
    }

    setIsBulkPrinting(true)
    try {
      // Ambil data slip gaji satu per satu secara paralel/batch
      const promises = targetStaffIds.map(async (id) => {
        const res = await authenticatedFetch(
          `/api-backend/finance/payroll/slip-gaji/${id}?year=${selectedYear}&month=${selectedMonth}`
        )
        if (!res.ok) return null
        return res.json()
      })

      const allSlips = (await Promise.all(promises)).filter(Boolean)
      if (allSlips.length === 0) {
        throw new Error('Tidak ada data slip gaji yang dapat dimuat.')
      }

      const combinedHtml = allSlips.map(s => renderSingleSlipHtml(s)).join('\n')
      openPrintSlipsWindow(combinedHtml, `Slip Gaji Massal (${allSlips.length} Pegawai)`)
    } catch (err: any) {
      Swal.fire({
        title: 'Cetak Massal Gagal',
        text: err?.message || 'Gagal memuat kumpulan data slip gaji.',
        icon: 'error',
      })
    } finally {
      setIsBulkPrinting(false)
    }
  }

  // Mutation Simpan Komponen Gaji
  const savePayrollMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await authenticatedFetch('/api-backend/finance/payroll/save-record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.message || 'Gagal menyimpan data penggajian')
      }
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['payroll-summary'] })
      setShowEditModal(false)
      Swal.fire({
        title: 'Penggajian Tersimpan',
        text: data?.message || 'Rincian gaji pegawai berhasil diperbarui!',
        icon: 'success',
        confirmButtonColor: '#059669',
      })
    },
    onError: (err: any) => {
      Swal.fire({
        title: 'Gagal Menyimpan',
        text: err?.message || 'Terjadi kesalahan sistem.',
        icon: 'error',
      })
    }
  })

  // Mutation Update Status Kepegawaian (PTTP, GTTP, GTP, PTP)
  const updateStatusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      const res = await authenticatedFetch(`/api-backend/finance/payroll/employment-status/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employmentStatus: status }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.message || 'Gagal mengubah status jabatan')
      }
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['payroll-summary'] })
      Swal.fire({
        title: 'Status Diperbarui',
        text: data?.message || 'Status jabatan pegawai berhasil diubah!',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
      })
    },
    onError: (err: any) => {
      Swal.fire({
        title: 'Gagal',
        text: err?.message || 'Gagal memperbarui status kepegawaian',
        icon: 'error',
      })
    }
  })

  const months = [
    { value: '1', label: 'Januari' },
    { value: '2', label: 'Februari' },
    { value: '3', label: 'Maret' },
    { value: '4', label: 'April' },
    { value: '5', label: 'Mei' },
    { value: '6', label: 'Juni' },
    { value: '7', label: 'Juli' },
    { value: '8', label: 'Agustus' },
    { value: '9', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' },
  ]

  const currentYear = new Date().getFullYear()
  const years = [currentYear - 1, currentYear, currentYear + 1]

  // Buka Modal Edit Gaji Pegawai
  const handleOpenEdit = (staff: PayrollStaff) => {
    setSelectedStaff(staff)
    setFormStatus(staff.employmentStatus || 'GTTP')
    setFormMasaKerja((staff.masaKerja ?? 0).toString())
    setFormBankName(staff.bankName || 'BNI')
    setFormBankAccountNumber(staff.bankAccountNumber || '')
    setFormBankAccountHolder(staff.bankAccountHolder || staff.name || '')
    setFormHours(staff.totalHours?.toString() || '0')
    setFormHourlyRate(staff.hourlyRate?.toString() || '0')
    setFormKelebihanJam((staff.kelebihanJam ?? 0).toString())
    setFormNotes(staff.notes || '')

    // Map Standard Allowances
    const aMap: Record<string, number> = {}
    const customA: ManualItem[] = []
    ;(staff.manualAllowances || []).forEach(item => {
      if (STANDARD_ALLOWANCES.includes(item.name)) {
        aMap[item.name] = item.amount || 0
      } else {
        customA.push(item)
      }
    })
    setAllowanceValues(aMap)
    setCustomAllowances(customA)

    // Map Standard Deductions
    const dMap: Record<string, number> = {}
    const customD: ManualItem[] = []
    ;(staff.manualDeductions || []).forEach(item => {
      if (STANDARD_DEDUCTIONS.includes(item.name)) {
        dMap[item.name] = item.amount || 0
      } else {
        customD.push(item)
      }
    })
    setDeductionValues(dMap)
    setCustomDeductions(customD)

    setShowEditModal(true)
  }

  // Simpan Form Pengaturan Gaji Pegawai
  const handleSaveStaffPayroll = () => {
    if (!selectedStaff) return
    const hours = parseFloat(formHours) || 0
    const rate = parseFloat(formHourlyRate) || 0
    const kelebihan = parseFloat(formKelebihanJam) || 0
    const masaKerja = parseInt(formMasaKerja, 10) || 0

    // Gabungkan standard & custom allowances
    const finalAllowances: ManualItem[] = []
    STANDARD_ALLOWANCES.forEach(name => {
      const amt = allowanceValues[name] || 0
      if (amt > 0) {
        finalAllowances.push({ name, amount: amt })
      }
    })
    customAllowances.forEach(item => {
      if (item.name.trim() !== '' && item.amount > 0) {
        finalAllowances.push(item)
      }
    })

    // Gabungkan standard & custom deductions
    const finalDeductions: ManualItem[] = []
    STANDARD_DEDUCTIONS.forEach(name => {
      const amt = deductionValues[name] || 0
      if (amt > 0) {
        finalDeductions.push({ name, amount: amt })
      }
    })
    customDeductions.forEach(item => {
      if (item.name.trim() !== '' && item.amount > 0) {
        finalDeductions.push(item)
      }
    })

    savePayrollMutation.mutate({
      userId: selectedStaff.id,
      year: parseInt(selectedYear, 10),
      month: parseInt(selectedMonth, 10),
      employmentStatus: formStatus,
      bankName: formBankName,
      bankAccountNumber: formBankAccountNumber,
      bankAccountHolder: formBankAccountHolder,
      masaKerja,
      kelebihanJam: kelebihan,
      totalHours: hours,
      hourlyRate: rate,
      manualAllowances: finalAllowances,
      manualDeductions: finalDeductions,
      notes: formNotes,
    })
  }

  // Buka Modal & Fetch Slip Gaji
  const handleOpenSlip = async (staffId: string) => {
    setIsLoadingSlip(true)
    setShowSlipModal(true)
    try {
      const res = await authenticatedFetch(
        `/api-backend/finance/payroll/slip-gaji/${staffId}?year=${selectedYear}&month=${selectedMonth}`
      )
      if (!res.ok) throw new Error('Gagal mengambil slip gaji')
      const data = await res.json()
      setSlipData(data)
    } catch (err: any) {
      Swal.fire({
        title: 'Gagal Memuat Slip',
        text: err?.message || 'Tidak dapat memuat rincian slip gaji.',
        icon: 'error',
      })
      setShowSlipModal(false)
    } finally {
      setIsLoadingSlip(false)
    }
  }

  // Handler Export Excel Resmi
  const handleExportExcel = async () => {
    try {
      const res = await authenticatedFetch(
        `/api-backend/finance/payroll/export-excel?year=${selectedYear}&month=${selectedMonth}`
      )
      if (!res.ok) throw new Error('Gagal mengekspor file Excel')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Rekapitulasi_Penggajian_${months.find(m => m.value === selectedMonth)?.label}_${selectedYear}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      Swal.fire({
        title: 'Export Gagal',
        text: err?.message || 'Gagal mengunduh berkas rekap Excel.',
        icon: 'error',
      })
    }
  }

  const { sortConfig, handleSort, sortedItems: sortedPayroll } = useSorting(payroll || [])
  const searchedPayroll = filterDataBySearch(sortedPayroll, searchQuery)

  // Perhitungan Kalkulasi Live Preview di Modal
  const previewBase = (parseFloat(formHours) || 0) * (parseFloat(formHourlyRate) || 0)
  const previewKelebihan = parseFloat(formKelebihanJam) || 0
  const previewAbsenMakan = selectedStaff?.mealAllowance || 0
  const previewTransport = selectedStaff?.transportAllowance || 0

  const previewStandardAllowances = STANDARD_ALLOWANCES.reduce((acc, name) => acc + (allowanceValues[name] || 0), 0)
  const previewCustomAllowances = customAllowances.reduce((acc, c) => acc + (c.amount || 0), 0)
  const previewTotalAllowance = previewAbsenMakan + previewTransport + previewStandardAllowances + previewCustomAllowances
  const previewGross = previewBase + previewKelebihan + previewTotalAllowance

  const previewStandardDeductions = STANDARD_DEDUCTIONS.reduce((acc, name) => acc + (deductionValues[name] || 0), 0)
  const previewCustomDeductions = customDeductions.reduce((acc, c) => acc + (c.amount || 0), 0)
  const previewTotalDeduction = previewStandardDeductions + previewCustomDeductions
  const previewNet = previewGross - previewTotalDeduction

  // Helper format rupiah slip fisik
  const formatRpSlip = (num: number | undefined | null) => {
    if (!num || num === 0) return 'Rp-';
    return `Rp${new Intl.NumberFormat('id-ID').format(num)}.00`;
  }

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl flex items-center justify-center shadow-xs shrink-0">
              <Banknote className="w-5 h-5 text-white" />
            </div>
            Penggajian & Parameter Gaji
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Kalkulasi otomatis presensi, set gaji per jam, tunjangan manual, potongan, dan slip gaji pegawai
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
          <div className="flex gap-2">
            <Select value={selectedMonth} onValueChange={(val) => { if (val) setSelectedMonth(val) }}>
              <SelectTrigger className="w-[140px] bg-white">
                <SelectValue placeholder="Pilih Bulan" />
              </SelectTrigger>
              <SelectContent>
                {months.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedYear} onValueChange={(val) => { if (val) setSelectedYear(val) }}>
              <SelectTrigger className="w-[110px] bg-white">
                <SelectValue placeholder="Pilih Tahun" />
              </SelectTrigger>
              <SelectContent>
                {years.map(y => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Button 
              onClick={() => handlePrintBulkSlips(searchedPayroll.map(p => p.id))} 
              variant="outline" 
              className="border-emerald-600 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-bold text-xs h-9"
              disabled={!payroll || payroll.length === 0 || isLoading || isBulkPrinting}
            >
              {isBulkPrinting ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Printer className="w-3.5 h-3.5 mr-1.5" />}
              Cetak Semua Slip ({searchedPayroll.length})
            </Button>

            {selectedStaffIds.length > 0 && (
              <Button 
                onClick={() => handlePrintBulkSlips(selectedStaffIds)} 
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 animate-in fade-in"
                disabled={isBulkPrinting}
              >
                {isBulkPrinting ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Printer className="w-3.5 h-3.5 mr-1.5" />}
                Cetak Terpilih ({selectedStaffIds.length})
              </Button>
            )}

            <Button 
              onClick={handleExportExcel} 
              variant="outline" 
              className="border-slate-300 text-slate-700 bg-white hover:bg-slate-50 font-bold text-xs h-9"
              disabled={!payroll || payroll.length === 0 || isLoading}
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Export Excel
            </Button>
          </div>
        </div>
      </div>

      {/* Panel Ringkasan Akumulasi */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-0 shadow-md">
          <CardContent className="p-4 sm:p-5">
            <p className="text-emerald-100 text-xs font-semibold uppercase tracking-wider">Total Beban Gaji Bersih</p>
            <h3 className="text-2xl font-bold mt-1">
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(
                searchedPayroll.reduce((acc, curr) => acc + (curr.netSalary || 0), 0)
              )}
            </h3>
            <p className="text-emerald-200 text-xs mt-1">{months.find(m => m.value === selectedMonth)?.label} {selectedYear}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-0 shadow-md">
          <CardContent className="p-4 sm:p-5">
            <p className="text-blue-100 text-xs font-semibold uppercase tracking-wider">Tunjangan Presensi (Auto)</p>
            <h3 className="text-2xl font-bold mt-1">
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(
                searchedPayroll.reduce((acc, curr) => acc + (curr.transportAllowance || 0) + (curr.mealAllowance || 0), 0)
              )}
            </h3>
            <p className="text-blue-200 text-xs mt-1">Transport Rp5rb & Absen Makan Rp8rb</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-600 to-violet-700 text-white border-0 shadow-md">
          <CardContent className="p-4 sm:p-5">
            <p className="text-purple-100 text-xs font-semibold uppercase tracking-wider">Gaji Pokok Jam Kerja</p>
            <h3 className="text-2xl font-bold mt-1">
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(
                searchedPayroll.reduce((acc, curr) => acc + (curr.baseSalary || 0), 0)
              )}
            </h3>
            <p className="text-purple-200 text-xs mt-1">Akumulasi Jam × Satuan Tarif</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rose-500 to-red-600 text-white border-0 shadow-md">
          <CardContent className="p-4 sm:p-5">
            <p className="text-rose-100 text-xs font-semibold uppercase tracking-wider">Total Potongan Manual</p>
            <h3 className="text-2xl font-bold mt-1">
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(
                searchedPayroll.reduce((acc, curr) => acc + (curr.totalDeduction || 0), 0)
              )}
            </h3>
            <p className="text-rose-200 text-xs mt-1">Infaq, Dansos, BPJS, dll</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabel Utama Penggajian Pegawai */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-lg font-bold text-slate-800">
              Daftar Penggajian Guru & Pegawai
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Periode: <span className="font-semibold text-emerald-700">{months.find(m => m.value === selectedMonth)?.label} {selectedYear}</span> ({searchedPayroll.length} Orang)
            </CardDescription>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
            <TableSearch
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Cari nama / jabatan pegawai..."
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[45px] text-center">
                    <input 
                      type="checkbox"
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer h-4 w-4"
                      checked={searchedPayroll.length > 0 && selectedStaffIds.length === searchedPayroll.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedStaffIds(searchedPayroll.map(p => p.id))
                        } else {
                          setSelectedStaffIds([])
                        }
                      }}
                      title="Pilih Semua Pegawai"
                    />
                  </TableHead>
                  <TableHead className="w-[45px] text-center">No</TableHead>
                  <SortableTableHead sortConfig={sortConfig} onSort={handleSort} sortKey="name">Pegawai / NIP</SortableTableHead>
                  <TableHead className="text-center w-[130px]">Status Jabatan</TableHead>
                  <SortableTableHead sortConfig={sortConfig} onSort={handleSort} sortKey="totalHadir" className="text-center">Presensi</SortableTableHead>
                  <SortableTableHead sortConfig={sortConfig} onSort={handleSort} sortKey="baseSalary" className="text-right">Gaji Pokok</SortableTableHead>
                  <SortableTableHead sortConfig={sortConfig} onSort={handleSort} sortKey="totalAllowance" className="text-right">Tunjangan</SortableTableHead>
                  <SortableTableHead sortConfig={sortConfig} onSort={handleSort} sortKey="totalDeduction" className="text-right">Potongan</SortableTableHead>
                  <SortableTableHead sortConfig={sortConfig} onSort={handleSort} sortKey="netSalary" className="text-right">Gaji Bersih</SortableTableHead>
                  <TableHead className="text-center w-[150px]">Aksi</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <Loader2 className="w-6 h-6 animate-spin mb-2 text-emerald-600" />
                        Memuat data penggajian...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : searchedPayroll.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12 text-slate-500">
                      {searchQuery ? 'Tidak ada data pegawai yang sesuai dengan pencarian.' : 'Tidak ada data pegawai.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  searchedPayroll.map((item, index) => {
                    const isSelected = selectedStaffIds.includes(item.id)
                    return (
                      <TableRow key={item.id} className={`hover:bg-slate-50/60 transition-colors ${isSelected ? 'bg-emerald-50/40' : ''}`}>
                        <TableCell className="text-center">
                          <input 
                            type="checkbox"
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer h-4 w-4"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedStaffIds(prev => [...prev, item.id])
                              } else {
                                setSelectedStaffIds(prev => prev.filter(id => id !== item.id))
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell className="text-center font-medium text-slate-500 text-xs">{index + 1}</TableCell>
                        
                        {/* Nama Pegawai & NIP & Rekening Bank */}
                        <TableCell>
                          <p className="font-bold text-slate-900 text-sm">{item.name}</p>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                            <span>NIP: {item.nip}</span>
                            <span>•</span>
                            <span className="truncate max-w-[140px]">{item.roles}</span>
                          </div>
                          {item.bankAccountNumber ? (
                            <div className="mt-0.5 text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded inline-block font-mono">
                              💳 {item.bankName || 'BANK'}: {item.bankAccountNumber} ({item.bankAccountHolder || item.name})
                            </div>
                          ) : (
                            <div className="mt-0.5 text-[10px] text-slate-400 italic">
                              Rekening belum diisi
                            </div>
                          )}
                        </TableCell>

                        {/* Status Jabatan Dropdown Inline */}
                        <TableCell className="text-center">
                          <Select 
                            value={item.employmentStatus || 'GTTP'} 
                            onValueChange={(val) => {
                              if (val) updateStatusMutation.mutate({ userId: item.id, status: val })
                            }}
                          >
                            <SelectTrigger className="h-7 text-xs font-bold w-full bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {EMPLOYMENT_STATUS_OPTIONS.map(opt => (
                                <SelectItem key={opt.value} value={opt.value} className="text-xs font-medium">
                                  {opt.value} - {opt.label.split('(')[1]?.replace(')', '') || opt.value}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>

                        {/* Kehadiran & Jam */}
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center">
                            <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-xs">
                              {item.totalHadir} Hari
                            </span>
                            <span className="text-[10px] text-slate-500 mt-0.5">
                              {item.totalHours} Jam • MK: {item.masaKerja ?? 0}
                            </span>
                          </div>
                        </TableCell>

                        {/* Gaji Pokok (Jam x Tarif) */}
                        <TableCell className="text-right">
                          <span className="font-semibold text-slate-900 text-xs">
                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.baseSalary || 0)}
                          </span>
                          {item.totalHours > 0 && item.hourlyRate > 0 && (
                            <p className="text-[10px] text-slate-400">
                              {item.totalHours} jam × Rp{new Intl.NumberFormat('id-ID').format(item.hourlyRate)}
                            </p>
                          )}
                        </TableCell>

                        {/* Tunjangan (Transport + Makan + Manual) */}
                        <TableCell className="text-right">
                          <span className="font-semibold text-emerald-700 text-xs">
                            +{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.totalAllowance || 0)}
                          </span>
                          <div className="flex flex-col items-end gap-0.5 text-[9px] text-slate-500">
                            {item.mealAllowance > 0 && (
                              <span>Abs Mkn: {new Intl.NumberFormat('id-ID').format(item.mealAllowance)}</span>
                            )}
                            {item.transportAllowance > 0 && (
                              <span>Transport: {new Intl.NumberFormat('id-ID').format(item.transportAllowance)}</span>
                            )}
                          </div>
                        </TableCell>

                        {/* Potongan Manual */}
                        <TableCell className="text-right">
                          {item.totalDeduction > 0 ? (
                            <span className="font-semibold text-rose-600 text-xs">
                              -{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.totalDeduction || 0)}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs font-medium">Rp0</span>
                          )}
                        </TableCell>

                        {/* Gaji Bersih Netto */}
                        <TableCell className="text-right">
                          <span className="font-extrabold text-slate-900 text-sm">
                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.netSalary || 0)}
                          </span>
                        </TableCell>

                        {/* Aksi: Atur Gaji & Slip Gaji */}
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-purple-300 text-purple-700 bg-purple-50/60 hover:bg-purple-100 text-xs font-semibold h-8 px-2.5"
                              onClick={() => handleOpenEdit(item)}
                              title="Atur Komponen Gaji Lengkap"
                            >
                              <Settings className="w-3.5 h-3.5 mr-1" />
                              Atur
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              className="border-blue-300 text-blue-700 bg-blue-50/60 hover:bg-blue-100 text-xs font-semibold h-8 px-2"
                              onClick={() => handleOpenSlip(item.id)}
                              title="Lihat & Cetak Slip Gaji Resmi"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Dialog Atur Komponen Gaji Pegawai (Lengkap Sesuai Slip Fisik) */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Calculator className="w-5 h-5 text-emerald-600" />
              Atur Komponen Gaji: {selectedStaff?.name}
            </DialogTitle>
            <DialogDescription>
              Periode: {months.find(m => m.value === selectedMonth)?.label} {selectedYear} • {selectedStaff?.roles}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2 text-xs">
            {/* Status Jabatan & Masa Kerja & Rekening Bank */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold text-slate-700">Status Jabatan Pegawai</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-1.5">
                    {EMPLOYMENT_STATUS_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFormStatus(opt.value)}
                        className={`py-1.5 px-1 rounded-md text-xs font-bold border text-center transition-all ${
                          formStatus === opt.value
                            ? `${opt.badgeBg} ring-2 ring-emerald-500`
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {opt.value}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Masa Kerja (Tahun)</Label>
                  <Input
                    type="number"
                    value={formMasaKerja}
                    onChange={(e) => setFormMasaKerja(e.target.value)}
                    placeholder="0"
                    className="bg-white h-8 text-xs mt-1"
                  />
                </div>
              </div>

              {/* Input Rekening Bank Pegawai Untuk Transfer */}
              <div className="border-t border-slate-200 pt-2.5">
                <Label className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                  💳 Data Rekening Bank Pegawai (Tujuan Transfer Penggajian)
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-1.5">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-600">Nama Bank</Label>
                    <Input
                      placeholder="Contoh: BNI / BRI / BSI / Mandiri"
                      value={formBankName}
                      onChange={(e) => setFormBankName(e.target.value)}
                      className="bg-white h-7 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-600">Nomor Rekening</Label>
                    <Input
                      placeholder="Nomor rekening"
                      value={formBankAccountNumber}
                      onChange={(e) => setFormBankAccountNumber(e.target.value)}
                      className="bg-white h-7 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-600">Atas Nama Pemilik</Label>
                    <Input
                      placeholder="Nama di buku tabungan"
                      value={formBankAccountHolder}
                      onChange={(e) => setFormBankAccountHolder(e.target.value)}
                      className="bg-white h-7 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 1. Gaji Pokok & Kelebihan Jam */}
            <div className="border border-slate-200 rounded-lg p-3 space-y-3 bg-white">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  1. Gaji Pokok & Kelebihan Jam
                </h4>
                <span className="text-xs font-extrabold text-emerald-700">
                  Gaji Pokok: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(previewBase)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-600">Jumlah Jam Kerja (Jam)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={formHours}
                    onChange={(e) => setFormHours(e.target.value)}
                    placeholder="25"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-600">Nilai Satuan/JAM (Rp)</Label>
                  <Input
                    type="number"
                    value={formHourlyRate}
                    onChange={(e) => setFormHourlyRate(e.target.value)}
                    placeholder="25000"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-600">2. Kelebihan Jam (Rp)</Label>
                  <Input
                    type="number"
                    value={formKelebihanJam}
                    onChange={(e) => setFormKelebihanJam(e.target.value)}
                    placeholder="0"
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* 3. Tunjangan (Standard Sesuai Slip Fisik + Absen Makan Auto) */}
            <div className="border border-slate-200 rounded-lg p-3 bg-white space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                  3. Rincian Tunjangan Resmi
                </h4>
                <span className="text-xs font-bold text-emerald-700">
                  Total Tunjangan: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(previewTotalAllowance)}
                </span>
              </div>

              {/* Absen Makan & Transport Otomatis Presensi */}
              <div className="p-2.5 bg-emerald-50/60 rounded-md border border-emerald-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <span className="font-bold text-emerald-900">6. Abs mkn (Absen Makan & Transport Presensi)</span>
                  <p className="text-[10px] text-slate-500">
                    Otomatis dari {selectedStaff?.totalHadir || 0} hari kehadiran ({selectedStaff?.dailyDetails?.length || 0} log presensi sistem)
                  </p>
                </div>
                <span className="font-extrabold text-emerald-800 text-xs bg-white px-2.5 py-1 rounded border border-emerald-300">
                  {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(previewAbsenMakan + previewTransport)}
                </span>
              </div>

              {/* List Komponen Tunjangan Manual Resmi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {STANDARD_ALLOWANCES.map((name, idx) => (
                  <div key={name} className="flex items-center justify-between gap-2 p-1.5 bg-slate-50 rounded border border-slate-200">
                    <span className="font-medium text-slate-700 text-xs">{idx + (idx >= 5 ? 2 : 1)}. {name}</span>
                    <Input
                      type="number"
                      placeholder="0"
                      value={allowanceValues[name] ?? ''}
                      onChange={(e) => setAllowanceValues({ ...allowanceValues, [name]: parseInt(e.target.value, 10) || 0 })}
                      className="h-7 w-32 text-right text-xs bg-white"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Rincian Potongan (Standard Sesuai Slip Fisik 1-15) */}
            <div className="border border-slate-200 rounded-lg p-3 bg-white space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wider">
                  4. Rincian Potongan Resmi (1 s/d 15)
                </h4>
                <span className="text-xs font-bold text-rose-700">
                  Total Potongan: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(previewTotalDeduction)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {STANDARD_DEDUCTIONS.map((name, idx) => (
                  <div key={name} className="flex items-center justify-between gap-2 p-1.5 bg-rose-50/40 rounded border border-rose-100">
                    <span className="font-medium text-rose-900 text-[11px] truncate">{idx + 1}. {name}</span>
                    <Input
                      type="number"
                      placeholder="0"
                      value={deductionValues[name] ?? ''}
                      onChange={(e) => setDeductionValues({ ...deductionValues, [name]: parseInt(e.target.value, 10) || 0 })}
                      className="h-7 w-28 text-right text-xs bg-white"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Ringkasan Kalkulasi Real-Time */}
            <div className="p-3.5 bg-slate-900 text-white rounded-lg space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>TOTAL PENGHASILAN (Gaji Pokok + Kelebihan + Tunjangan):</span>
                <span className="font-bold">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(previewGross)}</span>
              </div>
              <div className="flex justify-between text-rose-400">
                <span>TOTAL POTONGAN:</span>
                <span className="font-bold">-{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(previewTotalDeduction)}</span>
              </div>
              <div className="border-t border-slate-700 pt-1.5 flex justify-between font-extrabold text-sm text-amber-300">
                <span>GAJI BERSIH (TOTAL GAJI - TOTAL POTONGAN):</span>
                <span>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(previewNet)}</span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Batal
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              onClick={handleSaveStaffPayroll}
              disabled={savePayrollMutation.isPending}
            >
              {savePayrollMutation.isPending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
              Simpan Penggajian
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Dialog Pratinjau & Cetak Slip Gaji (PERSIS 100% SLIP FISIK) */}
      <Dialog open={showSlipModal} onOpenChange={setShowSlipModal}>
        <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <FileText className="w-5 h-5 text-emerald-600" />
              Slip Gaji Digital Resmi
            </DialogTitle>
            <DialogDescription>
              Format slip gaji resmi SMA Muhammadiyah 1 Ponorogo
            </DialogDescription>
          </DialogHeader>

          {isLoadingSlip ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
              <p className="text-xs font-semibold">Menyiapkan slip gaji...</p>
            </div>
          ) : slipData ? (
            <div className="space-y-4">
              {/* Box Slip Gaji Yang Siap Dicetak Persis Format Fisik */}
              <div 
                ref={printSlipRef} 
                className="p-6 border border-slate-300 rounded-lg bg-white shadow-2xs text-[13px] text-slate-900 leading-tight space-y-2 font-mono"
              >
                {/* Kop Sekolah */}
                <div className="header-kop flex items-center gap-3 border-b-2 border-black pb-2 mb-3">
                  <div className="w-12 h-12 flex items-center justify-center shrink-0 border border-slate-300 rounded">
                    <Banknote className="w-7 h-7 text-emerald-800" />
                  </div>
                  <div>
                    <h2 className="kop-title font-extrabold text-[15px] uppercase tracking-wide text-slate-950">
                      {slipData.schoolInfo?.schoolName || 'SMA MUHAMMADIYAH 1 PONOROGO'}
                    </h2>
                    <p className="kop-subtitle text-[11px] text-slate-700">
                      {slipData.schoolInfo?.address || 'Jln. Batoro Katong No. 6B Ponorogo'}
                    </p>
                    <p className="kop-subtitle text-[11px] text-slate-700">
                      Telp. {slipData.schoolInfo?.phone || '(0352) 481521'}
                    </p>
                  </div>
                </div>

                {/* Info Biodata Pegawai */}
                <table className="staff-info-table w-full text-[13px]">
                  <tbody>
                    <tr>
                      <td className="w-24">Nama</td>
                      <td className="w-3">:</td>
                      <td className="font-bold uppercase">{slipData.staff?.name}</td>
                    </tr>
                    <tr>
                      <td>Jabatan</td>
                      <td>:</td>
                      <td>
                        <span className="font-bold">{slipData.staff?.employmentStatus || 'GTTP'}</span>
                        <span className="ml-10">Jumlah Jam</span>
                        <span className="ml-2">: {slipData.calculation?.totalHours ?? 0}</span>
                      </td>
                    </tr>
                    <tr>
                      <td>Masa Kerja</td>
                      <td>:</td>
                      <td>
                        <span>{slipData.staff?.masaKerja ?? 0}</span>
                        <span className="ml-16">Nilai Satuan/JAM</span>
                        <span className="ml-2">: {formatRpSlip(slipData.calculation?.hourlyRate)}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* GAJI */}
                <div className="section-title font-bold text-[13px] mt-2">GAJI</div>
                
                <div className="item-row flex justify-between">
                  <span>1. Gaji Pokok</span>
                  <span className="font-mono">: {formatRpSlip(slipData.calculation?.baseSalary)}</span>
                </div>

                <div className="item-row flex justify-between">
                  <span>2. Kelebihan Jam</span>
                  <span className="font-mono">: {formatRpSlip(slipData.calculation?.kelebihanJam)}</span>
                </div>

                <div className="section-title font-bold text-[13px] mt-1">3. Tunjangan</div>
                
                {/* 1. Jabatan */}
                <div className="sub-item-row flex justify-between pl-5">
                  <span>1.  Jabatan</span>
                  <span className="font-mono">: {formatRpSlip(slipData.calculation?.manualAllowances?.find((a: any) => a.name === 'Jabatan')?.amount)}</span>
                </div>

                {/* 2. Berkala */}
                <div className="sub-item-row flex justify-between pl-5">
                  <span>2.  Berkala</span>
                  <span className="font-mono">: {formatRpSlip(slipData.calculation?.manualAllowances?.find((a: any) => a.name === 'Berkala')?.amount)}</span>
                </div>

                {/* 3. Keluarga */}
                <div className="sub-item-row flex justify-between pl-5">
                  <span>3.  Keluarga</span>
                  <span className="font-mono">: {formatRpSlip(slipData.calculation?.manualAllowances?.find((a: any) => a.name === 'Keluarga')?.amount)}</span>
                </div>

                {/* 4. Sembako */}
                <div className="sub-item-row flex justify-between pl-5">
                  <span>4.  Sembako</span>
                  <span className="font-mono">: {formatRpSlip(slipData.calculation?.manualAllowances?.find((a: any) => a.name === 'Sembako')?.amount)}</span>
                </div>

                {/* 5. Kom/Kin */}
                <div className="sub-item-row flex justify-between pl-5">
                  <span>5.  Kom/Kin</span>
                  <span className="font-mono">: {formatRpSlip(slipData.calculation?.manualAllowances?.find((a: any) => a.name === 'Kom/Kin')?.amount)}</span>
                </div>

                {/* 6. Abs mkn */}
                <div className="sub-item-row flex justify-between pl-5">
                  <span>6.  Abs mkn</span>
                  <span className="font-mono">: {formatRpSlip((slipData.calculation?.mealAllowance || 0) + (slipData.calculation?.transportAllowance || 0))}</span>
                </div>

                {/* 7. Jarak */}
                <div className="sub-item-row flex justify-between pl-5">
                  <span>7.  Jarak</span>
                  <span className="font-mono">: {formatRpSlip(slipData.calculation?.manualAllowances?.find((a: any) => a.name === 'Jarak')?.amount)}</span>
                </div>

                {/* 8. Fungsional */}
                <div className="sub-item-row flex justify-between pl-5">
                  <span>8.  Fungsional</span>
                  <span className="font-mono">: {formatRpSlip(slipData.calculation?.manualAllowances?.find((a: any) => a.name === 'Fungsional')?.amount)}</span>
                </div>

                {/* TOTAL GAJI KOTOR */}
                <div className="total-block flex justify-between font-bold border-t border-dashed border-black pt-1 mt-1">
                  <span>TOTAL</span>
                  <span className="font-mono">: {formatRpSlip(slipData.calculation?.totalGrossSalary)}</span>
                </div>

                {/* POTONGAN */}
                <div className="section-title font-bold text-[13px] mt-2">POTONGAN</div>
                <div className="item-row flex justify-between">
                  <span>1. Jumlah Gaji</span>
                  <span className="font-mono">:</span>
                </div>
                <div className="section-title font-bold text-[13px]">2. Potongan</div>

                {/* Grid 2 Kolom Potongan 1 - 15 */}
                <div className="two-column-grid grid grid-cols-2 gap-x-4 pl-3">
                  <div className="space-y-0.5">
                    <div className="flex justify-between">
                      <span>1.Infaq</span>
                      <span className="font-mono">: {formatRpSlip(slipData.calculation?.manualDeductions?.find((d: any) => d.name === 'Infaq')?.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>2.Dansos</span>
                      <span className="font-mono">: {formatRpSlip(slipData.calculation?.manualDeductions?.find((d: any) => d.name === 'Dansos')?.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>3.Tab.Krb</span>
                      <span className="font-mono">: {formatRpSlip(slipData.calculation?.manualDeductions?.find((d: any) => d.name === 'Tab.Krb')?.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>4.Qurban</span>
                      <span className="font-mono">: {formatRpSlip(slipData.calculation?.manualDeductions?.find((d: any) => d.name === 'Qurban')?.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>5.BRI/MS</span>
                      <span className="font-mono">: {formatRpSlip(slipData.calculation?.manualDeductions?.find((d: any) => d.name === 'BRI/MS')?.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>6.IKS</span>
                      <span className="font-mono">: {formatRpSlip(slipData.calculation?.manualDeductions?.find((d: any) => d.name === 'IKS')?.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>7.SumbSos</span>
                      <span className="font-mono">: {formatRpSlip(slipData.calculation?.manualDeductions?.find((d: any) => d.name === 'SumbSos')?.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>8.Rek BNI</span>
                      <span className="font-mono">: {formatRpSlip(slipData.calculation?.manualDeductions?.find((d: any) => d.name === 'Rek BNI')?.amount)}</span>
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex justify-between">
                      <span>9.Listrik</span>
                      <span className="font-mono">: {formatRpSlip(slipData.calculation?.manualDeductions?.find((d: any) => d.name === 'Listrik')?.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>10.Telp.</span>
                      <span className="font-mono">: {formatRpSlip(slipData.calculation?.manualDeductions?.find((d: any) => d.name === 'Telp.')?.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>11.Ars.Stnk</span>
                      <span className="font-mono">: {formatRpSlip(slipData.calculation?.manualDeductions?.find((d: any) => d.name === 'Ars.Stnk')?.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>12.Ars HRY</span>
                      <span className="font-mono">: {formatRpSlip(slipData.calculation?.manualDeductions?.find((d: any) => d.name === 'Ars HRY')?.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>13.Kas bon Hr</span>
                      <span className="font-mono">: {formatRpSlip(slipData.calculation?.manualDeductions?.find((d: any) => d.name === 'Kas bon Hr')?.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>14.BPJS</span>
                      <span className="font-mono">: {formatRpSlip(slipData.calculation?.manualDeductions?.find((d: any) => d.name === 'BPJS')?.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>15.Lain-lain</span>
                      <span className="font-mono">: {formatRpSlip(slipData.calculation?.manualDeductions?.find((d: any) => d.name === 'Lain-lain')?.amount)}</span>
                    </div>
                  </div>
                </div>

                {/* TOTAL POTONGAN */}
                <div className="total-block flex justify-between font-bold border-t border-dashed border-black pt-1 mt-1">
                  <span>TOTAL POTONGAN</span>
                  <span className="font-mono">: {formatRpSlip(slipData.calculation?.totalDeduction)}</span>
                </div>

                {/* GAJI BERSIH */}
                <div className="net-block flex justify-between font-bold text-[14px] border-t-2 border-b-2 border-black py-1 mt-2">
                  <span>GAJI BERSIH</span>
                  <span className="font-mono">: {formatRpSlip(slipData.calculation?.netSalary)}</span>
                </div>
                <div className="text-[11px] text-slate-600">TOTAL GAJI-TOTALPOTONGAN</div>

                {/* Tanda Tangan Bendahara */}
                <div className="ttd-container flex justify-end pt-4 text-[12px]">
                  <div className="ttd-box text-center w-56">
                    <p>Ponorogo, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    <p className="font-semibold">Bendahara</p>
                    <div className="stamp-area h-12 flex items-center justify-center text-slate-400 italic text-[10px]">
                      ( Ttd & Cap )
                    </div>
                    <p className="font-bold border-b border-black inline-block px-2">{slipData.schoolInfo?.treasurerName || 'AGUNG TRIBOWO, SE'}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowSlipModal(false)}>
              Tutup
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              onClick={handlePrintSlip}
              disabled={!slipData || isLoadingSlip}
            >
              <Printer className="w-4 h-4 mr-2" />
              Cetak Slip Gaji
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

