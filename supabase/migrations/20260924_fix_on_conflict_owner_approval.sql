-- ============================================================================
-- FIX ON CONFLICT CONSTRAINT & APPROVAL ONBOARDING FOR APPBENK
-- ============================================================================

-- 1. Tambahkan UNIQUE constraint pada public.owner(user_id) secara idempotent
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.owner'::regclass 
      AND contype = 'u' 
      AND conname = 'owner_user_id_key'
  ) THEN
    ALTER TABLE public.owner ADD CONSTRAINT owner_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- 2. Tambahkan UNIQUE constraint pada public.admin(user_id) secara idempotent
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.admin'::regclass 
      AND contype = 'u' 
      AND conname = 'admin_user_id_key'
  ) THEN
    ALTER TABLE public.admin ADD CONSTRAINT admin_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- 3. Perbarui trigger prevent_role_tampering agar mengizinkan Super Admin dan transaksi internal
CREATE OR REPLACE FUNCTION public.prevent_role_tampering()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Izinkan jika bypass context aktif pada transaksi saat ini
  IF current_setting('app.bypass_role_guard', true) = 'on' THEN
    RETURN NEW;
  END IF;

  -- Jika kolom role berubah dan user yang mengubah bukan Owner atau Super Admin
  IF NEW.role <> OLD.role AND NOT (public.has_role(ARRAY['owner']::public.app_role[]) OR public.is_super_admin()) THEN
    RAISE EXCEPTION 'Akses Ditolak: Anda tidak memiliki wewenang untuk mengubah role akun.';
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Perbarui approve_workshop_application dengan bypass guard dan ON CONFLICT yang valid
CREATE OR REPLACE FUNCTION public.approve_workshop_application(
  p_application_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app record;
  v_new_id_bengkel text;
  v_clean_nama_bengkel text;
BEGIN
  -- 1. Validasi Pemanggil Harus Super Admin
  IF NOT public.is_super_admin() THEN
    RETURN json_build_object('ok', false, 'error', 'Akses ditolak: Hanya Super Admin yang berhak menyetujui pengajuan.');
  END IF;

  -- 2. Ambil Data Pengajuan yang Sedang PENDING (Lock for update)
  SELECT * INTO v_app
  FROM public.workshop_applications
  WHERE id = p_application_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'Data pengajuan tidak ditemukan.');
  END IF;

  IF v_app.status <> 'PENDING' THEN
    RETURN json_build_object('ok', false, 'error', 'Pengajuan ini sudah berstatus ' || v_app.status || ' dan tidak dapat disetujui ulang.');
  END IF;

  -- Set bypass agar trigger prevent_role_tampering mengizinkan update role
  PERFORM set_config('app.bypass_role_guard', 'on', true);

  -- 3. Generate ID Bengkel Otomatis (Format TEXT: bengkel-XXXX)
  LOOP
    v_new_id_bengkel := 'bengkel-' || lpad((floor(random() * 9000) + 1000)::text, 4, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.bengkel WHERE id_bengkel = v_new_id_bengkel);
  END LOOP;

  v_clean_nama_bengkel := trim(v_app.nama_bengkel);

  -- 4. Transaksi Atomik: INSERT Bengkel Baru
  INSERT INTO public.bengkel (
    id_bengkel,
    nama_bengkel,
    alamat,
    no_telepon,
    paket,
    status,
    owner_nama,
    owner_email,
    created_at,
    updated_at
  ) VALUES (
    v_new_id_bengkel,
    v_clean_nama_bengkel,
    v_app.alamat,
    v_app.no_telepon,
    v_app.paket,
    'Aktif',
    v_app.owner_nama,
    v_app.owner_email,
    now(),
    now()
  );

  -- 5. Transaksi Atomik: INSERT / UPDATE Owner (id_owner MURNI MENGGUNAKAN UUID!)
  INSERT INTO public.owner (
    id_owner,
    user_id,
    nama,
    email,
    no_hp,
    status,
    id_bengkel,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_app.user_id,
    v_app.owner_nama,
    v_app.owner_email,
    v_app.no_telepon,
    'aktif',
    v_new_id_bengkel,
    now(),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    id_bengkel = EXCLUDED.id_bengkel,
    nama = EXCLUDED.nama,
    email = EXCLUDED.email,
    no_hp = EXCLUDED.no_hp,
    status = 'aktif',
    updated_at = now();

  -- 6. Transaksi Atomik: Update profiles Pengguna Menjadi 'owner'
  UPDATE public.profiles
  SET
    role = 'owner',
    id_bengkel = v_new_id_bengkel,
    full_name = COALESCE(v_app.owner_nama, full_name),
    phone = COALESCE(v_app.no_telepon, phone),
    updated_at = now()
  WHERE id = v_app.user_id;

  -- 7. Update Status Pengajuan Menjadi APPROVED
  UPDATE public.workshop_applications
  SET
    status = 'APPROVED',
    bengkel_id_result = v_new_id_bengkel,
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    updated_at = now()
  WHERE id = p_application_id;

  RETURN json_build_object(
    'ok', true,
    'id_bengkel', v_new_id_bengkel,
    'nama_bengkel', v_clean_nama_bengkel,
    'owner_id', v_app.user_id
  );
END;
$$;

-- 5. Perbarui claim_admin_invitation dengan bypass guard dan ON CONFLICT yang valid
CREATE OR REPLACE FUNCTION public.claim_admin_invitation(p_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv record;
  v_user_email text;
  v_existing_owner record;
BEGIN
  -- 1. Pastikan Sesi Login Pengguna Tersedia
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'Sesi tidak ditemukan. Silakan login atau buat akun terlebih dahulu.');
  END IF;

  -- 2. Ambil Email Pengguna dari auth.users
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = auth.uid();

  -- 3. Cari Undangan yang Bersangkutan (Lock for update)
  SELECT * INTO v_inv
  FROM public.admin_invitations
  WHERE token = trim(p_token)
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'Undangan tidak ditemukan.');
  END IF;

  IF v_inv.status <> 'pending' THEN
    RETURN json_build_object('ok', false, 'error', 'Undangan ini sudah tidak dapat digunakan (Status: ' || v_inv.status || ').');
  END IF;

  IF v_inv.expires_at < now() THEN
    UPDATE public.admin_invitations SET status = 'expired', updated_at = now() WHERE id = v_inv.id;
    RETURN json_build_object('ok', false, 'error', 'Undangan ini telah kedaluwarsa.');
  END IF;

  -- 4. VALIDASI INTEGRITAS: Akun Auth Harus Sesuai dengan Email Undangan
  IF lower(trim(v_user_email)) <> lower(trim(v_inv.email)) THEN
    RETURN json_build_object(
      'ok', false, 
      'error', 'Email akun yang sedang aktif (' || COALESCE(v_user_email, '-') || ') tidak sesuai dengan email penerima undangan (' || v_inv.email || ').'
    );
  END IF;

  -- 5. VALIDASI INTEGRITAS: Mencegah Owner Mengklaim Undangan Admin
  SELECT * INTO v_existing_owner FROM public.owner WHERE user_id = auth.uid();
  IF FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'Akun Anda sudah terdaftar sebagai Owner bengkel dan tidak dapat diubah menjadi Admin.');
  END IF;

  -- Set bypass agar trigger prevent_role_tampering mengizinkan update role
  PERFORM set_config('app.bypass_role_guard', 'on', true);

  -- 6. Update profiles Pengguna Menjadi 'admin' Terikat ke id_bengkel
  UPDATE public.profiles
  SET
    role = 'admin',
    id_bengkel = v_inv.id_bengkel,
    full_name = COALESCE(v_inv.nama, full_name),
    updated_at = now()
  WHERE id = auth.uid();

  -- 7. INSERT / UPDATE public.admin (id_admin MURNI MENGGUNAKAN UUID!)
  INSERT INTO public.admin (
    id_admin,
    user_id,
    nama,
    email,
    no_hp,
    status,
    id_bengkel,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    auth.uid(),
    v_inv.nama,
    v_inv.email,
    null,
    'aktif',
    v_inv.id_bengkel,
    now(),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    id_bengkel = EXCLUDED.id_bengkel,
    nama = EXCLUDED.nama,
    status = 'aktif',
    updated_at = now();

  -- 8. Tandai Undangan Sebagai 'accepted' (Hanya Bisa Dipakai 1 Kali)
  UPDATE public.admin_invitations
  SET
    status = 'accepted',
    accepted_by = auth.uid(),
    accepted_at = now(),
    updated_at = now()
  WHERE id = v_inv.id;

  RETURN json_build_object(
    'ok', true,
    'id_bengkel', v_inv.id_bengkel,
    'role', 'admin'
  );
END;
$$;

-- Izin Eksekusi Fungsi
GRANT EXECUTE ON FUNCTION public.approve_workshop_application(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_admin_invitation(text) TO authenticated;

