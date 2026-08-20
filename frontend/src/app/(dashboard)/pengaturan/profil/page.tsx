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
  Smartphone, Monitor, Calendar, LogOut, Unlink, ShieldAlert, Sparkles
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

function formatIpLocation(ip?: string | null): { label: string; isLocal: boolean; ipFormatted: string } {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') {
    return {
      label: 'Localhost / Server Internal (127.0.0.1)',
      isLocal: true,
      ipFormatted: '127.0.0.1'
    }
  }

  const cleanIp = ip.replace(/^::ffff:/, '').trim()

  // Cek Private IP Networks (RFC 1918):
  // 10.0.0.0 - 10.255.255.255
  // 172.16.0.0 - 172.31.255.255
  // 192.168.0.0 - 192.168.255.255
  const is192 = cleanIp.startsWith('192.168.')
  const is10 = cleanIp.startsWith('10.')
  const is172 = /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(cleanIp)

  if (is192 || is10 || is172) {
    return {
      label: `Jaringan Lokal / WiFi Sekolah (${cleanIp})`,
      isLocal: true,
      ipFormatted: cleanIp
    }
  }

  // Public IP / Internet / Tunnel (Cloudflare Tunnel, Ngrok, Telkomsel, IndiHome, dsb)
  return {
    label: `Akses Publik / Tunnel (${cleanIp})`,
    isLocal: false,
    ipFormatted: cleanIp
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
  const [showWaitingRoomDemo, setShowWaitingRoomDemo] = useState(false)
  const [demoPosition, setDemoPosition] = useState(14)
  const [demoWait, setDemoWait] = useState(25)
  const [sessionTab, setSessionTab] = useState<'active' | 'logs'>('active')

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

  const { data: unlinkLogs, isLoading: isUnlinkLogsLoading, refetch: refetchUnlinkLogs } = useQuery<any[]>({
    queryKey: ['unlink-logs', userId],
    queryFn: async () => {
      if (!userId) return []
      const res = await authenticatedFetch(`/api-backend/users/${userId}/unlink-logs`)
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
      queryClient.invalidateQueries({ queryKey: ['unlink-logs', userId] })
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
      queryClient.invalidateQueries({ queryKey: ['unlink-logs', userId] })
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

      {/* Sesi Login & Pengelolaan Keamanan Perangkat */}
      <Card className="border-slate-200/80 dark:border-slate-800/80 shadow-xs overflow-hidden bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl rounded-2xl">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shadow-xs border border-emerald-200/60 dark:border-emerald-800/40">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">Perangkat Login & Riwayat Log Unlink</CardTitle>
                <CardDescription className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium">
                  Kelola sesi aktif dan pantau riwayat unlink / pemutusan perangkat akun Anda
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowWaitingRoomDemo(true)}
                className="h-8 px-2.5 text-xs flex items-center gap-1.5 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 rounded-xl"
                title="Uji Coba Tampilan Waiting Room"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Simulasi Waiting Room</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  refetchHistory()
                  refetchUnlinkLogs()
                }}
                className="h-8 px-2.5 text-xs flex items-center gap-1.5 rounded-xl border-slate-200 dark:border-slate-800"
                title="Perbarui Data Sesi"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isHistoryLoading || isUnlinkLogsLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>
              {loginHistory && loginHistory.filter(s => s.isActive !== false).length > 1 && (
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={unlinkAllMutation.isPending}
                  onClick={() => {
                    if (confirm('Apakah Anda yakin ingin meng-unlink seluruh perangkat lain? Anda akan tetap login di sesi saat ini.')) {
                      unlinkAllMutation.mutate()
                    }
                  }}
                  className="h-8 px-2.5 text-xs flex items-center gap-1.5 shadow-xs rounded-xl"
                >
                  <Unlink className="w-3.5 h-3.5" />
                  <span>Unlink Semua</span>
                </Button>
              )}
            </div>
          </div>

          {/* Sub-Tab Switcher: Sesi Aktif vs Riwayat Log Unlink */}
          <div className="flex items-center gap-2 pt-3">
            {(() => {
              const activeCount = (loginHistory || []).filter(s => s.isActive !== false).length
              const logsCount = (unlinkLogs || []).length
              return (
                <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setSessionTab('active')}
                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      sessionTab === 'active'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Laptop className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Sesi Aktif ({activeCount})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSessionTab('logs')}
                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      sessionTab === 'logs'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Unlink className="w-3.5 h-3.5 text-red-500" />
                    <span>Riwayat Log Unlink ({logsCount})</span>
                  </button>
                </div>
              )
            })()}
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-5">
          {unlinkMsg && (
            <div className="flex items-center gap-2 p-3.5 bg-green-50 dark:bg-green-950/60 border border-green-200 dark:border-green-900 rounded-xl text-green-700 dark:text-green-300 text-xs font-semibold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600" />
              <span>{unlinkMsg}</span>
            </div>
          )}

          {sessionTab === 'active' ? (
            <>
              {/* Status Sesi Aktif */}
              <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60 flex items-start gap-3.5">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse mt-1 shrink-0" />
                <div className="space-y-1 text-xs sm:text-sm">
                  <p className="font-bold text-emerald-900 dark:text-emerald-200">
                    Sesi Perangkat Ini Aktif (Tidak Logout Otomatis)
                  </p>
                  <p className="text-emerald-700/90 dark:text-emerald-400 text-xs leading-relaxed">
                    Sistem SIMASMUH menjaga sesi Anda tetap aktif dan aman. Jika perangkat lain di-unlink, sistem mencatat audit log dan memutuskan sesi secara seketika.
                  </p>
                </div>
              </div>

              {/* Daftar Perangkat Terhubung */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Laptop className="w-4 h-4 text-slate-500" />
                    <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                      Perangkat Sedang Aktif ({((loginHistory || []).filter(s => s.isActive !== false)).length})
                    </h4>
                  </div>
                </div>

                {isHistoryLoading ? (
                  <div className="py-6 flex items-center justify-center gap-2 text-slate-400 text-xs">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memeriksa perangkat aktif...</span>
                  </div>
                ) : loginHistory && loginHistory.filter(s => s.isActive !== false).length > 0 ? (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
                    {loginHistory.filter(s => s.isActive !== false).map((item, idx) => {
                      const dev = parseDeviceInfo(item.userAgent)
                      const d = new Date(item.createdAt || item.lastActiveAt)
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
                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200 dark:border-emerald-900 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  Aktif
                                </span>
                              </div>
                              {(() => {
                                const ipInfo = formatIpLocation(item.ipAddress)
                                return (
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 pt-0.5">
                                    <MapPin className={`w-3.5 h-3.5 shrink-0 ${ipInfo.isLocal ? 'text-slate-400' : 'text-blue-500'}`} />
                                    <span>Lokasi IP: <strong className="text-slate-700 dark:text-slate-300">{ipInfo.label}</strong></span>
                                  </p>
                                )
                              })()}
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
            </>
          ) : (
            /* TAB RIWAYAT LOG UNLINK & AUDIT */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Unlink className="w-4 h-4 text-red-500" />
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                    Log Pemutusan & Unlink Sesi ({unlinkLogs?.length || 0})
                  </h4>
                </div>
              </div>

              {isUnlinkLogsLoading ? (
                <div className="py-6 flex items-center justify-center gap-2 text-slate-400 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memuat riwayat audit log unlink...</span>
                </div>
              ) : unlinkLogs && unlinkLogs.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
                  {unlinkLogs.map((log: any, idx: number) => {
                    const d = new Date(log.createdAt)
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
                        key={log.id || idx}
                        className="p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors text-xs"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 mt-0.5 border border-red-200 dark:border-red-900/60">
                            <Unlink className="w-4 h-4" />
                          </div>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 text-[10px] font-bold border border-red-200 dark:border-red-900">
                                {log.action === 'UNLINK_ALL_SESSIONS' ? 'Unlink Semua Sesi' : log.action === 'LOGOUT_SESSION' ? 'Sesi Logout' : 'Sesi Di-unlink'}
                              </span>
                              <span className="text-slate-700 dark:text-slate-200 font-semibold text-xs">
                                {log.details?.device || log.details?.os || 'Perangkat Pengguna'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed pt-0.5">
                              {log.message}
                            </p>
                            {(() => {
                              const ipInfo = formatIpLocation(log.ipAddress)
                              return (
                                <p className="text-[10px] text-slate-400 flex items-center gap-1.5 font-mono">
                                  <span>Lokasi IP: {ipInfo.label}</span>
                                </p>
                              )
                            })()}
                          </div>
                        </div>

                        <div className="flex flex-col sm:items-end text-[11px] text-slate-500 dark:text-slate-400 shrink-0 pl-12 md:pl-0">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {fullDate}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px] flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            Pukul {timeStr} WIB
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="py-6 px-4 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 text-xs">
                  Belum ada catatan riwayat unlink untuk akun ini.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL SIMULASI WAITING ROOM */}
      {showWaitingRoomDemo && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/95 backdrop-blur-xl p-4 text-white">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 p-8 shadow-2xl shadow-emerald-950/50 text-center">
            
            {/* Close Button for Demo */}
            <button
              onClick={() => setShowWaitingRoomDemo(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition"
              title="Tutup Simulasi"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Animated Halo Glow */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

            {/* Badge Icon */}
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-inner">
              <ShieldAlert className="h-10 w-10 animate-pulse text-emerald-400" />
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 mb-3">
              <Sparkles className="w-3.5 h-3.5" /> Proteksi Lonjakan Server Aktif
            </span>

            <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
              Ruang Tunggu Antrean
            </h2>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              Lalu lintas pengguna saat ini sedang sangat padat. Demi menjaga kestabilan data & keamanan sistem, Anda ditempatkan di antrean virtual.
            </p>

            {/* Position & Stats Card */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="rounded-2xl bg-slate-800/60 border border-slate-700/50 p-4">
                <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 mb-1">
                  <User className="w-3.5 h-3.5 text-emerald-400" /> Nomor Antrean
                </div>
                <div className="text-3xl font-extrabold text-emerald-400">
                  #{demoPosition}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-800/60 border border-slate-700/50 p-4">
                <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 mb-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" /> Estimasi Waktu
                </div>
                <div className="text-3xl font-extrabold text-amber-300">
                  ~{demoWait}s
                </div>
              </div>
            </div>

            {/* Progress Animation */}
            <div className="space-y-2 mb-5">
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full animate-pulse transition-all duration-300"
                  style={{ width: `${Math.max(15, 100 - demoPosition * 6)}%` }}
                />
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                Memperbarui posisi antrean secara otomatis...
              </div>
            </div>

            {/* Tombol Interaktif Majukan Antrean */}
            <div className="flex gap-2 justify-center mb-4">
              <button
                onClick={() => {
                  setDemoPosition((prev) => (prev > 1 ? prev - 1 : 14))
                  setDemoWait((prev) => (prev > 4 ? prev - 3 : 25))
                }}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Majukan Antrean
              </button>
              <button
                onClick={() => setShowWaitingRoomDemo(false)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Selesai / Tutup
              </button>
            </div>

            <div className="text-[11px] text-slate-500 border-t border-slate-800 pt-3">
              Mohon jangan menutup atau merefresh tab ini agar posisi antrean Anda tidak tereset.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


