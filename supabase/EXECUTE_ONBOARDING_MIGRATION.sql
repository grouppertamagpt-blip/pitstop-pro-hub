-- ============================================================================
-- APPBENK: WORKSHOP ONBOARDING & ADMIN INVITATIONS MIGRATION
-- Target Database: https://oviiclcydeopilagbypq.supabase.co
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABEL: public.workshop_applications (Pengajuan Calon Owner)
-- ----------------------------------------------------------------------------
create table if not exists public.workshop_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nama_bengkel text not null,
  alamat text not null,
  no_telepon text not null,
  owner_nama text not null,
  owner_email text not null,
  paket text not null default 'Basic' check (paket in ('Basic', 'Premium')),
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  catatan_review text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  bengkel_id_result text references public.bengkel(id_bengkel) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indeks performa
create index if not exists idx_workshop_app_user_id on public.workshop_applications(user_id);
create index if not exists idx_workshop_app_status on public.workshop_applications(status);

-- Satu user hanya boleh memiliki SATU pengajuan yang sedang PENDING pada saat bersamaan
create unique index if not exists idx_one_pending_app_per_user 
  on public.workshop_applications(user_id) 
  where status = 'PENDING';

-- Trigger function auto-update updated_at jika belum ada
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Trigger auto-update updated_at
drop trigger if exists trg_workshop_app_updated_at on public.workshop_applications;
create trigger trg_workshop_app_updated_at
  before update on public.workshop_applications
  for each row execute procedure public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 2. TABEL: public.admin_invitations (Undangan Staf oleh Owner)
-- ----------------------------------------------------------------------------
create table if not exists public.admin_invitations (
  id uuid primary key default gen_random_uuid(),
  id_bengkel text not null references public.bengkel(id_bengkel) on delete cascade,
  email text not null,
  nama text not null,
  token text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'cancelled')),
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indeks performa
create index if not exists idx_admin_inv_token on public.admin_invitations(token);
create index if not exists idx_admin_inv_bengkel on public.admin_invitations(id_bengkel);
create index if not exists idx_admin_inv_email on public.admin_invitations(email);

-- Satu email hanya boleh memiliki SATU undangan pending per bengkel
create unique index if not exists idx_one_pending_inv_per_email 
  on public.admin_invitations(lower(email), id_bengkel) 
  where status = 'pending';

-- Trigger auto-update updated_at
drop trigger if exists trg_admin_inv_updated_at on public.admin_invitations;
create trigger trg_admin_inv_updated_at
  before update on public.admin_invitations
  for each row execute procedure public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------------------
alter table public.workshop_applications enable row level security;
alter table public.admin_invitations enable row level security;

-- Policies untuk workshop_applications
drop policy if exists "workshop_app_select_policy" on public.workshop_applications;
create policy "workshop_app_select_policy"
  on public.workshop_applications
  for select
  to authenticated
  using (
    public.is_super_admin()
    or user_id = auth.uid()
  );

drop policy if exists "workshop_app_insert_policy" on public.workshop_applications;
create policy "workshop_app_insert_policy"
  on public.workshop_applications
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
  );

drop policy if exists "workshop_app_update_policy" on public.workshop_applications;
create policy "workshop_app_update_policy"
  on public.workshop_applications
  for update
  to authenticated
  using (
    public.is_super_admin()
  )
  with check (
    public.is_super_admin()
  );

-- Policies untuk admin_invitations
drop policy if exists "admin_inv_select_policy" on public.admin_invitations;
create policy "admin_inv_select_policy"
  on public.admin_invitations
  for select
  to authenticated
  using (
    public.is_super_admin()
    or id_bengkel = (select id_bengkel from public.profiles where id = auth.uid())
  );

drop policy if exists "admin_inv_insert_policy" on public.admin_invitations;
create policy "admin_inv_insert_policy"
  on public.admin_invitations
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles 
      where id = auth.uid() 
        and role = 'owner' 
        and id_bengkel = admin_invitations.id_bengkel
    )
  );

