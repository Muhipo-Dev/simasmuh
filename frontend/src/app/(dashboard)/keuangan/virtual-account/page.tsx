'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  CreditCard, Upload, Download, Search, Filter, RefreshCw, CheckCircle2,
  AlertCircle, Edit2, Trash2, FileSpreadsheet, Building2, UserCheck, HelpCircle, X, Plus
} from 'lucide-react'
import Swal from 'sweetalert2'
import * as XLSX from 'xlsx'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'

interface StudentVA {
  id: string
  nis: string
  nisn: string
  name: string
  gender: string
  virtualAccount: string | null
  totalTagihan?: number
  totalLunas?: number
  sisaTagihan?: number
  tagihanCount?: number
  statusTagihan?: 'LUNAS' | 'ADA_TAGIHAN' | 'TANPA_TAGIHAN'
  class: {
    id: string
    name: string
    gradeLevel: number
  }
}

interface ClassItem {
  id: string
  name: string
  gradeLevel: number
}

interface ImportPreviewItem {
  nis: string
  name: string
  virtualAccount: string
  matchedStudentName?: string
  status: 'VALID' | 'MISSING_NIS' | 'MISSING_VA' | 'NOT_FOUND'
}

export default function VirtualAccountPage() {
  const authenticatedFetch = useAuthenticatedFetch()
  const [students, setStudents] = useState<StudentVA[]>([])
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [stats, setStats] = useState({
    totalStudents: 0,
    countWithVa: 0,
    countWithoutVa: 0,
    totalNominalVaActive: 0,
    totalUnpaidNominal: 0,
  })

  // Modal Import States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<ImportPreviewItem[]>([])
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Modal Edit Manual States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<StudentVA | null>(null)
  const [editVaNumber, setEditVaNumber] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  // Modal Tambah VA Manual States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [addStudentId, setAddStudentId] = useState('')
  const [addVaNumber, setAddVaNumber] = useState('')
  const [addModalSearch, setAddModalSearch] = useState('')
  const [addModalClassFilter, setAddModalClassFilter] = useState('')
  const [savingAdd, setSavingAdd] = useState(false)

  // Load classes & student VA list
  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch classes
      const resClasses = await authenticatedFetch('/api-backend/classes')
      if (resClasses.ok) {
        const dataClasses = await resClasses.json()
        setClasses(Array.isArray(dataClasses) ? dataClasses : [])
      }

      // Fetch VA list
      let url = '/api-backend/finance/virtual-accounts?'
      if (selectedClass) url += `classId=${encodeURIComponent(selectedClass)}&`
      if (search) url += `search=${encodeURIComponent(search)}`

      const resVA = await authenticatedFetch(url)
      if (resVA.ok) {
        const dataVA = await resVA.json()
        setStudents(dataVA.students || [])
        setStats(dataVA.stats || { totalStudents: 0, countWithVa: 0, countWithoutVa: 0 })
      }
    } catch (err) {
      console.error('Failed to fetch VA data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedClass])

  // Handle Search Debounce / Trigger
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchData()
  }

  // Handle File Upload and Parse
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImportFile(file)
    parseExcelFile(file)
  }

  const parseExcelFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' })

        if (rawJson.length === 0) {
          Swal.fire('File Kosong', 'Tidak ada data dalam file yang diunggah.', 'warning')
          return
        }

        // Map columns (support flexible header names)
        const parsedItems: ImportPreviewItem[] = rawJson.map((row: any) => {
          const nisKey = Object.keys(row).find((k) =>
            /nis/i.test(k.trim()) && !/nisn/i.test(k.trim())
          ) || Object.keys(row).find((k) => /nis/i.test(k.trim())) || ''

          const nameKey = Object.keys(row).find((k) =>
            /nama/i.test(k.trim()) || /name/i.test(k.trim())
          ) || ''

          const vaKey = Object.keys(row).find((k) =>
            /va/i.test(k.trim()) || /virtual/i.test(k.trim()) || /account/i.test(k.trim()) || /kode/i.test(k.trim())
          ) || ''

          const nis = String(row[nisKey] || '').trim()
          const name = String(row[nameKey] || '').trim()
          const virtualAccount = String(row[vaKey] || '').trim()

          // Match with currently loaded student list
          const matched = students.find((s) => s.nis === nis)

          let status: ImportPreviewItem['status'] = 'VALID'
          if (!nis) status = 'MISSING_NIS'
          else if (!virtualAccount) status = 'MISSING_VA'
          else if (!matched) status = 'NOT_FOUND'

          return {
            nis,
            name: name || matched?.name || '-',
            virtualAccount,
            matchedStudentName: matched?.name,
            status,
          }
        })

        setPreviewData(parsedItems)
      } catch (err) {
        console.error('Failed to parse excel:', err)
        Swal.fire('Gagal Membaca File', 'Format file tidak didukung atau rusak.', 'error')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  // Execute Import Batch
  const handleExecuteImport = async () => {
    const validItems = previewData.filter((i) => i.status === 'VALID')
    if (validItems.length === 0) {
      Swal.fire('Tidak Ada Data Valid', 'Tidak ada data Virtual Account valid yang dapat diimpor.', 'warning')
      return
    }

    setImporting(true)
    try {
      const res = await authenticatedFetch('/api-backend/finance/virtual-accounts/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          validItems.map((i) => ({
            nis: i.nis,
            virtualAccount: i.virtualAccount,
            name: i.name,
          }))
        ),
      })

      const data = await res.json()
      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Import Virtual Account Berhasil',
          html: `
            <div class="text-left text-sm space-y-1 mt-2">
              <p>✅ <b>Berhasil Baru:</b> ${data.summary?.successCount || 0} siswa</p>
              <p>🔄 <b>Diperbarui/Ditimpa:</b> ${data.summary?.updatedCount || 0} siswa</p>
              <p>⏸️ <b>Dilewati (Identik/Sudah Ada):</b> ${data.summary?.skippedCount || 0} data</p>
              <p>❌ <b>Gagal/Tidak Ditemukan:</b> ${data.summary?.failedCount || 0} data</p>
            </div>
          `,
        })
        setIsImportModalOpen(false)
        setPreviewData([])
        setImportFile(null)
        fetchData()
      } else {
        throw new Error(data.message || 'Gagal menyimpan import Virtual Account')
      }
    } catch (err: any) {
      Swal.fire('Gagal Import', err.message || 'Terjadi kesalahan sistem.', 'error')
    } finally {
      setImporting(false)
    }
  }

  // Download Excel Template
  const handleDownloadTemplate = () => {
    window.open('/api-backend/finance/virtual-accounts/export-template', '_blank')
  }

  // Open Add Manual VA Modal
  const handleOpenAdd = () => {
    setAddStudentId('')
    setAddVaNumber('')
    setAddModalSearch('')
    setAddModalClassFilter('')
    setIsAddModalOpen(true)
  }

  // Save Add Manual VA
  const handleSaveAdd = async () => {
    if (!addStudentId) {
      Swal.fire('Pilih Siswa', 'Silakan pilih siswa terlebih dahulu.', 'warning')
      return
    }
    if (!addVaNumber.trim()) {
      Swal.fire('Isi Nomor VA', 'Silakan masukkan nomor Virtual Account BNI.', 'warning')
      return
    }

    setSavingAdd(true)
    try {
      const res = await authenticatedFetch(`/api-backend/finance/virtual-accounts/${addStudentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ virtualAccount: addVaNumber.trim() }),
      })

      const data = await res.json()
      if (res.ok) {
        Swal.fire('Berhasil', data.message || 'Virtual Account berhasil ditambahkan.', 'success')
        setIsAddModalOpen(false)
        fetchData()
      } else {
        throw new Error(data.message || 'Gagal menambahkan Virtual Account')
      }
    } catch (err: any) {
      Swal.fire('Gagal', err.message || 'Terjadi kesalahan sistem.', 'error')
    } finally {
      setSavingAdd(false)
    }
  }

  // Open Edit Single Student VA
  const handleOpenEdit = (student: StudentVA) => {
    setSelectedStudent(student)
    setEditVaNumber(student.virtualAccount || '')
    setIsEditModalOpen(true)
  }

  // Save Single Student VA Edit
  const handleSaveEdit = async () => {
    if (!selectedStudent) return
    setSavingEdit(true)
    try {
      const res = await authenticatedFetch(`/api-backend/finance/virtual-accounts/${selectedStudent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ virtualAccount: editVaNumber.trim() || null }),
      })

      const data = await res.json()
      if (res.ok) {
        Swal.fire('Berhasil', data.message || 'Virtual Account berhasil disimpan.', 'success')
        setIsEditModalOpen(false)
        fetchData()
      } else {
        throw new Error(data.message || 'Gagal menyimpan Virtual Account')
      }
    } catch (err: any) {
      Swal.fire('Gagal', err.message || 'Terjadi kesalahan sistem.', 'error')
    } finally {
      setSavingEdit(false)
    }
  }

  // Clear Single Student VA
  const handleClearVa = (student: StudentVA) => {
    Swal.fire({
      title: 'Hapus Virtual Account?',
      text: `Hapus nomor Virtual Account BNI milik ${student.name} (NIS: ${student.nis})?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await authenticatedFetch(`/api-backend/finance/virtual-accounts/${student.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ virtualAccount: null }),
          })
          if (res.ok) {
            Swal.fire('Dihapus!', 'Nomor Virtual Account telah dihapus.', 'success')
            fetchData()
          }
        } catch (err) {
          Swal.fire('Gagal', 'Terjadi kesalahan sistem.', 'error')
        }
      }
    })
  }

  return (
    <div className="space-y-5 p-3 md:p-6 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-5 rounded-2xl shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CreditCard className="w-7 h-7 text-emerald-300" />
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Virtual Account Siswa (BNI)</h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-emerald-700/80 border border-emerald-400/30 rounded-full text-emerald-100">
              Bank BNI
            </span>
          </div>
          <p className="text-xs md:text-sm text-emerald-100/80">
            Kelola dan impor nomor Virtual Account BNI untuk pembayaran tagihan siswa.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-emerald-700/60 hover:bg-emerald-600/80 border border-emerald-500/30 rounded-xl transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Template Excel
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-emerald-400 hover:bg-emerald-300 text-slate-950 rounded-xl transition-all shadow-md active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah VA Manual
          </button>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl transition-all shadow-md active:scale-95"
          >
            <Upload className="w-3.5 h-3.5" />
            Import Virtual Account
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Siswa</p>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">{stats.totalStudents}</h3>
          </div>
          <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Memiliki VA</p>
            <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{stats.countWithVa}</h3>
          </div>
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Belum Ada VA</p>
            <h3 className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">{stats.countWithoutVa}</h3>
          </div>
          <div className="p-2.5 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Nominal VA</p>
            <h3 className="text-base font-bold text-teal-600 dark:text-teal-400 mt-1">
              Rp {(stats.totalNominalVaActive || 0).toLocaleString('id-ID')}
            </h3>
          </div>
          <div className="p-2.5 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-lg">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter & Table Area */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {/* Controls */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari NIS, Nama, atau VA..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </form>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Filter className="w-3.5 h-3.5" />
              <span>Kelas:</span>
            </div>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="">Semua Kelas</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (Tingkat {c.gradeLevel})
                </option>
              ))}
            </select>

            <button
              onClick={fetchData}
              className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl transition-all"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-100/70 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3 w-12 text-center">No</th>
                <th className="px-4 py-3">NIS</th>
                <th className="px-4 py-3">Nama Siswa</th>
                <th className="px-4 py-3">Kelas</th>
                <th className="px-4 py-3">Kode Virtual Account</th>
                <th className="px-4 py-3 text-right">Nominal Tagihan VA</th>
                <th className="px-4 py-3 text-center">Status VA</th>
                <th className="px-4 py-3 text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Memuat data Virtual Account...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    Tidak ada data siswa ditemukan.
                  </td>
                </tr>
              ) : (
                students.map((student, idx) => (
                  <tr key={student.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-2.5 text-center font-medium text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-2.5 font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {student.nis}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white">
                      {student.name}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="px-2 py-0.5 text-[11px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-md">
                        {student.class?.name || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {student.virtualAccount ? (
                        <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800/50 tracking-wider">
                          {student.virtualAccount}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Belum diatur</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold">
                      {student.sisaTagihan && student.sisaTagihan > 0 ? (
                        <span className="text-emerald-700 dark:text-emerald-400">
                          Rp {student.sisaTagihan.toLocaleString('id-ID')}
                        </span>
                      ) : student.statusTagihan === 'LUNAS' ? (
                        <span className="text-slate-400 text-[11px] font-sans">Lunas</span>
                      ) : (
                        <span className="text-slate-400 text-[11px] font-sans">Rp 0</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {student.virtualAccount ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-full">
                          Belum Ada
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(student)}
                          className="px-2.5 py-1 text-[11px] font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 dark:text-blue-300 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800/60 rounded-lg transition-all flex items-center gap-1 shadow-sm"
                          title="Edit Virtual Account"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        {student.virtualAccount ? (
                          <button
                            onClick={() => handleClearVa(student)}
                            className="px-2.5 py-1 text-[11px] font-medium text-red-700 bg-red-50 hover:bg-red-100 dark:text-red-300 dark:bg-red-950/50 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-800/60 rounded-lg transition-all flex items-center gap-1 shadow-sm"
                            title="Hapus Virtual Account"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Hapus</span>
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL IMPORT VIRTUAL ACCOUNT */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Import Virtual Account Siswa BNI</h3>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Instructions */}
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-200 space-y-1">
                <p className="font-semibold text-xs flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-emerald-600" />
                  Petunjuk Format Data Excel:
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-emerald-700 dark:text-emerald-300">
                  <li>Gunakan <b>NIS</b> sebagai kolom kunci penghubung dengan akun siswa di sistem.</li>
                  <li>Sediakan kolom <b>Nama Siswa</b> (opsional untuk verifikasi) dan <b>Kode Virtual Account</b>.</li>
                  <li>Unduh template Excel jika Anda membutuhkan contoh format yang disarankan.</li>
                </ul>
              </div>

              {/* Upload Input */}
              <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 hover:border-emerald-500 transition-colors">
                <Upload className="w-8 h-8 text-slate-400 mb-2" />
                <p className="text-slate-600 dark:text-slate-300 font-medium mb-1">
                  {importFile ? importFile.name : 'Pilih file Excel (.xlsx / .csv) untuk diunggah'}
                </p>
                <p className="text-[11px] text-slate-400 mb-3">Mendukung format MS Excel dan CSV</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all"
                >
                  Pilih File Data
                </button>
              </div>

              {/* Preview Table */}
              {previewData.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200">
                      Preview Data Import ({previewData.length} Baris)
                    </h4>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      Valid: {previewData.filter((i) => i.status === 'VALID').length} baris
                    </span>
                  </div>

                  <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-100 dark:bg-slate-700 sticky top-0 font-semibold">
                        <tr>
                          <th className="px-3 py-2">NIS</th>
                          <th className="px-3 py-2">Nama Siswa (File)</th>
                          <th className="px-3 py-2">Terhubung Sistem</th>
                          <th className="px-3 py-2">Virtual Account</th>
                          <th className="px-3 py-2 text-center">Status Validasi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {previewData.map((item, i) => (
                          <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                            <td className="px-3 py-1.5 font-mono font-semibold">{item.nis || '-'}</td>
                            <td className="px-3 py-1.5">{item.name}</td>
                            <td className="px-3 py-1.5 font-medium text-slate-900 dark:text-white">
                              {item.matchedStudentName || <span className="text-red-500 italic">Tidak ditemukan</span>}
                            </td>
                            <td className="px-3 py-1.5 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {item.virtualAccount || '-'}
                            </td>
                            <td className="px-3 py-1.5 text-center">
                              {item.status === 'VALID' && (
                                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 rounded-full">
                                  Valid
                                </span>
                              )}
                              {item.status === 'NOT_FOUND' && (
                                <span className="px-2 py-0.5 text-[10px] font-semibold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 rounded-full">
                                  NIS Tidak Ada
                                </span>
                              )}
                              {item.status === 'MISSING_VA' && (
                                <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 rounded-full">
                                  VA Kosong
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white rounded-xl border border-slate-200 dark:border-slate-700"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={importing || previewData.filter((i) => i.status === 'VALID').length === 0}
                className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl transition-all shadow-md flex items-center gap-1.5"
              >
                {importing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {importing ? 'Memproses Import...' : 'Simpan Virtual Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT SINGLE STUDENT VA */}
      {isEditModalOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Atur Virtual Account Siswa</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl space-y-1">
                <p className="text-slate-500">Nama Siswa: <span className="font-semibold text-slate-900 dark:text-white">{selectedStudent.name}</span></p>
                <p className="text-slate-500">NIS / Kelas: <span className="font-mono font-medium text-slate-800 dark:text-slate-200">{selectedStudent.nis}</span> ({selectedStudent.class?.name || '-'})</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nomor Virtual Account BNI
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 988880012345"
                  value={editVaNumber}
                  onChange={(e) => setEditVaNumber(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono font-semibold rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">Kosongkan kolom jika ingin menghapus nomor VA.</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
              <div>
                {selectedStudent.virtualAccount && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditModalOpen(false)
                      handleClearVa(selectedStudent)
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus VA</span>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white rounded-xl border border-slate-200 dark:border-slate-700"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={savingEdit}
                  className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl transition-all shadow-md flex items-center gap-1.5"
                >
                  {savingEdit && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH VA MANUAL */}
      {isAddModalOpen && (() => {
        // Compute modal-specific filtered list
        const modalFilteredStudents = students.filter((st) => {
          // Hanya siswa yang BELUM memiliki VA
          if (st.virtualAccount) return false
          
          // Filter kelas di modal
          if (addModalClassFilter && st.class?.id !== addModalClassFilter) return false

          // Filter pencarian nama / NIS di modal
          if (addModalSearch) {
            const q = addModalSearch.toLowerCase().trim()
            const matchName = st.name?.toLowerCase().includes(q)
            const matchNis = st.nis?.toLowerCase().includes(q)
            if (!matchName && !matchNis) return false
          }

          return true
        })

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                <div className="flex items-center gap-2">
                  <Plus className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Tambah VA Manual (BNI)</h3>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                {/* Filter pencarian dan kelas di dalam modal */}
                <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl space-y-2 border border-slate-100 dark:border-slate-700/50">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">Filter Data Siswa (Belum Memiliki VA)</span>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">{modalFilteredStudents.length} siswa ditemukan</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Cari Nama / NIS..."
                      value={addModalSearch}
                      onChange={(e) => setAddModalSearch(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <select
                      value={addModalClassFilter}
                      onChange={(e) => setAddModalClassFilter(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="">Semua Kelas</option>
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Pilih Siswa
                  </label>
                  <select
                    value={addStudentId}
                    onChange={(e) => {
                      setAddStudentId(e.target.value)
                      const st = students.find((s) => s.id === e.target.value)
                      if (st && st.virtualAccount) {
                        setAddVaNumber(st.virtualAccount)
                      } else {
                        setAddVaNumber('')
                      }
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="">-- Pilih Siswa (Belum Memiliki VA) --</option>
                    {modalFilteredStudents.map((st) => (
                      <option key={st.id} value={st.id}>
                        [{st.nis}] {st.name} ({st.class?.name || '-'})
                      </option>
                    ))}
                  </select>
                  {modalFilteredStudents.length === 0 && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">⚠️ tidak ada siswa tanpa VA yang sesuai dengan pencarian/filter.</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nomor Virtual Account BNI
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 988880012345"
                    value={addVaNumber}
                    onChange={(e) => setAddVaNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-semibold rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Masukkan nomor Virtual Account BNI resmi untuk siswa.</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveAdd}
                  disabled={savingAdd}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl transition flex items-center gap-1.5"
                >
                  {savingAdd && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Simpan Virtual Account
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
