'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, Loader2, ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import Link from 'next/link'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'

export default function EditJurnalKaryawanPage() {
  const authenticatedFetch = useAuthenticatedFetch()
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const journalId = params.id as string

  const [formData, setFormData] = useState({
    date: '',
    activity: '',
    notes: '',
    evidence: ''
  })

  const { data: journal, isLoading } = useQuery({
    queryKey: ['staff-journal', journalId],
    queryFn: async () => {
      const res = await authenticatedFetch(`/api-backend/staff-journals/${journalId}`)
      if (!res.ok) throw new Error('Gagal memuat jurnal')
      return res.json()
    },
    enabled: !!journalId
  })

  useEffect(() => {
    if (journal) {
      setFormData({
        date: journal.date ? new Date(journal.date).toISOString().split('T')[0] : '',
        activity: journal.activity || '',
        notes: journal.notes || '',
        evidence: journal.evidence || ''
      })
    }
  }, [journal])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData(p => ({ ...p, evidence: reader.result as string }))
      }
      reader.readAsDataURL(file)
    }
  }

  const updateMutation = useMutation({
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

      const res = await authenticatedFetch(`/api-backend/staff-journals/${journalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, evidence: evidenceUrl })
      })
      if (!res.ok) throw new Error('Gagal memperbarui jurnal')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-journals'] })
      router.push('/presensi/jurnal-karyawan')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate(formData)
  }

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Ubah Jurnal Karyawan & Pegawai</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Perbarui aktivitas harian Anda</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="shadow-xs border-slate-200 dark:border-slate-800">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-lg">Informasi Jurnal</CardTitle>
            <CardDescription>Ubah detail aktivitas yang telah Anda lakukan</CardDescription>
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
                placeholder="Misal: Memeriksa laporan keuangan bulan ini"
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

            <div className="space-y-2">
              <Label htmlFor="evidence">Bukti Kegiatan (Foto/Gambar) - Opsional</Label>
              <Input
                id="evidence"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
              />
              {formData.evidence && (
                <div className="mt-2">
                  <p className="text-xs text-slate-500 mb-1">Pratinjau Bukti (Terbaru/Saat ini):</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={formData.evidence} alt="Bukti" className="h-32 rounded-lg object-cover border border-slate-200 shadow-xs" />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Link href="/presensi/jurnal-karyawan">
                <Button type="button" variant="outline">Batal</Button>
              </Link>
              <Button type="submit" disabled={updateMutation.isPending} className="bg-blue-600 hover:bg-blue-700 font-bold shadow-md">
                {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Simpan Perubahan
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