drop policy if exists "admin_inv_update_policy" on public.admin_invitations;
create policy "admin_inv_update_policy"
  on public.admin_invitations
  for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles 
      where id = auth.uid() 
        and role = 'owner' 
        and id_bengkel = admin_invitations.id_bengkel
    )
  );

-- ----------------------------------------------------------------------------
-- 4. SERVER-SIDE FUNCTIONS (SECURITY DEFINER, ATOMIC & ZERO-TRUST)
-- ----------------------------------------------------------------------------

-- A. Approval Pengajuan Bengkel (KHUSUS SUPER ADMIN)
create or replace function public.approve_workshop_application(
  p_application_id uuid
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app record;
  v_new_id_bengkel text;
  v_clean_nama_bengkel text;
begin
  -- 1. Validasi Pemanggil Harus Super Admin
  if not public.is_super_admin() then
    return json_build_object('ok', false, 'error', 'Akses ditolak: Hanya Super Admin yang berhak menyetujui pengajuan.');
  end if;

  -- 2. Ambil Data Pengajuan yang Sedang PENDING (Lock for update)
  select * into v_app
  from public.workshop_applications
  where id = p_application_id
  for update;

  if not found then
    return json_build_object('ok', false, 'error', 'Data pengajuan tidak ditemukan.');
  end if;

  if v_app.status <> 'PENDING' then
    return json_build_object('ok', false, 'error', 'Pengajuan ini sudah berstatus ' || v_app.status || ' dan tidak dapat disetujui ulang.');
  end if;

  -- 3. Generate ID Bengkel Otomatis (Format TEXT: bengkel-XXXX)
  loop
    v_new_id_bengkel := 'bengkel-' || lpad((floor(random() * 9000) + 1000)::text, 4, '0');
    exit when not exists (select 1 from public.bengkel where id_bengkel = v_new_id_bengkel);
  end loop;

  v_clean_nama_bengkel := trim(v_app.nama_bengkel);

  -- 4. Transaksi Atomik: INSERT Bengkel Baru
  insert into public.bengkel (
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
  ) values (
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
  insert into public.owner (
    id_owner,
    user_id,
    nama,
    email,
    no_hp,
    status,
    id_bengkel,
    created_at,
    updated_at
  ) values (
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
  on conflict (user_id) do update set
    id_bengkel = excluded.id_bengkel,
    nama = excluded.nama,
    email = excluded.email,
    no_hp = excluded.no_hp,
    status = 'aktif',
    updated_at = now();

  -- 6. Transaksi Atomik: Update profiles Pengguna Menjadi 'owner'
  update public.profiles
  set
    role = 'owner',
    id_bengkel = v_new_id_bengkel,
    full_name = coalesce(v_app.owner_nama, full_name),
    phone = coalesce(v_app.no_telepon, phone),
    updated_at = now()
  where id = v_app.user_id;

  -- 7. Update Status Pengajuan Menjadi APPROVED
  update public.workshop_applications
  set
    status = 'APPROVED',
    bengkel_id_result = v_new_id_bengkel,
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    updated_at = now()
  where id = p_application_id;

  return json_build_object(
    'ok', true,
    'id_bengkel', v_new_id_bengkel,
    'nama_bengkel', v_clean_nama_bengkel,
    'owner_id', v_app.user_id
  );
end;
$$;

-- B. Penolakan Pengajuan Bengkel (KHUSUS SUPER ADMIN)
create or replace function public.reject_workshop_application(
  p_application_id uuid,
  p_alasan text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin() then
    return json_build_object('ok', false, 'error', 'Akses ditolak: Hanya Super Admin yang berhak menolak pengajuan.');
  end if;

  update public.workshop_applications
  set
    status = 'REJECTED',
    catatan_review = coalesce(nullif(trim(p_alasan), ''), 'Pengajuan belum memenuhi syarat verifikasi platform.'),
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    updated_at = now()
  where id = p_application_id and status = 'PENDING';

  if not found then
    return json_build_object('ok', false, 'error', 'Pengajuan tidak ditemukan atau sudah tidak berstatus PENDING.');
  end if;

  return json_build_object('ok', true);
end;
$$;

-- C. Pembuatan Undangan Staf Admin (KHUSUS OWNER BENGKEL)
create or replace function public.create_admin_invitation(
  p_nama text,
  p_email text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_role text;
  v_caller_bengkel text;
  v_token text;
  v_inv_id uuid;
  v_clean_email text;
  v_clean_nama text;
begin
  -- 1. Validasi Sesi Autentikasi
  if auth.uid() is null then
    return json_build_object('ok', false, 'error', 'Sesi login tidak valid.');
  end if;

  -- 2. Membaca Otoritas Langsung dari profiles (Bukan dari Client)
  select role, id_bengkel into v_caller_role, v_caller_bengkel
  from public.profiles
  where id = auth.uid();

  -- HANYA Owner yang berhak mengundang Admin
  if v_caller_role <> 'owner' then
    return json_build_object('ok', false, 'error', 'Akses ditolak: Hanya Owner bengkel yang dapat mengundang staf Admin.');
  end if;

  if v_caller_bengkel is null or trim(v_caller_bengkel) = '' then
    return json_build_object('ok', false, 'error', 'Akun Owner ini belum terikat pada bengkel manapun.');
  end if;

  v_clean_email := lower(trim(p_email));
  v_clean_nama := trim(p_nama);

  if v_clean_email = '' or v_clean_nama = '' then
    return json_build_object('ok', false, 'error', 'Nama dan email calon admin wajib diisi.');
  end if;

  -- Cek apakah email sudah terdaftar sebagai Admin aktif di bengkel ini
  if exists (
    select 1 from public.admin 
    where lower(email) = v_clean_email and id_bengkel = v_caller_bengkel and status = 'aktif'
  ) then
    return json_build_object('ok', false, 'error', 'Staf dengan email ini sudah terdaftar aktif sebagai Admin di bengkel Anda.');
  end if;

  -- 3. Batalkan Undangan Pending Sebelumnya untuk Email Ini di Bengkel Ini (jika ada)
  update public.admin_invitations
  set status = 'cancelled', updated_at = now()
  where lower(email) = v_clean_email 
    and id_bengkel = v_caller_bengkel 
    and status = 'pending';

  -- 4. Generate Token Kriptografis Unik (24 bytes hex = 48 karakter)
  v_token := encode(gen_random_bytes(24), 'hex');

  -- 5. Simpan Undangan dengan Masa Berlaku Tepat 48 Jam
  insert into public.admin_invitations (
    id_bengkel,
    email,
    nama,
    token,
    created_by,
    expires_at,
    status
  ) values (
    v_caller_bengkel,
    v_clean_email,
    v_clean_nama,
    v_token,
    auth.uid(),
    now() + interval '48 hours',
    'pending'
  )
  returning id into v_inv_id;

  return json_build_object(
    'ok', true,
    'invitation_id', v_inv_id,
    'token', v_token,
    'id_bengkel', v_caller_bengkel,
    'email', v_clean_email,
    'expires_at', (now() + interval '48 hours')
  );
end;
$$;

-- D. Verifikasi Token Undangan (Dapat Diakses Anon/Auth untuk Mengecek Validitas Tautan)
create or replace function public.get_invitation_by_token(
  p_token text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv record;
  v_bengkel_nama text;
begin
  select * into v_inv
  from public.admin_invitations
  where token = trim(p_token);

  if not found then
    return json_build_object('ok', false, 'error', 'Tautan undangan tidak valid.');
  end if;

  if v_inv.status <> 'pending' then
    return json_build_object('ok', false, 'error', 'Tautan undangan ini sudah tidak berlaku (Status: ' || v_inv.status || ').');
  end if;

  if v_inv.expires_at < now() then
    update public.admin_invitations set status = 'expired', updated_at = now() where id = v_inv.id;
    return json_build_object('ok', false, 'error', 'Tautan undangan telah kedaluwarsa (masa berlaku 48 jam telah habis).');
  end if;

  select nama_bengkel into v_bengkel_nama
  from public.bengkel
  where id_bengkel = v_inv.id_bengkel;

  return json_build_object(
    'ok', true,
    'email', v_inv.email,
    'nama', v_inv.nama,
    'id_bengkel', v_inv.id_bengkel,
    'nama_bengkel', coalesce(v_bengkel_nama, 'Bengkel Mitra AppBenk'),
    'expires_at', v_inv.expires_at
  );
end;
$$;

-- E. Klaim Undangan Admin (Ketat, Atomik & Verifikasi Kesesuaian Email Auth)
create or replace function public.claim_admin_invitation(
  p_token text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv record;
  v_user_email text;
  v_existing_owner record;
begin
  -- 1. Pastikan Sesi Login Pengguna Tersedia
  if auth.uid() is null then
    return json_build_object('ok', false, 'error', 'Sesi tidak ditemukan. Silakan login atau buat akun terlebih dahulu.');
  end if;

  -- 2. Ambil Email Pengguna dari auth.users
  select email into v_user_email
  from auth.users
  where id = auth.uid();

  -- 3. Cari Undangan yang Bersangkutan (Lock for update)
  select * into v_inv
  from public.admin_invitations
  where token = trim(p_token)
  for update;

  if not found then
    return json_build_object('ok', false, 'error', 'Undangan tidak ditemukan.');
  end if;

  if v_inv.status <> 'pending' then
    return json_build_object('ok', false, 'error', 'Undangan ini sudah tidak dapat digunakan (Status: ' || v_inv.status || ').');
  end if;

  if v_inv.expires_at < now() then
    update public.admin_invitations set status = 'expired', updated_at = now() where id = v_inv.id;
    return json_build_object('ok', false, 'error', 'Undangan ini telah kedaluwarsa.');
  end if;

  -- 4. VALIDASI INTEGRITAS: Akun Auth Harus Sesuai dengan Email Undangan
  if lower(trim(v_user_email)) <> lower(trim(v_inv.email)) then
    return json_build_object(
      'ok', false, 
      'error', 'Email akun yang sedang aktif (' || coalesce(v_user_email, '-') || ') tidak sesuai dengan email penerima undangan (' || v_inv.email || ').'
    );
  end if;

  -- 5. VALIDASI INTEGRITAS: Mencegah Owner Mengklaim Undangan Admin
  select * into v_existing_owner from public.owner where user_id = auth.uid();
  if found then
    return json_build_object('ok', false, 'error', 'Akun Anda sudah terdaftar sebagai Owner bengkel dan tidak dapat diubah menjadi Admin.');
  end if;

  -- 6. Update profiles Pengguna Menjadi 'admin' Terikat ke id_bengkel
  update public.profiles
  set
    role = 'admin',
    id_bengkel = v_inv.id_bengkel,
    full_name = coalesce(v_inv.nama, full_name),
    updated_at = now()
  where id = auth.uid();

  -- 7. INSERT / UPDATE public.admin (id_admin MURNI MENGGUNAKAN UUID!)
  insert into public.admin (
    id_admin,
    user_id,
    nama,
    email,
    no_hp,
    status,
    id_bengkel,
    created_at,
    updated_at
  ) values (
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
  on conflict (user_id) do update set
    id_bengkel = excluded.id_bengkel,
    nama = excluded.nama,
    status = 'aktif',
    updated_at = now();

  -- 8. Tandai Undangan Sebagai 'accepted' (Hanya Bisa Dipakai 1 Kali)
  update public.admin_invitations
  set
    status = 'accepted',
    accepted_by = auth.uid(),
    accepted_at = now(),
    updated_at = now()
  where id = v_inv.id;

  return json_build_object(
    'ok', true,
    'id_bengkel', v_inv.id_bengkel,
    'role', 'admin'
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- 5. GRANTS KE AUTHENTICATED & ANON (PRINSIP LEAST PRIVILEGE)
-- ----------------------------------------------------------------------------
grant select, insert on public.workshop_applications to authenticated;
grant update on public.workshop_applications to authenticated;

grant select, insert, update on public.admin_invitations to authenticated;

grant execute on function public.approve_workshop_application(uuid) to authenticated;
grant execute on function public.reject_workshop_application(uuid, text) to authenticated;
grant execute on function public.create_admin_invitation(text, text) to authenticated;
grant execute on function public.get_invitation_by_token(text) to anon, authenticated;
grant execute on function public.claim_admin_invitation(text) to authenticated;
