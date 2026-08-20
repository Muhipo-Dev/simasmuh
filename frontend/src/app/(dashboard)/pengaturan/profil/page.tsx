'use client'

import { useState, useRef, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Camera, Loader2, CheckCircle2, User, MapPin, Mail, Shield, Pencil, X, 
  GraduationCap, Award, Key, Lock, AlertCircle, Laptop, Clock, Globe, ShieldCheck, RefreshCw,
  Smartphone, Monitor, Calendar, LogOut, Unlink
} from 'lucide-react'

import { compressImageFile } from '@/utils/imageCompressor'

const EDUCATION_OPTIONS = ['S3', 'S2', 'S1', 'D4', 'D3', 'D2', 'D1', 'SMA/SMK/MA', 'Lainnya']
const CERTIFICATION_OPTIONS = [
  { value: 'BERSERTIFIKAT', label: 'Sudah Bersertifikasi' },
  { value: 'BELUM_BERSERTIFIKAT', label: 'Belum Bersertifikasi' },
  { value: 'PROSES', label: 'Sedang Proses' },
]

function parseDeviceInfo(ua?: string) {
  if (!ua) return { type: 'desktop', device: 'Perangkat Desktop / Laptop', browser: 'Web Browser' }
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)
  
  let os = 'Windows / PC'
  if (/Windows/i.test(ua)) os = 'Windows'
  else if (/Android/i.test(ua)) os = 'Android'
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS (Apple)'
  else if (/Macintosh|Mac OS/i.test(ua)) os = 'macOS'
  else if (/Linux/i.test(ua)) os = 'Linux'

  let browser = 'Browser'
  if (/Edg/i.test(ua)) browser = 'Microsoft Edge'
  else if (/Chrome/i.test(ua)) browser = 'Google Chrome'
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari'
  else if (/Firefox/i.test(ua)) browser = 'Mozilla Firefox'

  return {
    type: isMobile ? 'mobile' : 'desktop',
    device: `${isMobile ? 'Ponsel / Tablet' : 'Komputer / Laptop'} (${os})`,
    browser: browser
  }
}

