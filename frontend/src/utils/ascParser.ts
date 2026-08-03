export function normalizeSubjectName(rawName: string): string {
  if (!rawName) return '';
  const lower = rawName.replace(/\./g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  
  const dictionary: Record<string, string> = {
    'mtk': 'Matematika',
    'mat': 'Matematika',
    'matematika': 'Matematika',
    
    'b indo': 'Bahasa Indonesia',
    'bhs indo': 'Bahasa Indonesia',
    'bhs indonesia': 'Bahasa Indonesia',
    'bind': 'Bahasa Indonesia',
    'bindo': 'Bahasa Indonesia',
    'bahasa indonesia': 'Bahasa Indonesia',
    
    'b ing': 'Bahasa Inggris',
    'bhs ing': 'Bahasa Inggris',
    'bhs inggris': 'Bahasa Inggris',
    'bing': 'Bahasa Inggris',
    'bahasa inggris': 'Bahasa Inggris',
    
    'pai': 'Pendidikan Agama Islam',
    'pend agama': 'Pendidikan Agama Islam',
    'pend agama islam': 'Pendidikan Agama Islam',
    'agama': 'Pendidikan Agama Islam',
    'pendidikan agama islam': 'Pendidikan Agama Islam',
    
    'pkn': 'Pendidikan Pancasila dan Kewarganegaraan',
    'ppkn': 'Pendidikan Pancasila dan Kewarganegaraan',
    'pendidikan pancasila dan kewarganegaraan': 'Pendidikan Pancasila dan Kewarganegaraan',
    
    'penjas': 'Pendidikan Jasmani, Olahraga, dan Kesehatan',
    'pjok': 'Pendidikan Jasmani, Olahraga, dan Kesehatan',
    'olahraga': 'Pendidikan Jasmani, Olahraga, dan Kesehatan',
    'pendidikan jasmani olahraga dan kesehatan': 'Pendidikan Jasmani, Olahraga, dan Kesehatan',
    
    'sbd': 'Seni Budaya',
    'seni': 'Seni Budaya',
    'seni budaya': 'Seni Budaya',
    
    'sej': 'Sejarah',
    'sejarah indonesia': 'Sejarah',
    'sejarah': 'Sejarah',
    
    'fis': 'Fisika',
    'fisika': 'Fisika',
    
    'kim': 'Kimia',
    'kimia': 'Kimia',
    
    'bio': 'Biologi',
    'biologi': 'Biologi',
    
    'eko': 'Ekonomi',
    'ekonomi': 'Ekonomi',
    
    'geo': 'Geografi',
    'geografi': 'Geografi',
    
    'sos': 'Sosiologi',
    'sosiologi': 'Sosiologi'
  };

  if (dictionary[lower]) {
    return dictionary[lower];
  }

  // Fallback: title case
  return rawName.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
  ).trim();
}

export function parseAscTimetableXml(xmlText: string, dbClasses: any[], dbSubjects: any[], dbTeachers: any[]) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "text/xml");

  // 1. Parse periods
  const periods = new Map();
  const periodsNodes = xmlDoc.getElementsByTagName("period");
  for (let i = 0; i < periodsNodes.length; i++) {
    const p = periodsNodes[i];
    periods.set(p.getAttribute("period"), {
      startTime: p.getAttribute("starttime"),
      endTime: p.getAttribute("endtime"),
    });
  }

  // 2. Parse classes, subjects, teachers (aSc IDs -> Name)
  const aScClasses = new Map();
  const classesNodes = xmlDoc.getElementsByTagName("class");
  for (let i = 0; i < classesNodes.length; i++) {
    aScClasses.set(classesNodes[i].getAttribute("id"), classesNodes[i].getAttribute("name"));
  }

  const aScSubjects = new Map();
  const subjectsNodes = xmlDoc.getElementsByTagName("subject");
  for (let i = 0; i < subjectsNodes.length; i++) {
    aScSubjects.set(subjectsNodes[i].getAttribute("id"), subjectsNodes[i].getAttribute("name"));
  }

  const aScTeachers = new Map();
  const teachersNodes = xmlDoc.getElementsByTagName("teacher");
  for (let i = 0; i < teachersNodes.length; i++) {
    aScTeachers.set(teachersNodes[i].getAttribute("id"), teachersNodes[i].getAttribute("name"));
  }

  // 3. Parse lessons (Lesson ID -> { classId, subjectId, teacherId })
  const lessons = new Map();
  const lessonsNodes = xmlDoc.getElementsByTagName("lesson");
  for (let i = 0; i < lessonsNodes.length; i++) {
    const l = lessonsNodes[i];
    lessons.set(l.getAttribute("id"), {
      classIds: l.getAttribute("classids"),
      subjectId: l.getAttribute("subjectid"),
      teacherIds: l.getAttribute("teacherids")
    });
  }

  // 4. Parse cards and map to final schedule
  const schedules: any[] = [];
  const cardsNodes = xmlDoc.getElementsByTagName("card");
  for (let i = 0; i < cardsNodes.length; i++) {
    const c = cardsNodes[i];
    const lessonId = c.getAttribute("lessonid");
    const periodId = c.getAttribute("period");
    const daysStr = c.getAttribute("days");

    const lesson = lessons.get(lessonId);
    const period = periods.get(periodId);

    if (!lesson || !period) continue;

    let dayOfWeek = 1;
    if (daysStr && daysStr.length > 1) {
      // e.g. "10000" = day 1 (Senin), "01000" = day 2 (Selasa)
      dayOfWeek = daysStr.indexOf('1') + 1;
    } else if (daysStr) {
      dayOfWeek = parseInt(daysStr, 10);
    }

    const aScClassName = aScClasses.get(lesson.classIds)?.trim();
    let aScSubjectName = aScSubjects.get(lesson.subjectId);
    if (aScSubjectName) aScSubjectName = normalizeSubjectName(aScSubjectName);
    const aScTeacherName = aScTeachers.get(lesson.teacherIds)?.trim();

    // Find in DB
    const dbClass = dbClasses.find(c => c.name.toLowerCase() === (aScClassName || '').toLowerCase());
    const dbSubject = dbSubjects.find(s => s.name.toLowerCase() === (aScSubjectName || '').toLowerCase());
    const dbTeacher = dbTeachers.find(t => t.user?.name.toLowerCase() === (aScTeacherName || '').toLowerCase());

    // We require aScClassName, aScSubjectName, and aScTeacherName to be present.
    // Missing class, subject, and teacher will be auto-created by the backend.
    if (aScClassName && aScSubjectName && aScTeacherName) {
      schedules.push({
        dayOfWeek,
        startTime: period.startTime,
        endTime: period.endTime,
        classId: dbClass?.id || '',
        className: aScClassName,
        subjectId: dbSubject?.id || '',
        subjectName: aScSubjectName,
        teacherId: dbTeacher?.id || '',
        teacherName: aScTeacherName
      });
    }
  }

  return schedules;
}
