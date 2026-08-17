'use client'

import React, { useRef, useState, useCallback } from 'react'
import Swal from 'sweetalert2'
import { useRouter } from 'next/navigation'
import Webcam from 'react-webcam'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, Loader2, ArrowLeft, Camera, RefreshCcw } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'

export default function TambahJurnalKaryawanPage() {
  const authenticatedFetch = useAuthenticatedFetch()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const userId = (session?.user as any)?.id

  const webcamRef = useRef<Webcam>(null)
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    activity: '',
    notes: '',
    evidence: ''
  })

  const capture = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot()
      setFormData(p => ({ ...p, evidence: imageSrc || '' }))
    }
  }, [webcamRef])

  const handleRetake = () => {
    setFormData(p => ({ ...p, evidence: '' }))
  }

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      let evidenceUrl = payload.evidence
      if (evidenceUrl && evidenceUrl.startsWith('data:image')) {
        const uploadRes = await authenticatedFetch('/api-backend/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: evidenceUrl, folder: 'journals' })
        })
        if (!uploadRes.ok) throw new Error('Gagal mengunggah foto')
        const uploadData = await uploadRes.json()
        evidenceUrl = uploadData.url
      }

      const res = await authenticatedFetch('/api-backend/staff-journals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, evidence: evidenceUrl })
      })
      if (!res.ok) throw new Error('Gagal menyimpan jurnal')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-journals'] })
      router.push('/presensi/jurnal-karyawan')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return Swal.fire('Informasi', 'Sesi tidak valid, silakan login kembali.', 'info')

    createMutation.mutate({
      ...formData,
      userId
    })
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      <div className="flex items-center gap-4">
        <Link href="/presensi/jurnal-karyawan">
          <Button variant="outline" size="icon" className="h-9 w-9">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Tambah Jurnal Karyawan & Pegawai</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Catat aktivitas harian Anda sebagai pegawai</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="shadow-xs border-slate-200 dark:border-slate-800">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-lg">Informasi Jurnal</CardTitle>
            <CardDescription>Catat aktivitas utama yang dilakukan hari ini</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="date">Tanggal</Label>
              <Input
                id="date"
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData(p => ({ ...p, date: e.target.value }))}
                className="max-w-[200px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="activity">Aktivitas Utama</Label>
              <Input
                id="activity"
                placeholder="Misal: Menyusun laporan keuangan / Menginput data absensi"
                required
                value={formData.activity}
                onChange={(e) => setFormData(p => ({ ...p, activity: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Catatan Tambahan (Opsional)</Label>
              <Textarea
                id="notes"
                placeholder="Detail kendala atau hasil dari aktivitas..."
                rows={4}
                value={formData.notes}
                onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Capture Bukti Foto */}
        <Card className="shadow-xs border-slate-200 dark:border-slate-800">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-lg">Bukti Kegiatan (Foto)</CardTitle>
            <CardDescription>Ambil foto bukti aktivitas harian Anda (Opsional)</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              {formData.evidence ? (
                <div className="relative rounded-lg overflow-hidden border border-slate-200 shadow-xs">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={formData.evidence} alt="Bukti Jurnal" className="w-full max-w-md object-contain" />
                  <Button 
                    type="button" 
                    variant="secondary" 
                    size="sm" 
                    className="absolute top-2 right-2 bg-white/80 hover:bg-white dark:bg-slate-900/80 backdrop-blur shadow-xs"
                    onClick={handleRetake}
                  >
                    <RefreshCcw className="w-4 h-4 mr-2" /> Ulangi
                  </Button>
                </div>
              ) : (
                <div className="w-full max-w-md rounded-lg overflow-hidden border border-slate-200 bg-black flex items-center justify-center shadow-xs">
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    className="w-full"
                    videoConstraints={{ facingMode: "user" }}
                  />
                </div>
              )}
              
              {!formData.evidence && (
                <Button type="button" onClick={capture} className="bg-slate-900 hover:bg-slate-800 text-white font-bold">
                  <Camera className="w-4 h-4 mr-2" />
                  Ambil Foto Bukti
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Link href="/presensi/jurnal-karyawan">
            <Button type="button" variant="outline">Batal</Button>
          </Link>
          <Button type="submit" disabled={createMutation.isPending} className="bg-blue-600 hover:bg-blue-700 font-bold shadow-md">
            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Simpan Jurnal
          </Button>
        </div>
      </form>
    </div>
  )
}