export default function ProfilePage() {
  const { data: session } = useSession()
  const userId = (session?.user as any)?.id
  const role = (session?.user as any)?.role
  const isGuru = role === 'GURU' || role === 'PEGAWAI'
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const authenticatedFetch = useAuthenticatedFetch()

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    name: '', address: '', avatarUrl: '', email: '',
    lastEducation: '', certificationStatus: '', certificationYear: ''
  })
  const [successMsg, setSuccessMsg] = useState('')

  const [pwdForm, setPwdForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' })
  const [pwdMsg, setPwdMsg] = useState({ type: '', text: '' })

  const pwdMutation = useMutation({
    mutationFn: async (data: { oldPassword: string; newPassword: string }) => {
      const res = await authenticatedFetch(`/api-backend/users/${userId}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword: data.oldPassword, newPassword: data.newPassword })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.message || 'Gagal mengubah kata sandi')
      }
      return res.json()
    },
    onSuccess: () => {
      setPwdForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
      setPwdMsg({ type: 'success', text: 'Kata sandi berhasil diperbarui dengan aman!' })
      setTimeout(() => setPwdMsg({ type: '', text: '' }), 5000)
    },
    onError: (err: any) => {
      setPwdMsg({ type: 'error', text: err?.message || 'Terjadi kesalahan saat mengubah kata sandi' })
      setTimeout(() => setPwdMsg({ type: '', text: '' }), 5000)
    }
  })

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!pwdForm.oldPassword || !pwdForm.newPassword || !pwdForm.confirmPassword) {
      setPwdMsg({ type: 'error', text: 'Harap isi seluruh bidang kata sandi!' })
      return setTimeout(() => setPwdMsg({ type: '', text: '' }), 4000)
    }
    if (pwdForm.newPassword.length < 5) {
      setPwdMsg({ type: 'error', text: 'Kata sandi baru harus minimal 5 karakter!' })
      return setTimeout(() => setPwdMsg({ type: '', text: '' }), 4000)
    }
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      setPwdMsg({ type: 'error', text: 'Konfirmasi kata sandi baru tidak cocok!' })
      return setTimeout(() => setPwdMsg({ type: '', text: '' }), 4000)
    }
    setPwdMsg({ type: '', text: '' })
    pwdMutation.mutate({ oldPassword: pwdForm.oldPassword, newPassword: pwdForm.newPassword })
  }

  const { data: profile, isLoading } = useQuery<any>({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) return null
      const res = await authenticatedFetch(`/api-backend/users/${userId}/profile`)
      if (!res.ok) return null
      return res.json()
    },
    enabled: !!userId
  })

  const { data: loginHistory, isLoading: isHistoryLoading, refetch: refetchHistory } = useQuery<any[]>({
    queryKey: ['login-history', userId],
    queryFn: async () => {
      if (!userId) return []
      const res = await authenticatedFetch(`/api-backend/users/${userId}/login-history`)
      if (!res.ok) return []
      return res.json()
    },
    enabled: !!userId
  })

  const [unlinkMsg, setUnlinkMsg] = useState('')

  const unlinkMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await authenticatedFetch(`/api-backend/users/${userId}/unlink-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      })
      if (!res.ok) throw new Error('Gagal meng-unlink sesi perangkat')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['login-history', userId] })
      setUnlinkMsg('Sesi perangkat berhasil di-unlink!')
      setTimeout(() => setUnlinkMsg(''), 4000)
    }
  })

  const unlinkAllMutation = useMutation({
    mutationFn: async () => {
      const res = await authenticatedFetch('/api-backend/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })
      if (!res.ok) throw new Error('Gagal meng-unlink seluruh perangkat')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['login-history', userId] })
      setUnlinkMsg('Seluruh sesi perangkat lain berhasil di-unlink!')
      setTimeout(() => setUnlinkMsg(''), 4000)
    }
  })

  useEffect(() => {
    if (profile) {
      // eslint-disable-next-line
      setForm({
        name: profile.name || '',
        email: profile.email || '',
        address: profile.address || '',
        avatarUrl: profile.avatarUrl || '',
        lastEducation: profile.teacherProfile?.lastEducation || '',
        certificationStatus: profile.teacherProfile?.certificationStatus || '',
        certificationYear: profile.teacherProfile?.certificationYear?.toString() || '',
      })
    }
  }, [profile])

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      let avatarUrl = data.avatarUrl;
      if (avatarUrl && avatarUrl.startsWith('data:image')) {
        const uploadRes = await authenticatedFetch('/api-backend/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: avatarUrl, folder: 'profiles' })
        });
        if (!uploadRes.ok) throw new Error('Gagal mengunggah foto profil');
        const uploadData = await uploadRes.json();
        avatarUrl = uploadData.url;
      }

      const res = await authenticatedFetch(`/api-backend/users/${userId}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, avatarUrl })
      })
      if (!res.ok) throw new Error('Gagal memperbarui profil')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', userId] })
      setEditing(false)
      setSuccessMsg('Profil berhasil diperbarui!')
      setTimeout(() => setSuccessMsg(''), 3000)
    }
  })

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const compressed = await compressImageFile(file, { maxWidth: 500, maxHeight: 500, quality: 0.8 })
      setForm(prev => ({ ...prev, avatarUrl: compressed.dataUrl }))
    } catch (err) {
      console.error('Gagal mengompres avatar:', err)
    }
  }

  const handleSave = () => mutation.mutate(form)

  const certLabel = CERTIFICATION_OPTIONS.find(o => o.value === profile?.teacherProfile?.certificationStatus)?.label

  const roleLabels: Record<string, string> = {
    GURU: 'Guru', PEGAWAI: 'Karyawan', SISWA: 'Siswa', ADMIN_IT: 'Admin IT', KEUANGAN: 'Keuangan',
    ADMIN_TU: 'Admin Tata Usaha (BAU)', BAU: 'Badan Administrasi Umum (BAU)', TATA_USAHA: 'Tata Usaha (BAU)',
    BK_BP: 'BK/BP', PEMBINA_EXTRA: 'Pembina Ekstrakulikuler', PEMBINA_EKSTRA: 'Pembina Ekstrakulikuler',
    KURIKULUM: 'Kurikulum', KESISWAAN: 'Kesiswaan', KEAMANAN: 'Keamanan', KEPEGAWAIAN: 'Kepegawaian',
    KEBERSIHAN: 'Kebersihan', KEPALA_SEKOLAH: 'Kepala Sekolah', ADMIN_WEB: 'Admin Web',
    KETERTIBAN: 'Ketertiban', PUSTAKAWAN: 'Pustakawan', GURU_TAHFIDZ: 'Guru Tahfidz', PERSURATAN: 'Persuratan',
    WALI_KELAS: 'Wali Kelas', GURU_PIKET: 'Guru Piket'
  }

  if (isLoading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mr-3" />
        <span className="text-slate-500">Memuat profil...</span>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Profil Saya</h1>
        <p className="text-slate-500 mt-1">Kelola informasi profil dan foto Anda</p>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Main Info Card */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Informasi Profil</CardTitle>
              <CardDescription>Foto, nama lengkap, dan alamat Anda</CardDescription>
            </div>
            {!editing ? (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="w-4 h-4 mr-2" /> Edit
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => {
                setEditing(false)
                if (profile) setForm({
                  name: profile.name, email: profile.email || '', address: profile.address || '',
                  avatarUrl: profile.avatarUrl || '',
                  lastEducation: profile.teacherProfile?.lastEducation || '',
                  certificationStatus: profile.teacherProfile?.certificationStatus || '',
                  certificationYear: profile.teacherProfile?.certificationYear?.toString() || '',
                })
              }}>
                <X className="w-4 h-4 mr-2" /> Batal
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                {form.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.avatarUrl} alt="Foto Profil" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-14 h-14 text-blue-400" />
                )}
              </div>
              {editing && (
                <>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 w-9 h-9 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center shadow-md transition-colors"
                  >
                    <Camera className="w-4 h-4 text-white" />
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </>
              )}
            </div>
            {editing && <p className="text-xs text-slate-500">Klik ikon kamera untuk mengganti foto</p>}


          </div>

          {/* Basic Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-slate-700">
                <User className="w-4 h-4" /> Nama Lengkap
              </Label>
              {editing ? (
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Nama lengkap" className="border-slate-200" />
              ) : (
                <p className="text-slate-900 font-medium bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">{profile?.name || '-'}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-slate-700">
                <MapPin className="w-4 h-4" /> Alamat
              </Label>
              {editing ? (
                <Textarea value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="Alamat lengkap" className="border-slate-200 resize-none" rows={3} />
              ) : (
                <p className="text-slate-900 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100 min-h-[60px]">
                  {profile?.address || <span className="text-slate-400 text-sm">Belum diisi</span>}
                </p>
              )}
            </div>

            {/* Read-only */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div className="space-y-1">
                <Label className="flex items-center gap-2 text-slate-500 text-xs font-normal">
                  <Mail className="w-3.5 h-3.5" /> Email
                </Label>
                {editing ? (
                  <Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="Alamat email" className="border-slate-200 mt-1 h-9" />
                ) : (
                  <p className="text-sm text-slate-700 mt-1.5">{profile?.email || '-'}</p>
                )}
              </div>
              
              <div className="space-y-1">
                <Label className="flex items-center gap-2 text-slate-500 text-xs font-normal">
                  <Key className="w-3.5 h-3.5" /> {role === 'SISWA' ? 'NIS / NISN' : 'NIP / NBM'}
                </Label>
                <p className="text-sm text-slate-700 mt-1.5 font-medium">
                  {role === 'SISWA' 
                    ? `${profile?.student?.nis || '-'} / ${profile?.student?.nisn || '-'}`
                    : profile?.nipNbm || '-'}
                </p>
              </div>

              {role === 'SISWA' && (
                <div className="space-y-1">
                  <Label className="flex items-center gap-2 text-slate-500 text-xs font-normal">
                    <GraduationCap className="w-3.5 h-3.5" /> Kelas
                  </Label>
                  <p className="text-sm text-slate-700 mt-1.5 font-medium">
                    {profile?.student?.class?.name || '-'}
                  </p>
                </div>
              )}

              <div className="space-y-1">
                <Label className="flex items-center gap-2 text-slate-500 text-xs font-normal">
                  <Shield className="w-3.5 h-3.5" /> Peran
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  <span className="inline-block text-sm px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 font-medium">
                    {roleLabels[profile?.role] || profile?.role || '-'}
                  </span>
                  {profile?.subRole && (
                    <span className="inline-block text-sm px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100 font-medium">
                      {roleLabels[profile?.subRole] || profile?.subRole}
                    </span>
                  )}
                  {profile?.subRole2 && (
                    <span className="inline-block text-sm px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 font-medium">
                      {roleLabels[profile?.subRole2] || profile?.subRole2}
                    </span>
                  )}
                  {profile?.subRole3 && (
                    <span className="inline-block text-sm px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100 font-medium">
                      {roleLabels[profile?.subRole3] || profile?.subRole3}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {editing && (
            <div className="pt-2">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSave} disabled={mutation.isPending}>
                {mutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Menyimpan...</> : 'Simpan Perubahan'}
              </Button>
              {mutation.isError && <p className="text-red-500 text-sm text-center mt-2">{(mutation.error as any)?.message}</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Teacher-only Card */}
      {isGuru && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-blue-600" />
                Informasi Kepegawaian
              </CardTitle>
              <CardDescription>Pendidikan terakhir dan sertifikasi guru</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* View mode */}
            {!editing && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Pendidikan Terakhir</p>
                  <p className="font-semibold text-slate-900 text-lg">
                    {profile?.teacherProfile?.lastEducation || <span className="text-slate-400 font-normal text-sm">Belum diisi</span>}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Status Sertifikasi</p>
                  {profile?.teacherProfile?.certificationStatus ? (
                    <span className={`inline-block text-sm px-3 py-1 rounded-full font-medium border ${
                      profile.teacherProfile.certificationStatus === 'BERSERTIFIKAT'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : profile.teacherProfile.certificationStatus === 'PROSES'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}>
                      <Award className="w-3.5 h-3.5 inline mr-1" />
                      {certLabel || profile.teacherProfile.certificationStatus}
                    </span>
                  ) : (
                    <span className="text-slate-400 text-sm">Belum diisi</span>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Tahun Sertifikasi</p>
                  <p className="font-semibold text-slate-900 text-lg">
                    {profile?.teacherProfile?.certificationYear || <span className="text-slate-400 font-normal text-sm">-</span>}
                  </p>
                </div>
              </div>
            )}

            {/* Edit mode */}
            {editing && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-slate-700">
                    <GraduationCap className="w-4 h-4" /> Pendidikan Terakhir
                  </Label>
                  <select
                    value={form.lastEducation}
                    onChange={e => setForm(p => ({ ...p, lastEducation: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Pilih Pendidikan --</option>
                    {EDUCATION_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-slate-700">
                      <Award className="w-4 h-4" /> Status Sertifikasi
                    </Label>
                    <select
                      value={form.certificationStatus}
                      onChange={e => setForm(p => ({ ...p, certificationStatus: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Pilih Status --</option>
                      {CERTIFICATION_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-slate-700">
                      Tahun Sertifikasi
                    </Label>
                    <Input
                      type="number"
                      min="1990"
                      max={new Date().getFullYear()}
                      value={form.certificationYear}
                      onChange={e => setForm(p => ({ ...p, certificationYear: e.target.value }))}
                      placeholder={`cth. ${new Date().getFullYear() - 2}`}
                      className="border-slate-200"
                      disabled={form.certificationStatus === 'BELUM_BERSERTIFIKAT' || !form.certificationStatus}
                    />
                    {(form.certificationStatus === 'BELUM_BERSERTIFIKAT' || !form.certificationStatus) && (
                      <p className="text-xs text-slate-400">Isi setelah memilih status sertifikasi</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Security & Password Card */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/70 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold shadow-sm">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-slate-900">Keamanan & Kata Sandi</CardTitle>
              <CardDescription>Ubah kata sandi akun Anda secara mandiri demi menjaga privasi & keamanan data</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-5">
          {pwdMsg.text && (
            <div className={`flex items-center gap-2.5 p-3.5 rounded-xl text-sm font-medium border ${
              pwdMsg.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              {pwdMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0 text-green-600" /> : <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />}
              <span>{pwdMsg.text}</span>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="oldPassword" className="text-slate-700 font-medium flex items-center gap-2">
                <Key className="w-4 h-4 text-slate-400" /> Kata Sandi Saat Ini (Lama)
              </Label>
              <Input
                id="oldPassword"
                type="password"
                placeholder="Masukkan kata sandi lama untuk otorisasi..."
                value={pwdForm.oldPassword}
                onChange={e => setPwdForm(p => ({ ...p, oldPassword: e.target.value }))}
                className="border-slate-200 focus:border-blue-500 h-10 rounded-lg max-w-md"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-slate-700 font-medium flex items-center gap-2">
                  <Lock className="w-4 h-4 text-slate-400" /> Kata Sandi Baru
                </Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Minimal 5 karakter..."
                  value={pwdForm.newPassword}
                  onChange={e => setPwdForm(p => ({ ...p, newPassword: e.target.value }))}
                  className="border-slate-200 focus:border-blue-500 h-10 rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-slate-700 font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-slate-400" /> Konfirmasi Kata Sandi Baru
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Ketik ulang kata sandi baru..."
                  value={pwdForm.confirmPassword}
                  onChange={e => setPwdForm(p => ({ ...p, confirmPassword: e.target.value }))}
                  className="border-slate-200 focus:border-blue-500 h-10 rounded-lg"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button 
                type="submit" 
                disabled={pwdMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-lg shadow-sm transition-all flex items-center gap-2"
              >
                {pwdMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</> : 'Simpan Kata Sandi Baru'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Sesi Login & Pengelolaan Cache Akun */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-900">
        <CardHeader className="bg-slate-50/70 dark:bg-slate-950/60 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shadow-sm">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">Perangkat Login & Status Sesi Aktif</CardTitle>
                <CardDescription className="text-slate-500 dark:text-slate-400">
                  Kelola dan unlink perangkat yang sedang terhubung ke akun Anda
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchHistory()}
                className="h-8 px-2.5 text-xs flex items-center gap-1.5"
                title="Perbarui Sesi"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isHistoryLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>
              {loginHistory && loginHistory.length > 1 && (
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={unlinkAllMutation.isPending}
                  onClick={() => {
                    if (confirm('Apakah Anda yakin ingin meng-unlink seluruh perangkat lain? Anda akan tetap login di sesi saat ini.')) {
                      unlinkAllMutation.mutate()
                    }
                  }}
                  className="h-8 px-2.5 text-xs flex items-center gap-1.5 shadow-xs"
                >
                  <Unlink className="w-3.5 h-3.5" />
                  <span>Unlink Semua</span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-5">
          {unlinkMsg && (
            <div className="flex items-center gap-2 p-3.5 bg-green-50 dark:bg-green-950/60 border border-green-200 dark:border-green-900 rounded-xl text-green-700 dark:text-green-300 text-xs font-semibold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600" />
              <span>{unlinkMsg}</span>
            </div>
          )}

          {/* Status Sesi Aktif */}
          <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60 flex items-start gap-3.5">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse mt-1 shrink-0" />
            <div className="space-y-1 text-xs sm:text-sm">
              <p className="font-bold text-emerald-900 dark:text-emerald-200">
                Sesi Perangkat Ini Aktif (Tidak Logout Otomatis)
              </p>
              <p className="text-emerald-700/90 dark:text-emerald-400 text-xs leading-relaxed">
                Riwayat sesi hanya menampilkan daftar perangkat yang <strong>sedang aktif login</strong> saat ini. Ketika Anda atau perangkat terkait melakukan logout/unlink, sesi tersebut langsung dihapus dari daftar aktif.
              </p>
            </div>
          </div>

          {/* Daftar Perangkat Terhubung */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Laptop className="w-4 h-4 text-slate-500" />
                <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                  Perangkat Terhubung ({loginHistory?.length || 0})
                </h4>
              </div>
            </div>

            {isHistoryLoading ? (
              <div className="py-6 flex items-center justify-center gap-2 text-slate-400 text-xs">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memeriksa perangkat aktif...</span>
              </div>
            ) : loginHistory && loginHistory.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
                {loginHistory.map((item, idx) => {
                  const dev = parseDeviceInfo(item.userAgent)
                  const d = new Date(item.createdAt)
                  const fullDate = d.toLocaleDateString('id-ID', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })
                  const timeStr = d.toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })

                  return (
                    <div
                      key={item.id || idx}
                      className="p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors text-xs"
                    >
                      {/* Perangkat & Browser */}
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          dev.type === 'mobile' 
                            ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400' 
                            : 'bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400'
                        }`}>
                          {dev.type === 'mobile' ? <Smartphone className="w-4.5 h-4.5" /> : <Monitor className="w-4.5 h-4.5" />}
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm">
                              {item.device || dev.device}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-semibold border border-slate-200/60 dark:border-slate-700">
                              {item.browser || dev.browser}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 pt-0.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>Lokasi Akses: <strong className="text-slate-700 dark:text-slate-300">{item.ipAddress === '127.0.0.1' || item.ipAddress === '::1' ? 'Jaringan Internal / Lokal Sekolah' : item.ipAddress || 'Jaringan Terdaftar'}</strong></span>
                          </p>
                        </div>
                      </div>

                      {/* Tanggal & Tombol Unlink */}
                      <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pl-12 md:pl-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800/60">
                        <div className="flex flex-col sm:items-end text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            {fullDate}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px] flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            Pukul {timeStr} WIB
                          </span>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={unlinkMutation.isPending}
                          onClick={() => {
                            if (confirm('Keluarkan (unlink) akun dari perangkat ini?')) {
                              unlinkMutation.mutate(item.id)
                            }
                          }}
                          className="h-8 px-2.5 text-xs text-red-600 dark:text-red-400 hover:text-white hover:bg-red-600 dark:hover:bg-red-600 rounded-lg transition-colors border border-red-200 dark:border-red-900/60"
                          title="Unlink / Logout Perangkat"
                        >
                          <Unlink className="w-3.5 h-3.5 mr-1" />
                          Unlink
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="py-6 px-4 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 text-xs">
                Tidak ada sesi perangkat lain yang sedang aktif.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


