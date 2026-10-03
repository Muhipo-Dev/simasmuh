import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { SystemLogService } from '../../core/services/system-log.service';
import { CreateExtracurricularDto, UpdateExtracurricularDto, AddMemberDto } from './dto/extracurricular.dto';

@Injectable()
export class ExtracurricularService {
  constructor(
    private prisma: PrismaService,
    private systemLogService: SystemLogService,
  ) {}

  /**
   * Seed otomatis ekstrakurikuler resmi default SMA Muhammadiyah 1 Ponorogo jika kosong di DB
   */
  private async ensureDefaultSeed() {
    const count = await this.prisma.extracurricular.count();
    if (count > 0) return;

    const defaults = [
      {
        name: 'Gerakan Kepanduan Hizbul Wathan (HW)',
        code: 'HW',
        category: 'WAJIB_MUHAMMADIYAH',
        description: 'Kepanduan wajib bernafaskan Islam Muhammadiyah untuk melatih kepemimpinan, kemandirian, dan kedisiplinan.',
        scheduleDay: 'Jumat',
        scheduleTime: '13:30 - 15:30',
        location: 'Halaman Utama SMA Muhammadiyah 1 Ponorogo',
        pembinaName: 'Fahrur Roji, S.Pd.I',
        pembinaNip: '1382117',
        targetPeserta: 'Wajib Kelas X & Pilihan Kelas XI/XII',
      },
      {
        name: 'Perguruan Seni Bela Diri Tapak Suci Putra Muhammadiyah',
        code: 'TS',
        category: 'WAJIB_MUHAMMADIYAH',
        description: 'Bela diri pencak silat resmi Muhammadiyah dengan tradisi prestasi kejuaraan nasional dan daerah.',
        scheduleDay: 'Sabtu',
        scheduleTime: '15:30 - 17:00',
        location: 'Aula Sport Hall Lt. 3',
        pembinaName: 'Ahmad Khoiruddin, S.Or',
        pembinaNip: '1092881',
        targetPeserta: 'Semua Tingkat (X, XI, XII)',
      },
      {
        name: 'Ikatan Pelajar Muhammadiyah (PR IPM MUHIPO)',
        code: 'IPM',
        category: 'KEORGANISASIAN',
        description: 'Organisasi otonom kesiswaan resmi untuk kaderisasi, kepemimpinan, dan literasi dakwah pelajar.',
        scheduleDay: 'Senin & Kamis',
        scheduleTime: '15:30 - 16:30',
        location: 'Ruang Sekretariat IPM',
        pembinaName: 'Drs. Supriyanto',
        pembinaNip: '197008121998021001',
        targetPeserta: 'Pengurus & Kader IPM',
      },
      {
        name: 'Palang Merah Remaja (PMR WIRA MUHIPO)',
        code: 'PMR',
        category: 'KESEHATAN_SOSIAL',
        description: 'Pelayanan pertolongan pertama, donor darah, UKS, dan aksi tanggap darurat kemanusiaan.',
        scheduleDay: 'Kamis',
        scheduleTime: '15:30 - 17:00',
        location: 'Ruang UKS & Lapangan',
        pembinaName: 'Siti Nurjanah, S.Pd',
        pembinaNip: '198204152009012008',
        targetPeserta: 'Semua Tingkat (X, XI, XII)',
      },
      {
        name: 'Pasukan Pengibar Bendera (Paskibraka MUHIPO)',
        code: 'PAS',
        category: 'KEPEMIMPINAN',
        description: 'Pelatihan baris berbaris, tata upacara bendera, dan persiapan seleksi paskibra kabupaten.',
        scheduleDay: 'Selasa & Jumat',
        scheduleTime: '15:30 - 17:00',
        location: 'Lapangan Depan',
        pembinaName: 'Bambang Eko S., S.Pd',
        pembinaNip: '197603102008011005',
        targetPeserta: 'Semua Tingkat (X, XI, XII)',
      },
      {
        name: 'Klub Futsal & Sepak Bola',
        code: 'FUTSAL',
        category: 'OLAHRAGA',
        description: 'Pengembangan bakat olahraga bola sepak dan futsal untuk persiapan kompetisi antar pelajar.',
        scheduleDay: 'Rabu',
        scheduleTime: '15:30 - 17:30',
        location: 'Lapangan Futsal MUHIPO',
        pembinaName: 'Rian Prasetyo, S.Pd',
        pembinaNip: '-',
        targetPeserta: 'Semua Tingkat (X, XI, XII)',
      },
      {
        name: 'Klub Robotika & IoT Coding',
        code: 'ROBOTIK',
        category: 'AKADEMIK_SAINS',
        description: 'Rancang bangun robot mikrokontroler, pemrograman Arduino, dan olimpiade teknologi cerdas.',
        scheduleDay: 'Kamis',
        scheduleTime: '15:30 - 17:00',
        location: 'Lab Komputer 1',
        pembinaName: 'Ir. Hendra Gunawan, S.Kom',
        pembinaNip: '198506222010011012',
        targetPeserta: 'Semua Tingkat (X, XI, XII)',
      },
      {
        name: 'Tahfidz & Tilawatil Quran',
        code: 'TAHFIDZ_EKS',
        category: 'KEAGAMAAN',
        description: 'Pendalaman hafalan Al-Quran, tajwid makharijul huruf, dan seni membaca Al-Quran (qiroah).',
        scheduleDay: 'Senin - Rabu',
        scheduleTime: '06:30 - 07:15',
        location: 'Masjid Darul Hikmah MUHIPO',
        pembinaName: 'Ust. Muhammad Wildan, S.Th.I',
        pembinaNip: '-',
        targetPeserta: 'Semua Tingkat (X, XI, XII)',
      },
    ];

    for (const item of defaults) {
      await this.prisma.extracurricular.create({
        data: item,
      });
    }
  }

