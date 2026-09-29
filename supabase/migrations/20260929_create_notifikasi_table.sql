-- Migration: Create Notifikasi Table and Enable Supabase Realtime
-- Tabel notifikasi in-app untuk komunikasi antar-role: Pelanggan, Admin, Owner

CREATE TABLE IF NOT EXISTS public.notifikasi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  bengkel_id TEXT,
  judul TEXT NOT NULL,
  pesan TEXT NOT NULL,
  tipe TEXT NOT NULL CHECK (tipe IN ('booking', 'servis', 'pembayaran', 'info')),
  tautan_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexing for fast query retrieval
CREATE INDEX IF NOT EXISTS idx_notifikasi_user_id ON public.notifikasi(user_id);
CREATE INDEX IF NOT EXISTS idx_notifikasi_bengkel_id ON public.notifikasi(bengkel_id);
CREATE INDEX IF NOT EXISTS idx_notifikasi_is_read ON public.notifikasi(is_read);
CREATE INDEX IF NOT EXISTS idx_notifikasi_created_at ON public.notifikasi(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.notifikasi ENABLE ROW LEVEL SECURITY;

-- 1. Policy Select: User dapat membaca notifikasi milik user_id mereka atau bengkel yang relevan
DROP POLICY IF EXISTS "notifikasi_select_policy" ON public.notifikasi;
CREATE POLICY "notifikasi_select_policy" ON public.notifikasi
  FOR SELECT
  TO authenticated, anon
  USING (
    user_id = auth.uid()
    OR user_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.admin a WHERE a.user_id = auth.uid() AND (a.id_bengkel = notifikasi.bengkel_id OR notifikasi.bengkel_id IS NULL)
    )
    OR EXISTS (
      SELECT 1 FROM public.owner o WHERE o.user_id = auth.uid() AND (o.id_bengkel = notifikasi.bengkel_id OR notifikasi.bengkel_id IS NULL)
    )
  );

-- 2. Policy Insert: Boleh insert dari client/frontend untuk memicu notifikasi antar-role
DROP POLICY IF EXISTS "notifikasi_insert_policy" ON public.notifikasi;
CREATE POLICY "notifikasi_insert_policy" ON public.notifikasi
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- 3. Policy Update: User dapat mengupdate status is_read notifikasi mereka
DROP POLICY IF EXISTS "notifikasi_update_policy" ON public.notifikasi;
CREATE POLICY "notifikasi_update_policy" ON public.notifikasi
  FOR UPDATE
  TO authenticated, anon
  USING (
    user_id = auth.uid()
    OR user_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.admin a WHERE a.user_id = auth.uid() AND (a.id_bengkel = notifikasi.bengkel_id OR notifikasi.bengkel_id IS NULL)
    )
    OR EXISTS (
      SELECT 1 FROM public.owner o WHERE o.user_id = auth.uid() AND (o.id_bengkel = notifikasi.bengkel_id OR notifikasi.bengkel_id IS NULL)
    )
  )
  WITH CHECK (true);

-- 4. Set REPLICA IDENTITY FULL dan daftarkan ke publikasi Realtime Supabase
ALTER TABLE public.notifikasi REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifikasi'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifikasi;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
