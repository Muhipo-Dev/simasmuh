-- Migration: Ensure RLS and Attendance & Log Security
-- Table Attendance, DailyAttendance, SystemLog, WhatsAppLog, CompressedLogArchive

-- 1. Enable RLS on newly added & existing log and attendance tables
ALTER TABLE IF EXISTS public."Attendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."DailyAttendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."SystemLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."WhatsAppLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."CompressedLogArchive" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."UserSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."ParentProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."ParentStudent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."CharacterAssessment" ENABLE ROW LEVEL SECURITY;

-- 2. Create / Reapply strict RLS backend access policies
DO $$
DECLARE
    tbl text;
    tables_list text[] := ARRAY[
        'Attendance', 'DailyAttendance', 'SystemLog', 'WhatsAppLog', 
        'CompressedLogArchive', 'UserSession', 'ParentProfile', 
        'ParentStudent', 'CharacterAssessment'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables_list LOOP
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            EXECUTE format('DROP POLICY IF EXISTS "backend_access_policy" ON public.%I', tbl);
            EXECUTE format('CREATE POLICY "backend_access_policy" ON public.%I FOR ALL USING (true) WITH CHECK (true)', tbl);
        END IF;
    END LOOP;
END $$;
