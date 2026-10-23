'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  ShieldCheck,
  Plus,
  Trash2,
  Edit3,
  Save,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Loader2,
  UploadCloud,
  CheckCircle2,
  Globe,
  Award,
  Cpu,
  BookOpen,
  Layers,
  ArrowUp,
  ArrowDown
} from 'lucide-react'
import { useAuthenticatedQuery, useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import Swal from 'sweetalert2'
import { compressImageFile } from '@/utils/imageCompressor'

interface PartnerLogoItem {
  id: string
  title: string
  subtitle?: string
  imageUrl: string
  linkUrl?: string
}

const DEFAULT_PARTNER_LOGOS: PartnerLogoItem[] = [
  {
    id: 'logo-muhipo-dikdasmen',
    title: 'SMA Muhammadiyah 1 Ponorogo',
    subtitle: 'Majelis Dikdasmen & PNF',
    imageUrl: '/logos/pic_logo.png',
    linkUrl: 'https://smamuhipo.sch.id'
  },
  {
    id: 'logo-sekolah-penggerak',
    title: 'Sekolah Penggerak',
    subtitle: 'Kemendikbudristek RI',
    imageUrl: '/logos/pic_logo.png',
    linkUrl: ''
  },
  {
    id: 'logo-icas-assessment',
    title: 'ICAS Assessments',
    subtitle: 'International Competitions',
    imageUrl: '/logos/pic_logo.png',
    linkUrl: ''
  },
  {
    id: 'logo-cambridge-associate',
    title: 'Cambridge Assessment',
    subtitle: 'International Education Associate',
    imageUrl: '/logos/pic_logo.png',
    linkUrl: ''
  },
  {
    id: 'logo-iso-certification',
    title: 'ISO 9001:2015',
    subtitle: 'Sistem Manajemen Mutu',
    imageUrl: '/logos/pic_logo.png',
    linkUrl: ''
  }
]

// Tipe data Pilar Keunggulan Sekolah ("Kenapa Harus Bersekolah di SMA Muhipo")
interface WhySchoolFeatureItem {
  id: string
  number: string
  title: string
  description: string
  tag: string
  icon: string
  color: 'blue' | 'amber' | 'emerald' | 'cyan' | 'purple' | 'rose'
}

const DEFAULT_WHY_SCHOOL_FEATURES: WhySchoolFeatureItem[] = [
  {
    id: 'why-1',
    number: '1',
    title: 'Sudah Terakreditasi A',
    description: 'Predikat akreditasi Unggul "A" dari Badan Akreditasi Nasional Sekolah/Madrasah (BAN-S/M) dengan standar mutu pendidikan dan tata kelola teruji secara terstandar.',
    tag: 'Mutu Terjamin & Berkelanjutan',
    icon: 'CheckCircle2',
    color: 'blue'
  },
  {
    id: 'why-2',
    number: '2',
    title: 'Sekolah Unggul Muhammadiyah',
    description: 'Pusat keunggulan pendidikan Islami berkemajuan yang membentuk karakter akhlakul karimah, kepemimpinan Hizbul Wathan, dan tradisi prestasi santri berdaya saing tinggi.',
    tag: 'Karakter Islami Berkemajuan',
    icon: 'Award',
    color: 'amber'
  },
  {
    id: 'why-3',
    number: '3',
    title: 'Kerjasama Nasional & Internasional',
    description: 'Koneksi kemitraan luas dengan perguruan tinggi ternama, lembaga industri, sekolah sahabat luar negeri, dan jaringan muhammadiyah internasional untuk mobilitas siswa.',
    tag: 'Jaringan Terbuka Global',
    icon: 'Globe',
    color: 'emerald'
  },
  {
    id: 'why-4',
    number: '4',
    title: 'Pembelajaran Berbasis ICT',
    description: 'Didukung sistem SIMASMUH, Smart Classroom, CBT terintegrasi, laboratorium komputer modern, serta pembelajaran interaktif yang mempersiapkan siswa era digital.',
    tag: 'Digital Campus & Inovasi',
    icon: 'Cpu',
    color: 'cyan'
  },
  {
    id: 'why-5',
    number: '5',
    title: 'Jumlah Program Siswa & Bakat Minat Lengkap',
    description: 'Tersedia 8 Program Peminatan Siswa serta 4 cabang ekstrakulikuler aktif (Sains, Robotika, Seni Budaya, Olahraga, Keagamaan, Kepanduan HW, Tapak Suci, hingga Jurnalistik) yang mewadahi bakat setiap individu.',
    tag: '8 Program Unggulan • 4 Ekstrakulikuler Aktif',
    icon: 'BookOpen',
    color: 'purple'
  }
]

export default function KeunggulanManagerPage() {
  const queryClient = useQueryClient()
  const authenticatedQuery = useAuthenticatedQuery()
  const authenticatedFetch = useAuthenticatedFetch()

  // Tab: 'pilar' (Pilar Keunggulan) atau 'logos' (Logo Kemitraan)
  const [activeTab, setActiveTab] = useState<'pilar' | 'logos'>('pilar')

  // State Pilar Keunggulan
  const [whyTitle, setWhyTitle] = useState('Kenapa Harus Bersekolah di SMA Muhipo?')
  const [whySubtitle, setWhySubtitle] = useState('SMA Muhammadiyah 1 Ponorogo berkomitmen memberikan lingkungan belajar holistik yang memadukan keunggulan akademik, adab Islam, teknologi masa depan, dan prestasi global.')
  const [features, setFeatures] = useState<WhySchoolFeatureItem[]>(DEFAULT_WHY_SCHOOL_FEATURES)

  // Dialog Pilar Keunggulan
  const [isFeatureDialogOpen, setIsFeatureDialogOpen] = useState(false)
  const [editingFeatureIndex, setEditingFeatureIndex] = useState<number | null>(null)
  const [featureForm, setFeatureForm] = useState<WhySchoolFeatureItem>({
    id: '',
    number: '1',
    title: '',
    description: '',
    tag: '',
    icon: 'Award',
    color: 'blue'
  })

  // State Logo Kemitraan
  const [logos, setLogos] = useState<PartnerLogoItem[]>(DEFAULT_PARTNER_LOGOS)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const [formItem, setFormItem] = useState<PartnerLogoItem>({
    id: '',
    title: '',
    subtitle: '',
    imageUrl: '',
    linkUrl: ''
  })

  // Ambil data settings dari backend
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings-keunggulan-sekolah'],
    queryFn: () => authenticatedQuery('/api-backend/settings')
  })

  useEffect(() => {
    if (settings) {
      // 1. Sinkronisasi Data Teks Judul & Subtitle Keunggulan
      if (settings.whySchoolTitle) setWhyTitle(settings.whySchoolTitle)
      if (settings.whySchoolSubtitle) setWhySubtitle(settings.whySchoolSubtitle)

      // 2. Sinkronisasi Kartu Pilar Keunggulan
      if (settings.whySchoolFeaturesJson) {
        try {
          const parsed = JSON.parse(settings.whySchoolFeaturesJson)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setFeatures(parsed)
          } else {
            setFeatures(DEFAULT_WHY_SCHOOL_FEATURES)
          }
        } catch {
          setFeatures(DEFAULT_WHY_SCHOOL_FEATURES)
        }
      } else {
        setFeatures(DEFAULT_WHY_SCHOOL_FEATURES)
      }

      // 3. Sinkronisasi Logo Kemitraan
      if (settings.partnerLogos) {
        try {
          const parsed = JSON.parse(settings.partnerLogos)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setLogos(parsed)
          } else {
            setLogos(DEFAULT_PARTNER_LOGOS)
          }
        } catch {
          setLogos(DEFAULT_PARTNER_LOGOS)
        }
      } else {
        setLogos(DEFAULT_PARTNER_LOGOS)
      }
    }
  }, [settings])

  // Mutation simpan pengaturan umum
  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await authenticatedFetch('/api-backend/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        throw new Error('Gagal menyimpan data keunggulan sekolah')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-keunggulan-sekolah'] })
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      queryClient.invalidateQueries({ queryKey: ['public-settings'] })
      Swal.fire({
        icon: 'success',
        title: 'Berhasil Disimpan!',
        text: 'Data keunggulan sekolah di halaman beranda berhasil diperbarui secara langsung.',
        confirmButtonColor: '#2563eb'
      })
    },
    onError: (err: any) => {
      Swal.fire('Gagal Menyimpan', err.message || 'Terjadi kesalahan sistem', 'error')
    }
  })

  // Simpan Pilar Keunggulan
  const handleSavePilar = () => {
    saveMutation.mutate({
      whySchoolTitle: whyTitle,
      whySchoolSubtitle: whySubtitle,
      whySchoolFeaturesJson: JSON.stringify(features)
    })
  }

  // Simpan Logo Kemitraan
  const handleSaveAll = () => {
    saveMutation.mutate({
      partnerLogos: JSON.stringify(logos)
    })
  }

  // Reset Pilar ke Bawaan
  const handleResetPilarDefault = () => {
    Swal.fire({
      title: 'Reset Pilar Keunggulan?',
      text: 'Judul dan 5 kartu pilar keunggulan akan dikembalikan ke teks standar default institusi.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Kembalikan Default',
      cancelButtonText: 'Batal'
    }).then((result) => {
      if (result.isConfirmed) {
        setWhyTitle('Kenapa Harus Bersekolah di SMA Muhipo?')
        setWhySubtitle('SMA Muhammadiyah 1 Ponorogo berkomitmen memberikan lingkungan belajar holistik yang memadukan keunggulan akademik, adab Islam, teknologi masa depan, dan prestasi global.')
        setFeatures(DEFAULT_WHY_SCHOOL_FEATURES)
      }
    })
  }

  const handleResetDefault = () => {
    Swal.fire({
      title: 'Reset ke Bawaan?',
      text: 'Semua logo akan dikembalikan ke daftar standar institusi kerja sama & keunggulan.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Reset',
      cancelButtonText: 'Batal'
    }).then((result) => {
      if (result.isConfirmed) {
        setLogos(DEFAULT_PARTNER_LOGOS)
        saveMutation.mutate({
          partnerLogos: JSON.stringify(DEFAULT_PARTNER_LOGOS)
        })
      }
    })
  }

  const handleOpenAddDialog = () => {
    setEditingIndex(null)
    setFormItem({
      id: `logo-${Date.now()}`,
      title: '',
      subtitle: '',
      imageUrl: '/logos/pic_logo.png',
      linkUrl: ''
    })
    setIsDialogOpen(true)
  }

  const handleOpenEditDialog = (index: number) => {
    setEditingIndex(index)
    setFormItem({ ...logos[index] })
    setIsDialogOpen(true)
  }

  const handleDelete = (index: number) => {
    Swal.fire({
      title: 'Hapus Logo?',
      text: `Logo "${logos[index].title}" akan dihapus dari daftar beranda.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    }).then((result) => {
      if (result.isConfirmed) {
        const updated = logos.filter((_, i) => i !== index)
        setLogos(updated)
      }
    })
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formItem.title.trim()) {
      Swal.fire('Perhatian', 'Nama instansi/logo wajib diisi', 'warning')
      return
    }
    if (!formItem.imageUrl.trim()) {
      Swal.fire('Perhatian', 'Gambar logo wajib diunggah atau dipilih', 'warning')
      return
    }

    if (editingIndex !== null) {
      const updated = [...logos]
      updated[editingIndex] = formItem
      setLogos(updated)
    } else {
      setLogos([...logos, formItem])
    }

    setIsDialogOpen(false)
  }

  // Helper upload & kompresi gambar langsung ke folder terpusat 'logos'
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsUploading(true)
      const compressed = await compressImageFile(file, { maxWidth: 500, maxHeight: 500, quality: 0.85 })
      
      // Simpan langsung ke endpoint upload dengan folder 'logos'
      const uploadRes = await authenticatedFetch('/api-backend/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: compressed.dataUrl,
          folder: 'logos'
        })
      })

      if (uploadRes.ok) {
        const data = await uploadRes.json()
        if (data.url) {
          setFormItem(prev => ({ ...prev, imageUrl: data.url }))
          return
        }
      }

      // Fallback ke dataUrl jika endpoint upload offline
      setFormItem(prev => ({ ...prev, imageUrl: compressed.dataUrl }))
    } catch {
      Swal.fire('Error', 'Gagal memproses berkas gambar', 'error')
    } finally {
      setIsUploading(false)
    }
  }

  // Aksi Form Pilar Keunggulan
  const handleOpenAddFeature = () => {
    setEditingFeatureIndex(null)
    setFeatureForm({
      id: `why-${Date.now()}`,
      number: `${features.length + 1}`,
      title: '',
      description: '',
      tag: '',
      icon: 'Award',
      color: 'blue'
    })
    setIsFeatureDialogOpen(true)
  }

  const handleOpenEditFeature = (index: number) => {
    setEditingFeatureIndex(index)
    setFeatureForm({ ...features[index] })
    setIsFeatureDialogOpen(true)
  }

  const handleDeleteFeature = (index: number) => {
    Swal.fire({
      title: 'Hapus Kartu Keunggulan?',
      text: `Poin keunggulan "${features[index].title}" akan dihapus dari beranda.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    }).then((res) => {
      if (res.isConfirmed) {
        setFeatures(features.filter((_, i) => i !== index))
      }
    })
  }

  const handleFeatureSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!featureForm.title.trim()) {
      Swal.fire('Perhatian', 'Judul poin keunggulan wajib diisi', 'warning')
      return
    }
    if (!featureForm.description.trim()) {
      Swal.fire('Perhatian', 'Uraian deskripsi wajib diisi', 'warning')
      return
    }

    if (editingFeatureIndex !== null) {
      const updated = [...features]
      updated[editingFeatureIndex] = featureForm
      setFeatures(updated)
    } else {
      setFeatures([...features, featureForm])
    }
    setIsFeatureDialogOpen(false)
  }

  const moveFeatureUp = (index: number) => {
    if (index === 0) return
    const updated = [...features]
    const temp = updated[index]
    updated[index] = updated[index - 1]
    updated[index - 1] = temp
    setFeatures(updated)
  }

  const moveFeatureDown = (index: number) => {
    if (index === features.length - 1) return
    const updated = [...features]
    const temp = updated[index]
    updated[index] = updated[index + 1]
    updated[index + 1] = temp
    setFeatures(updated)
  }

  const renderIconBadge = (iconName: string, color: string) => {
    let IconComp = Award
    if (iconName === 'CheckCircle2') IconComp = CheckCircle2
    else if (iconName === 'Globe') IconComp = Globe
    else if (iconName === 'Cpu') IconComp = Cpu
    else if (iconName === 'BookOpen') IconComp = BookOpen
    else if (iconName === 'ShieldCheck') IconComp = ShieldCheck

    const colorClasses: Record<string, string> = {
      blue: 'bg-blue-100 text-blue-600 border-blue-200 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-900/50',
      amber: 'bg-amber-100 text-amber-600 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-900/50',
      emerald: 'bg-emerald-100 text-emerald-600 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-900/50',
      cyan: 'bg-cyan-100 text-cyan-600 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-400 dark:border-cyan-900/50',
      purple: 'bg-purple-100 text-purple-600 border-purple-200 dark:bg-purple-950/60 dark:text-purple-400 dark:border-purple-900/50',
      rose: 'bg-rose-100 text-rose-600 border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-900/50',
    }

    return (
      <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${colorClasses[color] || colorClasses.blue}`}>
        <IconComp className="w-5 h-5" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 sm:p-6 md:p-8">
      {/* Header Halaman Utama */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold mb-2 border border-blue-200/80 dark:border-blue-900/60">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            MODUL ADMIN WEB
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Keunggulan Sekolah
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola teks judul, pilar keunggulan utama &quot;Kenapa Harus Bersekolah di Muhipo&quot;, dan logo kemitraan beranda sekolah.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 self-start sm:self-auto">
          <Button
            type="button"
            size="sm"
            variant={activeTab === 'pilar' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('pilar')}
            className={`text-xs font-bold rounded-lg gap-1.5 ${
              activeTab === 'pilar'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Pilar Keunggulan ({features.length})</span>
          </Button>
          <Button
            type="button"
            size="sm"
            variant={activeTab === 'logos' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('logos')}
            className={`text-xs font-bold rounded-lg gap-1.5 ${
              activeTab === 'logos'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Logo Kemitraan ({logos.length})</span>
          </Button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: PILAR KEUNGGULAN SEKOLAH (KENAPA BERSEKOLAH DI MUHIPO) */}
      {/* ======================================================== */}
      {activeTab === 'pilar' && (
        <div className="space-y-6">
          {/* Form Judul & Subtitle Utama */}
          <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Judul &amp; Pengantar Seksi Keunggulan</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Teks tajuk yang tampil di bagian atas seksi Keunggulan Utama Beranda (&quot;Kenapa Harus Bersekolah di SMA Muhipo?&quot;)
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResetPilarDefault}
                    className="text-xs font-bold rounded-xl gap-1.5 border-slate-200 dark:border-slate-700"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Default</span>
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSavePilar}
                    disabled={saveMutation.isPending || isLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs gap-1.5"
                  >
                    {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>Simpan Keunggulan</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="whyTitle" className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Judul Utama Seksi Keunggulan *
                </Label>
                <Input
                  id="whyTitle"
                  value={whyTitle}
                  onChange={(e) => setWhyTitle(e.target.value)}
                  placeholder="Contoh: Kenapa Harus Bersekolah di SMA Muhipo?"
                  className="font-bold text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="whySubtitle" className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Uraian Deskripsi / Subjudul *
                </Label>
                <Textarea
                  id="whySubtitle"
                  value={whySubtitle}
                  onChange={(e) => setWhySubtitle(e.target.value)}
                  rows={3}
                  placeholder="Tuliskan komitmen lingkungan belajar sekolah..."
                  className="text-xs leading-relaxed"
                />
              </div>
            </CardContent>
          </Card>

          {/* Daftar Kartu Keunggulan (Grid Cards) */}
          <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Daftar Kartu Pilar Keunggulan ({features.length} Poin)</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Kartu yang tampil dalam tata letak 3 kolom di halaman depan website.
                  </CardDescription>
                </div>
                <Button
                  onClick={handleOpenAddFeature}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Kartu Baru</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-3">
              {isLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : features.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  Belum ada poin keunggulan. Klik tombol &quot;Tambah Kartu Baru&quot; atau &quot;Reset Default&quot;.
                </div>
              ) : (
                features.map((feat, idx) => (
                  <div
                    key={feat.id || idx}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-2xs hover:border-blue-300 dark:hover:border-blue-700 transition-all"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      {renderIconBadge(feat.icon, feat.color)}
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-slate-900 dark:text-white">
                            {feat.number ? `${feat.number}. ` : ''}{feat.title}
                          </span>
                          {feat.tag && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
                              {feat.tag}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                          {feat.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={idx === 0}
                        onClick={() => moveFeatureUp(idx)}
                        className="h-8 w-8 rounded-lg"
                        title="Pindah ke atas"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={idx === features.length - 1}
                        onClick={() => moveFeatureDown(idx)}
                        className="h-8 w-8 rounded-lg"
                        title="Pindah ke bawah"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEditFeature(idx)}
                        className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg"
                        title="Edit Poin"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteFeature(idx)}
                        className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                        title="Hapus Poin"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: LOGO KEMITRAAN & AKREDITASI                       */}
      {/* ======================================================== */}
      {activeTab === 'logos' && (
      <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs">
        <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Daftar Logo Kemitraan &amp; Akreditasi ({logos.length})</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Ditampilkan ke samping (horizontal flex wrap) di bawah seksi Media Sosial pada Beranda Utama
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetDefault}
                className="text-xs font-bold rounded-xl gap-1.5 border-slate-200 dark:border-slate-700"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Bawaan</span>
              </Button>
              <Button
                type="button"
                onClick={handleOpenAddDialog}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Logo Baru</span>
              </Button>
              <Button
                type="button"
                onClick={handleSaveAll}
                disabled={saveMutation.isPending || isLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs gap-1.5 cursor-pointer"
              >
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Simpan Logo</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="py-12 flex justify-center items-center text-slate-400 text-xs">
              <Loader2 className="w-6 h-6 animate-spin mr-2 text-blue-600" />
              <span>Memuat data logo...</span>
            </div>
          ) : logos.length === 0 ? (
            <div className="text-center py-12 text-slate-400 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
              <ShieldCheck className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs font-semibold">Belum ada logo yang ditambahkan.</p>
              <Button size="sm" variant="outline" onClick={handleOpenAddDialog} className="text-xs">
                Tambahkan Logo Pertama
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              {logos.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/70 hover:border-blue-300 dark:hover:border-blue-800 transition-all shadow-2xs flex flex-col justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                      <img
                        src={item.imageUrl.startsWith('/uploads') ? `/api-backend${item.imageUrl}` : item.imageUrl}
                        alt={item.title}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                        {item.title}
                      </h4>
                      {item.subtitle && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {item.subtitle}
                        </p>
                      )}
                      {item.linkUrl && (
                        <a
                          href={item.linkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 hover:underline truncate mt-0.5"
                        >
                          <span>{item.linkUrl}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-mono text-[10px]">
                      Urutan #{idx + 1}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEditDialog(idx)}
                        className="h-7 w-7 text-slate-600 hover:text-blue-600 rounded-md cursor-pointer"
                        title="Edit Logo"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(idx)}
                        className="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md cursor-pointer"
                        title="Hapus Logo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* Panduan Singkat */}
      <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 flex items-start gap-3 text-xs text-blue-900 dark:text-blue-200">
        <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">Penempatan Otomatis Beranda:</p>
          <p className="text-[11px] leading-relaxed text-blue-800 dark:text-blue-300">
            Perubahan pada judul, subjudul, dan kartu pilar keunggulan &quot;Kenapa Harus Bersekolah di Muhipo&quot; langsung tampil di beranda sekolah, lengkap dengan deretan logo kemitraan.
          </p>
        </div>
      </div>

      {/* Modal Dialog Form Tambah / Edit Pilar Keunggulan */}
      <Dialog open={isFeatureDialogOpen} onOpenChange={setIsFeatureDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
              {editingFeatureIndex !== null ? 'Edit Poin Keunggulan Sekolah' : 'Tambah Poin Keunggulan Baru'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Sesuaikan nomor urut, judul, uraian isi, tag badge, icon, serta tema warna kartu.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleFeatureSubmit} className="space-y-3.5 pt-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="featNumber" className="text-xs font-bold">
                  Nomor Urut *
                </Label>
                <Input
                  id="featNumber"
                  value={featureForm.number}
                  onChange={(e) => setFeatureForm({ ...featureForm, number: e.target.value })}
                  placeholder="1, 2, 3..."
                  className="text-xs h-9"
                  required
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label htmlFor="featTitle" className="text-xs font-bold">
                  Judul Keunggulan *
                </Label>
                <Input
                  id="featTitle"
                  value={featureForm.title}
                  onChange={(e) => setFeatureForm({ ...featureForm, title: e.target.value })}
                  placeholder="Contoh: Sudah Terakreditasi A"
                  className="text-xs h-9"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="featDescription" className="text-xs font-bold">
                Uraian Deskripsi *
              </Label>
              <Textarea
                id="featDescription"
                value={featureForm.description}
                onChange={(e) => setFeatureForm({ ...featureForm, description: e.target.value })}
                placeholder="Jelaskan keunggulan secara lugas dan informatif..."
                rows={3}
                className="text-xs leading-relaxed"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="featTag" className="text-xs font-bold">
                Teks Tag Badge Bawah (Opsional)
              </Label>
              <Input
                id="featTag"
                value={featureForm.tag}
                onChange={(e) => setFeatureForm({ ...featureForm, tag: e.target.value })}
                placeholder="Contoh: Mutu Terjamin & Berkelanjutan"
                className="text-xs h-9"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="featIcon" className="text-xs font-bold">
                  Ikon Representatif
                </Label>
                <select
                  id="featIcon"
                  value={featureForm.icon}
                  onChange={(e) => setFeatureForm({ ...featureForm, icon: e.target.value })}
                  className="w-full h-9 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                >
                  <option value="CheckCircle2">Centang (CheckCircle2)</option>
                  <option value="Award">Penghargaan (Award)</option>
                  <option value="Globe">Dunia / Global (Globe)</option>
                  <option value="Cpu">Teknologi / ICT (Cpu)</option>
                  <option value="BookOpen">Buku / Edukasi (BookOpen)</option>
                  <option value="ShieldCheck">Perisai Mutu (ShieldCheck)</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="featColor" className="text-xs font-bold">
                  Warna Aksen Kartu
                </Label>
                <select
                  id="featColor"
                  value={featureForm.color}
                  onChange={(e) => setFeatureForm({ ...featureForm, color: e.target.value as any })}
                  className="w-full h-9 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                >
                  <option value="blue">Biru (Blue - Akreditasi)</option>
                  <option value="amber">Kuning / Emas (Amber - Muhammadiyah)</option>
                  <option value="emerald">Hijau (Emerald - Global/Kerjasama)</option>
                  <option value="cyan">Cyan (Cyan - ICT/Digital)</option>
                  <option value="purple">Ungu (Purple - Program Lengkap)</option>
                  <option value="rose">Merah Muda (Rose - Khusus)</option>
                </select>
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsFeatureDialogOpen(false)}
                className="text-xs rounded-xl"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl"
              >
                Simpan Kartu
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Dialog Form Tambah / Edit Logo */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
              {editingIndex !== null ? 'Edit Logo Keunggulan / Kemitraan' : 'Tambah Logo Baru'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Masukkan nama, instansi keterangan, tautan, dan unggah berkas logo.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleFormSubmit} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <Label htmlFor="logoTitle" className="text-xs font-bold">
                Nama Logo / Lembaga Mitra <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="logoTitle"
                value={formItem.title}
                onChange={(e) => setFormItem({ ...formItem, title: e.target.value })}
                placeholder="Contoh: Sekolah Penggerak / Cambridge Assessment"
                className="text-xs h-9"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="logoSubtitle" className="text-xs font-bold">
                Keterangan Singkat / Subtitle
              </Label>
              <Input
                id="logoSubtitle"
                value={formItem.subtitle || ''}
                onChange={(e) => setFormItem({ ...formItem, subtitle: e.target.value })}
                placeholder="Contoh: Kemendikbudristek RI / ISO 9001:2015"
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="logoLink" className="text-xs font-bold">
                Tautan Website Lembaga (Opsional)
              </Label>
              <Input
                id="logoLink"
                type="url"
                value={formItem.linkUrl || ''}
                onChange={(e) => setFormItem({ ...formItem, linkUrl: e.target.value })}
                placeholder="https://..."
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1.5 pt-1">
              <Label className="text-xs font-bold">
                Berkas Logo Icon <span className="text-rose-500">*</span>
              </Label>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                  {formItem.imageUrl ? (
                    <img
                      src={formItem.imageUrl.startsWith('/uploads') ? `/api-backend${formItem.imageUrl}` : formItem.imageUrl}
                      alt="Preview"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <UploadCloud className="w-6 h-6 text-slate-300" />
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="text-xs h-8 cursor-pointer"
                    disabled={isUploading}
                  />
                  <p className="text-[10px] text-slate-400">
                    Disarankan format PNG/SVG transparan atau WebP/JPEG (Max: 500x500px).
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsDialogOpen(false)}
                className="text-xs rounded-xl"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isUploading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl"
              >
                Simpan Logo
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
