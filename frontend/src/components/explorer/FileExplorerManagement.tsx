'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { 
  Folder, FolderPlus, Upload, RefreshCw, Search, Grid, List, 
  Eye, Download, Trash2, Edit3, ArrowLeft, ArrowRight, ArrowUp, ChevronRight, 
  FileText, Image as ImageIcon, FileSpreadsheet, File, ShieldCheck, 
  Camera, CheckCircle2, AlertCircle, HardDrive, UserCheck, Layers, 
  Sparkles, Link2, ExternalLink, X, Plus, Clock, FileCheck, Users,
  BookOpen, Inbox, Send, Archive, Receipt, Wallet, Banknote,
  LayoutGrid, Table2, Info, Monitor, Star, Pin, CornerUpLeft,
  ChevronDown, Copy, Check, Filter, SlidersHorizontal, Sparkle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Swal from 'sweetalert2'

export interface StorageItem {
  name: string
  relativePath: string
  url: string
  isDirectory: boolean
  size: number
  sizeFormatted: string
  extension: string
  mimeType: string
  previewType: 'image' | 'pdf' | 'doc' | 'sheet' | 'other' | 'folder'
  modifiedAt: string
  itemCount?: number
}

export interface BreadcrumbItem {
  name: string
  path: string
}

export interface StorageStats {
  storageRoot: string
  totalSize: number
  totalSizeFormatted: string
  totalFiles: number
  totalFolders: number
  categories: Array<{
    name: string
    label: string
    path: string
    fileCount: number
    size: number
    sizeFormatted: string
    color: string
  }>
}

interface FileExplorerProps {
  initialPath?: string
  forcedTitle?: string
}

