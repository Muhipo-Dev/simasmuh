-- Migration: Enforce Strict Row Level Security (RLS) and Revoke Public / Anon direct access
-- Menjamin 100% tabel public terlindungi RLS aktif dan akses direct PostgREST anon ditutup.
-- Hanya backend SIMASMUH (service_role / postgres superuser / secure connection) yang dapat mengelola data.

DO $$
DECLARE
    r RECORD;
BEGIN
    -- 1. Aktifkan RLS di SELURUH tabel skema public tanpa terkecuali
    FOR r IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
          AND tablename NOT LIKE 'pg_%' 
          AND tablename NOT LIKE '_prisma%'
    ) LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
        
        -- Revoke akses langsung publik (anon / public role) dari tabel
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, public;', r.tablename);
        
        -- Berikan akses eksklusif hanya untuk peran service_role dan postgres (Backend & Perangkat Server SIMASMUH)
        EXECUTE format('GRANT ALL ON TABLE public.%I TO postgres, service_role;', r.tablename);
        
        -- Refresh backend access policy
        EXECUTE format('DROP POLICY IF EXISTS "simasmuh_system_server_policy" ON public.%I;', r.tablename);
        EXECUTE format('CREATE POLICY "simasmuh_system_server_policy" ON public.%I TO postgres, service_role USING (true) WITH CHECK (true);', r.tablename);
    END LOOP;
END $$;
