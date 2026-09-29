import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase, type Profile } from "@/lib/supabase";
import {
  LayoutDashboard,
  CalendarPlus,
  Activity,
  Calculator,
  Wallet,
  History,
  UserCircle2,
  Inbox,
  Wrench,
  Package,
  FileBarChart,
  LineChart,
  Users,
  Car,
  ShoppingCart,
  LifeBuoy,
  Settings2,
  Building2,
  ClipboardCheck,
  ShieldAlert,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";

export type Role = "pelanggan" | "admin" | "owner" | "super_admin";

export type SessionUser = {
  /** Stable identity. In production this must be Supabase auth.users.id. */
  id: string;
  email: string;
  nama: string;
  role: Role;
  inisial: string;
  /** Bengkel identity for multi-bengkel isolation. */
  bengkelId?: string | undefined;
  /** Workshop UUID alias for multi-tenant SaaS. */
  workshopId?: string | undefined;
  /** Nama pelanggan yang dipetakan ke akun ini (khusus role pelanggan). */
  pelanggan?: string;
  /** ID resmi pelanggan dari tabel public.pelanggan (misal pl-8f0f7092). */
  pelangganId?: string | undefined;
  telepon?: string;
  gender?: string | undefined;
  avatarUrl?: string | undefined;
  premium: boolean;
};

/** Public registration creates customer accounts only. Admin/owner identities
 * must be provisioned internally by the connected auth provider. */
export const AKUN_DEMO: (SessionUser & { password: string })[] = [];

export const LABEL_ROLE: Record<Role, string> = {
  pelanggan: "Pelanggan",
  admin: "Admin Bengkel",
  owner: "Owner",
  super_admin: "Super Admin",
};

export type NavItem = { to: string; label: string; icon: LucideIcon; premium?: boolean };

export const NAV_ROLE: Record<Role, NavItem[]> = {
  pelanggan: [
    { to: "/pelanggan/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/pelanggan/booking", label: "Booking Servis", icon: CalendarPlus },
    { to: "/pelanggan/kendaraan", label: "Kendaraan Saya", icon: Car },
    { to: "/pelanggan/status", label: "Status Servis", icon: Activity },
    { to: "/pelanggan/estimasi", label: "Estimasi Servis", icon: Calculator },
    { to: "/pelanggan/pembayaran", label: "Pembayaran", icon: Wallet },
    { to: "/pelanggan/riwayat", label: "Riwayat Servis", icon: History },
    { to: "/pelanggan/cs", label: "Developer Support", icon: LifeBuoy },
    { to: "/profil", label: "Profile", icon: UserCircle2 },
  ],
  admin: [
    { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/admin/booking", label: "Booking Masuk", icon: Inbox },
    { to: "/admin/servis", label: "Operasional Servis", icon: Wrench },
    { to: "/admin/pembayaran", label: "Pembayaran", icon: Wallet },
    { to: "/admin/mekanik", label: "Kelola Mekanik", icon: Users },
    { to: "/admin/sparepart", label: "Kelola Sparepart", icon: Package },
    { to: "/admin/stok", label: "Catatan Stok", icon: ClipboardList },
    { to: "/admin/laporan", label: "Laporan & Data", icon: FileBarChart },
    { to: "/admin/cs", label: "Developer Support", icon: LifeBuoy },
    { to: "/admin/pengaturan", label: "Pengaturan Integrasi", icon: Settings2 },
    { to: "/profil", label: "Profile", icon: UserCircle2 },
  ],

  owner: [
    { to: "/owner/dashboard", label: "Dashboard Owner", icon: LayoutDashboard },
    { to: "/admin/dashboard", label: "Dashboard Operasional", icon: Activity },
    { to: "/admin/booking", label: "Booking Masuk", icon: Inbox },
    { to: "/admin/servis", label: "Operasional Servis", icon: Wrench },
    { to: "/admin/pembayaran", label: "Pembayaran", icon: Wallet },
    { to: "/admin/mekanik", label: "Kelola Mekanik", icon: Users },
    { to: "/admin/sparepart", label: "Kelola Sparepart", icon: Package },
    { to: "/admin/stok", label: "Catatan Stok", icon: ClipboardList },
    { to: "/admin/laporan", label: "Laporan & Data", icon: FileBarChart },
    { to: "/owner/servis", label: "Laporan Servis", icon: LineChart },
    { to: "/owner/sparepart", label: "Laporan Sparepart", icon: Package },
    { to: "/owner/pelanggan", label: "Laporan Pelanggan", icon: Users },
    { to: "/owner/admin", label: "Kelola Admin", icon: Users },
    { to: "/admin/pengaturan", label: "Pengaturan Bengkel", icon: Settings2 },
    { to: "/admin/cs", label: "Developer Support", icon: LifeBuoy },
    { to: "/profil", label: "Profile", icon: UserCircle2 },
  ],

  super_admin: [
    { to: "/superadmin/dashboard", label: "Dashboard Utama", icon: LayoutDashboard },
    { to: "/superadmin/klien", label: "Manajemen Klien", icon: Building2 },
    { to: "/superadmin/pengajuan-bengkel", label: "Pengajuan Bengkel", icon: ClipboardCheck },
    { to: "/superadmin/error-log", label: "Monitor Error", icon: ShieldAlert },
    { to: "/superadmin/cs", label: "Manajemen Tiket", icon: LifeBuoy },
    { to: "/profil", label: "Profile", icon: UserCircle2 },
  ],
};

export type NavGroup = { label?: string; items: NavItem[] };

const ITEM_PROFIL: NavItem = { to: "/profil", label: "Profile", icon: UserCircle2 };

export const NAV_GROUPS: Record<Role, NavGroup[]> = {
  pelanggan: [{ items: NAV_ROLE.pelanggan }],
  admin: [{ items: NAV_ROLE.admin }],
  owner: [
    {
      items: [
        { to: "/owner/dashboard", label: "Dashboard Owner", icon: LayoutDashboard },
        { to: "/admin/dashboard", label: "Dashboard Operasional", icon: Activity },
      ],
    },
    {
      label: "Operasional Bengkel",
      items: [
        { to: "/admin/booking", label: "Booking Masuk", icon: Inbox },
        { to: "/admin/servis", label: "Operasional Servis", icon: Wrench },
        { to: "/admin/pembayaran", label: "Pembayaran", icon: Wallet },
        { to: "/admin/mekanik", label: "Kelola Mekanik", icon: Users },
        { to: "/admin/sparepart", label: "Kelola Sparepart", icon: Package },
        { to: "/admin/stok", label: "Catatan Stok", icon: ClipboardList },
      ],
    },
    {
      label: "Laporan & Analisis",
      items: [
        { to: "/admin/laporan", label: "Laporan & Data", icon: FileBarChart },
        { to: "/owner/servis", label: "Laporan Servis", icon: LineChart },
        { to: "/owner/sparepart", label: "Laporan Sparepart", icon: Package },
        { to: "/owner/pelanggan", label: "Laporan Pelanggan", icon: Users },
      ],
    },
    {
      label: "Pengaturan & Sistem",
      items: [
        { to: "/owner/admin", label: "Kelola Admin", icon: Users },
        { to: "/admin/pengaturan", label: "Pengaturan Bengkel", icon: Settings2 },
        { to: "/admin/cs", label: "Developer Support", icon: LifeBuoy },
        ITEM_PROFIL,
      ],
    },
  ],
  super_admin: [
    {
      items: [
        { to: "/superadmin/dashboard", label: "Dashboard Utama", icon: LayoutDashboard },
        { to: "/superadmin/klien", label: "Manajemen Klien", icon: Building2 },
        { to: "/superadmin/pengajuan-bengkel", label: "Pengajuan Bengkel", icon: ClipboardCheck },
        { to: "/superadmin/error-log", label: "Monitor Error", icon: ShieldAlert },
        { to: "/superadmin/cs", label: "Manajemen Tiket", icon: LifeBuoy },
        ITEM_PROFIL,
      ],
    },
  ],
};

export const HOME_ROLE: Record<Role, string> = {
  pelanggan: "/pelanggan/dashboard",
  admin: "/admin/dashboard",
  owner: "/owner/dashboard",
  super_admin: "/superadmin/dashboard",
};

/** Prefix rute yang boleh diakses masing-masing role. */
export const IZIN_ROLE: Record<Role, string[]> = {
  pelanggan: ["/pelanggan", "/profil"],
  admin: ["/admin", "/profil"],
  owner: ["/owner", "/admin", "/profil"],
  super_admin: ["/superadmin", "/profil"],
};


export function bolehAkses(role: Role, pathname: string) {
  return IZIN_ROLE[role].some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function inisialDari(nama: string) {
  return nama
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

type AuthCtx = {
  user: SessionUser | null;
  loading: boolean;
  masuk: (email: string, password: string) => Promise<{ user?: SessionUser; error?: string }>;
  daftar: (input: {
    nama: string;
    email: string;
    telepon: string;
    gender?: string;
    password: string;
  }) => Promise<{ ok: boolean; error?: string; unconfirmed?: boolean }>;
  masukDenganGoogle: () => Promise<{ ok: boolean; error?: string }>;
  keluar: () => Promise<void>;
  aktifkanPremium: () => void;
  kirimKodeResetPassword: (email: string) => Promise<{ ok: boolean; error?: string }>;
  kirimUlangEmailVerifikasi: (email: string) => Promise<{ ok: boolean; error?: string }>;
  verifikasiDanUbahPassword: (
    email: string,
    token: string,
    passwordBaru: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  verifikasiKodeResetOtp: (
    email: string,
    token: string,
  ) => Promise<{
    ok: boolean;
    error?: string;
    errorType?: "empty" | "length" | "invalid" | "expired" | "other";
  }>;
  perbaruiKataSandiBaru: (passwordBaru: string) => Promise<{ ok: boolean; error?: string }>;
  cekSesiRecoveryAktif: () => Promise<boolean>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (id: string): Promise<SessionUser | null> => {
    const client = supabase();
    const { data, error } = await client
      .from("profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle<Profile>();

    if (!error && data) {
      let resolvedRole: Role = data.role;
      let activeBengkelId = data.workshop_id ?? data.id_bengkel ?? undefined;
      let displayName = data.full_name || "User";
      let displayPhone = data.phone;

      // 1. Cek apakah pengguna terdaftar di tabel owner (via user_id atau email)
      try {
        const { data: ownerRow } = await client
          .from("owner")
          .select("*")
          .or(`user_id.eq.${id},email.ilike.${data.email}`)
          .maybeSingle();

        if (ownerRow) {
          resolvedRole = "owner";
          const isFandi =
            (data.email && data.email.toLowerCase().includes("fandi")) ||
            (displayName && displayName.toLowerCase().includes("fandi")) ||
            (ownerRow.nama && ownerRow.nama.toLowerCase().includes("fandi"));
          activeBengkelId =
            ownerRow.workshop_id ?? ownerRow.id_bengkel ?? (isFandi ? "bengkel-2307" : activeBengkelId ?? "bengkel-001");
          if (
            ownerRow.nama &&
            (!data.full_name || data.full_name.toLowerCase() === "owner" || data.full_name === "User")
          ) {
            displayName = ownerRow.nama;
          }
          if (ownerRow.no_hp && !displayPhone) {
            displayPhone = ownerRow.no_hp;
          }
          if (ownerRow.user_id !== id) {
            client
              .from("owner")
              .update({ user_id: id })
              .eq("id_owner", ownerRow.id_owner)
              .then(() => {});
          }
        }
      } catch {
        // abaikan error jika tabel owner belum siap
      }

      // 2. Cek apakah pengguna terdaftar di tabel admin (via user_id atau email)
      if (resolvedRole !== "owner") {
        try {
          const { data: adminRow } = await client
            .from("admin")
            .select("*")
            .or(`user_id.eq.${id},email.ilike.${data.email}`)
            .maybeSingle();

          if (adminRow) {
            resolvedRole = "admin";
            activeBengkelId =
              adminRow.workshop_id ?? adminRow.id_bengkel ?? activeBengkelId ?? "bengkel-001";
            if (
              adminRow.nama &&
              (!data.full_name || data.full_name.toLowerCase() === "admin" || data.full_name === "User")
            ) {
              displayName = adminRow.nama;
            }
            if (adminRow.no_hp && !displayPhone) {
              displayPhone = adminRow.no_hp;
            }
            if (adminRow.user_id !== id) {
              client
                .from("admin")
                .update({ user_id: id })
                .eq("id_admin", adminRow.id_admin)
                .then(() => {});
            }
          }
        } catch {
          // abaikan error jika tabel admin belum siap
        }
      }

      // 3. Cek user_metadata dari auth.user jika belum terdeteksi owner/admin
      if (resolvedRole === "pelanggan") {
        try {
          const { data: sessionData } = await client.auth.getUser();
          const metaRole = sessionData?.user?.user_metadata?.["role"] as Role | undefined;
          if (metaRole === "owner" || metaRole === "admin" || metaRole === "super_admin") {
            resolvedRole = metaRole;
            const metaBengkel = (sessionData?.user?.user_metadata?.["workshop_id"] ||
              sessionData?.user?.user_metadata?.["id_bengkel"]) as string | undefined;
            if (metaBengkel) activeBengkelId = metaBengkel;
          }
        } catch {
          // abaikan error
        }
      }

      // 4. Ambil workshop_id dari workshop_members jika belum ada
      if (!activeBengkelId && (resolvedRole === "admin" || resolvedRole === "owner")) {
        try {
          const { data: memberData } = await client
            .from("workshop_members")
            .select("workshop_id")
            .eq("user_id", id)
            .limit(1)
            .maybeSingle();
          if (memberData?.workshop_id) {
            activeBengkelId = memberData.workshop_id;
          }
        } catch {
          // abaikan error jika workshop_members belum siap
        }
      }

      // 5. Cek & sinkronkan entitas pelanggan resmi jika pengguna adalah pelanggan
      let resolvedPelangganId: string | undefined = undefined;
      if (resolvedRole === "pelanggan" || !["admin", "owner"].includes(resolvedRole)) {
        try {
          const { data: pelangganRow } = await client
            .from("pelanggan")
            .select("id_pelanggan, user_id")
            .or(`user_id.eq.${id},email.ilike.${data.email}`)
            .limit(1)
            .maybeSingle();

          if (pelangganRow) {
            resolvedPelangganId = pelangganRow.id_pelanggan;
            if (pelangganRow.user_id !== id) {
              client
                .from("pelanggan")
                .update({ user_id: id })
                .eq("id_pelanggan", pelangganRow.id_pelanggan)
                .then(() => {});
            }
          } else {
            const newId = `pl-${id.slice(0, 8)}`;
            const { data: createdPel } = await client
              .from("pelanggan")
              .insert({
                id_pelanggan: newId,
                user_id: id,
                nama: displayName,
                email: data.email || "",
                no_hp: displayPhone || "-",
                alamat: "Pendaftaran online akun pelanggan AppBenk",
              })
              .select("id_pelanggan")
              .maybeSingle();
            resolvedPelangganId = createdPel?.id_pelanggan || newId;
          }
        } catch {
          // abaikan error jika tabel pelanggan belum siap
        }
      }

      // Cek status paket bengkel untuk akses premium
      let isUserPremium = resolvedRole === "super_admin";
      if (!isUserPremium && activeBengkelId) {
        try {
          const { data: bRow } = await client
            .from("bengkel")
            .select("paket")
            .or(`id_bengkel.eq.${activeBengkelId},workshop_id.eq.${activeBengkelId}`)
            .maybeSingle();
          if (bRow?.paket === "Premium") {
            isUserPremium = true;
          }
        } catch {}
      }

      const payload: SessionUser = {
        id: data.id,
        nama: displayName,
        email: data.email || "",
        role: resolvedRole,
        bengkelId: activeBengkelId,
        workshopId: activeBengkelId,
        inisial: inisialDari(displayName),
        premium: isUserPremium,
        pelangganId: resolvedPelangganId,
        ...(displayPhone ? { telepon: displayPhone } : {}),
        ...(data.gender ? { gender: data.gender } : {}),
        ...(data.avatar_url ? { avatarUrl: data.avatar_url } : {}),
        ...(resolvedRole === "pelanggan" ? { pelanggan: displayName } : {}),
      };
      return payload;
    }

    // Fallback mandiri jika profile belum terbuat
    try {
      const { data: sessionData } = await client.auth.getUser();
      const authUser = sessionData?.user;
      if (authUser && authUser.id === id && authUser.email) {
        const rawRole = authUser.user_metadata?.["role"] as Role | undefined;
        let metaRole: Role =
          rawRole && ["admin", "owner", "pelanggan", "super_admin"].includes(rawRole) ? rawRole : "pelanggan";
        let metaName: string =
          authUser.user_metadata?.["full_name"] || authUser.email.split("@")[0] || "User";
        let metaPhone: string | null = authUser.user_metadata?.["phone"] ?? null;
        let metaBengkel: string | null =
          (authUser.user_metadata?.["workshop_id"] as string) ??
          (authUser.user_metadata?.["id_bengkel"] as string) ??
          null;

        // Cek owner & admin table
        try {
          const { data: ownerRow } = await client
            .from("owner")
            .select("*")
            .or(`user_id.eq.${id},email.ilike.${authUser.email}`)
            .maybeSingle();
          if (ownerRow) {
            metaRole = "owner";
            const isFandi =
              (authUser.email && authUser.email.toLowerCase().includes("fandi")) ||
              (metaName && metaName.toLowerCase().includes("fandi")) ||
              (ownerRow.nama && ownerRow.nama.toLowerCase().includes("fandi"));
            metaBengkel = ownerRow.workshop_id ?? ownerRow.id_bengkel ?? (isFandi ? "bengkel-2307" : "bengkel-001");
            if (ownerRow.nama) metaName = ownerRow.nama;
            if (ownerRow.no_hp) metaPhone = ownerRow.no_hp;
          } else {
            const { data: adminRow } = await client
              .from("admin")
              .select("*")
              .or(`user_id.eq.${id},email.ilike.${authUser.email}`)
              .maybeSingle();
            if (adminRow) {
              metaRole = "admin";
              metaBengkel = adminRow.workshop_id ?? adminRow.id_bengkel ?? "bengkel-001";
              if (adminRow.nama) metaName = adminRow.nama;
              if (adminRow.no_hp) metaPhone = adminRow.no_hp;
            }
          }
        } catch {
          // abaikan error
        }

        const insertPayload: Record<string, any> = {
          id: authUser.id,
          full_name: metaName,
          email: authUser.email,
          phone: metaPhone,
          role: metaRole,
        };
        if (metaBengkel) {
          insertPayload["id_bengkel"] = metaBengkel;
        }

        const { data: created, error: insertErr } = await client
          .from("profiles")
          .upsert(insertPayload)
          .select("*")
          .single<Profile>();

        if (!insertErr && created) {
          let fallbackPelangganId: string | undefined = undefined;
          if (metaRole === "pelanggan") {
            try {
              const { data: pRow } = await client
                .from("pelanggan")
                .select("id_pelanggan, user_id")
                .or(`user_id.eq.${id},email.ilike.${authUser.email}`)
                .limit(1)
                .maybeSingle();
              if (pRow) {
                fallbackPelangganId = pRow.id_pelanggan;
              } else {
                const newId = `pl-${id.slice(0, 8)}`;
                const { data: createdP } = await client
                  .from("pelanggan")
                  .insert({
                    id_pelanggan: newId,
                    user_id: id,
                    nama: metaName,
                    email: authUser.email,
                    no_hp: metaPhone || "-",
                    alamat: "Pendaftaran online akun pelanggan AppBenk",
                  })
                  .select("id_pelanggan")
                  .maybeSingle();
                fallbackPelangganId = createdP?.id_pelanggan || newId;
              }
            } catch {
              // abaikan error
            }
          }

          const payload: SessionUser = {
            id: created.id,
            nama: created.full_name || metaName,
            email: created.email || authUser.email,
            role: metaRole,
            bengkelId: created.workshop_id ?? created.id_bengkel ?? metaBengkel ?? undefined,
            workshopId: created.workshop_id ?? created.id_bengkel ?? metaBengkel ?? undefined,
            inisial: inisialDari(created.full_name || metaName),
            premium: false,
            pelangganId: fallbackPelangganId,
            ...(metaPhone ? { telepon: metaPhone } : {}),
            ...(created.gender ? { gender: created.gender } : {}),
            ...(created.avatar_url ? { avatarUrl: created.avatar_url } : {}),
            ...(metaRole === "pelanggan" ? { pelanggan: created.full_name || metaName } : {}),
          };
          return payload;
        }
      }
    } catch {
      // abaikan error fallback
    }

    return null;
  };

  useEffect(() => {
    let live = true;
    const client = supabase();
    client.auth.getSession().then(async ({ data }) => {
      if (live && data.session) setUser(await loadProfile(data.session.user.id));
      if (live) setLoading(false);
    });
    const { data: listener } = client.auth.onAuthStateChange(async (_event, session) => {
      if (!live) return;
      setUser(session ? await loadProfile(session.user.id) : null);
      setLoading(false);
    });
    return () => {
      live = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      loading,
      masuk: async (email, password) => {
        const { data, error } = await supabase().auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error || !data.user) return { error: error?.message ?? "Login gagal." };
        const sessionUser = await loadProfile(data.user.id);
        if (!sessionUser) {
          await supabase().auth.signOut();
          return { error: "Profil akun tidak ditemukan. Hubungi administrator." };
        }
        setUser(sessionUser);
        return { user: sessionUser };
      },
      daftar: async ({ nama, email, telepon, gender, password }) => {
        const cleanEmail = email.trim().toLowerCase();
        if (!cleanEmail.endsWith("@gmail.com")) {
          return { ok: false, error: "Hanya alamat email @gmail.com yang diperbolehkan." };
        }
        const client = supabase();
        const { data, error } = await client.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              full_name: nama.trim(),
              phone: telepon.trim(),
              gender: gender || null,
              role: "pelanggan",
            },
            ...(typeof window !== "undefined"
              ? { emailRedirectTo: `${window.location.origin}/verify-email` }
              : {}),
          },
        });
        if (error) return { ok: false, error: error.message };

        // Fallback: Pastikan baris profile & pelanggan tersinkron jika trigger lambat
        if (data.user) {
          try {
            await client.from("profiles").upsert(
              {
                id: data.user.id,
                full_name: nama.trim(),
                email: email.trim(),
                phone: telepon.trim() || null,
                role: "pelanggan",
              },
              { onConflict: "id" },
            );
            await client
              .from("pelanggan")
              .insert({
                id_pelanggan: `pl-${data.user.id.slice(0, 8)}`,
                user_id: data.user.id,
                nama: nama.trim(),
                email: email.trim(),
                no_hp: telepon.trim() || "-",
                alamat: "Pendaftaran online akun pelanggan AppBenk",
              })
              .select()
              .maybeSingle();
          } catch {
            // Abaikan jika trigger database sudah menanganinya
          }
        }

        const unconfirmed = Boolean(data.user && !data.session);
        return { ok: true, unconfirmed };
      },
      masukDenganGoogle: async () => {
        const { error } = await supabase().auth.signInWithOAuth({
          provider: "google",
          options: {
            ...(typeof window !== "undefined"
              ? { redirectTo: `${window.location.origin}/login` }
              : {}),
          },
        });
        if (error) return { ok: false, error: error.message };
        return { ok: true };
      },
      kirimUlangEmailVerifikasi: async (email: string) => {
        const cleanEmail = email.trim();
        const { error } = await supabase().auth.resend({
          type: "signup",
          email: cleanEmail,
          options: {
            ...(typeof window !== "undefined"
              ? { emailRedirectTo: `${window.location.origin}/verify-email` }
              : {}),
          },
        });
        if (error) return { ok: false, error: error.message };
        return { ok: true };
      },
      keluar: async () => {
        await supabase().auth.signOut();
        setUser(null);
      },
      aktifkanPremium: () =>
        setUser((u) => {
          if (!u) return u;
          const next = { ...u, premium: true };
          return next;
        }),
      kirimKodeResetPassword: async (email: string) => {
        const cleanEmail = email.trim().toLowerCase();
        if (!cleanEmail.endsWith("@gmail.com")) {
          return { ok: false, error: "Hanya alamat email @gmail.com yang diperbolehkan." };
        }
        const { error } = await supabase().auth.resetPasswordForEmail(cleanEmail);
        if (error) {
          let msg = error.message;
          if (
            msg.toLowerCase().includes("email_address_invalid") ||
            msg.toLowerCase().includes("is invalid")
          ) {
            msg =
              "Format alamat email tidak dapat dikirimi kode oleh penyedia auth. Pastikan menggunakan email aktif terdaftar.";
          } else if (msg.toLowerCase().includes("rate limit")) {
            msg = "Terlalu banyak permintaan kirim kode. Silakan tunggu beberapa saat.";
          }
          return { ok: false, error: msg };
        }
        return { ok: true };
      },
      verifikasiDanUbahPassword: async (email: string, token: string, passwordBaru: string) => {
        const cleanEmail = email.trim().toLowerCase();
        if (!cleanEmail.endsWith("@gmail.com")) {
          return { ok: false, error: "Hanya alamat email @gmail.com yang diperbolehkan." };
        }
        const cleanToken = token.trim();
        const { error: verifyErr } = await supabase().auth.verifyOtp({
          email: cleanEmail,
          token: cleanToken,
          type: "recovery",
        });
        if (verifyErr) {
          let msg = verifyErr.message;
          if (msg.toLowerCase().includes("expired") || msg.toLowerCase().includes("invalid")) {
            msg =
              "Kode verifikasi salah atau telah kadaluarsa. Silakan periksa email Anda kembali.";
          }
          return { ok: false, error: msg };
        }

        const { error: updateErr } = await supabase().auth.updateUser({
          password: passwordBaru,
        });
        if (updateErr) {
          return { ok: false, error: updateErr.message };
        }

        // Keluar dari sesi recovery agar pengguna login secara bersih
        await supabase().auth.signOut();
        setUser(null);
        return { ok: true };
      },
      verifikasiKodeResetOtp: async (email: string, token: string) => {
        const cleanEmail = email.trim().toLowerCase();
        const cleanToken = token.trim();
        if (!cleanEmail) {
          return { ok: false, error: "Alamat email wajib diisi.", errorType: "empty" };
        }
        if (!cleanToken) {
          return { ok: false, error: "Kode verifikasi wajib diisi.", errorType: "empty" };
        }
        if (cleanToken.length !== 8) {
          return { ok: false, error: "Kode verifikasi harus 8 digit.", errorType: "length" };
        }

        try {
          const client = supabase();
          const { data, error } = await client.auth.verifyOtp({
            email: cleanEmail,
            token: cleanToken,
            type: "recovery",
          });

          if (error) {
            const rawMsg = (error.message || "").toLowerCase();

            // Cek apakah kode benar-benar kedaluwarsa berdasarkan waktu pengiriman (> 1 jam)
            let isStrictlyExpired = false;
            if (typeof window !== "undefined") {
              const sentAt = Number(sessionStorage.getItem("appbenk_otp_sent_at") || 0);
              if (sentAt > 0 && Date.now() - sentAt > 3600 * 1000) {
                isStrictlyExpired = true;
              }
            }

            if (isStrictlyExpired) {
              return {
                ok: false,
                error: "Kode verifikasi sudah kedaluwarsa. Silakan kirim ulang kode.",
                errorType: "expired",
              };
            }

            if (rawMsg.includes("rate limit") || rawMsg.includes("too many requests")) {
              return {
                ok: false,
                error: "Terlalu banyak permintaan. Silakan tunggu beberapa saat.",
                errorType: "other",
              };
            }

            // Supabase GoTrue mengembalikan "Token has expired or is invalid" ketika kode tidak cocok.
            // Sesuai aturan RP-06, jika dalam masa berlaku maka ini adalah "Kode verifikasi tidak sesuai."
            return {
              ok: false,
              error: "Kode verifikasi tidak sesuai.",
              errorType: "invalid",
            };
          }

          if (data?.session) {
            return { ok: true };
          }
          return {
            ok: false,
            error: "Kode verifikasi tidak sesuai.",
            errorType: "invalid",
          };
        } catch {
          return {
            ok: false,
            error: "Terjadi kesalahan saat memverifikasi kode. Silakan coba lagi.",
            errorType: "other",
          };
        }
      },
      perbaruiKataSandiBaru: async (passwordBaru: string) => {
        if (!passwordBaru) {
          return { ok: false, error: "Kata sandi wajib diisi." };
        }
        if (passwordBaru.length < 6) {
          return { ok: false, error: "Kata sandi minimal 6 karakter." };
        }

        try {
          const client = supabase();
          const { data: sessionData } = await client.auth.getSession();
          if (!sessionData?.session) {
            return {
              ok: false,
              error: "Sesi reset password tidak valid atau sudah kedaluwarsa. Silakan mulai kembali.",
            };
          }

          const { error: updateErr } = await client.auth.updateUser({
            password: passwordBaru,
          });

          if (updateErr) {
            return {
              ok: false,
              error: updateErr.message || "Gagal memperbarui kata sandi akun Anda.",
            };
          }

          // Keluar dari sesi recovery agar pengguna login secara bersih
          await client.auth.signOut();
          setUser(null);
          return { ok: true };
        } catch (err) {
          return {
            ok: false,
            error: err instanceof Error ? err.message : "Terjadi kesalahan saat memperbarui kata sandi.",
          };
        }
      },
      cekSesiRecoveryAktif: async () => {
        try {
          const client = supabase();
          const { data } = await client.auth.getSession();
          return Boolean(data?.session);
        } catch {
          return false;
        }
      },
    }),
    [user, loading],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam AuthProvider");
  return ctx;
}
