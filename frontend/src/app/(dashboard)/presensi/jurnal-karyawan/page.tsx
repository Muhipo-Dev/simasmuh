'use client'

import { useState } from 'react'
import Swal from 'sweetalert2'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Loader2, Pencil, Trash2, Calendar, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TableSearch, filterDataBySearch } from '@/components/TableSearch'
import { useSession } from 'next-auth/react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { SortableTableHead, useSorting } from "@/components/SortableTableHead"
import Link from 'next/link'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'

type StaffJournal = {
  id: string
  date: string
  activity: string
  notes?: string
  evidence?: string
}

export default function JurnalKaryawanPage() {
  const authenticatedFetch = useAuthenticatedFetch()
  const { data: session } = useSession()
  const userId = (session?.user as any)?.id
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')

  const { data: journals, isLoading } = useQuery<StaffJournal[]>({
    queryKey: ['staff-journals', userId],
    queryFn: async () => {
      if (!userId) return []
      const res = await authenticatedFetch(`/api-backend/staff-journals?userId=${userId}`)
      if (!res.ok) throw new Error('Gagal memuat jurnal')
      return res.json()
    },
    enabled: !!userId
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await authenticatedFetch(`/api-backend/staff-journals/${id}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error('Gagal menghapus jurnal')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-journals'] })
    }
  })

  const handleDelete = (id: string) => {
    Swal.fire({
      title: 'Konfirmasi',
      text: 'Apakah Anda yakin ingin menghapus jurnal ini?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, hapus!',
      cancelButtonText: 'Batal'
    }).then((result: any) => {
      if (result.isConfirmed) {
        deleteMutation.mutate(id)
      }
    })
  }

  const { sortConfig, handleSort, sortedItems: sortedJournals } = useSorting(journals || [])
  const searchedJournals = filterDataBySearch(sortedJournals, searchQuery)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Jurnal Karyawan & Pegawai</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola dan pantau aktivitas harian Anda sebagai pegawai.</p>
        </div>
        <Link href="/presensi/jurnal-karyawan/tambah">
          <Button className="bg-blue-600 hover:bg-blue-700 font-bold shadow-xs">
            <Plus className="w-4 h-4 mr-2" />
            Tambah Jurnal
          </Button>
        </Link>
      </div>

      <Card className="shadow-xs border-slate-200 dark:border-slate-800">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Riwayat Jurnal Pegawai</CardTitle>
            <CardDescription>Menampilkan daftar jurnal aktivitas harian Anda.</CardDescription>
          </div>
          <TableSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Cari jurnal (aktivitas/catatan)..."
          />
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-900">
              <TableRow>
                <TableHead className="w-[60px] pl-6">No</TableHead>
                <SortableTableHead sortConfig={sortConfig} onSort={handleSort} sortKey="date" className="w-[180px]">Tanggal</SortableTableHead>
                <SortableTableHead sortConfig={sortConfig} onSort={handleSort} sortKey="activity">Aktivitas</SortableTableHead>
                <SortableTableHead sortConfig={sortConfig} onSort={handleSort} sortKey="notes">Catatan</SortableTableHead>
                <TableHead>Bukti</TableHead>
                <TableHead className="text-right pr-6">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    <div className="flex flex-col items-center justify-center text-slate-500">
                      <Loader2 className="w-6 h-6 animate-spin mb-2 text-blue-600" />
                      Memuat data jurnal...
                    </div>
                  </TableCell>
                </TableRow>
              ) : searchedJournals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-medium">{searchQuery ? 'Tidak ada jurnal yang sesuai dengan pencarian.' : 'Anda belum mengisi jurnal hari ini.'}</p>
                  </TableCell>
                </TableRow>
              ) : (
                searchedJournals.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell className="pl-6 font-medium text-slate-500">{index + 1}</TableCell>
                    <TableCell className="font-semibold text-slate-900 dark:text-white">
                      {format(new Date(item.date), 'EEEE, dd MMMM yyyy', { locale: id })}
                    </TableCell>
                    <TableCell className="font-bold text-slate-900 dark:text-white">{item.activity}</TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-300 italic">{item.notes || '-'}</TableCell>
                    <TableCell>
                      {item.evidence ? (
                        <a href={item.evidence} target="_blank" rel="noreferrer" className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline">
                          Lihat Bukti
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end gap-1.5">
                        <Link href={`/presensi/jurnal-karyawan/edit/${item.id}`}>
                          <Button variant="ghost" size="icon" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} disabled={deleteMutation.isPending} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
