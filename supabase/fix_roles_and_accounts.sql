-- Aktifkan bypass role guard untuk session ini
SELECT set_config('app.bypass_role_guard', 'on', false);

-- 1. Pastikan grouppertamagpt@gmail.com memiliki role super_admin dan password superadmin123
UPDATE public.profiles 
SET role = 'super_admin', id_bengkel = NULL 
WHERE email = 'grouppertamagpt@gmail.com';

UPDATE auth.users 
SET encrypted_password = extensions.crypt('superadmin123', extensions.gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{role}', '"super_admin"')
WHERE email = 'grouppertamagpt@gmail.com';

-- 2. Pastikan owner@gmail.com memiliki role owner dan bengkel-2307
UPDATE public.profiles 
SET role = 'owner', id_bengkel = 'bengkel-2307' 
WHERE email = 'owner@gmail.com';

UPDATE auth.users 
SET encrypted_password = extensions.crypt('owner123', extensions.gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{role}', '"owner"')
WHERE email = 'owner@gmail.com';

-- Update tabel owner untuk owner@gmail.com
UPDATE public.owner 
SET id_bengkel = 'bengkel-2307',
    user_id = 'c456495e-bcc8-4aba-8b34-fae943a52aa2',
    status = 'aktif'
WHERE email = 'owner@gmail.com';

-- 3. Pastikan fandinasir@gmail.com tetap aktif sebagai owner bengkel-2307
UPDATE public.profiles
SET role = 'owner', id_bengkel = 'bengkel-2307'
WHERE email = 'fandinasir@gmail.com';

-- 4. Pastikan roniyahaha@gmail.com memiliki password roni123 (sesuai input form user!)
UPDATE auth.users 
SET encrypted_password = extensions.crypt('roni123', extensions.gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{role}', '"pelanggan"')
WHERE email = 'roniyahaha@gmail.com';

-- 5. Tambahkan akun superadmin@gmail.com jika belum ada untuk kemudahan akses Super Admin
DO $$
DECLARE
  super_id uuid;
BEGIN
  SELECT id INTO super_id FROM auth.users WHERE email = 'superadmin@gmail.com';
  
  IF super_id IS NULL THEN
    super_id := gen_random_uuid();
    
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      super_id,
      'authenticated',
      'authenticated',
      'superadmin@gmail.com',
      extensions.crypt('superadmin123', extensions.gen_salt('bf')),
      now(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      '{"full_name": "Super Admin AppBenk", "role": "super_admin"}'::jsonb,
      now(),
      now()
    );
  ELSE
    UPDATE auth.users 
    SET encrypted_password = extensions.crypt('superadmin123', extensions.gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{role}', '"super_admin"')
    WHERE id = super_id;
  END IF;

  INSERT INTO public.profiles (id, full_name, email, role, id_bengkel)
  VALUES (super_id, 'Super Admin AppBenk', 'superadmin@gmail.com', 'super_admin', NULL)
  ON CONFLICT (id) DO UPDATE 
  SET role = 'super_admin',
      full_name = 'Super Admin AppBenk';
END $$;

SELECT 'ROLE FIX COMPLETED' as status;
