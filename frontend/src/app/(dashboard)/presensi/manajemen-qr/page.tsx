'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthenticatedFetch, useAuthenticatedQuery } from '@/hooks/useAuthenticatedFetch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Copy, RefreshCw, QrCode, ShieldAlert } from 'lucide-react'
import Swal from 'sweetalert2'

export default function QrManagerPage() {
  const queryClient = useQueryClient()
  const [copied, setCopied] = useState(false)
  const authenticatedQuery = useAuthenticatedQuery()
  const authenticatedFetch = useAuthenticatedFetch()

  const { data, isLoading, error } = useQuery<{ token: string }>({
    queryKey: ['qr-public-token'],
    queryFn: () => authenticatedQuery('/api-backend/settings/qr-token')
  })

  const { mutate: regenerate, isPending: isRegenerating } = useMutation({
    mutationFn: async () => {
      const res = await authenticatedFetch('/api-backend/settings/qr-token/regenerate', { method: 'POST' })
      if (!res.ok) throw new Error('Gagal membuat ulang token')
      return res.json()
    },
    onSuccess: (newData) => {
      queryClient.setQueryData(['qr-public-token'], newData)
      setCopied(false)
      Swal.fire({
        title: 'Tautan Diacak Ulang!',
        text: 'Tautan layar publik yang lama telah dinonaktifkan.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
      })
    },
    onError: (err: any) => {
      Swal.fire({
        title: 'Gagal',
        text: err?.message || 'Gagal mengacak ulang tautan',
        icon: 'error',
      })
    }
  })

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const publicLink = data?.token ? `${baseUrl}/qr-display/${data.token}` : ''

  const handleCopy = async () => {
    if (!publicLink) return
    try {
      await navigator.clipboard.writeText(publicLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy', err)
    }
  }

  const handleConfirmRegenerate = () => {
    Swal.fire({
      title: 'Acak Ulang Tautan QR?',
      text: 'Layar publik yang sedang menampilkan QR Code saat ini akan terputus dan wajib diperbarui dengan URL baru.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Acak Ulang',
      cancelButtonText: 'Batal',
    }).then((result) => {
      if (result.isConfirmed) {
        regenerate()
      }
    })
  }

  return (
    <div className="space-y-4 sm:space-y-5 max-w-4xl mx-auto">
      {/* Header Compact */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/80 dark:bg-slate-900/75 border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur-xl shadow-xs">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-0.5">
            Presensi & Display
          </span>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <QrCode className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Manajemen Layar QR
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Atur tautan akses publik untuk menampilkan QR Code Presensi Harian.</p>
        </div>
      </div>

      <Card className="shadow-xs border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white">Tautan Layar Publik</CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                Gunakan tautan ini pada browser tablet atau monitor lobi sekolah tanpa perlu autentikasi login.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 space-y-3.5">
          {isLoading ? (
            <div className="flex items-center justify-center text-slate-500 text-xs gap-2 py-8">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <span>Memuat tautan layar publik...</span>
            </div>
          ) : error ? (
            <div className="text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-4 py-3 rounded-xl border border-rose-200 dark:border-rose-800 text-xs font-semibold">
              Gagal memuat token layar publik.
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">URL Akses Publik Monitor</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input 
                  readOnly 
                  value={publicLink} 
                  className="bg-slate-50 dark:bg-slate-800 font-mono text-xs text-slate-700 dark:text-slate-200 h-10 rounded-xl border-slate-200 dark:border-slate-700"
                />
                <Button 
                  onClick={handleCopy} 
                  variant="secondary" 
                  className="shrink-0 gap-1.5 h-10 px-4 rounded-xl font-bold text-xs touch-manipulation"
                >
                  {copied ? (
                    <span className="text-emerald-600 font-bold">Tersalin!</span>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Salin URL</span>
                    </>
                  )}
                </Button>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-[11px] leading-relaxed flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <span>
                  <strong>Keamanan:</strong> Pastikan tautan hanya dibuka di browser kiosk/tablet resmi sekolah. Jika tautan diketahui pihak luar, klik <strong>Acak Ulang Tautan</strong> untuk langsung memutus akses lama.
                </span>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-md">
            Mengacak ulang token akan memutuskan tampilan layar QR yang sedang aktif di monitor lama secara seketika.
          </p>
          <Button 
            variant="destructive" 
            onClick={handleConfirmRegenerate}
            disabled={isRegenerating || isLoading}
            className="h-10 px-3.5 gap-1.5 shrink-0 rounded-xl font-bold text-xs touch-manipulation"
          >
            {isRegenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Acak Ulang Tautan
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
