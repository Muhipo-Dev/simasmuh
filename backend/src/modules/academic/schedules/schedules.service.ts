import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

// Daftar Akronim & Singkatan Mata Pelajaran yang Wajib Full Kapital (UPPERCASE)
const KNOWN_UPPERCASE_ACRONYMS = new Set([
  'KKA',
  'TIK',
  'IT',
  'ICT',
  'PKWU',
  'PKW',
  'PJOK',
  'PPKN',
  'PKN',
  'PAI',
  'BK',
  'BP',
  'IPA',
  'IPS',
  'MTK',
  'SBD',
  'SBK',
  'FIS',
  'KIM',
  'BIO',
  'EKO',
  'GEO',
  'SOS',
  'SEJ',
  'KMD',
  'ISMUBA',
  'P5',
  'P3',
  'KKPI',
  'TKJ',
  'RPL',
  'AKL',
  'OTKP',
  'DKV',
  'BING',
  'BIND',
  'BA',
  'BJ',
  'MLK',
  'MULOK',
  'AI',
  'XII',
  'XI',
  'X',
  'IX',
  'VIII',
  'VII',
]);

// Kamus Normalisasi Mata Pelajaran Standar Kurikulum Nasional & Muhammadiyah
const SUBJECT_DICTIONARY: Record<string, string> = {
  // Singkatan / Akronim KKA & TIK & Vokasi / IT (Full Kapital)
  'kka': 'KKA',
  'tik': 'TIK',
  'it': 'IT',
  'ict': 'ICT',
  'pkwu': 'PKWU',
  'pkw': 'PKWU',
  'kkpi': 'KKPI',
  'tkj': 'TKJ',
  'rpl': 'RPL',
  'akl': 'AKL',
  'otkp': 'OTKP',
  'dkv': 'DKV',
  'ai': 'AI',

  // Singkatan PJOK, PPKn, PAI, BK, ISMUBA, P5, Mapel Dasar
  'pjok': 'PJOK',
  'ppkn': 'PPKN',
  'pkn': 'PKN',
  'pai': 'PAI',
  'bk': 'BK',
  'bp': 'BP',
  'p5': 'P5',
  'kmd': 'KMD',
  'ismuba': 'ISMUBA',
  'ipa': 'IPA',
  'ips': 'IPS',
  'sbd': 'SBD',
  'sbk': 'SBK',
  'mtk': 'MTK',

  // Matematika
  'mat': 'Matematika',
  'math': 'Matematika',
  'matematika': 'Matematika',
  'matematika wajib': 'Matematika',
  'matematika peminatan': 'Matematika Tingkat Lanjut',
  'mtk wajib': 'MTK',
  'mtk peminatan': 'MTK Tingkat Lanjut',
  'mtk tl': 'MTK Tingkat Lanjut',

  // Bahasa Indonesia
  'b indo': 'Bahasa Indonesia',
  'bhs indo': 'Bahasa Indonesia',
  'bhs indonesia': 'Bahasa Indonesia',
  'b indonesia': 'Bahasa Indonesia',
  'bind': 'Bahasa Indonesia',
  'bindo': 'Bahasa Indonesia',
  'bi': 'Bahasa Indonesia',
  'bahasa indonesia': 'Bahasa Indonesia',
  'bahasa dan sastra indonesia': 'Bahasa Indonesia Tingkat Lanjut',

  // Bahasa Inggris
  'b ing': 'Bahasa Inggris',
  'bhs ing': 'Bahasa Inggris',
  'bhs inggris': 'Bahasa Inggris',
  'b inggris': 'Bahasa Inggris',
  'bing': 'Bahasa Inggris',
  'big': 'Bahasa Inggris',
  'bahasa inggris': 'Bahasa Inggris',
  'bahasa dan sastra inggris': 'Bahasa Inggris Tingkat Lanjut',

  // PAI & ISMUBA
  'pend agama': 'Pendidikan Agama Islam',
  'pend agama islam': 'Pendidikan Agama Islam',
  'agama': 'Pendidikan Agama Islam',
  'agama islam': 'Pendidikan Agama Islam',
  'pendidikan agama islam': 'Pendidikan Agama Islam',
  'pai & bp': 'PAI & BP',
  'pai dan budi pekerti': 'Pendidikan Agama Islam',
  'fiqih': 'Fiqih',
  'aqidah akhlak': 'Aqidah Akhlak',
  'quran hadis': 'Al-Quran Hadis',
  'ski': 'Sejarah Kebudayaan Islam',
  'kemuhammadiyahan': 'Kemuhammadiyahan',
  'pendidikan ismuba': 'Pendidikan ISMUBA',

  // PPKn
  'civics': 'Pendidikan Pancasila dan Kewarganegaraan',
  'pendidikan pancasila': 'Pendidikan Pancasila dan Kewarganegaraan',
  'pendidikan kewarganegaraan': 'Pendidikan Pancasila dan Kewarganegaraan',
  'pendidikan pancasila dan kewarganegaraan': 'Pendidikan Pancasila dan Kewarganegaraan',

  // PJOK
  'penjas': 'Pendidikan Jasmani, Olahraga, dan Kesehatan',
  'olahraga': 'Pendidikan Jasmani, Olahraga, dan Kesehatan',
  'penjaskes': 'Pendidikan Jasmani, Olahraga, dan Kesehatan',
  'penjasorkes': 'Pendidikan Jasmani, Olahraga, dan Kesehatan',
  'pendidikan jasmani olahraga dan kesehatan': 'Pendidikan Jasmani, Olahraga, dan Kesehatan',

  // Seni Budaya
  'seni': 'Seni Budaya',
  'seni budaya': 'Seni Budaya',
  'seni rupa': 'Seni Rupa',
  'seni musik': 'Seni Musik',
  'seni tari': 'Seni Tari',
  'seni teater': 'Seni Teater',

  // IPA & Peminatan
  'fis': 'Fisika',
  'fisika': 'Fisika',
  'kim': 'Kimia',
  'kimia': 'Kimia',
  'bio': 'Biologi',
  'biologi': 'Biologi',

  // IPS & Peminatan
  'eko': 'Ekonomi',
  'ekonomi': 'Ekonomi',
  'akuntansi': 'Akuntansi',
  'geo': 'Geografi',
  'geografi': 'Geografi',
  'sos': 'Sosiologi',
  'sosiologi': 'Sosiologi',

  // Sejarah
  'sej': 'Sejarah',
  'sejarah': 'Sejarah',
  'sejarah indonesia': 'Sejarah',
  'sejarah peminatan': 'Sejarah Tingkat Lanjut',
  'sej peminatan': 'Sejarah Tingkat Lanjut',
  'sej indo': 'Sejarah',

  // Bahasa Daerah & Asing
  'b arab': 'Bahasa Arab',
  'bhs arab': 'Bahasa Arab',
  'bahasa arab': 'Bahasa Arab',
  'arab': 'Bahasa Arab',
  'b jawa': 'Bahasa Jawa',
  'bhs jawa': 'Bahasa Jawa',
  'bahasa jawa': 'Bahasa Jawa',
  'jawa': 'Bahasa Jawa',
  'mulok jawa': 'Bahasa Jawa',
  'b jepang': 'Bahasa Jepang',
  'bahasa jepang': 'Bahasa Jepang',

  // IT, Vokasi, Bimbingan & Projek
  'informatika': 'Informatika',
  'komputer': 'Informatika',
  'prakarya': 'Prakarya dan Kewirausahaan',
  'kewirausahaan': 'Prakarya dan Kewirausahaan',
  'bimbingan konseling': 'Bimbingan Konseling',
  'bimbingan dan konseling': 'Bimbingan Konseling',
  'projek p3': 'Projek P5',
  'projek p5': 'Projek P5',
  'wali kelas': 'Jam Wali Kelas',
  'pembinaan': 'Jam Wali Kelas',
  'jam wali kelas': 'Jam Wali Kelas',
  'homeroom': 'Jam Wali Kelas',
};

