-- Create VirtualAccountTransaction Table
CREATE TABLE IF NOT EXISTS public."VirtualAccountTransaction" (
  id          text NOT NULL,
  "studentId" text NOT NULL,
  "tagihanId" text,
  "vaNumber"  text NOT NULL,
  "bankCode"  text NOT NULL,
  amount      double precision NOT NULL,
  status      text DEFAULT 'PENDING'::text NOT NULL,
  reference   text NOT NULL,
  "paidAt"    timestamp(3) without time zone,
  "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) without time zone NOT NULL,
  CONSTRAINT "VirtualAccountTransaction_pkey" PRIMARY KEY (id),
  CONSTRAINT "VirtualAccountTransaction_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public."Student"(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "VirtualAccountTransaction_tagihanId_fkey" FOREIGN KEY ("tagihanId") REFERENCES public."Tagihan"(id) ON UPDATE CASCADE ON DELETE SET NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "VirtualAccountTransaction_reference_key" ON public."VirtualAccountTransaction" (reference);
CREATE INDEX IF NOT EXISTS "VirtualAccountTransaction_studentId_idx" ON public."VirtualAccountTransaction" ("studentId");
CREATE INDEX IF NOT EXISTS "VirtualAccountTransaction_tagihanId_idx" ON public."VirtualAccountTransaction" ("tagihanId");

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."TeacherProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Class" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Student" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Subject" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Schedule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Attendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."DailyAttendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Grade" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."TeachingJournal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."HomeroomJournal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Setting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Announcement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."StaffJournal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."IzinKeluar" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Tagihan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Pengeluaran" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."FileHash" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PaymentProof" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."NotificationTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ProgramConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."DanaBantuan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."VirtualAccountTransaction" ENABLE ROW LEVEL SECURITY;

-- Create default policies allowing service role / authenticated backend access
DO $$
DECLARE
    tbl text;
    tables_list text[] := ARRAY[
        'User', 'TeacherProfile', 'Class', 'Student', 'Subject', 'Schedule', 
        'Attendance', 'DailyAttendance', 'Grade', 'TeachingJournal', 'HomeroomJournal', 
        'Setting', 'Announcement', 'StaffJournal', 'IzinKeluar', 'Tagihan', 
        'Payment', 'Pengeluaran', 'FileHash', 'PaymentProof', 'Notification', 
        'NotificationTemplate', 'ProgramConfig', 'DanaBantuan', 'VirtualAccountTransaction'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables_list LOOP
        EXECUTE format('DROP POLICY IF EXISTS "backend_access_policy" ON public.%I', tbl);
        EXECUTE format('CREATE POLICY "backend_access_policy" ON public.%I FOR ALL USING (true) WITH CHECK (true)', tbl);
    END LOOP;
END $$;
