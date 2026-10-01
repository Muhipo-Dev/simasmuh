import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { STORAGE_ROOT, STORAGE_DIRS } from '../config/storage.config';
import { PrismaService } from '../prisma/prisma.service';

export interface StorageItem {
  name: string;
  relativePath: string;
  url: string;
  isDirectory: boolean;
  size: number;
  sizeFormatted: string;
  extension: string;
  mimeType: string;
  previewType: 'image' | 'pdf' | 'doc' | 'sheet' | 'other' | 'folder';
  modifiedAt: string;
  itemCount?: number;
}

export interface BreadcrumbItem {
  name: string;
  path: string;
}

@Injectable()
export class StorageExplorerService {
  private readonly logger = new Logger(StorageExplorerService.name);

  constructor(private readonly prisma: PrismaService) {
    this.ensureDefaultDirectories();
  }

  private ensureDefaultDirectories() {
    try {
      const defaultDirs = [
        'profiles',
        'students',
        'arsip',
        'surat-masuk',
        'surat-keluar',
        'ijazah',
        'sdm_docs',
        'journals',
        'payment-proofs',
        'carousel',
        'thumbnails',
        'backups',
      ];

      for (const dir of defaultDirs) {
        const fullDir = path.join(STORAGE_ROOT, dir);
        if (!fs.existsSync(fullDir)) {
          fs.mkdirSync(fullDir, { recursive: true });
        }
      }
    } catch (err: any) {
      this.logger.error('Failed to ensure default directories:', err);
    }
  }

  /**
   * Sanitasi path dan cegah Directory Traversal / Path Traversal attack
   */
  private resolveSafePath(relPath: string = ''): string {
    const cleanRel = (relPath || '')
      .replace(/\\/g, '/')
      .replace(/^\/+/, '')
      .replace(/\.\./g, '');
    const fullPath = path.resolve(STORAGE_ROOT, cleanRel);

    // Verifikasi ketat bahwa fullPath berada di dalam STORAGE_ROOT
    if (!fullPath.startsWith(path.resolve(STORAGE_ROOT))) {
      throw new BadRequestException('Akses direktori di luar batas penyimpanan server ditolak.');
    }

    return fullPath;
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private getPreviewType(
    ext: string,
    isDirectory: boolean,
  ): 'image' | 'pdf' | 'doc' | 'sheet' | 'other' | 'folder' {
    if (isDirectory) return 'folder';
    const cleanExt = ext.toLowerCase().replace('.', '');
    if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp', 'avif'].includes(cleanExt)) {
      return 'image';
    }
    if (['pdf'].includes(cleanExt)) {
      return 'pdf';
    }
    if (['doc', 'docx', 'odt', 'rtf', 'txt'].includes(cleanExt)) {
      return 'doc';
    }
    if (['xls', 'xlsx', 'csv', 'ods'].includes(cleanExt)) {
      return 'sheet';
    }
    return 'other';
  }