function normalizeSubjectString(rawName: string): string {
  if (!rawName) return '';
  const trimmed = rawName.trim();
  const lower = trimmed
    .replace(/[._-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  // 1. Cek di Kamus
  if (SUBJECT_DICTIONARY[lower]) {
    return SUBJECT_DICTIONARY[lower];
  }

  // 2. Jika merupakan singkatan tunggal 2-5 karakter (misal KKA, TIK, PKWU, P5, dll)
  const cleanToken = trimmed.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (
    KNOWN_UPPERCASE_ACRONYMS.has(cleanToken) ||
    (cleanToken.length >= 2 && cleanToken.length <= 5 && (!/[aeiou]/i.test(trimmed) || /^[A-Z0-9]+$/.test(trimmed)))
  ) {
    return cleanToken;
  }

  // 3. Normalisasi kata per kata: jaga seluruh akronim / singkatan agar selalu FULL UPPERCASE
  return trimmed
    .split(/\s+/)
    .map((word) => {
      const cleanWord = word.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      if (
        KNOWN_UPPERCASE_ACRONYMS.has(cleanWord) ||
        (cleanWord.length >= 2 && cleanWord.length <= 5 && (!/[aeiou]/i.test(cleanWord) || /^[A-Z0-9]+$/.test(word)))
      ) {
        return word.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.substring(1).toLowerCase();
    })
    .join(' ');
}

function normalizeClassString(rawName: string): { name: string; gradeLevel: number } {
  if (!rawName) return { name: 'X 1', gradeLevel: 10 };
  let clean = rawName.trim();
  clean = clean.replace(/^(kelas|class|tingkat|ruang|r\.)\s+/i, '').trim();

  const romanMatch = clean.match(/^(XII|XI|X|IX|VIII|VII)\b[\s\-._]*(?:ipa|ips|mipa|mia|iis|ibb|bahasa|keagamaan|tkj|rpl|akl|otkp)?[\s\-._]*(\d+)?/i);
  if (romanMatch) {
    const roman = romanMatch[1].toUpperCase();
    const num = romanMatch[2] || '1';
    let gradeLevel = 10;
    if (roman === 'XI') gradeLevel = 11;
    else if (roman === 'XII') gradeLevel = 12;
    return { name: `${roman} ${num}`, gradeLevel };
  }

  const arabicMatch = clean.match(/^(12|11|10)\b[\s\-._]*(?:ipa|ips|mipa|mia|iis|ibb)?[\s\-._]*(\d+)?/i);
  if (arabicMatch) {
    const grade = parseInt(arabicMatch[1], 10);
    const roman = grade === 10 ? 'X' : grade === 11 ? 'XI' : 'XII';
    const num = arabicMatch[2] || '1';
    return { name: `${roman} ${num}`, gradeLevel: grade };
  }

  return { name: clean, gradeLevel: 10 };
}

function cleanTeacherName(name: string): string {
  if (!name) return '';
  return name
    .replace(/\b(Drs|Dra|Dr|Prof|Ir|H|Hj|Ust|Ustadz|Pak|Bu|Ibu|Bapak)\b\.?/gi, '')
    .replace(/,\s*(S\.Pd|S\.Pd\.I|S\.Pd\.SD|M\.Pd|M\.Pd\.I|S\.Ag|M\.Ag|S\.Kom|M\.Kom|S\.T|M\.T|S\.Si|M\.Si|S\.E|M\.M|S\.Sos|M\.Sos|S\.Psi|M\.Psi|S\.H|M\.H|S\.Sn|M\.Sn|Lc|M\.A|Ph\.D)\b\.?/gi, '')
    .replace(/\b(S\.Pd|S\.Pd\.I|S\.Pd\.SD|M\.Pd|M\.Pd\.I|S\.Ag|M\.Ag|S\.Kom|M\.Kom|S\.T|M\.T|S\.Si|M\.Si|S\.E|M\.M|S\.Sos|M\.Sos|S\.Psi|M\.Psi|S\.H|M\.H|S\.Sn|M\.Sn|Lc|M\.A)\b\.?/gi, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function getTeacherInitials(name: string): string {
  if (!name) return '';
  const clean = cleanTeacherName(name);
  return clean
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0].toUpperCase())
    .join('');
}

function stringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().replace(/\s+/g, '');
  const s2 = str2.toLowerCase().replace(/\s+/g, '');
  if (s1 === s2) return 1.0;
  if (s1.length < 2 || s2.length < 2) return 0;

  const getBigrams = (str: string) => {
    const bigrams = new Map<string, number>();
    for (let i = 0; i < str.length - 1; i++) {
      const bg = str.substring(i, i + 2);
      bigrams.set(bg, (bigrams.get(bg) || 0) + 1);
    }
    return bigrams;
  };

  const bg1 = getBigrams(s1);
  const bg2 = getBigrams(s2);
  let intersection = 0;

  bg1.forEach((count, bg) => {
    if (bg2.has(bg)) {
      intersection += Math.min(count, bg2.get(bg)!);
    }
  });

  const total = (s1.length - 1) + (s2.length - 1);
  return (2.0 * intersection) / total;
}

function parseTimeToMinutes(t: string | undefined | null): number {
  if (!t) return 0;
  const clean = t.replace('.', ':').trim();
  const parts = clean.split(':');
  const hours = parseInt(parts[0] || '0', 10) || 0;
  const minutes = parseInt(parts[1] || '0', 10) || 0;
  return hours * 60 + minutes;
}

@Injectable()
export class SchedulesService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: { userId?: string; teacherId?: string }) {
    const where: any = {};
    if (query?.teacherId) {
      where.teacherId = query.teacherId;
    }
    if (query?.userId) {
      where.teacher = { userId: query.userId };
    }
    return this.prisma.schedule.findMany({
      where,
      include: {
        class: true,
        subject: true,
        teacher: { include: { user: true } },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  async findOne(id: string) {
    return this.prisma.schedule.findUnique({
      where: { id },
      include: {
        class: true,
        subject: true,
        teacher: { include: { user: true } },
      },
    });
  }

  async create(data: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    classId: string;
    subjectId: string;
    teacherId: string;
  }) {
    if (data.dayOfWeek < 1 || data.dayOfWeek > 5) {
      throw new Error('Jadwal pelajaran hanya dapat dialokasikan untuk hari kerja efektif (Senin s.d. Jumat).');
    }
    return this.prisma.schedule.create({
      data,
      include: {
        class: true,
        subject: true,
        teacher: { include: { user: true } },
      },
    });
  }

  /**
   * Bulk Import aSc Timetables dengan Algoritma AI Resolver Guru Pengampu & Sinkronisasi Mutlak
   */
  async createBulk(dataArray: any[], replaceExisting: boolean = true) {
    if (!Array.isArray(dataArray) || dataArray.length === 0) {
      return [];
    }

    // 1. Ambil Pengaturan Tahun Ajaran Aktif
    const setting = await this.prisma.setting.findFirst({
      select: { academicYear: true },
    });
    const currentAcademicYear = setting?.academicYear || '2026/2027';

    // 2. Load Data Eksisting untuk AI Solver
    const existingClasses = await this.prisma.class.findMany({
      include: { homeroomTeacher: { include: { user: true } } },
    });
    const existingSubjects = await this.prisma.subject.findMany({
      include: { teacherSubjects: true },
    });
    const existingTeachers = await this.prisma.teacherProfile.findMany({
      include: {
        user: true,
        homeroomClasses: true,
        teacherSubjects: true,
      },
    });

    // Inisialisasi Lookup Maps
    const classMap = new Map<string, any>();
    for (const c of existingClasses) {
      classMap.set(c.name.toLowerCase().trim(), c);
      const norm = normalizeClassString(c.name).name.toLowerCase().trim();
      classMap.set(norm, c);
    }

    const subjectMap = new Map<string, any>();
    for (const s of existingSubjects) {
      subjectMap.set(s.name.toLowerCase().trim(), s);
      const norm = normalizeSubjectString(s.name).toLowerCase().trim();
      subjectMap.set(norm, s);
    }

    const teacherList = existingTeachers.map((t) => {
      const fullName = t.user?.name || t.nip || '';
      const cleaned = cleanTeacherName(fullName);
      const initials = getTeacherInitials(fullName);
      const subjectIds = (t.teacherSubjects || []).map((ts) => ts.subjectId);
      const homeroomClassIds = (t.homeroomClasses || []).map((hc) => hc.id);
      return {
        id: t.id,
        userId: t.userId,
        fullName,
        cleaned,
        initials,
        subjectIds,
        homeroomClassIds,
        assignedHours: 0,
      };
    });

    let currentSubjectCount = existingSubjects.length;

    // 3. Pra-proses dan Normalisasi Data aSc (Senin s.d. Jumat: 1 to 5)
    const normalizedItems: Array<{
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      className: string;
      gradeLevel: number;
      subjectName: string;
      rawTeacherName: string;
      rawTeacherShort: string;
      explicitTeacherId?: string;
    }> = [];

    for (const raw of dataArray) {
      const rawClass = raw.className || raw.class || '';
      const normClass = normalizeClassString(rawClass);

      const rawSubj = raw.subjectName || raw.subject || '';
      const normSubj = normalizeSubjectString(rawSubj);

      const startTime = (raw.startTime || '07:00').replace('.', ':').trim();
      const endTime = (raw.endTime || '08:30').replace('.', ':').trim();
      const dayOfWeek = parseInt(raw.dayOfWeek, 10) || 1;

      // Hanya izinkan hari kerja efektif sekolah (Senin - Jumat)
      if (dayOfWeek < 1 || dayOfWeek > 5) {
        continue;
      }

      const rawTeacherName = (raw.teacherName || raw.rawTeacherName || '').trim();
      const rawTeacherShort = (raw.rawTeacherShort || raw.teacherShort || '').trim();
      const explicitTeacherId = raw.teacherId || undefined;

      normalizedItems.push({
        dayOfWeek,
        startTime,
        endTime,
        className: normClass.name,
        gradeLevel: normClass.gradeLevel,
        subjectName: normSubj,
        rawTeacherName,
        rawTeacherShort,
        explicitTeacherId,
      });
    }

    // 4. Penggabungan Jam Pelajaran Berdampingan (Contiguous Period Block Merging)
    normalizedItems.sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
      if (a.className !== b.className) return a.className.localeCompare(b.className);
      if (a.subjectName !== b.subjectName) return a.subjectName.localeCompare(b.subjectName);
      return parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime);
    });

    const consolidatedItems: typeof normalizedItems = [];
    for (const item of normalizedItems) {
      const last = consolidatedItems[consolidatedItems.length - 1];
      if (
        last &&
        last.dayOfWeek === item.dayOfWeek &&
        last.className === item.className &&
        last.subjectName === item.subjectName &&
        last.rawTeacherName === item.rawTeacherName &&
        last.endTime === item.startTime
      ) {
        last.endTime = item.endTime;
      } else {
        consolidatedItems.push({ ...item });
      }
    }

    // 5. Eksekusi Atomic Transaction Database
    return this.prisma.$transaction(
      async (tx) => {
        // A. Jika replaceExisting, hapus jadwal lama untuk memastikan data sinkron rapi
        if (replaceExisting) {
          const existingSchedules = await tx.schedule.findMany({
            select: { id: true },
          });
          if (existingSchedules.length > 0) {
            const scheduleIds = existingSchedules.map((s) => s.id);
            await tx.attendance.deleteMany({
              where: { scheduleId: { in: scheduleIds } },
            });
            await tx.teachingJournal.deleteMany({
              where: { scheduleId: { in: scheduleIds } },
            });
            await tx.schedule.deleteMany({});
          }
        }

        const createdSchedules: any[] = [];
        const teacherScheduleSlots = new Map<string, Array<{ dayOfWeek: number; startMin: number; endMin: number }>>();

        // Helper untuk cek bentrok jadwal guru
        const hasScheduleConflict = (teacherId: string, dayOfWeek: number, startMin: number, endMin: number) => {
          const slots = teacherScheduleSlots.get(teacherId) || [];
          return slots.some(
            (slot) =>
              slot.dayOfWeek === dayOfWeek &&
              Math.max(slot.startMin, startMin) < Math.min(slot.endMin, endMin)
          );
        };

        const recordTeacherSlot = (teacherId: string, dayOfWeek: number, startMin: number, endMin: number) => {
          const slots = teacherScheduleSlots.get(teacherId) || [];
          slots.push({ dayOfWeek, startMin, endMin });
          teacherScheduleSlots.set(teacherId, slots);
        };

        // Cache untuk Kelas dan Mapel yang dibuat / ditemukan di transaksi
        const txClassCache = new Map<string, any>();
        const txSubjectCache = new Map<string, any>();
        const txTeacherCache = new Map<string, any>();

        for (const item of consolidatedItems) {
          // --- RESOLVE KELAS ---
          const classKey = item.className.toLowerCase().trim();
          let classObj = txClassCache.get(classKey) || classMap.get(classKey);

          if (!classObj) {
            classObj = await tx.class.findFirst({
              where: { name: { equals: item.className, mode: 'insensitive' } },
            });

            if (!classObj) {
              classObj = await tx.class.create({
                data: {
                  name: item.className,
                  gradeLevel: item.gradeLevel,
                  academicYear: currentAcademicYear,
                },
              });
            }
            txClassCache.set(classKey, classObj);
            classMap.set(classKey, classObj);
          }

          // --- RESOLVE MATA PELAJARAN ---
          const subjectKey = item.subjectName.toLowerCase().trim();
          let subjectObj = txSubjectCache.get(subjectKey) || subjectMap.get(subjectKey);

          if (!subjectObj) {
            subjectObj = await tx.subject.findFirst({
              where: { name: { equals: item.subjectName, mode: 'insensitive' } },
            });

            if (!subjectObj) {
              currentSubjectCount++;
              const prefix = currentSubjectCount.toString().padStart(2, '0');
              const words = item.subjectName.split(' ').filter(Boolean);
              let abbr = '';
              if (words.length === 1) {
                abbr = words[0].substring(0, 4).toUpperCase();
              } else {
                abbr = words.map((w) => w[0]).join('').toUpperCase().substring(0, 5);
              }
              const code = `${prefix}-${abbr}`;

              subjectObj = await tx.subject.create({
                data: { name: item.subjectName, code },
              });
            }
            txSubjectCache.set(subjectKey, subjectObj);
            subjectMap.set(subjectKey, subjectObj);
          }

          // --- ALGORITMA AI RESOLVER GURU PENGAMPU ---
          const startMin = parseTimeToMinutes(item.startTime);
          const endMin = parseTimeToMinutes(item.endTime);
          let resolvedTeacherId: string | null = null;

          // Jika ada explicitTeacherId yang valid di DB
          if (item.explicitTeacherId) {
            const exists = teacherList.find((t) => t.id === item.explicitTeacherId);
            if (exists) {
              resolvedTeacherId = exists.id;
            }
          }

          const cleanAscName = cleanTeacherName(item.rawTeacherName);
          const ascInitials = item.rawTeacherShort.toUpperCase() || getTeacherInitials(item.rawTeacherName);

          // Tingkat 1: Pencocokan Nama Lengkap Bersih (Strict Normalized Name Match)
          if (!resolvedTeacherId && cleanAscName) {
            const exactMatch = teacherList.find((t) => t.cleaned === cleanAscName);
            if (exactMatch) {
              resolvedTeacherId = exactMatch.id;
            }
          }

          // Tingkat 2: Pencocokan Inisial Huruf (Initials / Short Code Match)
          if (!resolvedTeacherId && ascInitials.length >= 2 && ascInitials.length <= 4) {
            const initialsMatch = teacherList.find((t) => t.initials === ascInitials);
            if (initialsMatch) {
              resolvedTeacherId = initialsMatch.id;
            }
          }

          // Tingkat 3: Pencocokan Fuzzy String Similarity (Score >= 0.75)
          if (!resolvedTeacherId && cleanAscName) {
            let bestFuzzy: any = null;
            let highestSim = 0;
            for (const t of teacherList) {
              const sim = stringSimilarity(cleanAscName, t.cleaned);
              if (sim > highestSim && sim >= 0.75) {
                highestSim = sim;
                bestFuzzy = t;
              }
            }
            if (bestFuzzy) {
              resolvedTeacherId = bestFuzzy.id;
            }
          }

          // Tingkat 4: Matriks Kompetensi Guru Mapel (TeacherSubject) & Beban Jam Kerja
          if (!resolvedTeacherId && subjectObj) {
            const subjectTeachers = teacherList.filter((t) => t.subjectIds.includes(subjectObj.id));

            if (subjectTeachers.length > 0) {
              // Saring kandidat guru yang TIDAK memiliki bentrok jadwal di jam dan hari ini
              const nonConflicting = subjectTeachers.filter(
                (t) => !hasScheduleConflict(t.id, item.dayOfWeek, startMin, endMin)
              );
              const candidates = nonConflicting.length > 0 ? nonConflicting : subjectTeachers;

              // Prioritaskan wali kelas jika mengajar di kelasnya sendiri
              const homeroomCand = candidates.find((t) => t.homeroomClassIds.includes(classObj.id));
              if (homeroomCand) {
                resolvedTeacherId = homeroomCand.id;
              } else {
                // Pilih guru dengan jam kerja paling sedikit (Workload Balancing)
                candidates.sort((a, b) => a.assignedHours - b.assignedHours);
                resolvedTeacherId = candidates[0].id;
              }
            }
          }

          // Tingkat 5: Heuristik Jam Wali Kelas / Pembinaan
          if (!resolvedTeacherId && (item.subjectName.includes('Wali Kelas') || item.subjectName.includes('Pembinaan'))) {
            if (classObj.homeroomTeacherId) {
              resolvedTeacherId = classObj.homeroomTeacherId;
            }
          }

          // Tingkat 6: Auto-Create Akun Guru Baru jika Belum Ada di Basis Data
          if (!resolvedTeacherId && item.rawTeacherName) {
            const cachedTeacher = txTeacherCache.get(item.rawTeacherName.toLowerCase());
            if (cachedTeacher) {
              resolvedTeacherId = cachedTeacher.id;
            } else {
              const defaultPassword = await bcrypt.hash('Guru123!', 10);
              const baseUsername = item.rawTeacherName
                .replace(/[^a-zA-Z0-9]/g, '')
                .toLowerCase()
                .substring(0, 15);
              const randomNum = Math.floor(100 + Math.random() * 900);
              const uniqueUsername = `${baseUsername}${randomNum}`;

              const newUser = await tx.user.create({
                data: {
                  name: item.rawTeacherName,
                  username: uniqueUsername,
                  password: defaultPassword,
                  role: 'GURU',
                },
              });

              const newTeacherProfile = await tx.teacherProfile.create({
                data: {
                  userId: newUser.id,
                },
                include: { user: true },
              });

              resolvedTeacherId = newTeacherProfile.id;
              txTeacherCache.set(item.rawTeacherName.toLowerCase(), newTeacherProfile);

              // Masukkan ke lookup in-memory
              teacherList.push({
                id: newTeacherProfile.id,
                userId: newUser.id,
                fullName: item.rawTeacherName,
                cleaned: cleanTeacherName(item.rawTeacherName),
                initials: getTeacherInitials(item.rawTeacherName),
                subjectIds: [subjectObj.id],
                homeroomClassIds: [],
                assignedHours: 0,
              });
            }
          }

          // Tingkat 7: Fallback Ultimate jika tidak ada nama guru di aSc dan belum ada guru mapel
          if (!resolvedTeacherId) {
            if (teacherList.length > 0) {
              const nonConflicting = teacherList.filter(
                (t) => !hasScheduleConflict(t.id, item.dayOfWeek, startMin, endMin)
              );
              resolvedTeacherId = nonConflicting.length > 0 ? nonConflicting[0].id : teacherList[0].id;
            } else {
              continue;
            }
          }

          // Update data beban jam kerja & slot jadwal guru
          const assignedTeacher = teacherList.find((t) => t.id === resolvedTeacherId);
          if (assignedTeacher) {
            assignedTeacher.assignedHours += (endMin - startMin) / 45;
            recordTeacherSlot(resolvedTeacherId, item.dayOfWeek, startMin, endMin);

            // Auto-Sync ke tabel relasi TeacherSubject agar database selalu mutakhir
            if (subjectObj && !assignedTeacher.subjectIds.includes(subjectObj.id)) {
              await tx.teacherSubject.upsert({
                where: {
                  teacherId_subjectId: {
                    teacherId: resolvedTeacherId,
                    subjectId: subjectObj.id,
                  },
                },
                update: {},
                create: {
                  teacherId: resolvedTeacherId,
                  subjectId: subjectObj.id,
                },
              });
              assignedTeacher.subjectIds.push(subjectObj.id);
            }
          }

          // Simpan data Schedule
          if (classObj && subjectObj && resolvedTeacherId) {
            const schedule = await tx.schedule.create({
              data: {
                dayOfWeek: item.dayOfWeek,
                startTime: item.startTime,
                endTime: item.endTime,
                classId: classObj.id,
                subjectId: subjectObj.id,
                teacherId: resolvedTeacherId,
              },
              include: {
                class: true,
                subject: true,
                teacher: { include: { user: true } },
              },
            });
            createdSchedules.push(schedule);
          }
        }

        return createdSchedules;
      },
      {
        timeout: 30000,
      }
    );
  }

  async deleteAllSchedules(userId: string, passwordConfirm: string) {
    if (!userId || !passwordConfirm) {
      throw new Error('Identitas user dan password otorisasi wajib diisi.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('Pengguna tidak ditemukan.');
    }

    const isAuthorizedRole = [
      'SUPERADMIN',
      'ADMIN_IT',
      'ADMIN_TU',
      'BAU',
      'TATA_USAHA',
    ].includes(user.role);

    if (!isAuthorizedRole) {
      throw new Error('Anda tidak memiliki izin otorisasi untuk menghapus semua jadwal.');
    }

    const isPasswordValid = await bcrypt.compare(passwordConfirm, user.password);
    if (!isPasswordValid) {
      throw new Error('Password otorisasi yang Anda masukkan salah.');
    }

    return this.prisma.$transaction(async (tx) => {
      const allSchedules = await tx.schedule.findMany({ select: { id: true } });
      const totalCount = allSchedules.length;

      if (totalCount > 0) {
        const scheduleIds = allSchedules.map((s) => s.id);
        await tx.attendance.deleteMany({
          where: { scheduleId: { in: scheduleIds } },
        });
        await tx.teachingJournal.deleteMany({
          where: { scheduleId: { in: scheduleIds } },
        });
        await tx.schedule.deleteMany({});
      }

      return {
        success: true,
        message: `Berhasil menghapus seluruh ${totalCount} data jadwal pelajaran sekolah. Data kelas, guru, dan mata pelajaran tetap aman terjaga.`,
        deletedCount: totalCount,
      };
    });
  }

  async update(id: string, data: any) {
    return this.prisma.schedule.update({
      where: { id },
      data,
      include: {
        class: true,
        subject: true,
        teacher: { include: { user: true } },
      },
    });
  }

  async remove(id: string) {
    return this.prisma.schedule.delete({ where: { id } });
  }
}
