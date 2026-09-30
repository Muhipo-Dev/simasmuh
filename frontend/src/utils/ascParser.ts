/**
 * SIMASMUH aSc Timetables Parser & AI Schedule Resolver
 * Membaca, memvalidasi, menormalisasi, dan menganalisis penjadwalan aSc Timetables XML.
 */

// Daftar Akronim & Singkatan Mata Pelajaran yang Wajib Full Kapital (UPPERCASE)
export const KNOWN_UPPERCASE_ACRONYMS = new Set([
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
  'VII'
]);

// Kamus Normalisasi Nama Mata Pelajaran Standar Kurikulum Nasional & Muhammadiyah
export const SUBJECT_DICTIONARY: Record<string, string> = {
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
  'homeroom': 'Jam Wali Kelas'
};

/**
 * Normalisasi Nama Mata Pelajaran dengan Proteksi Akronim Full Kapital (UPPERCASE)
 */
export function normalizeSubjectName(rawName: string): string {
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

/**
 * Standar Penamaan Kelas (Aturan 12 AGENTS.md: [Romawi Kelas] [Angka Kelas], contoh: "X 1", "XI 2", "XII 1")
 */
export function normalizeClassName(rawName: string): { name: string; gradeLevel: number } {
  if (!rawName) return { name: 'X 1', gradeLevel: 10 };
  let clean = rawName.trim();

  // Hapus kata pengantar "Kelas", "Class", "Tingkat", "Ruang", "R."
  clean = clean.replace(/^(kelas|class|tingkat|ruang|r\.)\s+/i, '').trim();

  // Pola 1: Angka Romawi + pemisah/jurusan + nomor (contoh: "X 1", "X-1", "X.1", "X IPA 1", "XI MIPA 2", "XII IPS 1")
  const romanMatch = clean.match(/^(XII|XI|X|IX|VIII|VII)\b[\s\-._]*(?:ipa|ips|mipa|mia|iis|ibb|bahasa|keagamaan|tkj|rpl|akl|otkp)?[\s\-._]*(\d+)?/i);
  if (romanMatch) {
    const roman = romanMatch[1].toUpperCase();
    const num = romanMatch[2] || '1';
    let gradeLevel = 10;
    if (roman === 'XI') gradeLevel = 11;
    else if (roman === 'XII') gradeLevel = 12;
    return { name: `${roman} ${num}`, gradeLevel };
  }

  // Pola 2: Angka Arab 10/11/12 (contoh: "10 1", "10-1", "11-2", "12 1")
  const arabicMatch = clean.match(/^(12|11|10)\b[\s\-._]*(?:ipa|ips|mipa|mia|iis|ibb)?[\s\-._]*(\d+)?/i);
  if (arabicMatch) {
    const grade = parseInt(arabicMatch[1], 10);
    const roman = grade === 10 ? 'X' : grade === 11 ? 'XI' : 'XII';
    const num = arabicMatch[2] || '1';
    return { name: `${roman} ${num}`, gradeLevel: grade };
  }

  return { name: clean, gradeLevel: 10 };
}

/**
 * Pembersih Gelar Akademik & Honorific Guru untuk Pencocokan AI Cerdas
 */
export function cleanTeacherNameForAI(name: string): string {
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

/**
 * Ekstraksi Inisial Huruf Depan dari Nama Lengkap
 */
export function getInitials(name: string): string {
  if (!name) return '';
  const clean = cleanTeacherNameForAI(name);
  return clean
    .split(' ')
    .filter(Boolean)
    .map(w => w[0].toUpperCase())
    .join('');
}

/**
 * Hitung Kemiripan String Sederhana (Jaro-Winkler / Dice Coefficient)
 */
export function calculateStringSimilarity(str1: string, str2: string): number {
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

/**
 * Format string jam waktu menjadi "HH:MM" yang rapi
 */
export function formatTimeSlot(rawTime: string | null | undefined, defaultTime: string): string {
  if (!rawTime) return defaultTime;
  const clean = rawTime.replace('.', ':').trim();
  const parts = clean.split(':');
  if (parts.length >= 2) {
    const hh = parts[0].padStart(2, '0');
    const mm = parts[1].padStart(2, '0');
    return `${hh}:${mm}`;
  }
  return clean.padStart(5, '0');
}

export function parseTimeToMinutes(t: string | undefined | null): number {
  if (!t) return 0;
  const clean = t.replace('.', ':').trim();
  const parts = clean.split(':');
  const hours = parseInt(parts[0] || '0', 10) || 0;
  const minutes = parseInt(parts[1] || '0', 10) || 0;
  return hours * 60 + minutes;
}

export interface AscParsedScheduleItem {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  classId: string;
  className: string;
  gradeLevel: number;
  subjectId: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
  aiResolutionStatus?: 'EXACT_NAME' | 'INITIALS_MATCH' | 'COMPETENCY_MATCH' | 'HOMEROOM_MATCH' | 'NEW_AUTO_PROFILE';
  aiConfidence?: number;
  rawLessonId?: string;
  rawTeacherName?: string;
  rawTeacherShort?: string;
}

/**
 * Main Parser: aSc Timetables XML dengan Algoritma Analisis Cerdas & AI Resolver
 */
export function parseAscTimetableXml(
  xmlText: string,
  dbClasses: any[] = [],
  dbSubjects: any[] = [],
  dbTeachers: any[] = []
): AscParsedScheduleItem[] {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

  // Periksa apakah dokumen XML valid
  const parseError = xmlDoc.getElementsByTagName('parsererror');
  if (parseError && parseError.length > 0) {
    throw new Error('Format dokumen XML tidak valid.');
  }

  // 1. Parse Periods (Jam Pelajaran)
  const periods = new Map<string, { startTime: string; endTime: string; name: string; short: string; order: number }>();
  const periodsNodes = xmlDoc.getElementsByTagName('period');
  for (let i = 0; i < periodsNodes.length; i++) {
    const p = periodsNodes[i];
    const periodId = p.getAttribute('period') || p.getAttribute('id') || `${i + 1}`;
    const startTime = formatTimeSlot(p.getAttribute('starttime'), '07:00');
    const endTime = formatTimeSlot(p.getAttribute('endtime'), '07:45');
    const name = p.getAttribute('name') || `${i + 1}`;
    const short = p.getAttribute('short') || name;
    periods.set(periodId, { startTime, endTime, name, short, order: i + 1 });
  }

  // 2. Parse Classes (Kelas)
  const aScClasses = new Map<string, { rawName: string; normalizedName: string; gradeLevel: number }>();
  const classesNodes = xmlDoc.getElementsByTagName('class');
  for (let i = 0; i < classesNodes.length; i++) {
    const c = classesNodes[i];
    const id = c.getAttribute('id') || '';
    const rawName = c.getAttribute('name') || c.getAttribute('short') || '';
    const norm = normalizeClassName(rawName);
    aScClasses.set(id, { rawName, normalizedName: norm.name, gradeLevel: norm.gradeLevel });
  }

  // 3. Parse Subjects (Mata Pelajaran)
  const aScSubjects = new Map<string, { rawName: string; normalizedName: string; short: string }>();
  const subjectsNodes = xmlDoc.getElementsByTagName('subject');
  for (let i = 0; i < subjectsNodes.length; i++) {
    const s = subjectsNodes[i];
    const id = s.getAttribute('id') || '';
    const rawName = s.getAttribute('name') || s.getAttribute('short') || '';
    const short = s.getAttribute('short') || '';
    const normalizedName = normalizeSubjectName(rawName || short);
    aScSubjects.set(id, { rawName, normalizedName, short });
  }

  // 4. Parse Teachers (Guru)
  const aScTeachers = new Map<string, { rawName: string; short: string; email?: string }>();
  const teachersNodes = xmlDoc.getElementsByTagName('teacher');
  for (let i = 0; i < teachersNodes.length; i++) {
    const t = teachersNodes[i];
    const id = t.getAttribute('id') || '';
    const rawName = t.getAttribute('name') || t.getAttribute('short') || '';
    const short = t.getAttribute('short') || '';
    const email = t.getAttribute('email') || undefined;
    aScTeachers.set(id, { rawName, short, email });
  }

  // 5. Parse Lessons (Pelajaran)
  const lessons = new Map<string, { classIds: string[]; subjectId: string; teacherIds: string[] }>();
  const lessonsNodes = xmlDoc.getElementsByTagName('lesson');
  for (let i = 0; i < lessonsNodes.length; i++) {
    const l = lessonsNodes[i];
    const id = l.getAttribute('id') || '';
    const classIdsStr = l.getAttribute('classids') || l.getAttribute('classid') || '';
    const subjectId = l.getAttribute('subjectid') || '';
    const teacherIdsStr = l.getAttribute('teacherids') || l.getAttribute('teacherid') || '';

    const classIds = classIdsStr.split(',').map(s => s.trim()).filter(Boolean);
    const teacherIds = teacherIdsStr.split(',').map(s => s.trim()).filter(Boolean);

    lessons.set(id, { classIds, subjectId, teacherIds });
  }

  // 6. Pre-calculate DB lookup index untuk Algoritma AI Resolver
  const teacherLookups = (dbTeachers || []).map(t => {
    const fullName = t.user?.name || t.nipNbm || '';
    const cleaned = cleanTeacherNameForAI(fullName);
    const initials = getInitials(fullName);
    const teacherSubjectIds = (t.teacherSubjects || []).map((ts: any) => ts.subjectId);
    const homeroomClassIds = (t.homeroomClasses || []).map((hc: any) => hc.id);
    return {
      teacherProfile: t,
      id: t.id,
      userId: t.userId || t.user?.id,
      fullName,
      cleaned,
      initials,
      teacherSubjectIds,
      homeroomClassIds
    };
  });

  const subjectLookups = (dbSubjects || []).map(s => ({
    subject: s,
    id: s.id,
    name: s.name,
    code: s.code,
    normalized: normalizeSubjectName(s.name)
  }));

  const classLookups = (dbClasses || []).map(c => ({
    classItem: c,
    id: c.id,
    name: c.name,
    normName: normalizeClassName(c.name).name,
    homeroomTeacherId: c.homeroomTeacherId
  }));

  // 7. Parse Cards & Jadwal Mentah
  const rawCards: Array<{
    dayOfWeek: number;
    periodOrder: number;
    startTime: string;
    endTime: string;
    classId: string;
    className: string;
    gradeLevel: number;
    subjectId: string;
    subjectName: string;
    teacherId: string;
    teacherName: string;
    rawTeacherName: string;
    rawTeacherShort: string;
    aiResolutionStatus: 'EXACT_NAME' | 'INITIALS_MATCH' | 'COMPETENCY_MATCH' | 'HOMEROOM_MATCH' | 'NEW_AUTO_PROFILE';
    aiConfidence: number;
  }> = [];

  const cardsNodes = xmlDoc.getElementsByTagName('card');
  for (let i = 0; i < cardsNodes.length; i++) {
    const c = cardsNodes[i];
    const lessonId = c.getAttribute('lessonid') || '';
    const periodId = c.getAttribute('period') || '';
    const daysStr = c.getAttribute('days') || c.getAttribute('day') || '1';

    const lesson = lessons.get(lessonId);
    const period = periods.get(periodId);
    if (!lesson || !period) continue;

    // Tentukan Hari (1: Senin s/d 5: Jumat). Sabtu & Minggu dihapuskan dari jadwal sekolah reguler.
    let dayOfWeek = 1;
    if (daysStr.length > 1 && daysStr.includes('1')) {
      dayOfWeek = daysStr.indexOf('1') + 1;
    } else {
      dayOfWeek = parseInt(daysStr, 10) || 1;
    }
    if (dayOfWeek < 1 || dayOfWeek > 5) {
      // Abaikan jadwal di luar hari kerja efektif Senin s.d. Jumat
      continue;
    }

    // Subjek
    const aScSub = aScSubjects.get(lesson.subjectId);
    const subjectName = aScSub?.normalizedName || normalizeSubjectName(lesson.subjectId);
    const dbSub = subjectLookups.find(s => 
      s.normalized.toLowerCase() === subjectName.toLowerCase() ||
      s.name.toLowerCase() === subjectName.toLowerCase()
    );
    const subjectId = dbSub?.id || '';

    // Guru dari aSc
    const primaryTeacherId = lesson.teacherIds[0] || '';
    const aScTeacher = aScTeachers.get(primaryTeacherId);
    const rawTeacherName = aScTeacher?.rawName?.trim() || '';
    const rawTeacherShort = aScTeacher?.short?.trim() || '';

    // Loop kelas di lesson (bisa single atau multi-class)
    const targetClassIds = lesson.classIds.length > 0 ? lesson.classIds : ['1'];
    for (const aScClsId of targetClassIds) {
      const aScCls = aScClasses.get(aScClsId);
      const className = aScCls?.normalizedName || normalizeClassName(aScClsId).name;
      const gradeLevel = aScCls?.gradeLevel || normalizeClassName(aScClsId).gradeLevel;

      const dbCls = classLookups.find(c => 
        c.normName.toLowerCase() === className.toLowerCase() ||
        c.name.toLowerCase() === className.toLowerCase()
      );
      const classId = dbCls?.id || '';

      // --- ALGORITMA AI RESOLVER GURU PENGAMPU ---
      let resolvedTeacherId = '';
      let resolvedTeacherName = rawTeacherName;
      let resolutionStatus: 'EXACT_NAME' | 'INITIALS_MATCH' | 'COMPETENCY_MATCH' | 'HOMEROOM_MATCH' | 'NEW_AUTO_PROFILE' = 'NEW_AUTO_PROFILE';
      let confidence = 0.5;

      const cleanAsc = cleanTeacherNameForAI(rawTeacherName);
      const ascInitials = rawTeacherShort.toUpperCase() || getInitials(rawTeacherName);

      // Tingkat 1: Pencocokan Nama Lengkap Bersih (Exact / Normalized Name)
      if (cleanAsc) {
        const exactMatch = teacherLookups.find(t => t.cleaned === cleanAsc);
        if (exactMatch) {
          resolvedTeacherId = exactMatch.id;
          resolvedTeacherName = exactMatch.fullName;
          resolutionStatus = 'EXACT_NAME';
          confidence = 0.98;
        }
      }

      // Tingkat 2: Pencocokan Inisial / Kode Singkatan Guru (Initials Match)
      if (!resolvedTeacherId && (ascInitials.length >= 2 && ascInitials.length <= 4)) {
        const initialsMatch = teacherLookups.find(t => t.initials === ascInitials);
        if (initialsMatch) {
          resolvedTeacherId = initialsMatch.id;
          resolvedTeacherName = initialsMatch.fullName;
          resolutionStatus = 'INITIALS_MATCH';
          confidence = 0.90;
        }
      }

      // Tingkat 3: Kemiripan String Fuzzy (Fuzzy Overlap >= 0.75)
      if (!resolvedTeacherId && cleanAsc) {
        let bestFuzzy: any = null;
        let highestSim = 0;
        for (const t of teacherLookups) {
          const sim = calculateStringSimilarity(cleanAsc, t.cleaned);
          if (sim > highestSim && sim >= 0.75) {
            highestSim = sim;
            bestFuzzy = t;
          }
        }
        if (bestFuzzy) {
          resolvedTeacherId = bestFuzzy.id;
          resolvedTeacherName = bestFuzzy.fullName;
          resolutionStatus = 'EXACT_NAME';
          confidence = Math.round(highestSim * 100) / 100;
        }
      }

      // Tingkat 4: Matriks Kompetensi Mata Pelajaran (TeacherSubject)
      if (!resolvedTeacherId && subjectId) {
        const specialistTeachers = teacherLookups.filter(t => t.teacherSubjectIds.includes(subjectId));
        if (specialistTeachers.length === 1) {
          resolvedTeacherId = specialistTeachers[0].id;
          resolvedTeacherName = specialistTeachers[0].fullName;
          resolutionStatus = 'COMPETENCY_MATCH';
          confidence = 0.92;
        } else if (specialistTeachers.length > 1) {
          // Jika ada lebih dari 1 guru mapel, pilih yang merupakan wali kelas atau urutan pertama
          const homeroomSpecialist = specialistTeachers.find(t => dbCls && t.homeroomClassIds.includes(dbCls.id));
          const selected = homeroomSpecialist || specialistTeachers[0];
          resolvedTeacherId = selected.id;
          resolvedTeacherName = selected.fullName;
          resolutionStatus = 'COMPETENCY_MATCH';
          confidence = 0.88;
        }
      }

      // Tingkat 5: Heuristik Jam Wali Kelas / Pembinaan
      if (!resolvedTeacherId && (subjectName.includes('Wali Kelas') || subjectName.includes('Pembinaan'))) {
        if (dbCls && dbCls.homeroomTeacherId) {
          const homeroomT = teacherLookups.find(t => t.id === dbCls.homeroomTeacherId);
          if (homeroomT) {
            resolvedTeacherId = homeroomT.id;
            resolvedTeacherName = homeroomT.fullName;
            resolutionStatus = 'HOMEROOM_MATCH';
            confidence = 0.95;
          }
        }
      }

      // Tingkat 6: Fallback Auto-Profile (Jika nama guru baru diberikan di XML)
      if (!resolvedTeacherId && rawTeacherName) {
        resolvedTeacherName = rawTeacherName;
        resolutionStatus = 'NEW_AUTO_PROFILE';
        confidence = 0.70;
      }

      rawCards.push({
        dayOfWeek,
        periodOrder: period.order,
        startTime: period.startTime,
        endTime: period.endTime,
        classId,
        className,
        gradeLevel,
        subjectId,
        subjectName,
        teacherId: resolvedTeacherId,
        teacherName: resolvedTeacherName,
        rawTeacherName,
        rawTeacherShort,
        aiResolutionStatus: resolutionStatus,
        aiConfidence: confidence
      });
    }
  }

  // 8. Sorting & Smart Period Block Merging (Menggabungkan jam pelajaran berurutan yang berdampingan)
  rawCards.sort((a, b) => {
    if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
    if (a.className !== b.className) return a.className.localeCompare(b.className);
    if (a.subjectName !== b.subjectName) return a.subjectName.localeCompare(b.subjectName);
    return a.periodOrder - b.periodOrder;
  });

  const mergedSchedules: AscParsedScheduleItem[] = [];

  for (const card of rawCards) {
    const last = mergedSchedules[mergedSchedules.length - 1];

    // Cek apakah sesi ini adalah jam pelajaran lanjutan dari sesi sebelumnya
    if (
      last &&
      last.dayOfWeek === card.dayOfWeek &&
      last.className === card.className &&
      last.subjectName === card.subjectName &&
      (last.teacherId === card.teacherId || (!last.teacherId && !card.teacherId)) &&
      last.endTime === card.startTime
    ) {
      // Perpanjang jam selesai blok jadwal
      last.endTime = card.endTime;
    } else {
      mergedSchedules.push({ ...card });
    }
  }

  // Urutkan jadwal akhir berdasarkan Hari -> Jam Mulai -> Nama Kelas
  return mergedSchedules.sort((a, b) => {
    if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
    const timeA = parseTimeToMinutes(a.startTime);
    const timeB = parseTimeToMinutes(b.startTime);
    if (timeA !== timeB) return timeA - timeB;
    return a.className.localeCompare(b.className);
  });
}

const DAYS_TEXT: Record<number, string> = {
  1: 'Senin',
  2: 'Selasa',
  3: 'Rabu',
  4: 'Kamis',
  5: 'Jumat',
};

export interface ScheduleConflict {
  id: string;
  type: 'TEACHER_CONFLICT' | 'CLASS_CONFLICT' | 'TIME_CONFLICT' | 'SUBJECT_CONFLICT';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  dayOfWeek: number;
  dayName: string;
  startTime: string;
  endTime: string;
  className: string;
  subjectName: string;
  teacherName: string;
  conflictingWith?: {
    className?: string;
    subjectName?: string;
    teacherName?: string;
    timeSlot?: string;
  };
  aiRecommendation: string;
}

/**
 * Algoritma AI Pendeteksi & Penganalisis Bentrok Jadwal (Guru, Kelas, Jam, Mapel)
 */
export function detectScheduleConflicts(schedules: AscParsedScheduleItem[]): ScheduleConflict[] {
  if (!schedules || schedules.length === 0) return [];
  const conflicts: ScheduleConflict[] = [];
  const checkedPairs = new Set<string>();

  for (let i = 0; i < schedules.length; i++) {
    const a = schedules[i];
    const startA = parseTimeToMinutes(a.startTime);
    const endA = parseTimeToMinutes(a.endTime);
    const dayName = DAYS_TEXT[a.dayOfWeek] || `Hari ke-${a.dayOfWeek}`;

    // 1. Validasi Bentrok Jam Pelajaran Tidak Valid (TIME_CONFLICT)
    if (endA <= startA) {
      conflicts.push({
        id: `time-inv-${i}`,
        type: 'TIME_CONFLICT',
        severity: 'HIGH',
        title: `Jam Pelajaran Tidak Valid di Kelas ${a.className}`,
        description: `Rentang waktu ${a.startTime} s/d ${a.endTime} tidak valid (jam selesai lebih awal atau sama dengan jam mulai).`,
        dayOfWeek: a.dayOfWeek,
        dayName,
        startTime: a.startTime,
        endTime: a.endTime,
        className: a.className,
        subjectName: a.subjectName,
        teacherName: a.teacherName || a.rawTeacherName || 'Guru',
        aiRecommendation: 'Sesuaikan format jam selesai agar lebih besar dari jam mulai.',
      });
    }

    for (let j = i + 1; j < schedules.length; j++) {
      const b = schedules[j];
      if (a.dayOfWeek !== b.dayOfWeek) continue;

      const startB = parseTimeToMinutes(b.startTime);
      const endB = parseTimeToMinutes(b.endTime);

      // Cek apakah rentang waktu tumpang tindih (overlap)
      const isOverlapping = Math.max(startA, startB) < Math.min(endA, endB);
      if (!isOverlapping) continue;

      const pairKey = `${i}-${j}`;
      if (checkedPairs.has(pairKey)) continue;
      checkedPairs.add(pairKey);

      const teacherA = (a.teacherName || a.rawTeacherName || '').trim();
      const teacherB = (b.teacherName || b.rawTeacherName || '').trim();
      const cleanA = cleanTeacherNameForAI(teacherA);
      const cleanB = cleanTeacherNameForAI(teacherB);
      const sameTeacher =
        (a.teacherId && b.teacherId && a.teacherId === b.teacherId) ||
        (cleanA && cleanB && cleanA === cleanB && cleanA.length > 2);

      // 2. Bentrok Guru (TEACHER_CONFLICT): Guru yang sama mengajar di kelas berbeda di jam yang sama
      if (sameTeacher && a.className.toLowerCase() !== b.className.toLowerCase()) {
        conflicts.push({
          id: `teacher-${i}-${j}`,
          type: 'TEACHER_CONFLICT',
          severity: 'HIGH',
          title: `Bentrok Guru: ${teacherA}`,
          description: `Guru ${teacherA} terjadwal mengajar bersamaan di Kelas ${a.className} (${a.subjectName}, ${a.startTime}-${a.endTime}) dan Kelas ${b.className} (${b.subjectName}, ${b.startTime}-${b.endTime}) pada hari ${dayName}.`,
          dayOfWeek: a.dayOfWeek,
          dayName,
          startTime: a.startTime,
          endTime: a.endTime,
          className: a.className,
          subjectName: a.subjectName,
          teacherName: teacherA,
          conflictingWith: {
            className: b.className,
            subjectName: b.subjectName,
            teacherName: teacherB,
            timeSlot: `${b.startTime} - ${b.endTime}`,
          },
          aiRecommendation: `Alihkan pengampu ${b.subjectName} di kelas ${b.className} ke guru spesialis lain yang sedang luang, atau pindahkan jam mengajar kelas ${b.className}.`,
        });
      }

      // 3. Bentrok Kelas (CLASS_CONFLICT) & Bentrok Mapel (SUBJECT_CONFLICT)
      if (a.className.toLowerCase() === b.className.toLowerCase()) {
        if (a.subjectName.toLowerCase() === b.subjectName.toLowerCase()) {
          // Bentrok Duplikasi Mapel (SUBJECT_CONFLICT)
          conflicts.push({
            id: `subject-dup-${i}-${j}`,
            type: 'SUBJECT_CONFLICT',
            severity: 'MEDIUM',
            title: `Duplikasi Jadwal Mapel: ${a.subjectName} di Kelas ${a.className}`,
            description: `Terdapat 2 sesi jadwal ${a.subjectName} yang saling bertabrakan pada jam ${a.startTime}-${a.endTime} dan ${b.startTime}-${b.endTime} di hari ${dayName}.`,
            dayOfWeek: a.dayOfWeek,
            dayName,
            startTime: a.startTime,
            endTime: a.endTime,
            className: a.className,
            subjectName: a.subjectName,
            teacherName: teacherA,
            conflictingWith: {
              className: b.className,
              subjectName: b.subjectName,
              teacherName: teacherB,
              timeSlot: `${b.startTime} - ${b.endTime}`,
            },
            aiRecommendation: 'Gabungkan sesi menjadi satu blok jam pelajaran terpadu.',
          });
        } else {
          // Bentrok Kelas (CLASS_CONFLICT)
          conflicts.push({
            id: `class-${i}-${j}`,
            type: 'CLASS_CONFLICT',
            severity: 'HIGH',
            title: `Bentrok Kelas: ${a.className}`,
            description: `Kelas ${a.className} memiliki 2 mata pelajaran bertabrakan di jam yang sama: ${a.subjectName} (${a.startTime}-${a.endTime}) dan ${b.subjectName} (${b.startTime}-${b.endTime}) pada hari ${dayName}.`,
            dayOfWeek: a.dayOfWeek,
            dayName,
            startTime: a.startTime,
            endTime: a.endTime,
            className: a.className,
            subjectName: a.subjectName,
            teacherName: teacherA,
            conflictingWith: {
              className: b.className,
              subjectName: b.subjectName,
              teacherName: teacherB,
              timeSlot: `${b.startTime} - ${b.endTime}`,
            },
            aiRecommendation: `Pindahkan salah satu sesi mata pelajaran (${b.subjectName}) ke jam pelajaran kosong lainnya pada hari ${dayName}.`,
          });
        }
      }
    }
  }

  return conflicts;
}

