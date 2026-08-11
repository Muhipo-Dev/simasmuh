-- Supabase Local Migration: Full schema for SIMASMUH
-- This migration creates all tables needed by Prisma schema

-- Prisma migrations tracking table
CREATE TABLE IF NOT EXISTS public._prisma_migrations (
  id                  character varying(36)    NOT NULL,
  checksum            character varying(64)    NOT NULL,
  finished_at         timestamp with time zone,
  migration_name      character varying(255)   NOT NULL,
  logs                text,
  rolled_back_at      timestamp with time zone,
  started_at          timestamp with time zone DEFAULT now() NOT NULL,
  applied_steps_count integer                  DEFAULT 0 NOT NULL,
  CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id)
);

-- User
CREATE TABLE IF NOT EXISTS public."User" (
  id          text                           NOT NULL,
  username    text                           NOT NULL,
  email       text,
  password    text                           NOT NULL,
  name        text                           NOT NULL,
  role        text                           DEFAULT 'GURU'::text NOT NULL,
  "avatarUrl" text,
  address     text,
  "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) without time zone NOT NULL,
  "subRole"   text,
  "subRole2"  text,
  "subRole3"  text,
  "nipNbm"    text,
  CONSTRAINT "User_pkey" PRIMARY KEY (id)
);
CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON public."User" (username);
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON public."User" (email);

