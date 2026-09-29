-- ============================================================================
-- FIX CREATE_ADMIN_INVITATION & RLS POLICIES FOR APPBENK
-- ============================================================================

-- 1. Pastikan ekstensi pgcrypto tersedia di schema extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

-- 2. Sinkronkan profil yang sudah terdaftar di public.owner ke public.profiles
DO $$
BEGIN
  -- Aktifkan bypass context untuk trigger prevent_role_tampering
  PERFORM set_config('app.bypass_role_guard', 'on', true);

  UPDATE public.profiles p
  SET 
    role = 'owner',
    id_bengkel = o.id_bengkel,
    full_name = COALESCE(NULLIF(p.full_name, ''), o.nama, 'Owner Bengkel'),
    phone = COALESCE(p.phone, o.no_hp),
    updated_at = now()
  FROM public.owner o
  WHERE (p.id = o.user_id OR lower(trim(p.email)) = lower(trim(o.email)))
    AND (p.role <> 'owner' OR p.id_bengkel IS NULL OR p.id_bengkel <> o.id_bengkel);
END $$;

-- 3. Perbarui Stored Procedure public.create_admin_invitation secara tangguh
CREATE OR REPLACE FUNCTION public.create_admin_invitation(
  p_nama text,
  p_email text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_caller_role text;
  v_caller_bengkel text;
  v_token text;
  v_inv_id uuid;
  v_clean_email text;
  v_clean_nama text;
BEGIN
  -- 1. Validasi Sesi Autentikasi
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'Sesi login tidak valid.');
  END IF;

  -- 2. Membaca Otoritas: Cek dari profiles terlebih dahulu
  SELECT role, id_bengkel INTO v_caller_role, v_caller_bengkel
  FROM public.profiles
  WHERE id = auth.uid();

  -- Sinkronisasi cerdas jika user terdaftar di public.owner tetapi profiles belum tersinkron
  IF v_caller_role <> 'owner' OR v_caller_bengkel IS NULL OR trim(v_caller_bengkel) = '' THEN
    SELECT 'owner', o.id_bengkel INTO v_caller_role, v_caller_bengkel
    FROM public.owner o
    WHERE o.user_id = auth.uid() OR lower(trim(o.email)) = lower(trim(auth.jwt()->>'email'))
    LIMIT 1;

    -- Jika ditemukan di public.owner, perbarui profiles agar konsisten
    IF v_caller_role = 'owner' AND v_caller_bengkel IS NOT NULL THEN
      PERFORM set_config('app.bypass_role_guard', 'on', true);
      UPDATE public.profiles
      SET role = 'owner', id_bengkel = v_caller_bengkel, updated_at = now()
      WHERE id = auth.uid();
    END IF;
  END IF;

  -- Dukungan untuk Super Admin dalam pengujian platform
  IF public.is_super_admin() THEN
    v_caller_role := 'owner';
    IF v_caller_bengkel IS NULL OR trim(v_caller_bengkel) = '' THEN
      SELECT id_bengkel INTO v_caller_bengkel FROM public.bengkel ORDER BY created_at ASC LIMIT 1;
      v_caller_bengkel := COALESCE(v_caller_bengkel, 'bengkel-001');
    END IF;
  END IF;

  -- HANYA Owner (atau Super Admin) yang berhak mengundang Admin
  IF v_caller_role <> 'owner' THEN
    RETURN json_build_object('ok', false, 'error', 'Akses ditolak: Hanya Owner bengkel yang dapat mengundang staf Admin.');
  END IF;

  IF v_caller_bengkel IS NULL OR trim(v_caller_bengkel) = '' THEN
    RETURN json_build_object('ok', false, 'error', 'Akun Owner ini belum terikat pada bengkel manapun.');
  END IF;

  v_clean_email := lower(trim(p_email));
  v_clean_nama := trim(p_nama);

  IF v_clean_email = '' OR v_clean_nama = '' THEN
    RETURN json_build_object('ok', false, 'error', 'Nama dan email calon admin wajib diisi.');
  END IF;

  -- Cek apakah email sudah terdaftar sebagai Admin aktif di bengkel ini
  IF EXISTS (
    SELECT 1 FROM public.admin 
    WHERE lower(email) = v_clean_email AND id_bengkel = v_caller_bengkel AND status = 'aktif'
  ) THEN
    RETURN json_build_object('ok', false, 'error', 'Staf dengan email ini sudah terdaftar aktif sebagai Admin di bengkel Anda.');
  END IF;

  -- 3. Batalkan Undangan Pending Sebelumnya untuk Email Ini di Bengkel Ini (jika ada)
  UPDATE public.admin_invitations
  SET status = 'cancelled', updated_at = now()
  WHERE lower(email) = v_clean_email 
    AND id_bengkel = v_caller_bengkel 
    AND status = 'pending';

  -- 4. Generate Token Kriptografis Unik (Aman di semua environment)
  BEGIN
    v_token := encode(extensions.gen_random_bytes(24), 'hex');
  EXCEPTION WHEN OTHERS THEN
    v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  END;

  -- 5. Simpan Undangan dengan Masa Berlaku Tepat 48 Jam
  INSERT INTO public.admin_invitations (
    id_bengkel,
    email,
    nama,
    token,
    created_by,
    expires_at,
    status
  ) VALUES (
    v_caller_bengkel,
    v_clean_email,
    v_clean_nama,
    v_token,
    auth.uid(),
    now() + interval '48 hours',
    'pending'
  )
  RETURNING id INTO v_inv_id;

  RETURN json_build_object(
    'ok', true,
    'invitation_id', v_inv_id,
    'token', v_token,
    'id_bengkel', v_caller_bengkel,
    'email', v_clean_email,
    'expires_at', (now() + interval '48 hours')
  );
END;
$$;

-- 4. Perbarui RLS Policies pada public.admin_invitations
DROP POLICY IF EXISTS "admin_inv_select_policy" ON public.admin_invitations;
CREATE POLICY "admin_inv_select_policy"
  ON public.admin_invitations
  FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin()
    OR id_bengkel = (SELECT id_bengkel FROM public.profiles WHERE id = auth.uid())
    OR id_bengkel IN (SELECT id_bengkel FROM public.owner WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "admin_inv_insert_policy" ON public.admin_invitations;
CREATE POLICY "admin_inv_insert_policy"
  ON public.admin_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
        AND role = 'owner' 
        AND id_bengkel = admin_invitations.id_bengkel
    )
    OR EXISTS (
      SELECT 1 FROM public.owner
      WHERE user_id = auth.uid()
        AND id_bengkel = admin_invitations.id_bengkel
    )
  );

DROP POLICY IF EXISTS "admin_inv_update_policy" ON public.admin_invitations;
CREATE POLICY "admin_inv_update_policy"
  ON public.admin_invitations
  FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
        AND role = 'owner' 
        AND id_bengkel = admin_invitations.id_bengkel
    )
    OR EXISTS (
      SELECT 1 FROM public.owner
      WHERE user_id = auth.uid()
        AND id_bengkel = admin_invitations.id_bengkel
    )
  );

-- 5. Berikan Hak Akses ke authenticated & anon
GRANT SELECT, INSERT, UPDATE ON public.admin_invitations TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_admin_invitation(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_admin_invitation(text) TO authenticated;

-- 6. Reload schema PostgREST
NOTIFY pgrst, 'reload schema';