export function FileExplorerManagement({ initialPath = '', forcedTitle }: FileExplorerProps) {
  const queryClient = useQueryClient()
  const authenticatedFetch = useAuthenticatedFetch()

  // Navigation History State (Windows 11 Back / Forward)
  const [currentPath, setCurrentPath] = useState<string>(initialPath)
  const [history, setHistory] = useState<string[]>([initialPath])
  const [historyIndex, setHistoryIndex] = useState<number>(0)

  // Filter & View State
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [fileTypeFilter, setFileTypeFilter] = useState<string>('ALL')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [selectedItem, setSelectedItem] = useState<StorageItem | null>(null)
  const [showDetailsPane, setShowDetailsPane] = useState<boolean>(true)

  // Modals State
  const [isMkdirOpen, setIsMkdirOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [uploadFilesQueue, setUploadFilesQueue] = useState<Array<{ name: string; base64: string; size: string; type: string; previewUrl?: string }>>([])
  const [isUploading, setIsUploading] = useState(false)

  const [isRenameOpen, setIsRenameOpen] = useState(false)
  const [renamingItem, setRenamingItem] = useState<StorageItem | null>(null)
  const [newItemName, setNewItemName] = useState('')

  // Preview State
  const [previewItem, setPreviewItem] = useState<StorageItem | null>(null)

  // Linking State: Siswa / Profile Photo
  const [isLinkStudentOpen, setIsLinkStudentOpen] = useState(false)
  const [linkingFile, setLinkingFile] = useState<StorageItem | null>(null)
  const [studentSearch, setStudentSearch] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState('')

  // Linking State: Surat TU
  const [isLinkSuratOpen, setIsLinkSuratOpen] = useState(false)
  const [linkingSuratFile, setLinkingSuratFile] = useState<StorageItem | null>(null)
  const [suratSearch, setSuratSearch] = useState('')
  const [selectedSuratType, setSelectedSuratType] = useState<'MASUK' | 'KELUAR'>('MASUK')
  const [selectedSuratId, setSelectedSuratId] = useState('')

  // Linking State: Keuangan Payment Proof
  const [isLinkPaymentOpen, setIsLinkPaymentOpen] = useState(false)
  const [linkingPaymentFile, setLinkingPaymentFile] = useState<StorageItem | null>(null)
  const [tagihanSearch, setTagihanSearch] = useState('')
  const [selectedTagihanId, setSelectedTagihanId] = useState('')
  const [paymentAmount, setPaymentAmount] = useState<string>('')
  const [paymentNotes, setPaymentNotes] = useState('')

  // Backup & Restore State
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false)
  const [backupNotes, setBackupNotes] = useState('')
  const [isCreatingBackup, setIsCreatingBackup] = useState(false)

  // Confidential System Reset State (Multi-Factor Security)
  const [isResetModalOpen, setIsResetModalOpen] = useState(false)
  const [resetStep, setResetStep] = useState<1 | 2>(1)
  const [resetSuperadminPassword, setResetSuperadminPassword] = useState('')
  const [resetChallengePin, setResetChallengePin] = useState('')
  const [inputChallengePin, setInputChallengePin] = useState('')
  const [resetConfirmPhrase, setResetConfirmPhrase] = useState('')
  const [resetOption, setResetOption] = useState<'TRANSACTIONAL_ONLY' | 'ALL_STUDENTS_AND_DATA'>('TRANSACTIONAL_ONLY')
  const [isRequestingReset, setIsRequestingReset] = useState(false)
  const [isExecutingReset, setIsExecutingReset] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Navigate helper with history tracking
  const navigateTo = (path: string) => {
    const cleanPath = path.replace(/^\/+|\/+$/g, '')
    if (cleanPath === currentPath) return

    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(cleanPath)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
    setCurrentPath(cleanPath)
    setSelectedItem(null)
  }

  const handleGoBack = () => {
    if (historyIndex > 0) {
      const prevIdx = historyIndex - 1
      setHistoryIndex(prevIdx)
      setCurrentPath(history[prevIdx])
      setSelectedItem(null)
    }
  }

  const handleGoForward = () => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1
      setHistoryIndex(nextIdx)
      setCurrentPath(history[nextIdx])
      setSelectedItem(null)
    }
  }

  const handleGoUp = () => {
    if (!currentPath) return
    const parts = currentPath.split('/')
    parts.pop()
    navigateTo(parts.join('/'))
  }

  // Sync initialPath if changed from props
  useEffect(() => {
    if (initialPath !== undefined && initialPath !== currentPath) {
      navigateTo(initialPath)
    }
  }, [initialPath])

  // 1. Query: List Directory Contents
  const { data: explorerData, isLoading: isLoadingContents, refetch: refetchContents } = useQuery({
    queryKey: ['storage-explorer-list', currentPath, searchQuery, fileTypeFilter],
    queryFn: async () => {
      const queryParams = new URLSearchParams()
      if (currentPath) queryParams.set('path', currentPath)
      if (searchQuery) queryParams.set('search', searchQuery)
      if (fileTypeFilter !== 'ALL') queryParams.set('type', fileTypeFilter)
      
      const res = await authenticatedFetch(`/api-backend/storage-explorer/list?${queryParams.toString()}`)
      if (!res.ok) throw new Error('Gagal mengambil daftar file & folder')
      return res.json()
    },
    staleTime: 5000,
  })

  // 2. Query: Storage Stats
  const { data: statsData, refetch: refetchStats } = useQuery<StorageStats>({
    queryKey: ['storage-explorer-stats'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/storage-explorer/stats')
      if (!res.ok) throw new Error('Gagal mengambil statistik penyimpanan')
      return res.json()
    },
    staleTime: 15000,
  })

  // 3. Query: Students Picker for Linking
  const { data: studentsList = [] } = useQuery<any[]>({
    queryKey: ['storage-explorer-students', studentSearch],
    queryFn: async () => {
      const q = studentSearch ? `?search=${encodeURIComponent(studentSearch)}` : ''
      const res = await authenticatedFetch(`/api-backend/students/list${q}`)
      if (!res.ok) return []
      const json = await res.json()
      return Array.isArray(json) ? json : json.data || []
    },
    enabled: isLinkStudentOpen,
  })

  // 4. Query: Surat TU Picker for Linking
  const { data: suratData = { suratMasuk: [], suratKeluar: [] } } = useQuery<any>({
    queryKey: ['storage-explorer-surat', suratSearch],
    queryFn: async () => {
      const q = suratSearch ? `?search=${encodeURIComponent(suratSearch)}` : ''
      const res = await authenticatedFetch(`/api-backend/storage-explorer/surat-list${q}`)
      if (!res.ok) return { suratMasuk: [], suratKeluar: [] }
      return res.json()
    },
    enabled: isLinkSuratOpen,
  })

  // 5. Query: Tagihan Siswa Picker for Linking Bukti Pembayaran
  const { data: tagihanList = [] } = useQuery<any[]>({
    queryKey: ['storage-explorer-tagihan', tagihanSearch],
    queryFn: async () => {
      const q = tagihanSearch ? `?search=${encodeURIComponent(tagihanSearch)}` : ''
      const res = await authenticatedFetch(`/api-backend/storage-explorer/tagihan-list${q}`)
      if (!res.ok) return []
      return res.json()
    },
    enabled: isLinkPaymentOpen,
  })

  // 6. Query: Backups List
  const { data: backupsList = [], refetch: refetchBackups } = useQuery<any[]>({
    queryKey: ['storage-explorer-backups'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/storage-explorer/backups')
      if (!res.ok) return []
      return res.json()
    },
    staleTime: 10000,
  })

  // Quick Access Sidebar Folders
  const quickAccessItems = [
    { name: 'Root Server', path: '', icon: HardDrive, color: 'text-slate-600 dark:text-slate-300' },
    { name: 'Arsip Backup Data', path: 'backups', icon: Database, color: 'text-rose-500' },
    { name: 'Bukti Pembayaran', path: 'payment-proofs', icon: Receipt, color: 'text-orange-500' },
    { name: 'Foto Profil & AI', path: 'profiles', icon: Camera, color: 'text-blue-500' },
    { name: 'Berkas Siswa', path: 'students', icon: Users, color: 'text-indigo-500' },
    { name: 'E-Arsip Sekolah', path: 'arsip', icon: Archive, color: 'text-amber-500' },
    { name: 'Surat Masuk', path: 'surat-masuk', icon: Inbox, color: 'text-emerald-500' },
    { name: 'Surat Keluar', path: 'surat-keluar', icon: Send, color: 'text-teal-500' },
    { name: 'Kepegawaian SDM', path: 'sdm_docs', icon: UserCheck, color: 'text-sky-500' },
    { name: 'Banner Carousel', path: 'carousel', icon: ImageIcon, color: 'text-purple-500' },
  ]

  // Handle Synchronize FaceNet AI
  const handleSyncFaceNetAi = async () => {
    try {
      Swal.fire({
        title: 'Sinkronisasi FaceNet AI',
        text: 'Memproses vektor biometrik seluruh foto dari direktori server...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      })

      const res = await authenticatedFetch('/api-backend/storage-explorer/sync-facenet', {
        method: 'POST',
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Gagal sinkronisasi FaceNet AI')

      Swal.fire({
        icon: 'success',
        title: 'Sinkronisasi Berhasil',
        text: data.message,
        confirmButtonColor: '#2563eb',
      })
    } catch (err: any) {
      Swal.fire('Error', err?.message || 'Gagal sinkronisasi FaceNet AI.', 'error')
    }
  }

  // Handle Create Folder
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFolderName.trim()) return

    try {
      const res = await authenticatedFetch('/api-backend/storage-explorer/mkdir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: currentPath,
          folderName: newFolderName.trim(),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Gagal membuat folder')

      setIsMkdirOpen(false)
      setNewFolderName('')
      refetchContents()
      refetchStats()
    } catch (err: any) {
      Swal.fire('Error', err?.message || 'Gagal membuat folder baru.', 'error')
    }
  }

  // Handle Files Selected for Upload
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const newQueue: Array<{ name: string; base64: string; size: string; type: string; previewUrl?: string }> = []
    
    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = reader.result as string
        const isImg = file.type.startsWith('image/')
        newQueue.push({
          name: file.name,
          base64,
          size: `${(file.size / 1024).toFixed(1)} KB`,
          type: file.type || 'application/octet-stream',
          previewUrl: isImg ? base64 : undefined,
        })

        if (newQueue.length === files.length) {
          setUploadFilesQueue((prev) => [...prev, ...newQueue])
        }
      }
      reader.readAsDataURL(file)
    })

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Handle Execute Upload
  const handleExecuteUpload = async () => {
    if (uploadFilesQueue.length === 0) return

    try {
      setIsUploading(true)
      const res = await authenticatedFetch('/api-backend/storage-explorer/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: currentPath,
          files: uploadFilesQueue.map((f) => ({
            name: f.name,
            base64: f.base64,
          })),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Gagal mengunggah berkas')

      setIsUploadOpen(false)
      setUploadFilesQueue([])
      refetchContents()
      refetchStats()

      Swal.fire({
        icon: 'success',
        title: 'Berhasil Diunggah',
        text: data.message,
        confirmButtonColor: '#2563eb',
      })
    } catch (err: any) {
      Swal.fire('Error', err?.message || 'Gagal mengunggah berkas ke server.', 'error')
    } finally {
      setIsUploading(false)
    }
  }

  // Handle Rename Item
  const handleExecuteRename = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!renamingItem || !newItemName.trim()) return

    try {
      const res = await authenticatedFetch('/api-backend/storage-explorer/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldPath: renamingItem.relativePath,
          newName: newItemName.trim(),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Gagal mengubah nama')

      setIsRenameOpen(false)
      setRenamingItem(null)
      setNewItemName('')
      refetchContents()
    } catch (err: any) {
      Swal.fire('Error', err?.message || 'Gagal mengganti nama berkas/folder.', 'error')
    }
  }

  // Handle Delete Item
  const handleDelete = async (item: StorageItem) => {
    const isFolder = item.isDirectory
    const confirm = await Swal.fire({
      title: isFolder ? 'Hapus Folder?' : 'Hapus Berkas?',
      text: `Apakah Anda yakin ingin menghapus "${item.name}" secara permanen dari penyimpanan server?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus Permanen',
      cancelButtonText: 'Batal',
    })

    if (!confirm.isConfirmed) return

    try {
      const res = await authenticatedFetch('/api-backend/storage-explorer/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: item.relativePath,
          isRecursive: true,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Gagal menghapus item')

      if (selectedItem?.relativePath === item.relativePath) {
        setSelectedItem(null)
      }

      refetchContents()
      refetchStats()
    } catch (err: any) {
      Swal.fire('Error', err?.message || 'Gagal menghapus item dari server.', 'error')
    }
  }

  // Handle Link Photo to Student Profile
  const handleExecuteLinkStudent = async () => {
    if (!linkingFile || !selectedStudentId) {
      Swal.fire('Peringatan', 'Pilih siswa terlebih dahulu.', 'warning')
      return
    }

    try {
      const res = await authenticatedFetch('/api-backend/storage-explorer/link-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudentId,
          fileRelPath: linkingFile.relativePath,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Gagal menautkan foto')

      Swal.fire({
        icon: 'success',
        title: 'Foto Profil Tertaut',
        text: data.message,
        confirmButtonColor: '#2563eb',
      })

      setIsLinkStudentOpen(false)
      setLinkingFile(null)
      setSelectedStudentId('')
      refetchContents()
    } catch (err: any) {
      Swal.fire('Error', err?.message || 'Gagal menautkan foto ke profil siswa.', 'error')
    }
  }

  // Handle Link Document to Surat TU
  const handleExecuteLinkSurat = async () => {
    if (!linkingSuratFile || !selectedSuratId) {
      Swal.fire('Peringatan', 'Pilih surat target terlebih dahulu.', 'warning')
      return
    }

    try {
      const res = await authenticatedFetch('/api-backend/storage-explorer/link-surat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suratId: selectedSuratId,
          suratType: selectedSuratType,
          fileRelPath: linkingSuratFile.relativePath,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Gagal menautkan dokumen')

      Swal.fire({
        icon: 'success',
        title: 'E-Arsip Berhasil Ditautkan',
        text: data.message,
        confirmButtonColor: '#2563eb',
      })

      setIsLinkSuratOpen(false)
      setLinkingSuratFile(null)
      setSelectedSuratId('')
    } catch (err: any) {
      Swal.fire('Error', err?.message || 'Gagal menautkan dokumen ke data surat TU.', 'error')
    }
  }

  // Handle Link Payment Proof to Student Tagihan
  const handleExecuteLinkPayment = async () => {
    if (!linkingPaymentFile || !selectedTagihanId) {
      Swal.fire('Peringatan', 'Pilih tagihan siswa target terlebih dahulu.', 'warning')
      return
    }

    try {
      const res = await authenticatedFetch('/api-backend/storage-explorer/link-payment-proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tagihanId: selectedTagihanId,
          fileRelPath: linkingPaymentFile.relativePath,
          amount: paymentAmount ? Number(paymentAmount) : undefined,
          notes: paymentNotes || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Gagal menautkan bukti pembayaran')

      Swal.fire({
        icon: 'success',
        title: 'Bukti Pembayaran Tertaut',
        text: data.message,
        confirmButtonColor: '#2563eb',
      })

      setIsLinkPaymentOpen(false)
      setLinkingPaymentFile(null)
      setSelectedTagihanId('')
      setPaymentAmount('')
      setPaymentNotes('')
    } catch (err: any) {
      Swal.fire('Error', err?.message || 'Gagal menautkan bukti pembayaran ke tagihan siswa.', 'error')
    }
  }

  // Handle Create Backup
  const handleCreateBackup = async () => {
    try {
      setIsCreatingBackup(true)
      const res = await authenticatedFetch('/api-backend/storage-explorer/create-backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: backupNotes }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Gagal membuat backup')

      Swal.fire({
        icon: 'success',
        title: 'Backup Berhasil Dibuat',
        html: `<p class="text-xs text-slate-600">${data.message}</p><p class="text-xs font-mono font-bold mt-2 text-blue-600">${data.fileName} (${data.sizeFormatted})</p>`,
        confirmButtonColor: '#2563eb',
      })

      setIsBackupModalOpen(false)
      setBackupNotes('')
      refetchBackups()
      refetchContents()
      refetchStats()
    } catch (err: any) {
      Swal.fire('Error', err?.message || 'Gagal membuat backup sistem.', 'error')
    } finally {
      setIsCreatingBackup(false)
    }
  }

  // Handle Step 1: Request Reset Challenge
  const handleRequestResetChallenge = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetSuperadminPassword) {
      Swal.fire('Peringatan', 'Masukkan password akun Superadmin Anda.', 'warning')
      return
    }

    try {
      setIsRequestingReset(true)
      const res = await authenticatedFetch('/api-backend/storage-explorer/reset-challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: resetSuperadminPassword }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Otorisasi gagal')

      setResetChallengePin(data.challengeCode)
      setResetStep(2)
      setResetSuperadminPassword('')
    } catch (err: any) {
      Swal.fire('Otorisasi Ditolak', err?.message || 'Password salah atau Anda bukan Superadmin.', 'error')
    } finally {
      setIsRequestingReset(false)
    }
  }

  // Handle Step 2: Execute Confidential Reset
  const handleExecuteSystemReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (resetConfirmPhrase !== 'SAYA YAKIN RESET DATA SIMASMUH') {
      Swal.fire('Peringatan', 'Ketik tepat frasa konfirmasi: "SAYA YAKIN RESET DATA SIMASMUH"', 'warning')
      return
    }

    if (inputChallengePin !== resetChallengePin) {
      Swal.fire('Peringatan', 'PIN Otorisasi Rahasia tidak cocok.', 'warning')
      return
    }

    const confirm = await Swal.fire({
      title: '🚨 PERINGATAN TERAKHIR!',
      html: `
        <div class="text-xs text-left text-rose-700 bg-rose-50 p-3 rounded-lg border border-rose-200">
          <p class="font-bold mb-1">Tindakan ini akan membersihkan data operasional dan tidak dapat dibatalkan!</p>
          <p>Sistem akan otomatis menyimpan 1 snapshot backup darurat sebelum pembersihan dimulai.</p>
        </div>
      `,
      icon: 'error',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'EKSEKUSI RESET SEKARANG',
      cancelButtonText: 'Batal',
    })

    if (!confirm.isConfirmed) return

    try {
      setIsExecutingReset(true)
      const res = await authenticatedFetch('/api-backend/storage-explorer/execute-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeCode: inputChallengePin,
          confirmPhrase: resetConfirmPhrase,
          resetOption,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Gagal mengeksekusi reset sistem')

      Swal.fire({
        icon: 'success',
        title: 'System Reset Selesai',
        text: data.message,
        confirmButtonColor: '#2563eb',
      })

      setIsResetModalOpen(false)
      setResetStep(1)
      setInputChallengePin('')
      setResetChallengePin('')
      setResetConfirmPhrase('')
      refetchContents()
      refetchStats()
      refetchBackups()
    } catch (err: any) {
      Swal.fire('Error', err?.message || 'Gagal mengeksekusi reset sistem.', 'error')
    } finally {
      setIsExecutingReset(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-105px)] min-h-[580px] bg-slate-100/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl border border-slate-300/80 dark:border-slate-800 shadow-xl overflow-hidden font-sans">
      
      {/* ================= 1. WINDOWS 11 COMMAND BAR (RIBBON) ================= */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-3 py-1.5 flex items-center justify-between gap-2 shrink-0 select-none">
        
        {/* Left Action Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar">
          <Button
            size="sm"
            onClick={() => setIsUploadOpen(true)}
            className="h-8 px-3 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-md gap-1.5 shadow-2xs"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload</span>
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsMkdirOpen(true)}
            className="h-8 px-2.5 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md gap-1.5 text-slate-700 dark:text-slate-300"
          >
            <FolderPlus className="w-4 h-4 text-amber-500" />
            <span>Folder Baru</span>
          </Button>

          <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1 shrink-0" />

          {/* Contextual Actions when item is selected */}
          {selectedItem && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setPreviewItem(selectedItem)}
                className="h-8 px-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md gap-1 text-slate-700 dark:text-slate-300"
                title="Pratinjau Berkas"
              >
                <Eye className="w-3.5 h-3.5 text-blue-500" />
                <span className="hidden sm:inline">Preview</span>
              </Button>

              {!selectedItem.isDirectory && (
                <a
                  href={selectedItem.url}
                  download={selectedItem.name}
                  className="h-8 px-2 text-xs flex items-center gap-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-700 dark:text-slate-300"
                  title="Unduh Berkas"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="hidden sm:inline">Unduh</span>
                </a>
              )}

              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setRenamingItem(selectedItem)
                  setNewItemName(selectedItem.name)
                  setIsRenameOpen(true)
                }}
                className="h-8 px-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md gap-1 text-slate-700 dark:text-slate-300"
                title="Ganti Nama"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden md:inline">Rename</span>
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDelete(selectedItem)}
                className="h-8 px-2 text-xs hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 rounded-md gap-1"
                title="Hapus"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Hapus</span>
              </Button>

              <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1 shrink-0" />
            </>
          )}

          {/* AI & Automation Buttons */}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleSyncFaceNetAi}
            className="h-8 px-2.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-md gap-1.5"
            title="Sinkronisasi Vektor AI Wajah FaceNet Realtime"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
            <span className="hidden lg:inline">FaceNet AI</span>
          </Button>

          {/* Backup Database & File Storage Button */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsBackupModalOpen(true)}
            className="h-8 px-2.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-md gap-1.5"
            title="Backup Data Sistem, Database & File Storage"
          >
            <Database className="w-3.5 h-3.5 text-emerald-500" />
            <span className="hidden xl:inline">Backup Snapshot</span>
          </Button>

          {/* Confidential System Reset Button */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setResetStep(1)
              setIsResetModalOpen(true)
            }}
            className="h-8 px-2.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-md gap-1.5"
            title="Reset Sistem & Pembersihan Data (Superadmin Only - Rahasia)"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-rose-500" />
            <span className="hidden xl:inline">Reset Sistem</span>
          </Button>
        </div>

        {/* Right View & Filter Toggles */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* File Type Filter */}
          <Select value={fileTypeFilter} onValueChange={(val) => { if (val) setFileTypeFilter(val) }}>
            <SelectTrigger className="h-7 text-xs w-28 md:w-36 bg-slate-100 dark:bg-slate-800 border-none rounded-md">
              <Filter className="w-3 h-3 text-slate-400 mr-1 shrink-0" />
              <SelectValue placeholder="Tipe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Tipe</SelectItem>
              <SelectItem value="IMAGE">Foto & Gambar</SelectItem>
              <SelectItem value="PDF">Dokumen PDF</SelectItem>
              <SelectItem value="DOC">Word & Dokumen</SelectItem>
              <SelectItem value="SHEET">Excel Spreadsheet</SelectItem>
            </SelectContent>
          </Select>

          {/* View Mode (Grid vs Details Table) */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-md p-0.5 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1 rounded ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-2xs' : 'text-slate-400 hover:text-slate-600'}`}
              title="Ikon Besar (Grid)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1 rounded ${viewMode === 'table' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-2xs' : 'text-slate-400 hover:text-slate-600'}`}
              title="Rincian (Details Table)"
            >
              <Table2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Toggle Details Pane */}
          <button
            type="button"
            onClick={() => setShowDetailsPane(!showDetailsPane)}
            className={`p-1.5 rounded-md border text-xs flex items-center justify-center transition-colors ${
              showDetailsPane 
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 border-blue-200 dark:border-blue-800' 
                : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
            }`}
            title="Panel Rincian (Details Pane)"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ================= 2. WINDOWS 11 ADDRESS & SEARCH BAR ================= */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 px-3 py-1.5 flex items-center gap-2 shrink-0">
        
        {/* Navigation History Controls */}
        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            disabled={historyIndex <= 0}
            onClick={handleGoBack}
            className="h-7 w-7 p-0 rounded-md text-slate-600 dark:text-slate-400 disabled:opacity-30"
            title="Kembali (Alt + Left Arrow)"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            disabled={historyIndex >= history.length - 1}
            onClick={handleGoForward}
            className="h-7 w-7 p-0 rounded-md text-slate-600 dark:text-slate-400 disabled:opacity-30"
            title="Maju (Alt + Right Arrow)"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            disabled={!currentPath}
            onClick={handleGoUp}
            className="h-7 w-7 p-0 rounded-md text-slate-600 dark:text-slate-400 disabled:opacity-30"
            title="Ke Folder Induk (Alt + Up Arrow)"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Windows 11 Breadcrumbs Address Box */}
        <div className="flex-1 min-w-0 h-7.5 px-2 bg-slate-50/90 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-md flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300 overflow-x-auto custom-scrollbar">
          <HardDrive className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-1" />
          
          <button
            type="button"
            onClick={() => navigateTo('')}
            className={`hover:bg-slate-200/80 dark:hover:bg-slate-800 px-1.5 py-0.5 rounded shrink-0 font-medium ${
              currentPath === '' ? 'font-bold text-blue-600 dark:text-blue-400' : ''
            }`}
          >
            This PC &gt; Storage Root
          </button>

          {explorerData?.breadcrumbs?.filter((b: BreadcrumbItem) => b.path !== '').map((bc: BreadcrumbItem, idx: number) => (
            <div key={bc.path} className="flex items-center gap-1 shrink-0">
              <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
              <button
                type="button"
                onClick={() => navigateTo(bc.path)}
                className={`hover:bg-slate-200/80 dark:hover:bg-slate-800 px-1.5 py-0.5 rounded font-medium ${
                  idx === explorerData.breadcrumbs.length - 2
                    ? 'font-bold text-blue-600 dark:text-blue-400'
                    : ''
                }`}
              >
                {bc.name}
              </button>
            </div>
          ))}
        </div>

        {/* Refresh Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            refetchContents()
            refetchStats()
          }}
          className="h-7 w-7 p-0 rounded-md text-slate-600 dark:text-slate-400 shrink-0 hover:bg-slate-100 dark:hover:bg-slate-800"
          title="Segarkan (F5)"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>

        {/* Windows Search Bar */}
        <div className="relative w-44 md:w-60 shrink-0">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
          <Input
            placeholder={`Cari di ${currentPath ? currentPath.split('/').pop() : 'Storage'}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-7.5 pl-8 pr-7 text-xs bg-slate-50/90 dark:bg-slate-950/80 border-slate-200 dark:border-slate-800 rounded-md"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ================= 3. WINDOWS 11 SPLIT VIEW BODY ================= */}
      <div className="flex-1 flex min-h-0 overflow-hidden bg-white dark:bg-slate-950">
        
        {/* Left Sidebar: Quick Access & Drives Navigation */}
        <div className="w-48 md:w-56 bg-slate-50/70 dark:bg-slate-900/40 border-r border-slate-200/80 dark:border-slate-800 p-2 flex flex-col justify-between shrink-0 overflow-y-auto select-none">
          <div className="space-y-3">
            <div>
              <p className="px-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span>Quick Access</span>
              </p>
              <div className="space-y-0.5">
                {quickAccessItems.map((item) => {
                  const Icon = item.icon
                  const isActive = currentPath === item.path || (item.path !== '' && currentPath.startsWith(item.path))
                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => navigateTo(item.path)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors text-left ${
                        isActive
                          ? 'bg-blue-100/70 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold'
                          : 'hover:bg-slate-200/60 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${item.color}`} />
                      <span className="truncate">{item.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Storage Drive Capacity Summary */}
            <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800 px-2">
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Monitor className="w-3 h-3 text-slate-400" />
                <span>Server Storage</span>
              </p>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  <span>Drive (Local)</span>
                  <span>{statsData?.totalSizeFormatted || '0 B'}</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full rounded-full w-[25%]" />
                </div>
                <p className="text-[10px] text-slate-400">
                  {statsData?.totalFiles || 0} file · {statsData?.totalFolders || 0} folder
                </p>
              </div>
            </div>
          </div>

          <div className="p-2 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg border border-blue-100 dark:border-blue-900/40 text-[10px] text-blue-700 dark:text-blue-300">
            <p className="font-bold">Direktori Server</p>
            <p className="text-slate-500 dark:text-slate-400 truncate mt-0.5">./uploads/{currentPath || ''}</p>
          </div>
        </div>

        {/* Center Main Files & Folders Viewport */}
        <div 
          onClick={() => setSelectedItem(null)}
          className="flex-1 overflow-y-auto p-3 custom-scrollbar bg-white dark:bg-slate-950 select-none"
        >
          {isLoadingContents ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400">
              <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-medium">Membaca data direktori...</p>
            </div>
          ) : explorerData?.folders?.length === 0 && explorerData?.files?.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-400">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-300 dark:text-slate-700">
                <Folder className="w-8 h-8" />
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Folder ini kosong</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Tarik dan lepas berkas ke sini atau gunakan tombol Upload</p>
              </div>
              <Button
                size="sm"
                onClick={() => setIsUploadOpen(true)}
                className="text-xs rounded-md gap-1.5 bg-blue-600 text-white font-semibold"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Berkas Sekarang</span>
              </Button>
            </div>
          ) : viewMode === 'grid' ? (
            /* ================= WINDOWS 11 GRID VIEW ================= */
            <div className="space-y-5">
              {/* Folders Group */}
              {explorerData?.folders?.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 pb-1.5 mb-2 border-b border-slate-100 dark:border-slate-800/80">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Folders ({explorerData.folders.length})
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                    {explorerData.folders.map((folder: StorageItem) => {
                      const isSelected = selectedItem?.relativePath === folder.relativePath
                      return (
                        <div
                          key={folder.relativePath}
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedItem(folder)
                          }}
                          onDoubleClick={() => navigateTo(folder.relativePath)}
                          className={`group p-2.5 rounded-lg border transition-all cursor-pointer flex items-center gap-2.5 ${
                            isSelected
                              ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-400 dark:border-blue-600 shadow-2xs'
                              : 'bg-transparent hover:bg-slate-100/80 dark:hover:bg-slate-900 border-transparent hover:border-slate-200 dark:hover:border-slate-800'
                          }`}
                        >
                          <div className="w-10 h-10 rounded-md bg-amber-400/20 text-amber-500 flex items-center justify-center shrink-0">
                            <Folder className="w-6 h-6 fill-amber-400 text-amber-500" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-600" title={folder.name}>
                              {folder.name}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {folder.sizeFormatted}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Files Group */}
              {explorerData?.files?.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 pb-1.5 mb-2 border-b border-slate-100 dark:border-slate-800/80">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Files ({explorerData.files.length})
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
                    {explorerData.files.map((file: StorageItem) => {
                      const isSelected = selectedItem?.relativePath === file.relativePath
                      return (
                        <div
                          key={file.relativePath}
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedItem(file)
                          }}
                          onDoubleClick={() => setPreviewItem(file)}
                          className={`group relative p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-400 dark:border-blue-600 shadow-2xs ring-1 ring-blue-400/50'
                              : 'bg-white dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-900 border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300'
                          }`}
                        >
                          {/* File Thumbnail Box */}
                          <div className="w-full h-24 rounded-lg bg-slate-100 dark:bg-slate-800/80 overflow-hidden flex items-center justify-center relative mb-1.5">
                            {file.previewType === 'image' ? (
                              <img
                                src={file.url}
                                alt={file.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                loading="lazy"
                              />
                            ) : file.previewType === 'pdf' ? (
                              <div className="flex flex-col items-center gap-1 text-rose-500">
                                <FileText className="w-8 h-8" />
                                <span className="text-[8px] font-black uppercase tracking-wider bg-rose-100 dark:bg-rose-950/80 px-1 rounded text-rose-700 dark:text-rose-300">PDF</span>
                              </div>
                            ) : file.previewType === 'sheet' ? (
                              <div className="flex flex-col items-center gap-1 text-emerald-500">
                                <FileSpreadsheet className="w-8 h-8" />
                                <span className="text-[8px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/80 px-1 rounded text-emerald-700 dark:text-emerald-300">XLSX</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-1 text-blue-500">
                                <File className="w-8 h-8" />
                                <span className="text-[8px] font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-950/80 px-1 rounded text-blue-700 dark:text-blue-300">{file.extension.replace('.', '')}</span>
                              </div>
                            )}

                            {/* Quick Eye Button Overlay */}
                            <div className="absolute inset-0 bg-slate-950/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setPreviewItem(file)
                                }}
                                className="p-1 rounded-full bg-white text-slate-800 hover:scale-110 shadow-xs"
                                title="Lihat Pratinjau"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* File Label & Metadata */}
                          <div>
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate" title={file.name}>
                              {file.name}
                            </p>
                            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5 font-mono">
                              <span>{file.sizeFormatted}</span>
                              <span className="uppercase">{file.extension.replace('.', '')}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ================= WINDOWS 11 DETAILS TABLE VIEW ================= */
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/80 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-8"></TableHead>
                    <TableHead className="text-xs font-bold text-slate-600 dark:text-slate-400">Nama</TableHead>
                    <TableHead className="w-28 text-center text-xs font-bold text-slate-600 dark:text-slate-400">Tipe</TableHead>
                    <TableHead className="w-24 text-right text-xs font-bold text-slate-600 dark:text-slate-400">Ukuran</TableHead>
                    <TableHead className="w-36 text-center text-xs font-bold text-slate-600 dark:text-slate-400">Waktu Diubah</TableHead>
                    <TableHead className="w-32 text-right text-xs font-bold text-slate-600 dark:text-slate-400">Aksi Cepat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Folders in Details View */}
                  {explorerData?.folders?.map((folder: StorageItem) => {
                    const isSelected = selectedItem?.relativePath === folder.relativePath
                    return (
                      <TableRow
                        key={folder.relativePath}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedItem(folder)
                        }}
                        onDoubleClick={() => navigateTo(folder.relativePath)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-blue-50 dark:bg-blue-900/30'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-900/50'
                        }`}
                      >
                        <TableCell className="text-center py-2">
                          <Folder className="w-4 h-4 text-amber-500 fill-amber-500/20" />
                        </TableCell>
                        <TableCell className="py-2">
                          <p className="font-semibold text-xs text-slate-800 dark:text-slate-200 hover:text-blue-600">
                            {folder.name}
                          </p>
                        </TableCell>
                        <TableCell className="text-center py-2">
                          <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-700 border-amber-200">
                            Folder
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right py-2 text-xs text-slate-500 font-mono">
                          {folder.sizeFormatted}
                        </TableCell>
                        <TableCell className="text-center py-2 text-[11px] text-slate-400">
                          {new Date(folder.modifiedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </TableCell>
                        <TableCell className="text-right py-2">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation()
                                setRenamingItem(folder)
                                setNewItemName(folder.name)
                                setIsRenameOpen(true)
                              }}
                              className="h-6 w-6 p-0 text-slate-400 hover:text-slate-700"
                              title="Ganti Nama"
                            >
                              <Edit3 className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(folder)
                              }}
                              className="h-6 w-6 p-0 text-slate-400 hover:text-rose-600"
                              title="Hapus"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}

                  {/* Files in Details View */}
                  {explorerData?.files?.map((file: StorageItem) => {
                    const isSelected = selectedItem?.relativePath === file.relativePath
                    return (
                      <TableRow
                        key={file.relativePath}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedItem(file)
                        }}
                        onDoubleClick={() => setPreviewItem(file)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-blue-50 dark:bg-blue-900/30'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-900/50'
                        }`}
                      >
                        <TableCell className="text-center py-2">
                          {file.previewType === 'image' ? (
                            <ImageIcon className="w-4 h-4 text-blue-500" />
                          ) : file.previewType === 'pdf' ? (
                            <FileText className="w-4 h-4 text-rose-500" />
                          ) : (
                            <File className="w-4 h-4 text-slate-500" />
                          )}
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex items-center gap-2">
                            {file.previewType === 'image' && (
                              <img
                                src={file.url}
                                alt=""
                                className="w-5 h-5 rounded object-cover border border-slate-200 shrink-0"
                              />
                            )}
                            <p className="font-semibold text-xs text-slate-800 dark:text-slate-200 hover:text-blue-600 truncate max-w-xs" title={file.name}>
                              {file.name}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center py-2">
                          <Badge
                            variant="outline"
                            className="text-[9px] uppercase font-mono bg-slate-50 text-slate-700 border-slate-200"
                          >
                            {file.extension.replace('.', '') || 'FILE'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right py-2 text-xs text-slate-600 dark:text-slate-300 font-mono font-medium">
                          {file.sizeFormatted}
                        </TableCell>
                        <TableCell className="text-center py-2 text-[11px] text-slate-400">
                          {new Date(file.modifiedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </TableCell>
                        <TableCell className="text-right py-2">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation()
                                setPreviewItem(file)
                              }}
                              className="h-6 w-6 p-0 text-slate-400 hover:text-blue-600"
                              title="Pratinjau"
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(file)
                              }}
                              className="h-6 w-6 p-0 text-slate-400 hover:text-rose-600"
                              title="Hapus"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Right Details Pane (Windows 11 Properties / Inspector) */}
        {showDetailsPane && (
          <div className="w-64 md:w-72 bg-slate-50/80 dark:bg-slate-900/50 border-l border-slate-200/80 dark:border-slate-800 p-3.5 flex flex-col justify-between shrink-0 overflow-y-auto custom-scrollbar">
            {selectedItem ? (
              <div className="space-y-4">
                <div className="text-center pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div className="w-28 h-28 mx-auto rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 overflow-hidden flex items-center justify-center shadow-xs mb-2">
                    {selectedItem.isDirectory ? (
                      <Folder className="w-16 h-16 fill-amber-400 text-amber-500" />
                    ) : selectedItem.previewType === 'image' ? (
                      <img src={selectedItem.url} alt="" className="w-full h-full object-cover" />
                    ) : selectedItem.previewType === 'pdf' ? (
                      <FileText className="w-14 h-14 text-rose-500" />
                    ) : (
                      <File className="w-14 h-14 text-blue-500" />
                    )}
                  </div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate" title={selectedItem.name}>
                    {selectedItem.name}
                  </p>
                  <p className="text-[10px] text-slate-400 uppercase font-mono mt-0.5">
                    {selectedItem.isDirectory ? 'Folder Direktori' : `${selectedItem.extension.replace('.', '')} File`}
                  </p>
                </div>

                {/* File Properties List */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
                    <span className="text-slate-400">Ukuran:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">{selectedItem.sizeFormatted}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
                    <span className="text-slate-400">Lokasi:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[130px] font-mono text-[10px]">{selectedItem.relativePath}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
                    <span className="text-slate-400">Waktu Diubah:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 text-[10px]">{new Date(selectedItem.modifiedAt).toLocaleString('id-ID')}</span>
                  </div>
                </div>

                {/* Integration Actions for Selected File */}
                {!selectedItem.isDirectory && (
                  <div className="space-y-1.5 pt-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aksi Integrasi SIMASMUH</p>
                    
                    {/* Tautkan ke Tagihan / Bukti Bayar */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setLinkingPaymentFile(selectedItem)
                        setIsLinkPaymentOpen(true)
                      }}
                      className="w-full h-8 text-xs font-bold text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-900/50 hover:bg-orange-50 dark:hover:bg-orange-950/40 rounded-lg justify-start gap-2"
                    >
                      <Receipt className="w-4 h-4 text-orange-500" />
                      <span>Tautkan Bukti Bayar</span>
                    </Button>

                    {/* Tautkan Foto Siswa */}
                    {selectedItem.previewType === 'image' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setLinkingFile(selectedItem)
                          setIsLinkStudentOpen(true)
                        }}
                        className="w-full h-8 text-xs font-bold text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/50 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg justify-start gap-2"
                      >
                        <UserCheck className="w-4 h-4 text-blue-500" />
                        <span>Tautkan Foto Siswa</span>
                      </Button>
                    )}

                    {/* Tautkan E-Arsip Surat TU */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setLinkingSuratFile(selectedItem)
                        setIsLinkSuratOpen(true)
                      }}
                      className="w-full h-8 text-xs font-bold text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900/50 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-lg justify-start gap-2"
                    >
                      <Archive className="w-4 h-4 text-purple-500" />
                      <span>Tautkan E-Arsip TU</span>
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
                <Info className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                <p className="text-xs font-semibold">Pilih item berkas</p>
                <p className="text-[11px] text-slate-400">Klik salah satu berkas atau folder untuk melihat rincian & opsi integrasi.</p>
              </div>
            )}

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
              <span>Windows 11 Explorer View</span>
              <span className="font-mono">v1.2</span>
            </div>
          </div>
        )}
      </div>

      {/* ================= 4. WINDOWS 11 STATUS BAR ================= */}
      <div className="bg-slate-100 dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 px-3 py-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 shrink-0 select-none">
        <div className="flex items-center gap-3">
          <span>{explorerData ? `${explorerData.totalFolders + explorerData.totalFiles} item` : '0 item'}</span>
          {selectedItem && (
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              1 item terpilih ({selectedItem.sizeFormatted})
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span>Penyimpanan Lokal SIMASMUH</span>
        </div>
      </div>

      {/* ================= MODAL: CREATE NEW FOLDER ================= */}
      <Dialog open={isMkdirOpen} onOpenChange={setIsMkdirOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <FolderPlus className="w-5 h-5" /> Buat Folder Baru
            </DialogTitle>
            <DialogDescription className="text-xs">
              Folder akan dibuat pada direktori: <span className="font-mono text-slate-800 dark:text-slate-200">./uploads/{currentPath || ''}</span>
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateFolder} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nama Folder</Label>
              <Input
                placeholder="Contoh: bukti-spp-2026, dokumen-akademik, dll"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                autoFocus
                className="text-xs"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsMkdirOpen(false)}>
                Batal
              </Button>
              <Button type="submit" size="sm" disabled={!newFolderName.trim()} className="bg-amber-600 hover:bg-amber-700 text-white font-bold">
                Buat Folder
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL: UPLOAD FILES ================= */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-600">
              <Upload className="w-5 h-5" /> Unggah Berkas ke Server
            </DialogTitle>
            <DialogDescription className="text-xs">
              Target direktori: <span className="font-mono text-slate-800 dark:text-slate-200">./uploads/{currentPath || ''}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-blue-300 dark:border-blue-900/60 hover:border-blue-500 rounded-xl p-6 text-center cursor-pointer bg-blue-50/30 dark:bg-blue-950/20 hover:bg-blue-50/60 transition-colors flex flex-col items-center justify-center gap-2"
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-600 flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Klik untuk memilih berkas dari komputer / HP Anda
              </p>
              <p className="text-[10px] text-slate-400">
                Mendukung JPG, PNG, PDF, DOCX, XLSX, ZIP (Maks 25MB per file)
              </p>
            </div>

            {/* Upload Queue List */}
            {uploadFilesQueue.length > 0 && (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>Antrean Berkas ({uploadFilesQueue.length})</span>
                  <button
                    type="button"
                    onClick={() => setUploadFilesQueue([])}
                    className="text-[10px] text-rose-600 hover:underline"
                  >
                    Hapus Semua
                  </button>
                </div>
                {uploadFilesQueue.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {item.previewUrl ? (
                        <img src={item.previewUrl} alt="" className="w-7 h-7 rounded object-cover border shrink-0" />
                      ) : (
                        <File className="w-5 h-5 text-blue-500 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-xs">{item.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{item.size}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUploadFilesQueue((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setIsUploadOpen(false)} disabled={isUploading}>
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleExecuteUpload}
              disabled={uploadFilesQueue.length === 0 || isUploading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              {isUploading ? 'Mengunggah ke Server...' : `Unggah (${uploadFilesQueue.length} File)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL: RENAME FILE / FOLDER ================= */}
      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
              <Edit3 className="w-5 h-5 text-blue-500" /> Ganti Nama Berkas / Folder
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleExecuteRename} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nama Baru</Label>
              <Input
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                autoFocus
                className="text-xs"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsRenameOpen(false)}>
                Batal
              </Button>
              <Button type="submit" size="sm" disabled={!newItemName.trim()} className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
                Simpan Perubahan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL: FULL PREVIEW FILE ================= */}
      <Dialog open={!!previewItem} onOpenChange={() => setPreviewItem(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-4">
          <DialogHeader className="border-b pb-2">
            <DialogTitle className="text-sm font-bold truncate flex items-center justify-between">
              <span>Pratinjau: {previewItem?.name}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 min-h-[300px] overflow-auto flex items-center justify-center p-2 bg-slate-900 rounded-lg">
            {previewItem?.previewType === 'image' ? (
              <img
                src={previewItem.url}
                alt={previewItem.name}
                className="max-h-[60vh] max-w-full object-contain rounded"
              />
            ) : previewItem?.previewType === 'pdf' ? (
              <iframe
                src={previewItem.url}
                title={previewItem.name}
                className="w-full h-[60vh] rounded bg-white"
              />
            ) : (
              <div className="text-center text-slate-400 space-y-2 py-12">
                <File className="w-16 h-16 mx-auto text-slate-500" />
                <p className="text-xs">Pratinjau langsung tidak didukung untuk format ini.</p>
                <a
                  href={previewItem?.url}
                  download={previewItem?.name}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-bold"
                >
                  <Download className="w-3.5 h-3.5" /> Unduh Berkas
                </a>
              </div>
            )}
          </div>

          <DialogFooter className="flex items-center justify-between pt-2">
            <div className="text-xs text-slate-500 font-mono">
              Ukuran: {previewItem?.sizeFormatted}
            </div>
            <div className="flex items-center gap-2">
              <a
                href={previewItem?.url}
                download={previewItem?.name}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-xs font-semibold hover:bg-slate-200"
              >
                <Download className="w-3.5 h-3.5" /> Unduh
              </a>
              <Button size="sm" variant="outline" onClick={() => setPreviewItem(null)}>
                Tutup
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL: LINK TO STUDENT PROFILE PHOTO ================= */}
      <Dialog open={isLinkStudentOpen} onOpenChange={setIsLinkStudentOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-600">
              <UserCheck className="w-5 h-5" /> Tautkan Foto ke Profil Siswa
            </DialogTitle>
            <DialogDescription className="text-xs">
              Foto <span className="font-bold text-slate-800 dark:text-slate-200">{linkingFile?.name}</span> akan diset sebagai foto profil resmi siswa & disinkronkan ke FaceNet AI.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Cari Siswa</Label>
              <Input
                placeholder="Ketik Nama atau NIS siswa..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="max-h-52 overflow-y-auto space-y-1 pr-1 border border-slate-200 dark:border-slate-800 rounded-lg p-1">
              {studentsList.length === 0 ? (
                <p className="text-xs text-center py-6 text-slate-400">Tidak ada data siswa ditemukan.</p>
              ) : (
                studentsList.map((stu: any) => (
                  <div
                    key={stu.id}
                    onClick={() => setSelectedStudentId(stu.id)}
                    className={`p-2 rounded-lg text-xs cursor-pointer flex items-center justify-between transition-colors ${
                      selectedStudentId === stu.id
                        ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-400 font-bold text-blue-700 dark:text-blue-300'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div>
                      <p className="font-bold">{stu.name}</p>
                      <p className="text-[10px] text-slate-400">NIS: {stu.nis || '-'} · Kelas: {stu.class?.name || '-'}</p>
                    </div>
                    {selectedStudentId === stu.id && (
                      <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setIsLinkStudentOpen(false)}>
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleExecuteLinkStudent}
              disabled={!selectedStudentId}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              Tautkan Foto Profil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL: LINK TO SURAT TU (E-ARSIP) ================= */}
      <Dialog open={isLinkSuratOpen} onOpenChange={setIsLinkSuratOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-purple-600">
              <Archive className="w-5 h-5" /> Tautkan ke Data Surat (E-Arsip)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Berkas <span className="font-bold text-slate-800 dark:text-slate-200">{linkingSuratFile?.name}</span> akan ditautkan sebagai lampiran berkas asli surat.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                type="button"
                variant={selectedSuratType === 'MASUK' ? 'default' : 'outline'}
                onClick={() => {
                  setSelectedSuratType('MASUK')
                  setSelectedSuratId('')
                }}
                className="text-xs h-7 rounded-lg flex-1"
              >
                Surat Masuk
              </Button>
              <Button
                size="sm"
                type="button"
                variant={selectedSuratType === 'KELUAR' ? 'default' : 'outline'}
                onClick={() => {
                  setSelectedSuratType('KELUAR')
                  setSelectedSuratId('')
                }}
                className="text-xs h-7 rounded-lg flex-1"
              >
                Surat Keluar
              </Button>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Cari Surat</Label>
              <Input
                placeholder="Nomor surat / Perihal / Instansi..."
                value={suratSearch}
                onChange={(e) => setSuratSearch(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="max-h-52 overflow-y-auto space-y-1 pr-1 border border-slate-200 dark:border-slate-800 rounded-lg p-1">
              {selectedSuratType === 'MASUK' ? (
                suratData.suratMasuk?.length === 0 ? (
                  <p className="text-xs text-center py-6 text-slate-400">Tidak ada Surat Masuk ditemukan.</p>
                ) : (
                  suratData.suratMasuk?.map((s: any) => (
                    <div
                      key={s.id}
                      onClick={() => setSelectedSuratId(s.id)}
                      className={`p-2 rounded-lg text-xs cursor-pointer flex items-center justify-between transition-colors ${
                        selectedSuratId === s.id
                          ? 'bg-purple-50 dark:bg-purple-900/30 border border-purple-400 font-bold text-purple-700 dark:text-purple-300'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="min-w-0 max-w-xs">
                        <p className="font-bold truncate">No: {s.nomorSurat}</p>
                        <p className="text-[10px] text-slate-400 truncate">{s.perihal} ({s.instansi})</p>
                      </div>
                      {selectedSuratId === s.id && (
                        <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                      )}
                    </div>
                  ))
                )
              ) : (
                suratData.suratKeluar?.length === 0 ? (
                  <p className="text-xs text-center py-6 text-slate-400">Tidak ada Surat Keluar ditemukan.</p>
                ) : (
                  suratData.suratKeluar?.map((s: any) => (
                    <div
                      key={s.id}
                      onClick={() => setSelectedSuratId(s.id)}
                      className={`p-2 rounded-lg text-xs cursor-pointer flex items-center justify-between transition-colors ${
                        selectedSuratId === s.id
                          ? 'bg-purple-50 dark:bg-purple-900/30 border border-purple-400 font-bold text-purple-700 dark:text-purple-300'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="min-w-0 max-w-xs">
                        <p className="font-bold truncate">No: {s.nomorSurat}</p>
                        <p className="text-[10px] text-slate-400 truncate">{s.perihal} (Kepada: {s.tujuanPenerima})</p>
                      </div>
                      {selectedSuratId === s.id && (
                        <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                      )}
                    </div>
                  ))
                )
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setIsLinkSuratOpen(false)}>
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleExecuteLinkSurat}
              disabled={!selectedSuratId}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
            >
              Tautkan ke Dokumen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL: LINK TO TAGIHAN SISWA (BUKTI PEMBAYARAN) ================= */}
      <Dialog open={isLinkPaymentOpen} onOpenChange={setIsLinkPaymentOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <Receipt className="w-5 h-5" /> Tautkan ke Tagihan / Bukti Bayar Keuangan
            </DialogTitle>
            <DialogDescription className="text-xs">
              Struk berkas <span className="font-bold text-slate-800 dark:text-slate-200">{linkingPaymentFile?.name}</span> akan dicatat sebagai bukti transfer tagihan siswa.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Cari Tagihan Siswa</Label>
              <Input
                placeholder="Ketik Nama Siswa, NIS, atau Jenis Tagihan (SPP/DPP)..."
                value={tagihanSearch}
                onChange={(e) => setTagihanSearch(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1 pr-1 border border-slate-200 dark:border-slate-800 rounded-lg p-1">
              {tagihanList.length === 0 ? (
                <p className="text-xs text-center py-6 text-slate-400">Tidak ada data tagihan yang sesuai.</p>
              ) : (
                tagihanList.map((t: any) => (
                  <div
                    key={t.id}
                    onClick={() => {
                      setSelectedTagihanId(t.id)
                      const sisa = (t.amount || 0) - (t.amountPaid || 0)
                      setPaymentAmount(String(sisa > 0 ? sisa : t.amount || ''))
                    }}
                    className={`p-2 rounded-lg text-xs cursor-pointer flex items-center justify-between transition-colors ${
                      selectedTagihanId === t.id
                        ? 'bg-orange-50 dark:bg-orange-950/30 border border-orange-400 font-bold text-orange-700 dark:text-orange-300'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="min-w-0 max-w-xs">
                      <p className="font-bold">{t.studentName} ({t.className})</p>
                      <p className="text-[10px] text-slate-400">
                        {t.jenisTagihan} {t.month ? `Bulan ke-${t.month}` : ''} ({t.year})
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        Rp {t.amount?.toLocaleString('id-ID')}
                      </p>
                      <Badge variant="outline" className={`text-[9px] ${t.status === 'LUNAS' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {t.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Nominal Pembayaran (Rp)</Label>
                <Input
                  type="number"
                  placeholder="Jumlah bayar..."
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Catatan / Keterangan</Label>
                <Input
                  placeholder="Transfer Bank / Tunai..."
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setIsLinkPaymentOpen(false)}>
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleExecuteLinkPayment}
              disabled={!selectedTagihanId}
              className="bg-orange-600 hover:bg-orange-700 text-white font-bold"
            >
              Tautkan Bukti Bayar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL: BACKUP DATA & SNAPSHOT SYSTEM ================= */}
      <Dialog open={isBackupModalOpen} onOpenChange={setIsBackupModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <Database className="w-5 h-5" /> Backup Basis Data & File Storage Sistem
            </DialogTitle>
            <DialogDescription className="text-xs">
              Mengekspor seluruh data aktif di PostgreSQL/Supabase (Siswa, Guru, Presensi, Keuangan, Persuratan, Buku Induk) serta metadata direktori server ke arsip snapshot JSON/SQL.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Catatan / Keterangan Backup</Label>
              <Input
                placeholder="Contoh: Backup Rutin Awal Semester Ganjil 2026/2027..."
                value={backupNotes}
                onChange={(e) => setBackupNotes(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
              <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Cakupan Data yang Disimpan dalam Snapshot:
              </p>
              <ul className="list-disc pl-5 text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5">
                <li>Seluruh Master Data (Akun Pengguna, Profil Guru, Siswa, Orang Tua/Wali, Kelas, Mapel).</li>
                <li>Seluruh Riwayat Operasional (Log Presensi Pegawai & Siswa, Izin Keluar, Cuti, Dispensasi).</li>
                <li>Seluruh Transaksi Keuangan (Tagihan SPP/DPP, Bukti Pembayaran Transfer, Pengeluaran, Gaji).</li>
                <li>Seluruh E-Arsip Persuratan (Buku Agenda Surat Masuk, Surat Keluar, Disposisi, Buku Tamu).</li>
                <li>Metadata & Indexing Direktori File Server Lokal (<span className="font-mono text-[10px]">./uploads/</span>).</li>
              </ul>
            </div>

            {/* Riwayat Arsip Backup Sebelumnya */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Arsip Backup Tersedia di Server ({backupsList.length})</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateTo('backups')}
                  className="h-6 text-[10px] text-blue-600 hover:underline px-1"
                >
                  Buka Folder di Explorer →
                </Button>
              </div>

              <div className="max-h-36 overflow-y-auto space-y-1 pr-1 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5">
                {backupsList.length === 0 ? (
                  <p className="text-xs text-center py-4 text-slate-400">Belum ada file backup di ./uploads/backups/</p>
                ) : (
                  backupsList.map((b: any) => (
                    <div
                      key={b.name}
                      className="p-1.5 rounded-md bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0 flex items-center gap-2">
                        <Database className="w-4 h-4 text-emerald-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-xs">{b.name}</p>
                          <p className="text-[10px] text-slate-400">{b.sizeFormatted} · {new Date(b.createdAt).toLocaleString('id-ID')}</p>
                        </div>
                      </div>
                      <a
                        href={`/uploads/${b.relativePath}`}
                        download={b.name}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-400 hover:text-blue-600"
                        title="Unduh Arsip Snapshot"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setIsBackupModalOpen(false)} disabled={isCreatingBackup}>
              Tutup
            </Button>
            <Button
              size="sm"
              onClick={handleCreateBackup}
              disabled={isCreatingBackup}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5"
            >
              <Database className="w-3.5 h-3.5" />
              {isCreatingBackup ? 'Memproses Backup...' : 'Buat Backup Sekarang'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL: CONFIDENTIAL SYSTEM RESET (MULTI-FACTOR AUTH) ================= */}
      <Dialog open={isResetModalOpen} onOpenChange={setIsResetModalOpen}>
        <DialogContent className="sm:max-w-lg border-rose-300 dark:border-rose-900/60">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <ShieldCheck className="w-5 h-5" /> Reset Sistem & Pembersihan Data
            </DialogTitle>
            <DialogDescription className="text-xs text-rose-700 dark:text-rose-400 font-semibold">
              Fitur Sangat Rahasia & Terproteksi Berlapis (Khusus Superadmin SIMASMUH)
            </DialogDescription>
          </DialogHeader>

          {resetStep === 1 ? (
            /* ===== TAHAP 1: OTORISASI PASSWORD SUPERADMIN ===== */
            <form onSubmit={handleRequestResetChallenge} className="space-y-4 py-2">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg text-xs space-y-1">
                <p className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  Verifikasi Tingkat 1: Kredensial Superadmin
                </p>
                <p className="text-[11px] text-amber-700 dark:text-amber-400">
                  Untuk melindungi basis data dari modifikasi tidak disengaja, masukkan password akun Superadmin Anda saat ini untuk menerbitkan PIN otorisasi rahasia.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Password Akun Superadmin</Label>
                <Input
                  type="password"
                  placeholder="Masukkan password Anda..."
                  value={resetSuperadminPassword}
                  onChange={(e) => setResetSuperadminPassword(e.target.value)}
                  autoFocus
                  className="text-xs"
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsResetModalOpen(false)}>
                  Batal
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!resetSuperadminPassword || isRequestingReset}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
                >
                  {isRequestingReset ? 'Memverifikasi...' : 'Lanjut ke Otorisasi Akhir →'}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            /* ===== TAHAP 2: VERIFIKASI PIN RAHASIA & FRASA KONFIRMASI ===== */
            <form onSubmit={handleExecuteSystemReset} className="space-y-4 py-2">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-lg text-xs space-y-2 text-rose-800 dark:text-rose-300">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  Otorisasi Akhir: PIN Rahasia Berlaku 5 Menit
                </p>
                <div className="bg-white dark:bg-slate-900 p-2 rounded border border-rose-200 dark:border-rose-800 text-center">
                  <span className="text-[11px] text-slate-500">PIN Keamanan Anda: </span>
                  <span className="font-mono text-base font-black text-rose-600 tracking-widest">{resetChallengePin}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Pilih Cakupan Pembersihan</Label>
                <Select value={resetOption} onValueChange={(val: any) => setResetOption(val)}>
                  <SelectTrigger className="text-xs h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRANSACTIONAL_ONLY">
                      Hanya Data Transaksional (Presensi, Keuangan, Surat, Jurnal)
                    </SelectItem>
                    <SelectItem value="ALL_STUDENTS_AND_DATA">
                      Penuh: Data Transaksional + Data Siswa & Wali Murid (Master Akun Inti Tetap Utuh)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Masukkan PIN Keamanan di Atas</Label>
                <Input
                  type="text"
                  placeholder="Ketik 6 digit PIN..."
                  value={inputChallengePin}
                  onChange={(e) => setInputChallengePin(e.target.value)}
                  className="text-xs font-mono font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                  Ketik Tepat Frasa Konfirmasi: <span className="font-mono font-bold">SAYA YAKIN RESET DATA SIMASMUH</span>
                </Label>
                <Input
                  placeholder="SAYA YAKIN RESET DATA SIMASMUH"
                  value={resetConfirmPhrase}
                  onChange={(e) => setResetConfirmPhrase(e.target.value)}
                  className="text-xs font-semibold"
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setResetStep(1)}
                  disabled={isExecutingReset}
                >
                  ← Kembali
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={
                    inputChallengePin !== resetChallengePin ||
                    resetConfirmPhrase !== 'SAYA YAKIN RESET DATA SIMASMUH' ||
                    isExecutingReset
                  }
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
                >
                  {isExecutingReset ? 'Mengeksekusi Reset...' : 'Eksekusi Reset Sekarang'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