-- TeacherProfile
CREATE TABLE IF NOT EXISTS public."TeacherProfile" (
  id                    text    NOT NULL,
  nip                   text,
  phone                 text,
  "lastEducation"       text,
  "certificationStatus" text,
  "certificationYear"   integer,
  "userId"              text    NOT NULL,
  CONSTRAINT "TeacherProfile_pkey" PRIMARY KEY (id),
  CONSTRAINT "TeacherProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "TeacherProfile_userId_key" ON public."TeacherProfile" ("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "TeacherProfile_nip_key" ON public."TeacherProfile" (nip);

-- Class
CREATE TABLE IF NOT EXISTS public."Class" (
  id                  text    NOT NULL,
  name                text    NOT NULL,
  "gradeLevel"        integer NOT NULL,
  "academicYear"      text    NOT NULL,
  "homeroomTeacherId" text,
  CONSTRAINT "Class_pkey" PRIMARY KEY (id),
  CONSTRAINT "Class_homeroomTeacherId_fkey" FOREIGN KEY ("homeroomTeacherId") REFERENCES public."TeacherProfile"(id) ON UPDATE CASCADE ON DELETE SET NULL
);

-- Student
CREATE TABLE IF NOT EXISTS public."Student" (
  id                   text    NOT NULL,
  nisn                 text    NOT NULL,
  nis                  text    NOT NULL,
  name                 text    NOT NULL,
  gender               text    NOT NULL,
  "classId"            text    NOT NULL,
  "userId"             text,
  program              text,
  gelombang            text    DEFAULT 'Gelombang 1'::text,
  "jalurPendaftaran"   text    DEFAULT 'Mandiri'::text,
  "discountPercentage" integer DEFAULT 0 NOT NULL,
  "discountReason"     text,
  "beasiswaSeragamPct" integer DEFAULT 0 NOT NULL,
  "beasiswaSppPct"     integer DEFAULT 0 NOT NULL,
  "beasiswaDppPct"     integer DEFAULT 0 NOT NULL,
  CONSTRAINT "Student_pkey" PRIMARY KEY (id),
  CONSTRAINT "Student_classId_fkey" FOREIGN KEY ("classId") REFERENCES public."Class"(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT "Student_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Student_nisn_key" ON public."Student" (nisn);
CREATE UNIQUE INDEX IF NOT EXISTS "Student_nis_key" ON public."Student" (nis);
CREATE UNIQUE INDEX IF NOT EXISTS "Student_userId_key" ON public."Student" ("userId");
CREATE INDEX IF NOT EXISTS "Student_classId_idx" ON public."Student" ("classId");

-- Subject
CREATE TABLE IF NOT EXISTS public."Subject" (
  id   text NOT NULL,
  name text NOT NULL,
  code text NOT NULL,
  CONSTRAINT "Subject_pkey" PRIMARY KEY (id)
);
CREATE UNIQUE INDEX IF NOT EXISTS "Subject_code_key" ON public."Subject" (code);

-- Schedule
CREATE TABLE IF NOT EXISTS public."Schedule" (
  id          text    NOT NULL,
  "dayOfWeek" integer NOT NULL,
  "startTime" text    NOT NULL,
  "endTime"   text    NOT NULL,
  "classId"   text    NOT NULL,
  "subjectId" text    NOT NULL,
  "teacherId" text    NOT NULL,
  CONSTRAINT "Schedule_pkey" PRIMARY KEY (id),
  CONSTRAINT "Schedule_classId_fkey" FOREIGN KEY ("classId") REFERENCES public."Class"(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT "Schedule_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES public."Subject"(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT "Schedule_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES public."TeacherProfile"(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- Attendance
CREATE TABLE IF NOT EXISTS public."Attendance" (
  id           text                           NOT NULL,
  date         timestamp(3) without time zone NOT NULL,
  status       text                           NOT NULL,
  "studentId"  text                           NOT NULL,
  "scheduleId" text                           NOT NULL,
  "createdAt"  timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  location     text,
  "photoUrl"   text,
  "updatedAt"  timestamp(3) without time zone NOT NULL,
  CONSTRAINT "Attendance_pkey" PRIMARY KEY (id),
  CONSTRAINT "Attendance_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES public."Schedule"(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT "Attendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public."Student"(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- DailyAttendance
CREATE TABLE IF NOT EXISTS public."DailyAttendance" (
  id             text                           NOT NULL,
  date           timestamp(3) without time zone NOT NULL,
  "checkInTime"  text,
  "checkOutTime" text,
  "time"         text                           NOT NULL,
  status         text                           NOT NULL,
  "userId"       text                           NOT NULL,
  CONSTRAINT "DailyAttendance_pkey" PRIMARY KEY (id),
  CONSTRAINT "DailyAttendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "DailyAttendance_date_userId_key" ON public."DailyAttendance" (date, "userId");
CREATE INDEX IF NOT EXISTS "DailyAttendance_date_idx" ON public."DailyAttendance" (date);

-- Grade
CREATE TABLE IF NOT EXISTS public."Grade" (
  id          text             NOT NULL,
  type        text             NOT NULL,
  score       double precision NOT NULL,
  "studentId" text             NOT NULL,
  "subjectId" text             NOT NULL,
  semester    integer          NOT NULL,
  CONSTRAINT "Grade_pkey" PRIMARY KEY (id),
  CONSTRAINT "Grade_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public."Student"(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT "Grade_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES public."Subject"(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- TeachingJournal
CREATE TABLE IF NOT EXISTS public."TeachingJournal" (
  id           text                           NOT NULL,
  date         timestamp(3) without time zone NOT NULL,
  material     text                           NOT NULL,
  notes        text,
  "scheduleId" text                           NOT NULL,
  "teacherId"  text                           NOT NULL,
  "photoUrl"   text,
  CONSTRAINT "TeachingJournal_pkey" PRIMARY KEY (id),
  CONSTRAINT "TeachingJournal_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES public."Schedule"(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT "TeachingJournal_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES public."TeacherProfile"(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- HomeroomJournal
CREATE TABLE IF NOT EXISTS public."HomeroomJournal" (
  id            text                           NOT NULL,
  date          timestamp(3) without time zone NOT NULL,
  notes         text                           NOT NULL,
  "actionTaken" text,
  "teacherId"   text                           NOT NULL,
  CONSTRAINT "HomeroomJournal_pkey" PRIMARY KEY (id),
  CONSTRAINT "HomeroomJournal_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES public."TeacherProfile"(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- Setting
CREATE TABLE IF NOT EXISTS public."Setting" (
  id              text             NOT NULL,
  "schoolName"    text             NOT NULL,
  address         text             NOT NULL,
  phone           text,
  email           text,
  "logoUrl"       text,
  "principalName" text,
  "principalNip"  text,
  "qrPublicToken" text,
  "bankName"      text,
  "bankNumber"    text,
  "bankOwner"     text,
  "academicYear"  text             DEFAULT '2026/2027'::text,
  semester        text             DEFAULT 'Ganjil'::text,
  "defaultDpp"    double precision DEFAULT 0,
  "defaultUka"    double precision DEFAULT 0,
  "defaultUks"    double precision DEFAULT 0,
  "defaultInfaq"  double precision DEFAULT 0,
  "defaultSeragam" double precision DEFAULT 2000000,
  CONSTRAINT "Setting_pkey" PRIMARY KEY (id)
);

-- Announcement
CREATE TABLE IF NOT EXISTS public."Announcement" (
  id          text                           NOT NULL,
  title       text                           NOT NULL,
  content     text                           NOT NULL,
  target      text                           NOT NULL,
  "authorId"  text                           NOT NULL,
  "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) without time zone NOT NULL,
  "eventDate" timestamp(3) without time zone,
  image       text,
  type        text                           DEFAULT 'BERITA'::text NOT NULL,
  CONSTRAINT "Announcement_pkey" PRIMARY KEY (id),
  CONSTRAINT "Announcement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- StaffJournal
CREATE TABLE IF NOT EXISTS public."StaffJournal" (
  id          text                           NOT NULL,
  date        timestamp(3) without time zone NOT NULL,
  activity    text                           NOT NULL,
  notes       text,
  "userId"    text                           NOT NULL,
  "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) without time zone NOT NULL,
  evidence    text,
  CONSTRAINT "StaffJournal_pkey" PRIMARY KEY (id),
  CONSTRAINT "StaffJournal_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE
);

-- IzinKeluar
CREATE TABLE IF NOT EXISTS public."IzinKeluar" (
  id                text                           NOT NULL,
  date              timestamp(3) without time zone NOT NULL,
  "waktuKeluar"     text                           NOT NULL,
  "estimasiKembali" text,
  alasan            text                           NOT NULL,
  status            text                           DEFAULT 'MENUNGGU'::text NOT NULL,
  "catatanAdmin"    text,
  "userId"          text                           NOT NULL,
  "createdAt"       timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt"       timestamp(3) without time zone NOT NULL,
  CONSTRAINT "IzinKeluar_pkey" PRIMARY KEY (id),
  CONSTRAINT "IzinKeluar_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE
);

-- Tagihan
CREATE TABLE IF NOT EXISTS public."Tagihan" (
  id           text                           NOT NULL,
  "studentId"  text                           NOT NULL,
  type         text                           NOT NULL,
  amount       double precision               NOT NULL,
  "amountPaid" double precision               DEFAULT 0 NOT NULL,
  month        integer,
  year         integer,
  "dueDate"    timestamp(3) without time zone,
  status       text                           DEFAULT 'BELUM_LUNAS'::text NOT NULL,
  "paidDate"   timestamp(3) without time zone,
  notes        text,
  "createdAt"  timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt"  timestamp(3) without time zone NOT NULL,
  CONSTRAINT "Tagihan_pkey" PRIMARY KEY (id),
  CONSTRAINT "Tagihan_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public."Student"(id) ON UPDATE CASCADE ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "Tagihan_studentId_status_idx" ON public."Tagihan" ("studentId", status);
CREATE INDEX IF NOT EXISTS "Tagihan_year_month_status_idx" ON public."Tagihan" (year, month, status);
CREATE INDEX IF NOT EXISTS "Tagihan_type_idx" ON public."Tagihan" (type);

-- Payment
CREATE TABLE IF NOT EXISTS public."Payment" (
  id            text                           NOT NULL,
  "studentId"   text                           NOT NULL,
  "tagihanId"   text,
  type          text                           NOT NULL,
  amount        double precision               NOT NULL,
  "paymentDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  month         integer,
  year          integer,
  notes         text,
  "createdAt"   timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt"   timestamp(3) without time zone NOT NULL,
  CONSTRAINT "Payment_pkey" PRIMARY KEY (id),
  CONSTRAINT "Payment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public."Student"(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "Payment_tagihanId_fkey" FOREIGN KEY ("tagihanId") REFERENCES public."Tagihan"(id) ON UPDATE CASCADE ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "Payment_studentId_idx" ON public."Payment" ("studentId");
CREATE INDEX IF NOT EXISTS "Payment_tagihanId_idx" ON public."Payment" ("tagihanId");
CREATE INDEX IF NOT EXISTS "Payment_year_month_idx" ON public."Payment" (year, month);

-- Pengeluaran
CREATE TABLE IF NOT EXISTS public."Pengeluaran" (
  id           text                           NOT NULL,
  title        text                           NOT NULL,
  description  text,
  amount       double precision               NOT NULL,
  category     text                           DEFAULT 'UMUM'::text NOT NULL,
  date         timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "recordedBy" text                           NOT NULL,
  "createdAt"  timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt"  timestamp(3) without time zone NOT NULL,
  CONSTRAINT "Pengeluaran_pkey" PRIMARY KEY (id),
  CONSTRAINT "Pengeluaran_recordedBy_fkey" FOREIGN KEY ("recordedBy") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS "Pengeluaran_date_idx" ON public."Pengeluaran" (date);
CREATE INDEX IF NOT EXISTS "Pengeluaran_category_idx" ON public."Pengeluaran" (category);

-- FileHash
CREATE TABLE IF NOT EXISTS public."FileHash" (
  id           text                           NOT NULL,
  hash         text                           NOT NULL,
  "filePath"   text                           NOT NULL,
  "fileSize"   integer                        NOT NULL,
  "uploadedBy" text                           NOT NULL,
  "createdAt"  timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "FileHash_pkey" PRIMARY KEY (id),
  CONSTRAINT "FileHash_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT
);
CREATE UNIQUE INDEX IF NOT EXISTS "FileHash_hash_key" ON public."FileHash" (hash);

-- PaymentProof
CREATE TABLE IF NOT EXISTS public."PaymentProof" (
  id             text                           NOT NULL,
  "studentId"    text                           NOT NULL,
  "tagihanId"    text,
  amount         double precision               NOT NULL,
  "proofUrl"     text                           NOT NULL,
  "fileHash"     text,
  status         text                           DEFAULT 'MENUNGGU_VERIFIKASI'::text NOT NULL,
  notes          text,
  "verifiedBy"   text,
  "createdAt"    timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt"    timestamp(3) without time zone NOT NULL,
  CONSTRAINT "PaymentProof_pkey" PRIMARY KEY (id),
  CONSTRAINT "PaymentProof_fileHash_fkey" FOREIGN KEY ("fileHash") REFERENCES public."FileHash"(hash) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT "PaymentProof_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public."Student"(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "PaymentProof_tagihanId_fkey" FOREIGN KEY ("tagihanId") REFERENCES public."Tagihan"(id) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT "PaymentProof_verifiedBy_fkey" FOREIGN KEY ("verifiedBy") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL
);

-- Notification
CREATE TABLE IF NOT EXISTS public."Notification" (
  id          text                           NOT NULL,
  "userId"    text                           NOT NULL,
  "senderId"  text,
  type        text                           NOT NULL,
  title       text                           NOT NULL,
  message     text                           NOT NULL,
  data        jsonb,
  priority    text                           DEFAULT 'NORMAL'::text NOT NULL,
  status      text                           DEFAULT 'UNREAD'::text NOT NULL,
  channel     text                           DEFAULT 'IN_APP'::text NOT NULL,
  "isRead"    boolean                        DEFAULT false NOT NULL,
  "readAt"    timestamp(3) without time zone,
  "expiresAt" timestamp(3) without time zone,
  "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) without time zone NOT NULL,
  CONSTRAINT "Notification_pkey" PRIMARY KEY (id),
  CONSTRAINT "Notification_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "Notification_userId_status_idx" ON public."Notification" ("userId", status);
CREATE INDEX IF NOT EXISTS "Notification_userId_type_idx" ON public."Notification" ("userId", type);
CREATE INDEX IF NOT EXISTS "Notification_createdAt_idx" ON public."Notification" ("createdAt");

-- NotificationTemplate
CREATE TABLE IF NOT EXISTS public."NotificationTemplate" (
  id             text                           NOT NULL,
  type           text                           NOT NULL,
  title          text                           NOT NULL,
  message        text                           NOT NULL,
  "emailSubject" text,
  "emailBody"    text,
  "smsTemplate"  text,
  "isActive"     boolean                        DEFAULT true NOT NULL,
  "createdAt"    timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt"    timestamp(3) without time zone NOT NULL,
  CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY (id)
);
CREATE UNIQUE INDEX IF NOT EXISTS "NotificationTemplate_type_key" ON public."NotificationTemplate" (type);

-- ProgramConfig
CREATE TABLE IF NOT EXISTS public."ProgramConfig" (
  id                text                           NOT NULL,
  code              text                           NOT NULL,
  name              text                           NOT NULL,
  "defaultSpp"      double precision               DEFAULT 0 NOT NULL,
  "defaultDiscount" double precision               DEFAULT 0 NOT NULL,
  description       text,
  "createdAt"       timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt"       timestamp(3) without time zone NOT NULL,
  CONSTRAINT "ProgramConfig_pkey" PRIMARY KEY (id)
);
CREATE UNIQUE INDEX IF NOT EXISTS "ProgramConfig_code_key" ON public."ProgramConfig" (code);

-- DanaBantuan
CREATE TABLE IF NOT EXISTS public."DanaBantuan" (
  id                  text                           NOT NULL,
  "namaBantuan"       text                           NOT NULL,
  kategori            text                           DEFAULT 'SISWA'::text NOT NULL,
  "sumberDana"        text                           DEFAULT 'Yayasan'::text NOT NULL,
  nominal             double precision               NOT NULL,
  penerima            text,
  tanggal             timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  status              text                           DEFAULT 'DISETUJUI'::text NOT NULL,
  keterangan          text,
  "targetSync"        text                           DEFAULT 'KEUANGAN_KELUAR'::text NOT NULL,
  "isSynced"          boolean                        DEFAULT false NOT NULL,
  "syncedAt"          timestamp(3) without time zone,
  "syncedReferenceId" text,
  "recordedBy"        text                           NOT NULL,
  "createdAt"         timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt"         timestamp(3) without time zone NOT NULL,
  CONSTRAINT "DanaBantuan_pkey" PRIMARY KEY (id),
  CONSTRAINT "DanaBantuan_recordedBy_fkey" FOREIGN KEY ("recordedBy") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS "DanaBantuan_tanggal_idx" ON public."DanaBantuan" (tanggal);
CREATE INDEX IF NOT EXISTS "DanaBantuan_kategori_idx" ON public."DanaBantuan" (kategori);
CREATE INDEX IF NOT EXISTS "DanaBantuan_isSynced_idx" ON public."DanaBantuan" ("isSynced");
