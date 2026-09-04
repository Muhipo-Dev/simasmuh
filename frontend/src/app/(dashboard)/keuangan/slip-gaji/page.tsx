'use client'

import { useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { 
  Loader2, Banknote, Printer, FileText
} from 'lucide-react'
import { useAuthenticatedFetch, useAuthenticatedQuery } from '@/hooks/useAuthenticatedFetch'

export default function SlipGajiPenggunaPage() {
  const authenticatedFetch = useAuthenticatedFetch()
  const authenticatedQuery = useAuthenticatedQuery()
  const printSlipRef = useRef<HTMLDivElement>(null)

  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString())
  const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString())

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

  // Query Slip Gaji Milik Akun Sendiri
  const { data: slipData, isLoading } = useQuery<any>({
    queryKey: ['my-slip-gaji', selectedYear, selectedMonth],
    queryFn: () => authenticatedQuery(
      `/api-backend/finance/payroll/my-slip-gaji?year=${selectedYear}&month=${selectedMonth}`
    )
  })

  // Format rupiah slip fisik
  const formatRpSlip = (num: number | undefined | null) => {
    if (!num || num === 0) return 'Rp-';
    return `Rp${new Intl.NumberFormat('id-ID').format(num)}.00`;
  }

  // Handler Cetak Slip Gaji PDF Sesuai Format Fisik SMA MUHAMMADIYAH 1 PONOROGO (1 Lembar A4 muat 2 Slip Gaji)
  const handlePrintSlip = () => {
    if (!printSlipRef.current) return
    const printContent = printSlipRef.current.innerHTML
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Slip Gaji - ${slipData?.staff?.name || 'Pegawai'}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 0.8cm 1cm;
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
            }
            .slip-card-print {
              border: 1px solid #334155;
              padding: 8px 12px;
              margin-bottom: 12px;
              page-break-inside: avoid;
              break-inside: avoid;
              background: #fff;
            }
            .header-kop {
              display: flex;
              align-items: center;
              gap: 8px;
              border-bottom: 1.5px solid #000;
              padding-bottom: 3px;
              margin-bottom: 5px;
            }
            .kop-title {
              font-size: 12.5px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              line-height: 1.1;
            }
            .kop-subtitle {
              font-size: 9px;
              font-weight: normal;
              margin-top: 1px;
              line-height: 1.1;
            }
            .staff-info-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 4px;
              font-size: 10px;
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
              padding-left: 8px;
              font-size: 9.5px;
            }
            .two-column-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              column-gap: 16px;
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
              padding: 2px 0;
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
          <div class="slip-card-print">
            ${printContent}
          </div>
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

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl flex items-center justify-center shadow-xs shrink-0">
              <FileText className="w-5 h-5 text-white" />
            </div>
            Slip Gaji Saya
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Format resmi slip gaji SMA Muhammadiyah 1 Ponorogo
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="flex gap-2">
            <Select value={selectedMonth} onValueChange={(val) => { if (val) setSelectedMonth(val) }}>
              <SelectTrigger className="w-[130px] bg-white">
                <SelectValue placeholder="Pilih Bulan" />
              </SelectTrigger>
              <SelectContent>
                {months.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedYear} onValueChange={(val) => { if (val) setSelectedYear(val) }}>
              <SelectTrigger className="w-[100px] bg-white">
                <SelectValue placeholder="Pilih Tahun" />
              </SelectTrigger>
              <SelectContent>
                {years.map(y => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={handlePrintSlip} 
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            disabled={!slipData || isLoading}
          >
            <Printer className="w-4 h-4 mr-2" />
            Cetak Slip Gaji
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Card className="border-slate-200 shadow-xs">
          <CardContent className="py-16 flex flex-col items-center justify-center text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
            <p className="text-xs font-semibold">Memuat slip gaji...</p>
          </CardContent>
        </Card>
      ) : !slipData ? (
        <Card className="border-slate-200 shadow-xs">
          <CardContent className="py-16 text-center text-slate-500">
            <p className="text-sm font-medium">Data slip gaji tidak ditemukan untuk periode ini.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-slate-300 shadow-md">
          <CardContent className="p-6">
            {/* Box Slip Gaji Persis 100% Foto Fisik */}
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
          </CardContent>
        </Card>
      )}
    </div>
  )
}
