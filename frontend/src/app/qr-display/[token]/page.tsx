'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, ShieldAlert } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useParams } from 'next/navigation'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'

import NextImage from 'next/image'

export default function QrGeneratorPage() {
  const authenticatedFetch = useAuthenticatedFetch();
  const params = useParams()
  const tokenUrl = params?.token as string

  // Validate the public token
  const { data: validation, isLoading: validating, error: validationError } = useQuery({
    queryKey: ['validate-qr-token', tokenUrl],
    queryFn: async () => {
      const res = await authenticatedFetch(`/api-backend/settings/qr-token/validate?token=${tokenUrl}`, {
        headers: {
          'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'siakad_secret_api_key_2026'
        }
      })
      if (!res.ok) throw new Error('Gagal memvalidasi token')
      return res.json()
    },
    enabled: !!tokenUrl,
    refetchInterval: 5000 // Re-check validity every 5 second
  })

  // Fetch the actual attendance QR token (SIAKAD-QR-...) every 2s, but only if valid
  const { data: qrData, isLoading: loadingQr, error: qrError } = useQuery<{ token: string }>({
    queryKey: ['qr-attendance-token'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/daily-attendances/qr', {
        headers: {
          'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'siakad_secret_api_key_2026'
        }
      })
      if (!res.ok) throw new Error('Gagal mengambil token QR')
      return res.json()
    },
    refetchInterval: 2000,
    enabled: validation?.valid === true
  })

  const isValid = validation?.valid === true

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative p-6 overflow-x-hidden">
      {/* Background Wallpaper with Smooth Glass Overlay */}
      <div className="fixed inset-0 -z-30 w-full h-full overflow-hidden pointer-events-none">
        <NextImage
          src="/muhipo-log.jpg"
          alt="Latar Belakang SMA MUHIPO"
          fill
          priority
          unoptimized
          sizes="100vw"
          className="object-cover object-center w-full h-full scale-105"
        />
      </div>
      <div className="fixed inset-0 bg-slate-100/80 dark:bg-slate-950/90 backdrop-blur-[3px] -z-20 pointer-events-none" />
      <div className="w-full max-w-xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">QR Absen Harian</h1>
          <p className="text-slate-500 mt-1">Tampilkan QR Code ini di layar agar bisa di-scan oleh Guru, Karyawan, dan Siswa.</p>
        </div>

        <Card className="text-center py-10 shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="text-2xl">QR Code Presensi Hari Ini</CardTitle>
            <CardDescription>
              Arahkan scanner ke QR Code di bawah ini.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-6">
            {validating ? (
              <div className="flex flex-col items-center text-slate-500">
                <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-600" />
                <span>Memvalidasi Akses...</span>
              </div>
            ) : !isValid ? (
              <div className="flex flex-col items-center text-red-500 max-w-xs mx-auto text-center">
                <ShieldAlert className="w-12 h-12 mb-3 text-red-500" />
                <h3 className="font-bold text-lg mb-1">Akses Ditolak</h3>
                <p className="text-sm">Tautan Layar Publik ini tidak valid atau sudah kadaluarsa. Silakan minta tautan baru dari Admin IT.</p>
              </div>
            ) : loadingQr ? (
              <div className="flex flex-col items-center text-slate-500">
                <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-600" />
                <span>Membuat QR Code...</span>
              </div>
            ) : qrError ? (
              <div className="text-red-500 bg-red-50 px-4 py-3 rounded-lg border border-red-200">
                Gagal memuat QR Code. Pastikan server aktif.
              </div>
            ) : qrData?.token ? (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <QRCodeSVG
                  value={qrData.token}
                  style={{ width: "100%", height: "auto", maxWidth: "300px" }}
                  level={"H"}
                  includeMargin={true}
                />
                <p className="mt-6 text-sm text-slate-500 font-mono bg-slate-50 py-2 px-4 rounded-full border border-slate-100 inline-block">
                  Token: {qrData.token}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
