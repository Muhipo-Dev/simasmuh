'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FileCheck, Download, Trash2, CheckCircle2, Search, Filter, Loader2, Phone, Mail, GraduationCap } from 'lucide-react'
import * as XLSX from 'xlsx'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'

type SPMBApplicant = {
  id: string
  studentName: string
  schoolOrigin: string
  parentName: string
  phone: string
  email?: string
  majorChoice: string
  status: 'PENDING' | 'VERIFIED' | 'ACCEPTED' | 'REJECTED'
  createdAt: string
}

export default function SuperAdminSPMBPage() {
  const authenticatedFetch = useAuthenticatedFetch()
  const queryClient = useQueryClient()

  const [searchTerm, setSearchTerm] = useState('')
  const [filterMajor, setFilterMajor] = useState('ALL')
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Mock data / fetch data
  const [mockApplicants, setMockApplicants] = useState<SPMBApplicant[]>([
    {
      id: 'spmb-1',
      studentName: 'Muhammad Rizky Pratama',
      schoolOrigin: 'SMP Negeri 1 Ponorogo',
      parentName: 'Bambang S.',
      phone: '081234567890',
      email: 'rizky@gmail.com',
      majorChoice: 'MIPA',
      status: 'VERIFIED',
      createdAt: '2026-08-01T09:00:00Z'
    },
    {
      id: 'spmb-2',
      studentName: 'Aisyah Nur Aini',
      schoolOrigin: 'MTs Negeri 2 Ponorogo',
      parentName: 'Ahmad S.',
      phone: '085712345678',
      email: 'aisyah@gmail.com',
      majorChoice: 'TAHFIDZ',
      status: 'ACCEPTED',
      createdAt: '2026-08-02T10:30:00Z'
    },
    {
      id: 'spmb-3',
      studentName: 'Dimas Anggara',
      schoolOrigin: 'SMP Muhammadiyah 1 Ponorogo',
      parentName: 'Hendra A.',
      phone: '081399887766',
      email: 'dimas@gmail.com',
      majorChoice: 'IPS',
      status: 'PENDING',
      createdAt: '2026-08-02T11:15:00Z'
    }
  ])

  const filteredApplicants = mockApplicants.filter(a => {
    const matchesSearch = a.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          a.schoolOrigin.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          a.phone.includes(searchTerm)
    const matchesMajor = filterMajor === 'ALL' || a.majorChoice === filterMajor
    return matchesSearch && matchesMajor
  })

  const handleToggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredApplicants.map(a => a.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleToggleSelectOne = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const handleUpdateStatus = (id: string, newStatus: SPMBApplicant['status']) => {
    setMockApplicants(prev =>
      prev.map(a => a.id === id ? { ...a, status: newStatus } : a)
    )
  }

  const handleDelete = (id: string) => {
    if (confirm('Yakin ingin menghapus data pendaftar SPMB ini?')) {
      setMockApplicants(prev => prev.filter(a => a.id !== id))
    }
  }

  const exportExcel = () => {
    const dataToExport = filteredApplicants.map((item, idx) => ({
      'No': idx + 1,
      'Nama Calon Siswa': item.studentName,
      'Asal Sekolah': item.schoolOrigin,
      'Nama Wali': item.parentName,
      'No. WhatsApp': item.phone,
      'Email': item.email || '-',
      'Program Pilihan': item.majorChoice,
      'Status Pendaftaran': item.status,
      'Tanggal Didaftar': new Date(item.createdAt).toLocaleDateString('id-ID')
    }))
    const ws = XLSX.utils.json_to_sheet(dataToExport)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Data SPMB 2026')
    XLSX.writeFile(wb, 'data_pendaftar_spmb_2026.xlsx')
  }

  const isAllSelected = filteredApplicants.length > 0 && selectedIds.length === filteredApplicants.length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <FileCheck className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            Kelola Data SPMB Online
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Daftar pra-pendaftaran pendaftar siswa baru dari website publik.</p>
        </div>

        <Button onClick={exportExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
          <Download className="w-4 h-4 mr-2" />
          Export Excel Data SPMB
        </Button>
      </div>

      <Card className="shadow-xs border-slate-200 dark:border-slate-800">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">Pendaftar SPMB Online</CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-0.5">Total pendaftar: {filteredApplicants.length} calon murid</CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <Input 
                  placeholder="Cari nama, sekolah, WA..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 text-xs bg-white dark:bg-slate-950"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-semibold text-slate-500">Program:</span>
                <Select value={filterMajor} onValueChange={(v) => setFilterMajor(v || 'ALL')}>
                  <SelectTrigger className="w-[120px] h-7 text-xs border-0 shadow-none focus:ring-0 p-0">
                    <SelectValue placeholder="Semua" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Program</SelectItem>
                    <SelectItem value="MIPA">MIPA</SelectItem>
                    <SelectItem value="IPS">IPS</SelectItem>
                    <SelectItem value="TAHFIDZ">Tahfidz</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-900">
              <TableRow>
                <TableHead className="w-12 text-center">
                  <input 
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 cursor-pointer accent-blue-600"
                  />
                </TableHead>
                <TableHead>Nama Calon Siswa</TableHead>
                <TableHead>Asal Sekolah</TableHead>
                <TableHead>Orang Tua / Wali</TableHead>
                <TableHead>No. WhatsApp</TableHead>
                <TableHead>Pilihan Program</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right pr-6">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredApplicants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                    Belum ada data pendaftar SPMB Online.
                  </TableCell>
                </TableRow>
              ) : (
                filteredApplicants.map((item) => {
                  const isSelected = selectedIds.includes(item.id)
                  return (
                    <TableRow key={item.id} className={isSelected ? 'bg-blue-50/80 dark:bg-blue-950/40' : ''}>
                      <TableCell className="text-center">
                        <input 
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectOne(item.id)}
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 cursor-pointer accent-blue-600"
                        />
                      </TableCell>
                      <TableCell className="font-semibold text-slate-900 dark:text-white">{item.studentName}</TableCell>
                      <TableCell>{item.schoolOrigin}</TableCell>
                      <TableCell>{item.parentName || '-'}</TableCell>
                      <TableCell>
                        <a 
                          href={`https://wa.me/${item.phone.replace(/^0/, '62')}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-blue-600 hover:underline font-semibold flex items-center gap-1 text-xs"
                        >
                          <Phone className="w-3.5 h-3.5 text-emerald-600" />
                          {item.phone}
                        </a>
                      </TableCell>
                      <TableCell>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          {item.majorChoice}
                        </span>
                      </TableCell>
                      <TableCell>
                        <select
                          value={item.status}
                          onChange={(e) => handleUpdateStatus(item.id, e.target.value as any)}
                          className="text-xs font-bold px-2 py-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                        >
                          <option value="PENDING">PENDING</option>
                          <option value="VERIFIED">TERVERIFIKASI</option>
                          <option value="ACCEPTED">DITERIMA</option>
                          <option value="REJECTED">DITOLAK</option>
                        </select>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