  async findAll(category?: string, search?: string) {
    await this.ensureDefaultSeed();

    const where: any = {};
    if (category && category !== 'ALL') {
      where.category = category;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { pembinaName: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.extracurricular.findMany({
      where,
      include: {
        members: {
          include: {
            student: {
              include: {
                class: true,
              },
            },
          },
        },
      },
      orderBy: [
        { isActive: 'desc' },
        { name: 'asc' },
      ],
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.extracurricular.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            student: {
              include: {
                class: true,
              },
            },
          },
          orderBy: {
            joinedAt: 'asc',
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Data ekstrakurikuler tidak ditemukan.');
    }
    return item;
  }

  async create(dto: CreateExtracurricularDto, user: any) {
    const extracurricular = await this.prisma.extracurricular.create({
      data: {
        name: dto.name,
        code: dto.code || null,
        category: dto.category || 'UMUM',
        description: dto.description || null,
        scheduleDay: dto.scheduleDay || null,
        scheduleTime: dto.scheduleTime || null,
        location: dto.location || null,
        pembinaId: dto.pembinaId || null,
        pembinaName: dto.pembinaName,
        pembinaNip: dto.pembinaNip || null,
        pembinaContact: dto.pembinaContact || null,
        pembina2Name: dto.pembina2Name || null,
        pembina2Contact: dto.pembina2Contact || null,
        logoUrl: dto.logoUrl || null,
        targetPeserta: dto.targetPeserta || 'Semua Tingkat (X, XI, XII)',
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        createdBy: user?.name || user?.email || 'KESISWAAN',
      },
    });

    await this.systemLogService.log({
      category: 'AKADEMIK',
      level: 'INFO',
      action: 'EXTRACURRICULAR_CREATED',
      message: `Ekstrakurikuler "${extracurricular.name}" dengan pembina ${extracurricular.pembinaName} berhasil ditambahkan oleh ${user?.name}.`,
      userId: user?.id,
      details: { extracurricularId: extracurricular.id },
    });

    return extracurricular;
  }

  async update(id: string, dto: UpdateExtracurricularDto, user: any) {
    await this.findOne(id);

    const updated = await this.prisma.extracurricular.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.code !== undefined && { code: dto.code }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.scheduleDay !== undefined && { scheduleDay: dto.scheduleDay }),
        ...(dto.scheduleTime !== undefined && { scheduleTime: dto.scheduleTime }),
        ...(dto.location !== undefined && { location: dto.location }),
        ...(dto.pembinaId !== undefined && { pembinaId: dto.pembinaId }),
        ...(dto.pembinaName !== undefined && { pembinaName: dto.pembinaName }),
        ...(dto.pembinaNip !== undefined && { pembinaNip: dto.pembinaNip }),
        ...(dto.pembinaContact !== undefined && { pembinaContact: dto.pembinaContact }),
        ...(dto.pembina2Name !== undefined && { pembina2Name: dto.pembina2Name }),
        ...(dto.pembina2Contact !== undefined && { pembina2Contact: dto.pembina2Contact }),
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
        ...(dto.targetPeserta !== undefined && { targetPeserta: dto.targetPeserta }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    await this.systemLogService.log({
      category: 'AKADEMIK',
      level: 'INFO',
      action: 'EXTRACURRICULAR_UPDATED',
      message: `Data ekstrakurikuler "${updated.name}" berhasil diperbarui.`,
      userId: user?.id,
      details: { extracurricularId: updated.id },
    });

    return updated;
  }

  async delete(id: string, user: any) {
    const existing = await this.findOne(id);
    await this.prisma.extracurricular.delete({ where: { id } });

    await this.systemLogService.log({
      category: 'AKADEMIK',
      level: 'WARN',
      action: 'EXTRACURRICULAR_DELETED',
      message: `Ekstrakurikuler "${existing.name}" telah dihapus oleh ${user?.name}.`,
      userId: user?.id,
      details: { extracurricularId: id },
    });

    return { success: true, message: 'Ekstrakurikuler berhasil dihapus.' };
  }

  async addMember(extracurricularId: string, dto: AddMemberDto) {
    await this.findOne(extracurricularId);

    const existingMember = await this.prisma.extracurricularMember.findUnique({
      where: {
        extracurricularId_studentId: {
          extracurricularId,
          studentId: dto.studentId,
        },
      },
    });

    if (existingMember) {
      throw new ConflictException('Siswa ini sudah terdaftar di ekstrakurikuler tersebut.');
    }

    return this.prisma.extracurricularMember.create({
      data: {
        extracurricularId,
        studentId: dto.studentId,
        role: dto.role || 'ANGGOTA',
        catatan: dto.catatan || null,
      },
      include: {
        student: {
          include: {
            class: true,
          },
        },
      },
    });
  }

  async removeMember(memberId: string) {
    return this.prisma.extracurricularMember.delete({
      where: { id: memberId },
    });
  }

  async getStats() {
    await this.ensureDefaultSeed();

    const [totalEkskul, activeEkskul, totalAnggota] = await Promise.all([
      this.prisma.extracurricular.count(),
      this.prisma.extracurricular.count({ where: { isActive: true } }),
      this.prisma.extracurricularMember.count({ where: { status: 'AKTIF' } }),
    ]);

    return {
      totalEkskul,
      activeEkskul,
      totalAnggota,
    };
  }
}
