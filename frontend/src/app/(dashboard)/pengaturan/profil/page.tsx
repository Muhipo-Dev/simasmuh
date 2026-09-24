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
  Smartphone, Monitor, Calendar, LogOut, ShieldAlert, Sparkles, LogOut as DisconnectIcon, Trash2, Server, Activity,
  Printer, CreditCard, Download, QrCode
} from 'lucide-react'
import Swal from 'sweetalert2'

import { compressImageFile } from '@/utils/imageCompressor'
import { QRCodeSVG } from 'qrcode.react'

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

  const { data: schoolSettings } = useQuery<any>({
    queryKey: ['public-settings'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/settings/public')
      if (!res.ok) return null
      return res.json()
    }
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
      if (!res.ok) throw new Error('Gagal memutuskan sesi perangkat')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['login-history', userId] })
      queryClient.invalidateQueries({ queryKey: ['unlink-logs', userId] })
      setUnlinkMsg('Sesi perangkat berhasil diputuskan!')
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
      if (!res.ok) throw new Error('Gagal memutuskan seluruh sesi perangkat')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['login-history', userId] })
      queryClient.invalidateQueries({ queryKey: ['unlink-logs', userId] })
      setUnlinkMsg('Seluruh sesi perangkat lain berhasil diputuskan!')
      setTimeout(() => setUnlinkMsg(''), 4000)
    }
  })

  const printStudentCardDirect = () => {
    if (!profile) return
    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    document.body.appendChild(iframe)

    let bio: any = {}
    try {
      bio = typeof profile.student?.bioData === 'string' ? JSON.parse(profile.student.bioData) : profile.student?.bioData
    } catch { bio = {} }

    const tmpt = bio?.tempatLahir || ''
    const tgl = bio?.tglLahir || ''
    const ttlStr = tmpt && tgl ? `${tmpt}, ${tgl}` : tmpt || tgl || '-'
    const alamatStr = form.address || profile.address || '-'
    const genderStr = profile.student?.gender === 'L' ? 'Laki-laki' : profile.student?.gender === 'P' ? 'Perempuan' : profile.student?.gender || '-'
    const avatarUrl = form.avatarUrl || profile.avatarUrl || ''
    const frontBgUrl = schoolSettings?.studentCardTemplateUrl
      ? (schoolSettings.studentCardTemplateUrl.startsWith('/uploads') ? `/api-backend${schoolSettings.studentCardTemplateUrl}` : schoolSettings.studentCardTemplateUrl)
      : '/images/kartu-pelajar-depan.png'
    const studentNis = profile.student?.nis || profile.username || '-'
    const studentNisn = profile.student?.nisn || '[NISN]'
    const qrSvgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 29 29" width="64" height="64"><rect width="29" height="29" fill="#fff" opacity="0"/><path d="M0 0h7v7H0zM2 2h3v3H2zM9 0h2v1H9zM12 0h1v1h-1zM14 0h1v1h-1zM16 0h1v2h1v1h-1v1h2v1h-1v2h-1V6h-1v1h-1V5h1V3h-1V2h-1V1h-1V0h1zM22 0h7v7h-7zM24 2h3v3h-3zM9 2h1v3H9zM11 2h1v2h-1zM14 2h1v1h-1zM0 9h1v1H0zM2 9h1v1H2zM4 9h2v1H4zM7 9h1v3H7v1H6v-1H5v2H4v1H3v-1H1v-1h1v-1H0v-1h2v-1H1V9h1V8h1v1h1V8h1v1h1V8h1v1zM9 9h1v1H9zM11 9h1v2h-1zM13 9h1v1h-1zM18 9h1v2h-1zM20 9h1v2h-1zM22 9h1v1h-1zM25 9h1v2h-1zM27 9h2v2h-2zM10 10h1v2h-1zM14 10h1v1h-1zM16 10h1v1h-1zM22 10h2v1h-2zM9 11h1v1H9zM12 11h2v1h-2zM15 11h1v1h-1zM24 11h1v2h-1zM26 11h1v1h-1zM28 11h1v1h-1zM0 13h1v1H0zM2 13h1v1H2zM9 13h1v1H9zM11 13h1v2h-1zM13 13h1v2h-1zM16 13h2v1h-2zM19 13h1v1h-1zM21 13h1v1h-1zM26 13h1v2h-1zM28 13h1v2h-1zM8 14h1v1H8zM10 14h1v1h-1zM15 14h1v1h-1zM18 14h1v1h-1zM22 14h2v1h-2zM25 14h1v1h-1zM0 15h1v1H0zM3 15h1v1H3zM5 15h2v1H5zM8 15h1v1H8zM14 15h1v2h-1zM17 15h1v1h-1zM20 15h1v2h-1zM23 15h2v1h-2zM1 16h1v1H1zM4 16h1v1H4zM9 16h2v1H9zM12 16h2v1h-2zM16 16h1v1h-1zM18 16h2v1h-2zM22 16h1v1h-1zM27 16h1v1h-1zM0 17h1v1H0zM2 17h2v1H2zM6 17h1v1H6zM8 17h1v1H8zM11 17h1v1h-1zM15 17h1v1h-1zM17 17h1v1h-1zM25 17h1v1h-1zM28 17h1v1h-1zM1 18h1v1H1zM3 18h2v1H3zM7 18h1v1H7zM9 18h2v1H9zM12 18h1v1h-1zM14 18h1v1h-1zM18 18h2v1h-2zM21 18h2v1h-2zM24 18h1v1h-1zM26 18h2v1h-2zM2 19h1v1H2zM5 19h1v1H5zM8 19h1v1H8zM11 19h1v1h-1zM13 19h1v1h-1zM16 19h1v1h-1zM20 19h1v1h-1zM23 19h1v1h-1zM28 19h1v1h-1zM0 20h2v1H0zM3 20h1v1H3zM6 20h1v1H6zM9 20h1v1H9zM12 20h1v1h-1zM14 20h2v1h-2zM17 20h1v1h-1zM19 20h1v1h-1zM21 20h2v1h-2zM24 20h1v1h-1zM27 20h1v1h-1zM0 22h7v7H0zM2 24h3v3H2zM9 22h1v1H9zM12 22h1v1h-1zM14 22h1v1h-1zM16 22h1v2h1v1h-1v1h2v1h-1v2h-1v-2h-1v1h-1v-2h1v-2h-1v-1h-1v-1h-1v-1h1zM9 24h1v3H9zM11 24h1v2h-1zM14 24h1v1h-1zM8 28h1v1H8zM10 28h1v1h-1zM13 28h1v1h-1zM15 28h1v1h-1zM18 28h1v1h-1zM20 28h1v1h-1zM22 28h1v1h-1zM24 28h1v1h-1zM26 28h1v1h-1zM28 28h1v1h-1z" fill="#0f172a"/></svg>`

    const doc = iframe.contentWindow?.document
    if (!doc) return

    doc.open()
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cetak Kartu Pelajar - ${profile.name}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          html, body {
            background: #ffffff !important;
            color: #0f172a !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            width: 100%;
            height: 100%;
            overflow: hidden;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .page-container {
            width: 100%;
            display: flex;
            flex-direction: row;
            justify-content: center;
            align-items: flex-start;
            gap: 15mm;
            padding-top: 25mm;
          }
          .card-item {
            position: relative;
            width: 53.98mm;
            height: 85.6mm;
            border-radius: 3.2mm;
            overflow: hidden;
            border: 0.5px solid #e2e8f0;
            background: #ffffff;
            page-break-inside: avoid;
            break-inside: avoid;
            flex-shrink: 0;
          }
          .card-bg {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            object-fit: fill;
            z-index: 0;
          }
          .card-content {
            position: relative;
            width: 100%;
            height: 100%;
            z-index: 10;
          }
          .photo-box {
            position: absolute;
            left: 15.20%;
            top: 17.32%;
            width: 35.58%;
            height: 33.07%;
            border-radius: 2.2mm;
            overflow: hidden;
            background: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .photo-box img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          .qr-box {
            position: absolute;
            left: 60.5%;
            top: 22.5%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }
          .qr-box svg {
            width: 16mm;
            height: 16mm;
          }
          .qr-text {
            font-size: 5.5pt;
            font-family: monospace;
            font-weight: bold;
            color: #1e293b;
            margin-top: 1mm;
          }
          .student-name {
            position: absolute;
            left: 4%;
            right: 4%;
            top: 51.3%;
            text-align: center;
            font-size: 7.2pt;
            font-weight: 800;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: -0.2px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            line-height: 1;
          }
          .nisn-val {
            position: absolute;
            left: 51.5%;
            top: 50.2%;
            font-size: 6.5pt;
            font-family: monospace;
            font-weight: bold;
            color: #931553;
            letter-spacing: 0.5px;
            line-height: 1;
          }
          .ttl-val {
            position: absolute;
            left: 5.0%;
            top: 67.8%;
            width: 42%;
            font-size: 5.2pt;
            font-weight: bold;
            color: #1e293b;
            line-height: 1.2;
            text-align: left;
          }
          .alamat-val {
            position: absolute;
            left: 50.0%;
            top: 67.8%;
            width: 44%;
            font-size: 5.2pt;
            font-weight: bold;
            color: #1e293b;
            line-height: 1.2;
            text-align: left;
          }
          .nis-val {
            position: absolute;
            left: 5.0%;
            top: 81.8%;
            width: 42%;
            font-size: 5.8pt;
            font-family: monospace;
            font-weight: 900;
            color: #0f172a;
            line-height: 1;
            text-align: left;
          }
          .gender-val {
            position: absolute;
            left: 50.0%;
            top: 81.8%;
            width: 44%;
            font-size: 5.2pt;
            font-weight: bold;
            color: #1e293b;
            line-height: 1;
            text-align: left;
          }
        </style>
      </head>
      <body>
        <div class="page-container">
          <!-- SISI DEPAN -->
          <div class="card-item">
            <img class="card-bg" src="${frontBgUrl}" alt="Kartu Depan" />
            <div class="card-content">
              <div class="photo-box">
                ${avatarUrl ? `<img src="${avatarUrl}" alt="Foto" />` : `<div style="font-size: 5pt; color: #94a3b8; font-weight: bold;">Foto Siswa</div>`}
              </div>
              <div class="qr-box">
                ${qrSvgString}
                <div class="qr-text">${studentNis}</div>
              </div>
              <div class="student-name">${profile.name || '[NAMA LENGKAP]'}</div>
              <div class="nisn-val">${studentNisn}</div>
              <div class="ttl-val">${ttlStr}</div>
              <div class="alamat-val">${alamatStr}</div>
              <div class="nis-val">${studentNis}</div>
              <div class="gender-val">${genderStr}</div>
            </div>
          </div>
          <!-- SISI BELAKANG -->
          <div class="card-item">
            <img class="card-bg" src="/images/kartu-pelajar-belakang.png" alt="Kartu Belakang" />
          </div>
        </div>
      </body>
      </html>
    `)
    doc.close()

    setTimeout(() => {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
      setTimeout(() => {
        document.body.removeChild(iframe)
      }, 1000)
    }, 400)
  }

  const clearAllLogsMutation = useMutation({
    mutationFn: async () => {
      const res = await authenticatedFetch(`/api-backend/users/${userId}/unlink-logs`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Gagal menghapus riwayat pemutusan sesi')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unlink-logs', userId] })
      Swal.fire({
        icon: 'success',
        title: 'Berhasil Dihapus',
        text: 'Semua riwayat pemutusan sesi telah dibersihkan.',
        timer: 2000,
        showConfirmButton: false,
      })
    },
    onError: (err: any) => {
      Swal.fire('Gagal', err.message || 'Gagal menghapus riwayat', 'error')
    }
  })

  const deleteSingleLogMutation = useMutation({
    mutationFn: async (logId: string) => {
      const res = await authenticatedFetch(`/api-backend/users/${userId}/unlink-logs/${logId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Gagal menghapus log riwayat')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unlink-logs', userId] })
    },
    onError: (err: any) => {
      Swal.fire('Gagal', err.message || 'Gagal menghapus catatan', 'error')
    }
  })

  const handleClearAllLogs = () => {
    Swal.fire({
      title: 'Hapus Semua Riwayat?',
      text: 'Seluruh catatan riwayat pemutusan sesi perangkat akan dihapus secara permanen.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus Semua',
      cancelButtonText: 'Batal',
    }).then((result) => {
      if (result.isConfirmed) {
        clearAllLogsMutation.mutate()
      }
    })
  }

  const handleDeleteSingleLog = (logId: string) => {
    Swal.fire({
      title: 'Hapus Log Ini?',
      text: 'Catatan pemutusan sesi ini akan dihapus.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Hapus',
      cancelButtonText: 'Batal',
    }).then((result) => {
      if (result.isConfirmed) {
        deleteSingleLogMutation.mutate(logId)
      }
    })
  }

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
    ADMIN_TU: 'Tata Usaha (Badan Administrasi Umum)', BAU: 'Tata Usaha (Badan Administrasi Umum)', TATA_USAHA: 'Tata Usaha (Badan Administrasi Umum)',
    BK_BP: 'BK/BP', PEMBINA_EXTRA: 'Pembina Ekstrakulikuler', PEMBINA_EKSTRA: 'Pembina Ekstrakulikuler',
    KURIKULUM: 'Kurikulum', KESISWAAN: 'Kesiswaan', KEAMANAN: 'Keamanan', KEPEGAWAIAN: 'Humas & SDM',
    SDM: 'Humas & SDM', WAKA_HUMAS_SDM: 'Humas & SDM', HUMAS_SDM: 'Humas & SDM',
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 dark:bg-slate-900/75 border border-slate-200/80 dark:border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 backdrop-blur-xl shadow-xs">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-1">
            Akun & Identitas Pengguna
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">Profil Saya</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5">Kelola informasi profil, foto identitas, dan preferensi akun Anda.</p>
        </div>
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
                  {profile?.subRole4 && (
                    <span className="inline-block text-sm px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-100 font-medium">
                      {roleLabels[profile?.subRole4] || profile?.subRole4}
                    </span>
                  )}
                  {profile?.subRole5 && (
                    <span className="inline-block text-sm px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100 font-medium">
                      {roleLabels[profile?.subRole5] || profile?.subRole5}
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

      {/* Student-only Card: Modul Edit & Cetak Mandiri Kartu Pelajar */}
      {(role === 'SISWA' || profile?.student) && (
        <div id="kartu-pelajar" className="grid grid-cols-1 xl:grid-cols-12 gap-6 scroll-mt-6">
          {/* Card Kiri: Edit Data Kartu Pelajar */}
          <Card className="xl:col-span-5 border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 rounded-2xl overflow-hidden flex flex-col justify-between">
            <div>
              <CardHeader className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800/80 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100">
                      Data Kartu Pelajar
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Sesuaikan alamat dan unggah pas foto resmi Anda.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                {/* Baris 1: Nama & Jenis Kelamin */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Nama</Label>
                    <Input 
                      value={profile?.name || ''} 
                      disabled 
                      readOnly 
                      className="bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-xs font-medium cursor-not-allowed text-slate-700 dark:text-slate-300 h-9" 
                    />
                    <span className="text-[10px] text-slate-400">Oleh Admin</span>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Jenis Kelamin</Label>
                    <Input 
                      value={profile?.student?.gender === 'L' ? 'Laki-laki' : profile?.student?.gender === 'P' ? 'Perempuan' : profile?.student?.gender || 'Laki-laki'} 
                      disabled 
                      readOnly 
                      className="bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-xs font-medium cursor-not-allowed text-slate-700 dark:text-slate-300 h-9" 
                    />
                    <span className="text-[10px] text-slate-400">Oleh Admin</span>
                  </div>
                </div>

                {/* Baris 2: NIS & NISN */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">NIS (No. Induk)</Label>
                    <Input 
                      value={profile?.student?.nis || profile?.username || ''} 
                      disabled 
                      readOnly 
                      className="bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-xs font-mono font-medium cursor-not-allowed text-slate-700 dark:text-slate-300 h-9" 
                    />
                    <span className="text-[10px] text-slate-400">Oleh Admin</span>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">NISN</Label>
                    <Input 
                      value={profile?.student?.nisn || '-'} 
                      disabled 
                      readOnly 
                      className="bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-xs font-mono font-medium cursor-not-allowed text-slate-700 dark:text-slate-300 h-9" 
                    />
                    <span className="text-[10px] text-slate-400">Oleh Admin</span>
                  </div>
                </div>

                {/* Baris 3: Tempat Lahir & Tanggal Lahir */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Tempat Lahir</Label>
                    <Input 
                      value={(() => {
                        try {
                          const bio = typeof profile?.student?.bioData === 'string' ? JSON.parse(profile?.student?.bioData) : profile?.student?.bioData
                          return bio?.tempatLahir || '-'
                        } catch { return '-' }
                      })()} 
                      disabled 
                      readOnly 
                      className="bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-xs font-medium cursor-not-allowed text-slate-700 dark:text-slate-300 h-9" 
                    />
                    <span className="text-[10px] text-slate-400">Oleh Admin</span>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Tanggal Lahir</Label>
                    <Input 
                      value={(() => {
                        try {
                          const bio = typeof profile?.student?.bioData === 'string' ? JSON.parse(profile?.student?.bioData) : profile?.student?.bioData
                          return bio?.tglLahir || '-'
                        } catch { return '-' }
                      })()} 
                      disabled 
                      readOnly 
                      className="bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-xs font-medium cursor-not-allowed text-slate-700 dark:text-slate-300 h-9" 
                    />
                    <span className="text-[10px] text-slate-400">Oleh Admin</span>
                  </div>
                </div>

                {/* Baris 4: Alamat & Pas Foto */}
                <div className="space-y-3 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>Alamat Domisili</span>
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">Dapat Diubah</span>
                    </Label>
                    <Input 
                      value={form.address} 
                      onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                      placeholder="Contoh: Jl. Diponegoro No. 12, Ponorogo" 
                      className="border-indigo-200 dark:border-indigo-800 focus:border-indigo-500 text-xs h-9 bg-white dark:bg-slate-900" 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>Unggah Pas Foto Resmi</span>
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">Dapat Diupload</span>
                    </Label>
                    <Input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleAvatarChange}
                      className="text-xs h-9 cursor-pointer file:cursor-pointer file:text-xs file:bg-slate-100 file:border-0 file:rounded-md file:mr-2 bg-white dark:bg-slate-900" 
                    />
                  </div>
                </div>
              </CardContent>
            </div>

            <div className="p-5 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                Klik simpan setelah memperbarui foto atau alamat.
              </p>
              <Button 
                type="button"
                onClick={handleSave} 
                disabled={mutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2 rounded-xl shadow-xs shrink-0"
              >
                {mutation.isPending ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Menyimpan...</>
                ) : (
                  'Simpan Perubahan'
                )}
              </Button>
            </div>
          </Card>

          {/* Card Kanan: Cetak Kartu Pelajar Simulator */}
          <Card className="xl:col-span-7 border-slate-200 dark:border-slate-800 shadow-sm bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl overflow-hidden flex flex-col justify-between">
            <CardHeader className="bg-white/5 border-b border-white/10 px-5 py-3.5 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-indigo-400" />
                <CardTitle className="text-sm sm:text-base font-bold text-white">
                  Pratinjau & Cetak Kartu Pelajar
                </CardTitle>
              </div>
              <span className="text-[11px] text-indigo-300 font-mono bg-white/10 px-2.5 py-0.5 rounded-full">
                ISO/IEC 7810 ID-1
              </span>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 flex flex-col items-center justify-center flex-1 space-y-5">
              {/* Composite Card Frame Container */}
              <div className="print-area w-full flex justify-center">
                <style jsx global>{`
                  @media print {
                    @page {
                      size: A4 portrait;
                      margin: 10mm;
                    }
                    html, body {
                      background: #ffffff !important;
                      color: #000000 !important;
                      margin: 0 !important;
                      padding: 0 !important;
                      height: auto !important;
                      min-height: 100% !important;
                    }
                    body * {
                      visibility: hidden !important;
                    }
                    .print-area, .print-area * {
                      visibility: visible !important;
                    }
                    .print-area {
                      position: absolute !important;
                      left: 0 !important;
                      top: 0 !important;
                      right: 0 !important;
                      width: 100% !important;
                      display: flex !important;
                      justify-content: center !important;
                      align-items: flex-start !important;
                      padding-top: 20mm !important;
                      margin: 0 !important;
                      z-index: 999999 !important;
                      -webkit-print-color-adjust: exact !important;
                      print-color-adjust: exact !important;
                      color-adjust: exact !important;
                    }
                    .print-card-row {
                      display: flex !important;
                      flex-direction: row !important;
                      align-items: center !important;
                      justify-content: center !important;
                      gap: 15mm !important;
                      page-break-inside: avoid !important;
                      break-inside: avoid !important;
                    }
                    .print-card-item {
                      width: 53.98mm !important;
                      height: 85.6mm !important;
                      aspect-ratio: 638/1018 !important;
                      border: 1px solid #cbd5e1 !important;
                      border-radius: 3.5mm !important;
                      box-shadow: none !important;
                      overflow: hidden !important;
                      page-break-inside: avoid !important;
                      break-inside: avoid !important;
                      print-color-adjust: exact !important;
                      -webkit-print-color-adjust: exact !important;
                    }
                  }
                `}</style>

                {/* Kartu Preview Area (2 Sisi: Sisi Depan & Sisi Belakang) */}
                <div className="print-card-row flex flex-col md:flex-row items-center justify-center gap-6 sm:gap-8 w-full">
                  {/* SISI DEPAN KARTU (ISO/IEC 7810 ID-1) */}
                  <div className="print-card-item relative w-[250px] sm:w-[270px] aspect-[638/1016] rounded-2xl overflow-hidden shadow-lg border border-slate-200/90 select-none bg-white text-slate-900 flex flex-col justify-between transition-transform duration-300 hover:scale-[1.01] shrink-0">
                    {/* Background Template Kustom Sekolah atau Template Bawaan kartu-pelajar-depan.png */}
                    <img 
                      src={schoolSettings?.studentCardTemplateUrl 
                        ? (schoolSettings.studentCardTemplateUrl.startsWith('/uploads') ? `/api-backend${schoolSettings.studentCardTemplateUrl}` : schoolSettings.studentCardTemplateUrl)
                        : '/images/kartu-pelajar-depan.png'
                      } 
                      alt="Template Kartu Pelajar Depan" 
                      className="absolute inset-0 w-full h-full object-fill z-0 pointer-events-none" 
                    />

                    {/* Layer Elemen Dinamis Sisi Depan */}
                    <div className="relative z-10 w-full h-full pointer-events-none">
                      {/* Foto Siswa (Menempati persis bingkai kotak foto template) */}
                      <div className="absolute left-[15.20%] top-[17.32%] w-[35.58%] h-[33.07%] rounded-xl overflow-hidden flex items-center justify-center bg-white shadow-2xs">
                        {form.avatarUrl ? (
                          <img 
                            src={form.avatarUrl} 
                            alt={profile?.name || 'Foto Siswa'} 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400">
                            <User className="w-8 h-8 opacity-40" />
                            <span className="text-[8px] font-bold mt-1">Foto Siswa</span>
                          </div>
                        )}
                      </div>

                      {/* Barcode QR Code NIS */}
                      <div className="absolute left-[60.5%] top-[22.5%] flex flex-col items-center justify-center">
                        <QRCodeSVG 
                          value={profile?.student?.nis || profile?.username || '13154'} 
                          size={66}
                          level="M"
                          includeMargin={false}
                          bgColor="transparent"
                        />
                        <span className="text-[7.5px] font-mono font-bold text-slate-800 tracking-wider mt-1">
                          {profile?.student?.nis || profile?.username || '-'}
                        </span>
                      </div>

                      {/* Nama Siswa */}
                      <div className="absolute left-[4%] right-[4%] top-[51.3%] text-center">
                        <h3 className="font-extrabold text-[12px] sm:text-[13px] text-slate-900 uppercase tracking-tight line-clamp-1 leading-none">
                          {profile?.name || '[NAMA LENGKAP]'}
                        </h3>
                      </div>

                      {/* Nilai NISN (Sejajar tepat di sebelah tulisan NISN :) */}
                      <div className="absolute left-[51.5%] top-[50.2%] text-left">
                        <span className="font-mono font-bold text-[10.5px] text-[#931553] tracking-wider leading-none">
                          {profile?.student?.nisn || '[NISN]'}
                        </span>
                      </div>

                      {/* Data Grid Kolom Bawah */}
                      {/* TTL (Rata kiri tepat di bawah label TTL) */}
                      <div className="absolute left-[5.0%] top-[67.8%] w-[42%] text-left">
                        <p className="font-bold text-[8.5px] text-slate-800 leading-snug line-clamp-2">
                          {(() => {
                            try {
                              const bio = typeof profile?.student?.bioData === 'string' ? JSON.parse(profile?.student?.bioData) : profile?.student?.bioData
                              const tmpt = bio?.tempatLahir || ''
                              const tgl = bio?.tglLahir || ''
                              if (tmpt && tgl) return `${tmpt}, ${tgl}`
                              if (tmpt) return tmpt
                              if (tgl) return tgl
                              return '-'
                            } catch { return '-' }
                          })()}
                        </p>
                      </div>

                      {/* ALAMAT (Rata kiri tepat di bawah label ALAMAT) */}
                      <div className="absolute left-[50.0%] top-[67.8%] w-[44%] text-left">
                        <p className="font-bold text-[8.5px] text-slate-800 leading-snug line-clamp-2">
                          {form.address || profile?.address || '-'}
                        </p>
                      </div>

                      {/* NO. INDUK (NIS) (Rata kiri tepat di bawah label NO. INDUK) */}
                      <div className="absolute left-[5.0%] top-[81.8%] w-[42%] text-left">
                        <p className="font-black font-mono text-[9.5px] text-slate-900 leading-none">
                          {profile?.student?.nis || profile?.username || '-'}
                        </p>
                      </div>

                      {/* GENDER (Rata kiri tepat di bawah label GENDER) */}
                      <div className="absolute left-[50.0%] top-[81.8%] w-[44%] text-left">
                        <p className="font-bold text-[8.5px] text-slate-800 leading-none">
                          {profile?.student?.gender === 'L' ? 'Laki-laki' : profile?.student?.gender === 'P' ? 'Perempuan' : profile?.student?.gender || '-'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* SISI BELAKANG KARTU (ISO/IEC 7810 ID-1) */}
                  <div className="print-card-item relative w-[250px] sm:w-[270px] aspect-[638/1016] rounded-2xl overflow-hidden shadow-lg border border-slate-200/90 select-none bg-white text-slate-900 flex flex-col justify-between transition-transform duration-300 hover:scale-[1.01] shrink-0">
                    {/* Background Template Sisi Belakang Resmi */}
                    <img 
                      src="/images/kartu-pelajar-belakang.png" 
                      alt="Template Kartu Pelajar Belakang" 
                      className="absolute inset-0 w-full h-full object-fill z-0 pointer-events-none" 
                    />
                  </div>
                </div>
              </div>

              <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-white/10">
                <p className="text-[11px] text-indigo-200/90 text-center sm:text-left">
                  Gunakan browser printer dialog untuk menyimpan sebagai PDF atau cetak langsung.
                </p>

                <Button
                  type="button"
                  onClick={printStudentCardDirect}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-lg cursor-pointer flex items-center gap-2 shrink-0"
                >
                  <CreditCard className="w-4 h-4" />
                  Cetak / Download Kartu
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
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
                <CardTitle className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">Perangkat Login & Riwayat Pemutusan Sesi</CardTitle>
                <CardDescription className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium">
                  Kelola sesi aktif dan pantau riwayat pemutusan / logout perangkat akun Anda
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
                    if (confirm('Apakah Anda yakin ingin mengeluarkan seluruh perangkat lain? Anda akan tetap login di sesi saat ini.')) {
                      unlinkAllMutation.mutate()
                    }
                  }}
                  className="h-8 px-2.5 text-xs flex items-center gap-1.5 shadow-xs rounded-xl"
                >
                  <DisconnectIcon className="w-3.5 h-3.5" />
                  <span>Keluarkan Semua Perangkat</span>
                </Button>
              )}
            </div>
          </div>

          {/* Sub-Tab Switcher: Sesi Aktif vs Riwayat Log Pemutusan */}
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
                    <DisconnectIcon className="w-3.5 h-3.5 text-red-500" />
                    <span>Riwayat Pemutusan Sesi ({logsCount})</span>
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
                    Sistem SIMASMUH menjaga sesi Anda tetap aktif dan aman. Jika perangkat lain diputuskan/dikeluarkan, sistem mencatat audit log dan mengakhiri sesi seketika.
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

                          {/* Tanggal & Tombol Putuskan Perangkat */}
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
                                if (confirm('Keluarkan dan putuskan sesi akun dari perangkat ini?')) {
                                  unlinkMutation.mutate(item.id)
                                }
                              }}
                              className="h-8 px-2.5 text-xs text-red-600 dark:text-red-400 hover:text-white hover:bg-red-600 dark:hover:bg-red-600 rounded-lg transition-colors border border-red-200 dark:border-red-900/60"
                              title="Keluarkan / Putuskan Perangkat"
                            >
                              <DisconnectIcon className="w-3.5 h-3.5 mr-1" />
                              Keluarkan
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
            /* TAB RIWAYAT LOG PEMUTUSAN SESI & AUDIT */
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
                <div className="flex items-center gap-2">
                  <DisconnectIcon className="w-4 h-4 text-red-500" />
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                    Log Riwayat Pemutusan Sesi ({unlinkLogs?.length || 0})
                  </h4>
                </div>
                {unlinkLogs && unlinkLogs.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAllLogs}
                    disabled={clearAllLogsMutation.isPending}
                    className="h-8 px-2.5 text-xs text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-all self-end sm:self-auto gap-1.5 font-semibold"
                  >
                    {clearAllLogsMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    <span>Bersihkan Semua Log</span>
                  </Button>
                )}
              </div>

              {isUnlinkLogsLoading ? (
                <div className="py-6 flex items-center justify-center gap-2 text-slate-400 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memuat riwayat log pemutusan sesi...</span>
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
                        className="p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors text-xs group"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 mt-0.5 border border-red-200 dark:border-red-900/60">
                            <DisconnectIcon className="w-4 h-4" />
                          </div>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 text-[10px] font-bold border border-red-200 dark:border-red-900">
                                {log.action === 'UNLINK_ALL_SESSIONS' ? 'Keluarkan Semua Sesi' : log.action === 'LOGOUT_SESSION' ? 'Sesi Keluar' : 'Sesi Diputuskan'}
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

                        <div className="flex items-center justify-between md:justify-end gap-3 pl-12 md:pl-0">
                          <div className="flex flex-col sm:items-end text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              {fullDate}
                            </span>
                            <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px] flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              Pukul {timeStr} WIB
                            </span>
                          </div>
                          
                          {log.id && (
                            <button
                              type="button"
                              onClick={() => handleDeleteSingleLog(log.id)}
                              disabled={deleteSingleLogMutation.isPending}
                              title="Hapus log riwayat ini"
                              aria-label="Hapus log"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-all opacity-80 md:opacity-0 group-hover:opacity-100 focus:opacity-100"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="py-6 px-4 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 text-xs">
                  Belum ada catatan riwayat pemutusan sesi untuk akun ini.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL SIMULASI WAITING ROOM */}
      {showWaitingRoomDemo && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/90 backdrop-blur-2xl p-3 sm:p-4 md:p-6 text-white overflow-y-auto">
          {/* Animated Background Ambience */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] sm:w-[500px] h-[320px] sm:h-[500px] bg-emerald-500/15 rounded-full blur-[100px] animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-[250px] sm:w-[400px] h-[250px] sm:h-[400px] bg-teal-500/10 rounded-full blur-[90px] animate-pulse delay-700" />
            <div className="absolute top-1/3 left-1/4 w-[200px] sm:w-[350px] h-[200px] sm:h-[350px] bg-indigo-500/10 rounded-full blur-[80px] animate-pulse delay-1000" />
          </div>

          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl sm:rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950/95 p-5 sm:p-7 md:p-8 shadow-2xl shadow-emerald-950/60 backdrop-blur-xl transition-all duration-300">
            {/* Close Button for Demo */}
            <button
              onClick={() => setShowWaitingRoomDemo(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition cursor-pointer z-10"
              title="Tutup Simulasi"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header Badge */}
            <div className="flex items-center justify-between gap-2 mb-4 pr-8">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm shadow-emerald-950">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Simulasi Waiting Room
              </span>
              <span className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                <Server className="w-3 h-3 text-emerald-400" />
                Preview Mode
              </span>
            </div>

            {/* Icon & Title */}
            <div className="text-center mb-5 sm:mb-6">
              <div className="relative mx-auto mb-3 sm:mb-4 flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-400/30 text-emerald-400 shadow-xl shadow-emerald-900/30">
                <ShieldAlert className="h-8 w-8 sm:h-10 sm:w-10 animate-bounce text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.6)]" />
              </div>

              <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-white mb-1.5 bg-gradient-to-r from-white via-emerald-100 to-teal-200 bg-clip-text text-transparent">
                Ruang Tunggu Antrean
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-sm mx-auto leading-relaxed">
                Lalu lintas pengguna saat ini sedang sangat padat. Demi menjaga kestabilan data & keamanan sistem, Anda ditempatkan di antrean virtual.
              </p>
            </div>

            {/* Cards: Position & Wait Time */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 mb-5 sm:mb-6">
              <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-800/40 border border-slate-700/60 p-3 sm:p-4 text-center transition hover:border-emerald-500/50">
                <div className="flex items-center justify-center gap-1.5 text-[11px] sm:text-xs font-medium text-slate-400 mb-1">
                  <User className="w-3.5 h-3.5 text-emerald-400" /> Nomor Antrean
                </div>
                <div className="text-2xl sm:text-3xl md:text-4xl font-black text-emerald-400 tracking-tight drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]">
                  #{demoPosition}
                </div>
                <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">
                  dari 15 antrean simulasi
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-800/40 border border-slate-700/60 p-3 sm:p-4 text-center transition hover:border-amber-500/50">
                <div className="flex items-center justify-center gap-1.5 text-[11px] sm:text-xs font-medium text-slate-400 mb-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" /> Estimasi Waktu
                </div>
                <div className="text-2xl sm:text-3xl md:text-4xl font-black text-amber-300 tracking-tight drop-shadow-[0_0_8px_rgba(252,211,77,0.4)]">
                  ~{demoWait}s
                </div>
                <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">
                  otomatis masuk giliran
                </div>
              </div>
            </div>

            {/* Progress Animation */}
            <div className="space-y-2 mb-5">
              <div className="flex justify-between items-center text-[11px] sm:text-xs text-slate-400">
                <span className="flex items-center gap-1 font-medium text-emerald-400">
                  <Activity className="w-3.5 h-3.5 animate-spin" /> Sedang Mengantre
                </span>
                <span className="font-mono text-emerald-300 font-semibold">{Math.max(15, 100 - demoPosition * 6)}%</span>
              </div>

              <div className="h-2.5 sm:h-3 w-full bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(52,211,153,0.7)]"
                  style={{ width: `${Math.max(15, 100 - demoPosition * 6)}%` }}
                />
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
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
                className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-emerald-950/40 active:scale-95"
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

            <div className="text-[10px] sm:text-[11px] text-slate-400 text-center border-t border-slate-800/80 pt-3">
              🔒 Halaman ini akan otomatis beralih begitu giliran Anda tiba. Mohon tidak menutup tab.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


