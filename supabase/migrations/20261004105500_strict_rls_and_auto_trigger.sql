-- Migration: Eliminate Overly Permissive Policies, Enforce Strict Service-Only Access, and Automate RLS for Future Tables

-- 1. Hapus semua policy lama yang "USING (true)" ke public/all
DO $$
DECLARE
    r RECORD;
    pol RECORD;
BEGIN
    -- Loop seluruh tabel di schema public
    FOR r IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
          AND tablename NOT LIKE 'pg_%' 
          AND tablename NOT LIKE '_prisma%'
    ) LOOP
        -- Pastikan RLS aktif
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
        
        -- Cabut semua izin langsung dari role anon dan public
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, public, authenticated;', r.tablename);
        
        -- Berikan izin tabel hanya untuk backend & hardware server SIMASMUH (postgres & service_role)
        EXECUTE format('GRANT ALL ON TABLE public.%I TO postgres, service_role;', r.tablename);

        -- Hapus semua policy yang ada di tabel ini agar tidak ada warning "RLS Policy Always True"
        FOR pol IN (
            SELECT policyname 
            FROM pg_policies 
            WHERE schemaname = 'public' 
              AND tablename = r.tablename
        ) LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', pol.policyname, r.tablename);
        END LOOP;

        -- Pasang policy ketat HANYA untuk role internal service_role
        EXECUTE format('CREATE POLICY "simasmuh_internal_service_policy" ON public.%I FOR ALL TO service_role USING (auth.role() = ''service_role'') WITH CHECK (auth.role() = ''service_role'');', r.tablename);
    END LOOP;
END $$;

-- 2. Otomatisasi Hak Akses Default untuk Tabel Baru di Masa Depan
-- Setiap tabel baru yang dibuat oleh user 'postgres' di schema public akan otomatis mencabut hak akses public/anon dan menggrant ke service_role
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, public, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, service_role;

-- 3. Event Trigger Postgres: Otomatis Aktifkan RLS dan Terapkan Security Policy pada Setiap Tabel Baru
CREATE OR REPLACE FUNCTION public.auto_enable_rls_on_new_tables()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    obj record;
BEGIN
    FOR obj IN SELECT * FROM pg_event_trigger_ddl_commands() WHERE command_tag = 'CREATE TABLE'
    LOOP
        IF obj.schema_name = 'public' AND obj.object_identity NOT LIKE 'public._prisma%' THEN
            -- Aktifkan RLS secara otomatis
            EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY;', obj.object_identity);
            
            -- Cabut akses publik / anonim
            EXECUTE format('REVOKE ALL ON TABLE %s FROM anon, public, authenticated;', obj.object_identity);
            
            -- Berikan akses eksklusif ke postgres & service_role
            EXECUTE format('GRANT ALL ON TABLE %s TO postgres, service_role;', obj.object_identity);
            
            -- Buat policy ketat khusus service_role
            EXECUTE format('DROP POLICY IF EXISTS "simasmuh_internal_service_policy" ON %s;', obj.object_identity);
            EXECUTE format('CREATE POLICY "simasmuh_internal_service_policy" ON %s FOR ALL TO service_role USING (auth.role() = ''service_role'') WITH CHECK (auth.role() = ''service_role'');', obj.object_identity);
        END IF;
    END LOOP;
END;
$$;

-- Pasang Event Trigger DDL
DROP EVENT TRIGGER IF EXISTS trg_auto_enable_rls;
CREATE EVENT TRIGGER trg_auto_enable_rls
ON ddl_command_end
WHEN TAG IN ('CREATE TABLE')
EXECUTE FUNCTION public.auto_enable_rls_on_new_tables();
