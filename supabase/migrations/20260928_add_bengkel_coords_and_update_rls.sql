-- Migration: Tambah kolom latitude, longitude, jam_operasional dan policy UPDATE pada tabel bengkel
-- Date: 2026-09-28

-- 1. Tambah kolom latitude, longitude, dan jam_operasional ke tabel bengkel jika belum ada
ALTER TABLE public.bengkel 
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS jam_operasional text DEFAULT 'Senin–Sabtu: 08.00–17.00 WIB';

-- 2. Pastikan RLS diaktifkan
ALTER TABLE public.bengkel ENABLE ROW LEVEL SECURITY;

-- 3. Policy SELECT publik (pelanggan, anon, authenticated)
DROP POLICY IF EXISTS "bengkel_read_all" ON public.bengkel;
CREATE POLICY "bengkel_read_all" ON public.bengkel
  FOR SELECT TO public
  USING (true);

-- 4. Policy UPDATE untuk Owner, Admin, dan Super Admin
DROP POLICY IF EXISTS "bengkel_update_owner_staff" ON public.bengkel;
CREATE POLICY "bengkel_update_owner_staff" ON public.bengkel
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
    OR owner_email = (auth.jwt()->>'email')
    OR id_bengkel = (SELECT id_bengkel FROM public.profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.owner WHERE user_id = auth.uid() AND id_bengkel = bengkel.id_bengkel)
    OR EXISTS (SELECT 1 FROM public.admin WHERE user_id = auth.uid() AND id_bengkel = bengkel.id_bengkel)
  )
  WITH CHECK (true);

-- 5. Update data aktual Bengkel Fandi Motor
UPDATE public.bengkel
SET 
  alamat = 'Jl. Selaganggang, Kecamatan mrebet Kabupaten purbalingga.',
  latitude = -7.3245975,
  longitude = 109.352647,
  no_telepon = '081234567890',
  jam_operasional = 'Senin–Sabtu: 08.00–17.00 WIB',
  updated_at = NOW()
WHERE id_bengkel = 'bengkel-2307';

-- Update juga default koordinat untuk bengkel lainnya jika null
UPDATE public.bengkel SET latitude = -6.2088, longitude = 106.8456, jam_operasional = 'Senin–Sabtu: 08.00–17.00 WIB' WHERE id_bengkel = 'bengkel-001' AND latitude IS NULL;
UPDATE public.bengkel SET latitude = -6.2383, longitude = 106.9756, jam_operasional = 'Senin–Sabtu: 08.00–17.00 WIB' WHERE id_bengkel = 'bengkel-002' AND latitude IS NULL;
UPDATE public.bengkel SET latitude = -6.7105, longitude = 111.3415, jam_operasional = 'Senin–Sabtu: 08.00–17.00 WIB' WHERE id_bengkel = 'bengkel-3247' AND latitude IS NULL;

-- 6. Reload schema cache PostgREST
NOTIFY pgrst, 'reload schema';
