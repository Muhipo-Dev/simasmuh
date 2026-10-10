'use client'

import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Wrench, Loader2 } from 'lucide-react'
import Swal from 'sweetalert2'
import { useAuthenticatedQuery, useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'

export function MaintenanceModeHeaderSwitch() {
  const queryClient = useQueryClient()
  const authenticatedQuery = useAuthenticatedQuery()
  const authenticatedFetch = useAuthenticatedFetch()

  const { data: maintStatus, isLoading } = useQuery({
    queryKey: ['maintenance-status'],
    queryFn: () => authenticatedQuery('/api-backend/maintenance/status'),
    refetchInterval: 3000,
  })

  const maintenanceMode = maintStatus?.maintenanceMode || false

  const toggleMutation = useMutation({
    mutationFn: async (nextMode: boolean) => {
      const res = await authenticatedFetch('/api-backend/maintenance/admin/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          enabled: nextMode,
          message: maintStatus?.maintenanceMessage || 'Layanan SIMASMUH sedang dalam pemeliharaan berkala untuk optimalisasi sistem. Akses sementara dibatasi untuk Administrator.' 
        }),
      })
      if (!res.ok) throw new Error('Gagal mengubah status pemeliharaan')
      return res.json()
    },
    onSuccess: (data, nextMode) => {
      queryClient.setQueryData(['maintenance-status'], data)
      queryClient.invalidateQueries({ queryKey: ['maintenance-status'] })
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      Swal.fire({
        title: nextMode ? 'Pemeliharaan Aktif' : 'Sistem Beroperasi Normal',
        text: nextMode
          ? 'Akses sistem sementara dibatasi khusus untuk Administrator.'
          : 'Akses sistem dibuka kembali untuk seluruh pengguna.',
        icon: nextMode ? 'warning' : 'success',
        timer: 2000,
        showConfirmButton: false,
      })
    },
    onError: (err: any) => {
      Swal.fire('Gagal!', err.message || 'Terjadi kesalahan sistem', 'error')
    },
  })

  return (
    <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 sm:px-3.5 sm:py-2.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs w-full min-w-0">
      <div className="flex flex-col text-left min-w-0 flex-1 pr-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] sm:text-xs font-black text-slate-800 dark:text-slate-200 whitespace-nowrap">
            Maintenance Mode:
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shrink-0 ${
              maintenanceMode
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 animate-pulse'
                : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${maintenanceMode ? 'bg-amber-600' : 'bg-emerald-600'}`} />
            {maintenanceMode ? 'PEMELIHARAAN' : 'NORMAL'}
          </span>
        </div>
        <span className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate max-w-full mt-0.5">
          {maintenanceMode ? 'Khusus Administrator' : 'Operasional Normal'}
        </span>
      </div>

      {/* Switch Button (Ionic Style Toggle) */}
      <button
        type="button"
        disabled={toggleMutation.isPending || isLoading}
        onClick={() => toggleMutation.mutate(!maintenanceMode)}
        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none shadow-inner items-center p-0.5 ${
          maintenanceMode
            ? 'bg-amber-500'
            : 'bg-slate-300 dark:bg-slate-700'
        }`}
        title={maintenanceMode ? 'Klik untuk matikan mode pemeliharaan' : 'Klik untuk aktifkan mode pemeliharaan'}
      >
        <span className="sr-only">Toggle Maintenance Mode</span>
        <span
          className={`pointer-events-none inline-flex h-5.5 w-5.5 transform items-center justify-center rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
            maintenanceMode ? 'translate-x-5' : 'translate-x-0'
          }`}
        >
          {toggleMutation.isPending ? (
            <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
          ) : maintenanceMode ? (
            <Wrench className="w-3 h-3 text-amber-600" />
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          )}
        </span>
      </button>
    </div>
  )
}

export function WaitingRoomHeaderSwitch() {
  const queryClient = useQueryClient()
  const authenticatedQuery = useAuthenticatedQuery()
  const authenticatedFetch = useAuthenticatedFetch()

  const { data: metrics, isLoading } = useQuery({
    queryKey: ['waiting-room-metrics'],
    queryFn: () => authenticatedQuery('/api-backend/waiting-room/metrics'),
    refetchInterval: 3000,
  })

  const forceEnabled = metrics?.forceEnabled || false
  const activeUsers = metrics?.activeUsers || 0
  const maxCapacity = metrics?.maxCapacity || 1000

  const toggleMutation = useMutation({
    mutationFn: async (nextForce: boolean) => {
      const res = await authenticatedFetch('/api-backend/waiting-room/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceEnabled: nextForce }),
      })
      if (!res.ok) throw new Error('Gagal mengubah mode waiting room')
      return res.json()
    },
    onSuccess: (data, nextForce) => {
      queryClient.setQueryData(['waiting-room-metrics'], data)
      queryClient.invalidateQueries({ queryKey: ['waiting-room-metrics'] })
      Swal.fire({
        title: nextForce ? 'Waiting Room Manual Diaktifkan!' : 'Mode Otomatis Aktif!',
        text: nextForce
          ? 'Seluruh trafik login baru kini dialihkan ke ruang tunggu antrean.'
          : 'Waiting room kini otomatis berjalan saat beban server ≥ 80% atau kuota penuh.',
        icon: nextForce ? 'warning' : 'success',
        timer: 2000,
        showConfirmButton: false,
      })
    },
    onError: (err: any) => {
      Swal.fire('Gagal!', err.message || 'Terjadi kesalahan sistem', 'error')
    },
  })

  return (
    <div className="flex items-center justify-between gap-2.5 bg-white dark:bg-slate-900 p-2.5 sm:px-3.5 sm:py-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs shrink-0 flex-1 min-w-[240px]">
      <div className="flex flex-col text-left min-w-0 flex-1 pr-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-black text-slate-800 dark:text-slate-200 whitespace-nowrap">
            Waiting Room Manual:
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shrink-0 ${
              forceEnabled
                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 animate-pulse'
                : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${forceEnabled ? 'bg-rose-600' : 'bg-emerald-600'}`} />
            {forceEnabled ? 'MANUAL AKTIF' : 'OTOMATIS'}
          </span>
        </div>
        <span className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate max-w-full mt-0.5">
          {activeUsers}/{maxCapacity} login aktif • {metrics?.queuedUsers || 0} antre
        </span>
      </div>

      {/* Switch Button (Ionic Style Toggle) */}
      <button
        type="button"
        disabled={toggleMutation.isPending || isLoading}
        onClick={() => toggleMutation.mutate(!forceEnabled)}
        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none shadow-inner items-center p-0.5 ${
          forceEnabled
            ? 'bg-rose-600'
            : 'bg-slate-300 dark:bg-slate-700'
        }`}
        title={forceEnabled ? 'Klik untuk matikan mode manual' : 'Klik untuk aktifkan mode manual'}
      >
        <span className="sr-only">Toggle Waiting Room Manual</span>
        <span
          className={`pointer-events-none inline-flex h-5.5 w-5.5 transform items-center justify-center rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
            forceEnabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        >
          {toggleMutation.isPending ? (
            <Loader2 className="w-3 h-3 animate-spin text-rose-600" />
          ) : forceEnabled ? (
            <span className="w-2 h-2 rounded-full bg-rose-600" />
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          )}
        </span>
      </button>
    </div>
  )
}