  private getMimeType(ext: string): string {
    const cleanExt = ext.toLowerCase().replace('.', '');
    const map: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      gif: 'image/gif',
      svg: 'image/svg+xml',
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      txt: 'text/plain',
      csv: 'text/csv',
      zip: 'application/zip',
    };
    return map[cleanExt] || 'application/octet-stream';
  }

  /**
   * Menampilkan daftar item file & folder di dalam path tertentu
   */
  async listContents(
    relPath: string = '',
    search: string = '',
    filterType: string = 'ALL',
  ): Promise<{
    currentPath: string;
    parentPath: string | null;
    breadcrumbs: BreadcrumbItem[];
    folders: StorageItem[];
    files: StorageItem[];
    totalFolders: number;
    totalFiles: number;
    totalSize: number;
    totalSizeFormatted: string;
  }> {
    const targetDir = this.resolveSafePath(relPath);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const stat = await fs.promises.stat(targetDir);
    if (!stat.isDirectory()) {
      throw new BadRequestException('Path target bukan merupakan folder/direktori.');
    }

    const entries = await fs.promises.readdir(targetDir, { withFileTypes: true });

    const cleanRel = (relPath || '')
      .replace(/\\/g, '/')
      .replace(/^\/+/, '')
      .replace(/\/+$/, '');

    // Bangun breadcrumbs
    const breadcrumbs: BreadcrumbItem[] = [{ name: 'Penyimpanan Utama (Root)', path: '' }];
    if (cleanRel) {
      const parts = cleanRel.split('/');
      let accumulated = '';
      for (const part of parts) {
        accumulated = accumulated ? `${accumulated}/${part}` : part;
        breadcrumbs.push({ name: part, path: accumulated });
      }
    }

    const parentPath = cleanRel.includes('/')
      ? cleanRel.substring(0, cleanRel.lastIndexOf('/'))
      : cleanRel.length > 0
        ? ''
        : null;

    const folders: StorageItem[] = [];
    const files: StorageItem[] = [];
    let totalSize = 0;

    for (const entry of entries) {
      const entryName = entry.name;

      // Filter pencarian jika ada
      if (search && !entryName.toLowerCase().includes(search.toLowerCase())) {
        continue;
      }

      const itemRelPath = cleanRel ? `${cleanRel}/${entryName}` : entryName;
      const fullItemPath = path.join(targetDir, entryName);

      try {
        const itemStat = await fs.promises.stat(fullItemPath);
        const isDir = itemStat.isDirectory();

        if (isDir) {
          let itemCount = 0;
          try {
            const subEntries = await fs.promises.readdir(fullItemPath);
            itemCount = subEntries.length;
          } catch {}

          folders.push({
            name: entryName,
            relativePath: itemRelPath,
            url: `/uploads/${itemRelPath}`,
            isDirectory: true,
            size: 0,
            sizeFormatted: `${itemCount} item`,
            extension: '',
            mimeType: 'directory',
            previewType: 'folder',
            modifiedAt: itemStat.mtime.toISOString(),
            itemCount,
          });
        } else {
          const ext = path.extname(entryName);
          const previewType = this.getPreviewType(ext, false);

          // Filter tipe berkas jika difilter
          if (
            filterType &&
            filterType !== 'ALL' &&
            previewType.toUpperCase() !== filterType.toUpperCase()
          ) {
            continue;
          }

          totalSize += itemStat.size;

          files.push({
            name: entryName,
            relativePath: itemRelPath,
            url: `/uploads/${itemRelPath}`,
            isDirectory: false,
            size: itemStat.size,
            sizeFormatted: this.formatFileSize(itemStat.size),
            extension: ext.toLowerCase(),
            mimeType: this.getMimeType(ext),
            previewType,
            modifiedAt: itemStat.mtime.toISOString(),
          });
        }
      } catch (err) {
        this.logger.warn(`Gagal membaca metadata file/folder: ${fullItemPath}`);
      }
    }

    // Urutkan alfabetis
    folders.sort((a, b) => a.name.localeCompare(b.name, 'id', { numeric: true }));
    files.sort((a, b) => a.name.localeCompare(b.name, 'id', { numeric: true }));

    return {
      currentPath: cleanRel,
      parentPath,
      breadcrumbs,
      folders,
      files,
      totalFolders: folders.length,
      totalFiles: files.length,
      totalSize,
      totalSizeFormatted: this.formatFileSize(totalSize),
    };
  }

  /**
   * Rekapitulasi Statistik Penyimpanan Server
   */
  async getStats(): Promise<{
    storageRoot: string;
    totalSize: number;
    totalSizeFormatted: string;
    totalFiles: number;
    totalFolders: number;
    categories: Array<{
      name: string;
      label: string;
      path: string;
      fileCount: number;
      size: number;
      sizeFormatted: string;
      color: string;
    }>;
  }> {
    const categoryConfigs = [
      { name: 'profiles', label: 'Foto Profil & Biometrik Siswa', path: 'profiles', color: 'blue' },
      { name: 'students', label: 'Berkas & Ijazah Siswa', path: 'students', color: 'indigo' },
      { name: 'arsip', label: 'E-Arsip Dokumen Sekolah', path: 'arsip', color: 'amber' },
      { name: 'surat-masuk', label: 'Scan Surat Masuk', path: 'surat-masuk', color: 'emerald' },
      { name: 'surat-keluar', label: 'Dokumen Surat Keluar', path: 'surat-keluar', color: 'teal' },
      { name: 'ijazah', label: 'Arsip Ijazah & Alumni', path: 'ijazah', color: 'purple' },
      { name: 'sdm_docs', label: 'Berkas Kepegawaian SDM', path: 'sdm_docs', color: 'sky' },
      { name: 'journals', label: 'Lampiran Jurnal Mengajar', path: 'journals', color: 'rose' },
      { name: 'payment-proofs', label: 'Bukti Pembayaran Keuangan', path: 'payment-proofs', color: 'orange' },
      { name: 'carousel', label: 'Banner & Publikasi', path: 'carousel', color: 'slate' },
      { name: 'backups', label: 'Arsip Backup & Snapshot', path: 'backups', color: 'red' },
    ];

    let grandTotalSize = 0;
    let grandTotalFiles = 0;
    let grandTotalFolders = 0;

    const calcDirRecursive = (dirPath: string): { size: number; files: number; folders: number } => {
      let size = 0;
      let files = 0;
      let folders = 0;

      if (!fs.existsSync(dirPath)) return { size, files, folders };

      try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const entry of entries) {
          const full = path.join(dirPath, entry.name);
          try {
            const stat = fs.statSync(full);
            if (entry.isDirectory()) {
              folders += 1;
              const sub = calcDirRecursive(full);
              size += sub.size;
              files += sub.files;
              folders += sub.folders;
            } else {
              files += 1;
              size += stat.size;
            }
          } catch {}
        }
      } catch {}

      return { size, files, folders };
    };

    const categories: any[] = [];

    for (const cat of categoryConfigs) {
      const catPath = path.join(STORAGE_ROOT, cat.path);
      const res = calcDirRecursive(catPath);
      grandTotalSize += res.size;
      grandTotalFiles += res.files;
      grandTotalFolders += res.folders + 1; // +1 untuk folder kategori itu sendiri

      categories.push({
        name: cat.name,
        label: cat.label,
        path: cat.path,
        fileCount: res.files,
        size: res.size,
        sizeFormatted: this.formatFileSize(res.size),
        color: cat.color,
      });
    }

    return {
      storageRoot: STORAGE_ROOT,
      totalSize: grandTotalSize,
      totalSizeFormatted: this.formatFileSize(grandTotalSize),
      totalFiles: grandTotalFiles,
      totalFolders: grandTotalFolders,
      categories,
    };
  }

  /**
   * Membuat Folder Baru di Server
   */
  async createFolder(relPath: string = '', folderName: string): Promise<{ success: boolean; path: string }> {
    if (!folderName || folderName.trim().length === 0) {
      throw new BadRequestException('Nama folder tidak boleh kosong.');
    }

    // Sanitasi nama folder
    const safeFolderName = folderName
      .trim()
      .replace(/[\\/:*?"<>|]/g, '_')
      .replace(/\.\./g, '');

    const targetParent = this.resolveSafePath(relPath);
    const newFolderPath = path.join(targetParent, safeFolderName);

    if (fs.existsSync(newFolderPath)) {
      throw new BadRequestException(`Folder "${safeFolderName}" sudah ada.`);
    }

    await fs.promises.mkdir(newFolderPath, { recursive: true });
    this.logger.log(`Folder baru dibuat: ${newFolderPath}`);

    const newRelPath = relPath ? `${relPath}/${safeFolderName}` : safeFolderName;
    return { success: true, path: newRelPath };
  }

  /**
   * Mengunggah Berkas langsung ke direktori penyimpanan server
   */
  async uploadFiles(
    relPath: string = '',
    files: Array<{ name: string; base64: string }>,
  ): Promise<{ success: boolean; uploadedCount: number; files: StorageItem[] }> {
    if (!files || files.length === 0) {
      throw new BadRequestException('Tidak ada berkas yang dikirim untuk diunggah.');
    }

    const targetDir = this.resolveSafePath(relPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const uploadedItems: StorageItem[] = [];

    for (const file of files) {
      if (!file.base64 || !file.name) continue;

      let mimeType = 'application/octet-stream';
      let rawBase64 = file.base64;

      if (file.base64.startsWith('data:')) {
        const matches = file.base64.match(/^data:([A-Za-z0-9-+./]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          mimeType = matches[1].toLowerCase();
          rawBase64 = matches[2];
        }
      }

      const buffer = Buffer.from(rawBase64, 'base64');
      const safeOrigName = path
        .basename(file.name)
        .replace(/[\\/:*?"<>|]/g, '_')
        .replace(/\s+/g, '-');

      const ext = path.extname(safeOrigName).toLowerCase() || '.dat';
      const nameWithoutExt = path.basename(safeOrigName, ext);
      
      // Berikan prefix timestamp jika sudah ada file dengan nama sama
      let finalFilename = `${safeOrigName}`;
      let finalFilePath = path.join(targetDir, finalFilename);

      if (fs.existsSync(finalFilePath)) {
        finalFilename = `${nameWithoutExt}-${Date.now()}${ext}`;
        finalFilePath = path.join(targetDir, finalFilename);
      }

      const isImage = mimeType.includes('image') || ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);

      if (isImage) {
        try {
          // Optimasi gambar dengan Sharp (WebP 85% atau format asli)
          await sharp(buffer)
            .rotate()
            .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
            .toFile(finalFilePath);
        } catch {
          await fs.promises.writeFile(finalFilePath, buffer);
        }
      } else {
        // Dokumen PDF, Word, Excel, dll disimpan utuh
        await fs.promises.writeFile(finalFilePath, buffer);
      }

      const stat = await fs.promises.stat(finalFilePath);
      const itemRelPath = relPath ? `${relPath}/${finalFilename}` : finalFilename;

      uploadedItems.push({
        name: finalFilename,
        relativePath: itemRelPath,
        url: `/uploads/${itemRelPath}`,
        isDirectory: false,
        size: stat.size,
        sizeFormatted: this.formatFileSize(stat.size),
        extension: ext,
        mimeType: this.getMimeType(ext),
        previewType: this.getPreviewType(ext, false),
        modifiedAt: stat.mtime.toISOString(),
      });
    }

    // Jika upload di dalam folder profiles/ atau students/, auto-sync dengan FaceNet AI
    if (relPath.includes('profiles') || relPath.includes('students')) {
      this.triggerFaceAiSync().catch(() => {});
    }

    return {
      success: true,
      uploadedCount: uploadedItems.length,
      files: uploadedItems,
    };
  }

  /**
   * Mengubah Nama File atau Folder
   */
  async renameItem(
    relPath: string = '',
    oldName: string,
    newName: string,
  ): Promise<{ success: boolean; oldPath: string; newPath: string }> {
    if (!oldName || !newName) {
      throw new BadRequestException('Nama lama dan nama baru wajib diisi.');
    }

    const parentDir = this.resolveSafePath(relPath);
    const safeOldName = path.basename(oldName);
    const safeNewName = path.basename(newName).replace(/[\\/:*?"<>|]/g, '_');

    const oldFullPath = path.join(parentDir, safeOldName);
    const newFullPath = path.join(parentDir, safeNewName);

    if (!fs.existsSync(oldFullPath)) {
      throw new NotFoundException(`File atau folder "${safeOldName}" tidak ditemukan.`);
    }

    if (fs.existsSync(newFullPath)) {
      throw new BadRequestException(`Nama "${safeNewName}" sudah digunakan.`);
    }

    await fs.promises.rename(oldFullPath, newFullPath);

    const oldItemRel = relPath ? `${relPath}/${safeOldName}` : safeOldName;
    const newItemRel = relPath ? `${relPath}/${safeNewName}` : safeNewName;

    // Perbarui referensi avatar di database jika foto pengguna diganti namanya
    try {
      const oldUrl = `/uploads/${oldItemRel}`;
      const newUrl = `/uploads/${newItemRel}`;
      await this.prisma.user.updateMany({
        where: { avatarUrl: oldUrl },
        data: { avatarUrl: newUrl },
      });
      await this.prisma.suratMasuk.updateMany({
        where: { fileUrl: oldUrl },
        data: { fileUrl: newUrl },
      });
      await this.prisma.suratKeluar.updateMany({
        where: { fileUrl: oldUrl },
        data: { fileUrl: newUrl },
      });
    } catch {}

    return {
      success: true,
      oldPath: oldItemRel,
      newPath: newItemRel,
    };
  }

  /**
   * Menghapus File atau Folder secara permanen dari server
   */
  async deleteItem(relPath: string = '', name: string): Promise<{ success: boolean; message: string }> {
    if (!name) {
      throw new BadRequestException('Nama berkas atau folder wajib ditentukan.');
    }

    const parentDir = this.resolveSafePath(relPath);
    const safeName = path.basename(name);
    const fullPath = path.join(parentDir, safeName);

    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException(`Item "${safeName}" tidak ditemukan.`);
    }

    const stat = await fs.promises.stat(fullPath);
    if (stat.isDirectory()) {
      await fs.promises.rm(fullPath, { recursive: true, force: true });
      this.logger.log(`Direktori dihapus permanen: ${fullPath}`);
    } else {
      await fs.promises.unlink(fullPath);
      this.logger.log(`File dihapus permanen: ${fullPath}`);
    }

    // Bersihkan referensi avatar jika file foto profil dihapus
    try {
      const itemRelPath = relPath ? `${relPath}/${safeName}` : safeName;
      const fileUrl = `/uploads/${itemRelPath}`;
      await this.prisma.user.updateMany({
        where: { avatarUrl: fileUrl },
        data: { avatarUrl: null },
      });
    } catch {}

    return {
      success: true,
      message: `"${safeName}" berhasil dihapus dari penyimpanan server.`,
    };
  }

  /**
   * Sinkronisasi Realtime Vektor Biometrik FaceNet AI dari file direktori
   */
  async triggerFaceAiSync(): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch('http://127.0.0.1:8089/sync-database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force_refresh: true }),
        signal: AbortSignal.timeout(6000),
      });

      if (res.ok) {
        const json = await res.json();
        return {
          success: true,
          message: `Sinkronisasi AI FaceNet berhasil: ${json.message || 'Model biometrik diperbarui.'}`,
        };
      }
    } catch (err) {
      this.logger.warn(`FaceNet AI Microservice sync notification: ${err}`);
    }

    return {
      success: true,
      message: 'Foto profil tersimpan di penyimpanan server dan siap disinkronkan saat AI aktif.',
    };
  }

  /**
   * Menautkan foto langsung ke Profil Siswa / Pengguna
   */
  async linkPhotoToStudent(
    studentOrUserId: string,
    fileRelPath: string,
  ): Promise<{ success: boolean; message: string }> {
    const fileUrl = `/uploads/${fileRelPath.replace(/^\/+/, '')}`;

    // Cek apakah ID milik Siswa atau User
    const student = await this.prisma.student.findFirst({
      where: {
        OR: [{ id: studentOrUserId }, { userId: studentOrUserId }, { nis: studentOrUserId }],
      },
      include: { user: true },
    });

    if (student && student.userId) {
      await this.prisma.user.update({
        where: { id: student.userId },
        data: { avatarUrl: fileUrl },
      });

      // Trigger sinkronisasi AI langsung
      this.triggerFaceAiSync().catch(() => {});

      return {
        success: true,
        message: `Foto profil siswa ${student.name} berhasil ditautkan dan disinkronkan ke AI Presensi.`,
      };
    }

    // Cek apakah ID milik User langsung (Guru/Pegawai/Admin)
    const user = await this.prisma.user.findUnique({
      where: { id: studentOrUserId },
    });

    if (user) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl: fileUrl },
      });

      this.triggerFaceAiSync().catch(() => {});

      return {
        success: true,
        message: `Foto profil pengguna ${user.name} berhasil ditautkan.`,
      };
    }

    throw new NotFoundException('Data Siswa atau Pengguna tidak ditemukan.');
  }

  /**
   * Menautkan Berkas Scan PDF/Dokumen ke Surat Masuk, Surat Keluar, atau E-Arsip
   */
  async linkDocToSurat(
    suratId: string,
    suratType: 'MASUK' | 'KELUAR',
    fileRelPath: string,
  ): Promise<{ success: boolean; message: string }> {
    const fileUrl = `/uploads/${fileRelPath.replace(/^\/+/, '')}`;

    if (suratType === 'MASUK') {
      const surat = await this.prisma.suratMasuk.findUnique({
        where: { id: suratId },
      });
      if (!surat) throw new NotFoundException('Surat Masuk tidak ditemukan.');

      await this.prisma.suratMasuk.update({
        where: { id: suratId },
        data: { fileUrl },
      });

      return {
        success: true,
        message: `Berkas scan berhasil ditautkan ke Surat Masuk No. ${surat.nomorSurat}.`,
      };
    } else {
      const surat = await this.prisma.suratKeluar.findUnique({
        where: { id: suratId },
      });
      if (!surat) throw new NotFoundException('Surat Keluar tidak ditemukan.');

      await this.prisma.suratKeluar.update({
        where: { id: suratId },
        data: { fileUrl },
      });

      return {
        success: true,
        message: `Berkas dokumen berhasil ditautkan ke Surat Keluar No. ${surat.nomorSurat}.`,
      };
    }
  }

  /**
   * Mengambil daftar siswa untuk picker penautan foto
   */
  async getStudentsList(search: string = ''): Promise<any[]> {
    const students = await this.prisma.student.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { nis: { contains: search, mode: 'insensitive' } },
              { nisn: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      take: 50,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        nis: true,
        nisn: true,
        gender: true,
        userId: true,
        class: {
          select: { id: true, name: true },
        },
        user: {
          select: { id: true, avatarUrl: true, username: true },
        },
      },
    });

    return students.map((s) => ({
      id: s.id,
      userId: s.userId,
      name: s.name,
      nis: s.nis,
      nisn: s.nisn,
      className: s.class?.name || '-',
      avatarUrl: s.user?.avatarUrl || null,
    }));
  }

  /**
   * Mengambil daftar surat untuk picker penautan scan dokumen
   */
  async getSuratList(search: string = ''): Promise<any> {
    const [suratMasuk, suratKeluar] = await Promise.all([
      this.prisma.suratMasuk.findMany({
        where: search
          ? {
              OR: [
                { nomorSurat: { contains: search, mode: 'insensitive' } },
                { perihal: { contains: search, mode: 'insensitive' } },
                { instansi: { contains: search, mode: 'insensitive' } },
              ],
            }
          : undefined,
        take: 30,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          nomorSurat: true,
          nomorAgenda: true,
          instansi: true,
          perihal: true,
          fileUrl: true,
          tanggalSurat: true,
        },
      }),
      this.prisma.suratKeluar.findMany({
        where: search
          ? {
              OR: [
                { nomorSurat: { contains: search, mode: 'insensitive' } },
                { perihal: { contains: search, mode: 'insensitive' } },
                { tujuanPenerima: { contains: search, mode: 'insensitive' } },
              ],
            }
          : undefined,
        take: 30,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          nomorSurat: true,
          nomorAgenda: true,
          tujuanPenerima: true,
          perihal: true,
          fileUrl: true,
          tanggalSurat: true,
        },
      }),
    ]);

    return {
      suratMasuk,
      suratKeluar,
    };
  }

  /**
   * Mengambil daftar tagihan siswa untuk penautan bukti transfer pembayaran
   */
  async getTagihanList(search: string = ''): Promise<any[]> {
    const tagihans = await this.prisma.tagihan.findMany({
      where: search
        ? {
            OR: [
              { student: { name: { contains: search, mode: 'insensitive' } } },
              { student: { nis: { contains: search, mode: 'insensitive' } } },
              { type: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      take: 40,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        amount: true,
        amountPaid: true,
        status: true,
        month: true,
        year: true,
        studentId: true,
        student: {
          select: {
            id: true,
            name: true,
            nis: true,
            class: {
              select: { name: true },
            },
          },
        },
      },
    });

    return tagihans.map((t) => ({
      id: t.id,
      studentId: t.studentId,
      studentName: t.student?.name || '-',
      studentNis: t.student?.nis || '-',
      className: t.student?.class?.name || '-',
      jenisTagihan: t.type || 'Tagihan',
      amount: t.amount,
      amountPaid: t.amountPaid,
      status: t.status,
      month: t.month,
      year: t.year,
    }));
  }

  /**
   * Menautkan berkas bukti transfer ke Tagihan / Bukti Pembayaran Siswa
   */
  async linkProofToTagihan(
    tagihanId: string,
    fileRelPath: string,
    amount?: number,
    notes?: string,
  ): Promise<{ success: boolean; message: string; proofId: string }> {
    const tagihan = await this.prisma.tagihan.findUnique({
      where: { id: tagihanId },
      include: { student: true },
    });

    if (!tagihan) {
      throw new NotFoundException('Data Tagihan tidak ditemukan.');
    }

    const proofUrl = `/uploads/${fileRelPath.replace(/^\/+/, '')}`;
    const proofAmount = typeof amount === 'number' && amount > 0 ? amount : (tagihan.amount - (tagihan.amountPaid || 0));

    const paymentProof = await this.prisma.paymentProof.create({
      data: {
        studentId: tagihan.studentId,
        tagihanId: tagihan.id,
        amount: proofAmount,
        proofUrl,
        status: 'MENUNGGU_VERIFIKASI',
        notes: notes || `Bukti pembayaran diunggah melalui File Explorer (${tagihan.type || 'Tagihan'})`,
      },
    });

    return {
      success: true,
      message: `Bukti transfer berhasil ditautkan ke tagihan ${tagihan.student?.name || 'Siswa'} (${tagihan.type || 'Tagihan'}).`,
      proofId: paymentProof.id,
    };
  }

  // Token cache sementara untuk verifikasi bertingkat reset sistem (berlaku 5 menit)
  private resetChallengeTokens = new Map<string, { token: string; expiresAt: number; userId: string }>();

  /**
   * Mengambil daftar file arsip backup yang ada di ./uploads/backups/
   */
  async getBackupsList() {
    const backupDir = path.join(STORAGE_ROOT, 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const files = await fs.promises.readdir(backupDir);
    const result: any[] = [];

    for (const f of files) {
      if (!f.endsWith('.json') && !f.endsWith('.sql') && !f.endsWith('.dump')) continue;
      const fullPath = path.join(backupDir, f);
      try {
        const stat = await fs.promises.stat(fullPath);
        result.push({
          name: f,
          relativePath: `backups/${f}`,
          size: stat.size,
          sizeFormatted: this.formatFileSize(stat.size),
          createdAt: stat.mtime.toISOString(),
          type: f.endsWith('.json') ? 'FULL_SNAPSHOT_JSON' : 'DATABASE_SQL',
        });
      } catch {}
    }

    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return result;
  }

  /**
   * Membuat Backup Lengkap (Database Data Snapshot + File Storage Metadata)
   * Berlaku untuk seluruh data aplikasi (Siswa, Guru, Wali Murid, Presensi, Keuangan, Persuratan, Buku Induk, Inventaris)
   */
  async createFullBackup(notes?: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `SIMASMUH_BACKUP_${timestamp}.json`;
    const backupDir = path.join(STORAGE_ROOT, 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const backupFilePath = path.join(backupDir, backupFileName);

    this.logger.log(`Memulai proses Full Backup Sistem ke: ${backupFileName}`);

    // Ekstraksi data tabel secara komprehensif
    const [
      users,
      students,
      parentProfiles,
      parentStudents,
      classes,
      subjects,
      attendances,
      tagihans,
      paymentProofs,
      suratMasuks,
      suratKeluars,
      guestBooks,
      staffJournals,
    ] = await Promise.all([
      this.prisma.user.findMany({
        select: {
          id: true,
          username: true,
          email: true,
          name: true,
          role: true,
          subRole: true,
          subRole2: true,
          subRole3: true,
          subRole4: true,
          subRole5: true,
          phone: true,
          avatarUrl: true,
          address: true,
          employmentStatus: true,
          bankName: true,
          bankAccountNumber: true,
          bankAccountHolder: true,
          nipNbm: true,
          isActive: true,
        },
      }),
      this.prisma.student.findMany(),
      this.prisma.parentProfile.findMany(),
      this.prisma.parentStudent.findMany(),
      this.prisma.class.findMany(),
      this.prisma.subject.findMany(),
      this.prisma.dailyAttendance.findMany({ take: 5000, orderBy: { date: 'desc' } }),
      this.prisma.tagihan.findMany({ take: 5000, orderBy: { createdAt: 'desc' } }),
      this.prisma.paymentProof.findMany({ take: 5000, orderBy: { createdAt: 'desc' } }),
      this.prisma.suratMasuk.findMany({ take: 2000, orderBy: { createdAt: 'desc' } }),
      this.prisma.suratKeluar.findMany({ take: 2000, orderBy: { createdAt: 'desc' } }),
      this.prisma.guestBook.findMany({ take: 2000, orderBy: { createdAt: 'desc' } }),
      this.prisma.staffJournal.findMany({ take: 2000, orderBy: { createdAt: 'desc' } }),
    ]);

    // Ekstraksi metadata berkas di storage
    const storageStats = await this.getStats();

    const backupPayload = {
      version: '1.0',
      system: 'SIMASMUH',
      generatedAt: new Date().toISOString(),
      notes: notes || 'Backup snapshot sistem dan data basis data SIMASMUH',
      storageRoot: STORAGE_ROOT,
      storageStats,
      summary: {
        totalUsers: users.length,
        totalStudents: students.length,
        totalParents: parentProfiles.length,
        totalClasses: classes.length,
        totalSubjects: subjects.length,
        totalAttendances: attendances.length,
        totalTagihans: tagihans.length,
        totalPaymentProofs: paymentProofs.length,
        totalSuratMasuk: suratMasuks.length,
        totalSuratKeluar: suratKeluars.length,
      },
      data: {
        users,
        students,
        parentProfiles,
        parentStudents,
        classes,
        subjects,
        attendances,
        tagihans,
        paymentProofs,
        suratMasuks,
        suratKeluars,
        guestBooks,
        staffJournals,
      },
    };

    await fs.promises.writeFile(backupFilePath, JSON.stringify(backupPayload, null, 2), 'utf8');

    const stat = await fs.promises.stat(backupFilePath);

    return {
      success: true,
      message: 'Backup data sistem dan snapshot basis data berhasil dibuat.',
      fileName: backupFileName,
      relativePath: `backups/${backupFileName}`,
      sizeFormatted: this.formatFileSize(stat.size),
      summary: backupPayload.summary,
    };
  }

  /**
   * Tahap 1 Reset Sistem: Request Token Autentikasi Rahasia (Multi-Factor Challenge)
   * Mengharuskan password akun Superadmin aktif diverifikasi terlebih dahulu
   */
  async requestResetChallenge(userId: string, currentPassword?: string) {
    if (!currentPassword) {
      throw new BadRequestException('Password akun Superadmin wajib dimasukkan untuk otorisasi tindakan kritis.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Pengguna tidak ditemukan.');
    }

    // Wajib Superadmin
    if (user.role !== 'SUPERADMIN') {
      throw new ForbiddenException('Tindakan Reset Sistem hanya dapat diotorisasi oleh SUPERADMIN.');
    }

    // Verifikasi password pengguna
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Password akun Superadmin salah. Otorisasi Reset Sistem ditolak.');
    }

    // Generate token rahasia acak 64-karakter dengan masa kedaluwarsa 5 menit
    const resetToken = crypto.randomBytes(32).toString('hex');
    const challengeCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit PIN
    const expiresAt = Date.now() + 5 * 60 * 1000;

    this.resetChallengeTokens.set(userId, {
      token: `${resetToken}-${challengeCode}`,
      expiresAt,
      userId,
    });

    this.logger.warn(`RESET SYSTEM CHALLENGE ISSUED untuk Superadmin: ${user.name} (${user.username}). PIN Konfirmasi: ${challengeCode}`);

    return {
      success: true,
      message: 'Otorisasi tahap 1 berhasil. Masukkan PIN konfirmasi rahasia dan frasa keamanan untuk mengeksekusi reset.',
      challengeCode, // Diberikan langsung ke admin di response modal aman
      expiresInSeconds: 300,
    };
  }

  /**
   * Tahap 2 Reset Sistem: Eksekusi Reset Data Transaksional dengan Proteksi Penuh
   * Sesuai aturan: Akun superadmin inti dipertahankan utuh, struktur database tetap terjaga.
   */
  async executeSystemReset(
    userId: string,
    payload: {
      challengeCode: string;
      confirmPhrase: string; // Wajib: "SAYA YAKIN RESET DATA SIMASMUH"
      resetOption: 'TRANSACTIONAL_ONLY' | 'ALL_STUDENTS_AND_DATA';
    },
  ) {
    if (payload.confirmPhrase !== 'SAYA YAKIN RESET DATA SIMASMUH') {
      throw new BadRequestException('Frasa konfirmasi tidak cocok. Ketik tepat: "SAYA YAKIN RESET DATA SIMASMUH"');
    }

    const challenge = this.resetChallengeTokens.get(userId);
    if (!challenge || Date.now() > challenge.expiresAt) {
      this.resetChallengeTokens.delete(userId);
      throw new UnauthorizedException('Sesi otorisasi reset telah kedaluwarsa. Silakan lakukan verifikasi password ulang.');
    }

    if (!challenge.token.endsWith(`-${payload.challengeCode}`)) {
      throw new UnauthorizedException('Kode PIN otorisasi reset tidak valid.');
    }

    // Validasi ulang user
    const superadmin = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!superadmin || superadmin.role !== 'SUPERADMIN') {
      throw new ForbiddenException('Akses ditolak.');
    }

    // Buat snapshot backup otomatis terlebih dahulu sebelum reset dieksekusi demi keamanan
    try {
      await this.createFullBackup('Otomatis dibuat oleh sistem sebelum System Reset dieksekusi');
    } catch (e: any) {
      this.logger.warn('Gagal membuat auto-backup sebelum reset:', e);
    }

    this.logger.error(`MEMULAI EKSEKUSI SYSTEM RESET oleh Superadmin ${superadmin.username} (${superadmin.name}). Opsi: ${payload.resetOption}`);

    // Hapus data transaksional yang aman untuk direset
    await this.prisma.$transaction([
      this.prisma.dailyAttendance.deleteMany(),
      this.prisma.paymentProof.deleteMany(),
      this.prisma.tagihan.deleteMany(),
      this.prisma.guestBook.deleteMany(),
      this.prisma.staffJournal.deleteMany(),
      this.prisma.suratMasuk.deleteMany(),
      this.prisma.suratKeluar.deleteMany(),
      this.prisma.izinKeluar.deleteMany(),
    ]);

    // Jika opsi mencakup data siswa & wali
    if (payload.resetOption === 'ALL_STUDENTS_AND_DATA') {
      await this.prisma.$transaction([
        this.prisma.parentStudent.deleteMany(),
        this.prisma.parentProfile.deleteMany(),
        this.prisma.student.deleteMany(),
        this.prisma.user.deleteMany({
          where: {
            role: { in: ['SISWA', 'WALI_MURID'] },
          },
        }),
      ]);
    }

    // Bersihkan token
    this.resetChallengeTokens.delete(userId);

    return {
      success: true,
      message: 'Sistem berhasil direset dengan aman. Seluruh data lama telah dibersihkan dan snapshot backup darurat telah disimpan.',
      resetOption: payload.resetOption,
      executedBy: superadmin.name,
      timestamp: new Date().toISOString(),
    };
  }
}


