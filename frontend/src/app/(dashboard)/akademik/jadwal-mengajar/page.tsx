'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TableSearch, filterDataBySearch } from '@/components/TableSearch'
import { SortableTableHead, useSorting } from "@/components/SortableTableHead"
import { Loader2, Calendar, UserCheck } from 'lucide-react'

export default function JadwalMengajarPage() {
  const { data: session, status } = useSession()
  const userId = (session?.user as any)?.id
  const userRole = (session?.user as any)?.role
  const authenticatedFetch = useAuthenticatedFetch()
  const [searchQuery, setSearchQuery] = useState('')

  const { data: schedules, isLoading } = useQuery<any[]>({
    queryKey: ['schedules', userId],
    queryFn: async () => {
      const url = userId ? `/api-backend/schedules?userId=${userId}` : '/api-backend/schedules'
      const res = await authenticatedFetch(url)
      if (!res.ok) throw new Error('Gagal memuat jadwal')
      return res.json()
    },
    enabled: !!userId || status === 'authenticated'
  })

  // Filter ekstra di sisi frontend guna memastikan jadwal 100% murni milik akun guru yang bersangkutan
  const mySchedules = (Array.isArray(schedules) ? schedules : []).filter(s => {
    if (userRole === 'ADMIN_IT' || userRole === 'SUPERADMIN') return true
    return (
      s?.teacher?.userId === userId || 
      s?.teacher?.user?.email === session?.user?.email || 
      (s?.teacher?.user?.username && s?.teacher?.user?.username === (session?.user as any)?.username)
    )
  })

  const { sortConfig, handleSort, sortedItems: sortedSchedules } = useSorting(mySchedules || [])
  const searchedSchedules = filterDataBySearch(sortedSchedules, searchQuery)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-blue-600 to-indigo-700 p-6 rounded-2xl text-white shadow-lg">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Calendar className="w-8 h-8 opacity-90" />
            Jadwal Mengajar
          </h1>
          <p className="text-blue-100 mt-1.5 text-sm sm:text-base">
            Daftar jadwal mata pelajaran dan kelas yang Anda ampu pada semester ini.
          </p>
        </div>
        {session?.user && (
          <div className="bg-white/10 dark:bg-slate-900/30 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/20 flex items-center gap-3">
            <UserCheck className="w-5 h-5 text-emerald-300 shrink-0" />
            <div className="text-xs sm:text-sm">
              <div className="text-blue-100 font-medium">Akun Guru Aktif:</div>
              <div className="font-bold text-white tracking-wide">{session?.user?.name}</div>
            </div>
          </div>
        )}
      </div>

      <Card className="shadow-sm border-slate-200 dark:border-slate-800 dark:bg-slate-900/50">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="dark:text-slate-100">Jadwal Minggu Ini</CardTitle>
            <CardDescription className="dark:text-slate-400">Daftar kelas beserta jam mengajar untuk mingguan Anda.</CardDescription>
          </div>
          <TableSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Cari jadwal (kelas/mapel)..."
          />
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-800/80">
              <TableRow>
                <SortableTableHead sortConfig={sortConfig} onSort={handleSort} sortKey="dayOfWeek" className="pl-6 font-semibold dark:text-slate-200">Hari</SortableTableHead>
                <SortableTableHead sortConfig={sortConfig} onSort={handleSort} sortKey="startTime" className="font-semibold dark:text-slate-200">Waktu</SortableTableHead>
                <SortableTableHead sortConfig={sortConfig} onSort={handleSort} sortKey="class.name" className="font-semibold dark:text-slate-200">Kelas</SortableTableHead>
                <SortableTableHead sortConfig={sortConfig} onSort={handleSort} sortKey="subject.name" className="font-semibold dark:text-slate-200">Mata Pelajaran</SortableTableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading || status === 'loading' ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10">
                    <div className="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mb-2 text-blue-600 dark:text-blue-400" />
                      Memuat jadwal mengajar Anda...
                    </div>
                  </TableCell>
                </TableRow>
              ) : searchedSchedules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center justify-center">
                      <Calendar className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-2 stroke-[1.5]" />
                      <p className="font-medium text-base text-slate-700 dark:text-slate-300">{searchQuery ? 'Tidak ada jadwal yang sesuai pencarian.' : 'Tidak ada jadwal mengajar.'}</p>
                      {!searchQuery && <p className="text-xs text-slate-400 mt-1">Jadwal untuk akun Anda belum diatur atau Anda belum memiliki jadwal minggu ini.</p>}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                searchedSchedules.map((jadwal) => (
                  <TableRow key={jadwal.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                    <TableCell className="pl-6 font-semibold text-slate-900 dark:text-slate-200">
                      {['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][jadwal.dayOfWeek]}
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-300 font-mono text-sm">
                      {jadwal.startTime} - {jadwal.endTime}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {jadwal.class?.name || '-'}
                      </span>
                    </TableCell>
                    <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                      {jadwal.subject?.name || '-'}
                      {jadwal.subject?.code ? <span className="ml-2 text-xs text-slate-400 font-mono">({jadwal.subject?.code})</span> : null}
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

