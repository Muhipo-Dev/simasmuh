'use client'

import React, { useState } from 'react'
import Swal from 'sweetalert2'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { BookOpen, Check, Plus, Trash2, Edit3, Sparkles, Layers, ShieldCheck, AlertCircle } from 'lucide-react'
import { CurriculumOption, BUILTIN_CURRICULA } from '@/components/academic/kurikulum/common/KurikulumSelector'

interface PengaturanKurikulumManagerProps {
  activeCurricula: string[]
  customCurricula: CurriculumOption[]
  onSave: (activeCurricula: string[], customCurricula: CurriculumOption[]) => Promise<void>
  isSaving: boolean
}

export function PengaturanKurikulumManager({
  activeCurricula,
  customCurricula,
  onSave,
  isSaving,
}: PengaturanKurikulumManagerProps) {
  const [selectedActive, setSelectedActive] = useState<string[]>(activeCurricula || ['KURIKULUM_MERDEKA'])
  const [allCustom, setAllCustom] = useState<CurriculumOption[]>(customCurricula || [])
  const [openModalAdd, setOpenModalAdd] = useState(false)

  // Form State Tambah Kurikulum Baru
  const [newId, setNewId] = useState('')
  const [newName, setNewName] = useState('')
  const [newCode, setNewCode] = useState('')
  const [newTagline, setNewTagline] = useState('')
  const [newDesc, setNewDesc] = useState('')

  // Gabungkan Built-in + Custom Kurikulum
  const combinedCurricula: CurriculumOption[] = [
    ...BUILTIN_CURRICULA,
    ...allCustom,
  ]

  // Handler Toggle Aktif/Nonaktif (Maksimal 2 Kurikulum Aktif)
  const handleToggleActive = (id: string) => {
    if (selectedActive.includes(id)) {
      if (selectedActive.length <= 1) {
        Swal.fire({
          icon: 'warning',
          title: 'Minimal 1 Kurikulum Aktif',
          text: 'Sekolah wajib memiliki minimal satu kurikulum yang aktif sebagai acuan administrasi guru.',
        })
        return
      }
      setSelectedActive(selectedActive.filter((item) => item !== id))
    } else {
      if (selectedActive.length >= 2) {
        Swal.fire({
          icon: 'warning',
          title: 'Maksimal 2 Kurikulum Aktif',
          text: 'Sesuai standar operasional sekolah di Indonesia, sekolah hanya dapat mengaktifkan maksimal 2 kurikulum secara bersamaan (misal: Kurikulum Merdeka untuk kelas X & K13 untuk kelas XI-XII).',
        })
        return
      }
      setSelectedActive([...selectedActive, id])
    }
  }

  // Handler Simpan Kurikulum Custom Baru
  const handleAddCustom = () => {
    if (!newName.trim() || !newCode.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Lengkapi Data',
        text: 'Silakan isi nama kurikulum dan singkatan/kode kurikulum.',
      })
      return
    }

    const generatedId = newId.trim()
      ? newId.trim().toUpperCase().replace(/\s+/g, '_')
      : `KURIKULUM_${newCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_')}_${Date.now().toString().slice(-4)}`

    // Cek duplikasi
    if (combinedCurricula.some((c) => c.id === generatedId)) {
      Swal.fire({
        icon: 'error',
        title: 'ID / Kode Sudah Digunakan',
        text: 'Silakan gunakan kode kurikulum yang berbeda.',
      })
      return
    }

    const created: CurriculumOption = {
      id: generatedId,
      name: newName.trim(),
      code: newCode.trim().toUpperCase(),
      tagline: newTagline.trim() || 'Modul Kurikulum Baru',
      description: newDesc.trim() || 'Format kurikulum khusus yang disesuaikan kebijakan sekolah.',
      status: 'ACTIVE',
      colorClass: 'border-purple-500/30 bg-purple-500/5 text-purple-700 dark:text-purple-300',
      isCustom: true,
    }

    const updatedCustom = [...allCustom, created]
    setAllCustom(updatedCustom)
    setOpenModalAdd(false)

    // Reset Form
    setNewId('')
    setNewName('')
    setNewCode('')
    setNewTagline('')
    setNewDesc('')

    Swal.fire({
      icon: 'success',
      title: 'Kurikulum Berhasil Ditambahkan',
      text: `Modul kurikulum ${created.name} telah terdaftar dan dapat diaktifkan.`,
      timer: 1500,
      showConfirmButton: false,
    })
  }

  // Handler Hapus Kurikulum Custom
  const handleDeleteCustom = (id: string, name: string) => {
    Swal.fire({
      title: 'Hapus Kurikulum?',
      html: `Apakah Anda yakin ingin menghapus modul kurikulum <strong>${name}</strong>?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
    }).then((res) => {
      if (res.isConfirmed) {
        setAllCustom(allCustom.filter((c) => c.id !== id))
        if (selectedActive.includes(id)) {
          setSelectedActive(selectedActive.filter((item) => item !== id))
        }
      }
    })
  }

  // Simpan Perubahan ke Database
  const handleSaveAll = async () => {
    await onSave(selectedActive, allCustom)
  }

  return (
    <Card className="shadow-xs border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl rounded-2xl overflow-hidden">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-base sm:text-lg">
              <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Sistem Kurikulum SIMASMUH (Waka Kurikulum &amp; Admin)
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400 font-medium text-xs mt-0.5 leading-relaxed">
              Arsitektur kurikulum modular terpadu SIMASMUH: Kurikulum dapat dipilih dan diubah dinamis sesuai kebutuhan sekolah (maksimal 2 aktif bersamaan), serta dapat terus ditambahkan oleh Admin/Superadmin melalui patch update fitur aplikasi kedepannya.
            </CardDescription>
          </div>

          <Button
            size="sm"
            onClick={() => setOpenModalAdd(true)}
            className="h-8.5 gap-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-2xs shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Modul Kurikulum</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-5 sm:p-6 space-y-5">
        {/* Banner Info Batasan 2 Kurikulum Aktif */}
        <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-900 dark:text-blue-200 leading-relaxed space-y-1">
            <p className="font-bold">
              Status Kurikulum Aktif: {selectedActive.length} dari maksimal 2 Kurikulum
            </p>
            <p className="text-blue-700 dark:text-blue-300 text-[11.5px]">
              Guru akan melihat kurikulum yang Anda centang sebagai pilihan lembar kerja di menu <strong>Administrasi Guru</strong>. Kurikulum yang tidak diaktifkan akan disembunyikan agar guru fokus pada kurikulum sekolah saat ini.
            </p>
          </div>
        </div>

        {/* Grid Kartu Kurikulum yang Tersedia */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {combinedCurricula.map((cur) => {
            const isActive = selectedActive.includes(cur.id)
            return (
              <div
                key={cur.id}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                  isActive
                    ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 shadow-2xs'
                    : 'border-slate-200 dark:border-slate-800 bg-card hover:border-slate-300'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-mono font-bold ${
                        isActive
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {cur.code}
                    </Badge>

                    <div className="flex items-center gap-1">
                      {cur.isCustom && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCustom(cur.id, cur.name)}
                          className="p-1 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                          title="Hapus modul kurikulum custom"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <Badge
                        className={`text-[9.5px] font-bold ${
                          isActive
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {isActive ? 'Aktif di Sekolah' : 'Nonaktif'}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-extrabold text-sm text-foreground line-clamp-1" title={cur.name}>
                      {cur.name}
                    </h4>
                    <p className="text-[11px] font-semibold text-primary line-clamp-1 mt-0.5">
                      {cur.tagline}
                    </p>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed" title={cur.description}>
                    {cur.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-border flex items-center justify-between">
                  <span className="text-[10px] font-mono text-muted-foreground">
                    ID: {cur.id}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant={isActive ? 'default' : 'outline'}
                    onClick={() => handleToggleActive(cur.id)}
                    className={`h-7.5 px-3 rounded-lg text-xs font-bold gap-1 ${
                      isActive
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'border-slate-300 dark:border-slate-700 text-foreground'
                    }`}
                  >
                    {isActive ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Diaktifkan</span>
                      </>
                    ) : (
                      <span>Aktifkan</span>
                    )}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>

      <CardFooter className="bg-slate-50/50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800/80 p-5 sm:p-6 flex justify-end">
        <Button
          type="button"
          onClick={handleSaveAll}
          disabled={isSaving}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs px-6 h-9 text-xs"
        >
          {isSaving ? 'Menyimpan...' : 'Simpan Pengaturan Kurikulum'}
        </Button>
      </CardFooter>

      {/* MODAL TAMBAH KURIKULUM CUSTOM BARU */}
      <Dialog open={openModalAdd} onOpenChange={setOpenModalAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Tambah Modul Kurikulum Baru</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Daftarkan kurikulum baru nasional, internasional, atau kurikulum khas yayasan/daerah untuk menghadapi perubahan kurikulum di Indonesia.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs font-semibold">Nama Lengkap Kurikulum *</Label>
              <Input
                placeholder="Contoh: Kurikulum Berbasis Cinta (KBC) / Kurikulum IB"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-8.5 text-xs font-medium mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Kode Singkatan *</Label>
                <Input
                  placeholder="Contoh: KBC / IB / K26"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="h-8.5 text-xs font-mono font-bold uppercase mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">ID Sistem (Opsional)</Label>
                <Input
                  placeholder="KURIKULUM_KBC"
                  value={newId}
                  onChange={(e) => setNewId(e.target.value)}
                  className="h-8.5 text-xs font-mono uppercase mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Tagline Karakteristik</Label>
              <Input
                placeholder="Contoh: Pembelajaran Holistik Berbasis Nilai Cinta & Budaya"
                value={newTagline}
                onChange={(e) => setNewTagline(e.target.value)}
                className="h-8.5 text-xs mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Deskripsi & Ruang Lingkup</Label>
              <Textarea
                placeholder="Rincian pedoman, standar kompetensi, dan capaian kurikulum..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                rows={3}
                className="text-xs mt-1"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpenModalAdd(false)}
              className="h-8 text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleAddCustom}
              className="h-8 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
            >
              Tambahkan Modul
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
