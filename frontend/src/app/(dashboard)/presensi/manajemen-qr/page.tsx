'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthenticatedFetch, useAuthenticatedQuery } from '@/hooks/useAuthenticatedFetch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Copy, RefreshCw, QrCode } from 'lucide-react'

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

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Manajemen Layar QR</h1>
        <p className="text-slate-500 mt-1">Atur tautan akses publik untuk menampilkan QR Code Presensi Harian.</p>
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Tautan Layar Publik</CardTitle>
              <CardDescription>
                Gunakan tautan di bawah ini pada browser tablet atau layar lobi. Siapapun yang memiliki tautan ini dapat melihat QR Code secara langsung tanpa perlu login.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="py-6 space-y-4">
          {isLoading ? (
            <div className="flex items-center text-slate-500 gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Memuat data tautan...</span>
            </div>
          ) : error ? (
            <div className="text-red-500 bg-red-50 px-4 py-3 rounded-lg border border-red-200">
              Gagal memuat pengaturan.
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">URL Akses Publik</label>
              <div className="flex gap-2">
                <Input 
                  readOnly 
                  value={publicLink} 
                  className="bg-slate-50 font-mono text-sm text-slate-600"
                />
                <Button onClick={handleCopy} variant="secondary" className="shrink-0 gap-2 w-[120px]">
                  {copied ? (
                    <span className="text-emerald-600 font-semibold">Tersalin!</span>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Salin</span>
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                <strong>Catatan:</strong> Jika Anda membagikan layar ini di tempat umum, pastikan tidak ada orang tidak bertanggung jawab yang menyalin tautan ini. Jika tautan bocor, silakan gunakan tombol <strong>Acak Ulang</strong> di bawah.
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="bg-slate-50/50 border-t border-slate-100 py-4 flex justify-between items-center">
          <p className="text-sm text-slate-500 max-w-[60%]">
            Mengacak ulang akan membuat tautan lama langsung menjadi tidak valid. Layar yang menggunakan tautan lama akan ditutup otomatis.
          </p>
          <Button 
            variant="destructive" 
            onClick={() => {
              if(confirm('Yakin ingin mengacak ulang tautan? Layar publik yang sedang aktif saat ini akan terputus.')) {
                regenerate()
              }
            }}
            disabled={isRegenerating || isLoading}
            className="gap-2 shrink-0"
          >
            {isRegenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Acak Ulang Tautan
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
