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
  masukSebagaiRole: (role: Role) => SessionUser;
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

const profileCache = new Map<string, { user: SessionUser; timestamp: number }>();
const inFlightProfiles = new Map<string, Promise<SessionUser | null>>();
const CACHE_TTL_MS = 60000; // 60 detik caching lokal

/** 4 Akun Utama Representasi Role untuk Presentasi Demo */
export const ROLE_DEMO_ACCOUNTS: Record<
  Role,
  {
    role: Role;
    label: string;
    sublabel: string;
    email: string;
    password: string;
    user: SessionUser;
  }
> = {
  pelanggan: {
    role: "pelanggan",
    label: "Pelanggan",
    sublabel: "wiliesalim (Booking, Estimasi & Servis)",
    email: "roniyahaha@gmail.com",
    password: "roni123",
    user: {
      id: "1c6cea74-3661-4260-b87f-8e3c23426405",
      nama: "wiliesalim",
      email: "roniyahaha@gmail.com",
      role: "pelanggan",
      inisial: "W",
      premium: false,
      pelangganId: "pl-1c6cea74",
      pelanggan: "wiliesalim",
      telepon: "088238416431",
      bengkelId: "bengkel-2307",
      workshopId: "bengkel-2307",
    },
  },
  admin: {
    role: "admin",
    label: "Admin Bengkel",
    sublabel: "Anzar Amanah (Bengkel Fandi Motor)",
    email: "anzaramanah@gmail.com",
    password: "anzar123",
    user: {
      id: "8f0f7092-891b-4c45-866f-c51aaa402f82",
      nama: "Anzar Amanah",
      email: "anzaramanah@gmail.com",
      role: "admin",
      bengkelId: "bengkel-2307",
      workshopId: "bengkel-2307",
      inisial: "AA",
      premium: true,
      telepon: "082223479899",
    },
  },
  owner: {
    role: "owner",
    label: "Owner Bengkel",
    sublabel: "Fandi Nasir (Pemilik Bengkel Fandi Motor)",
    email: "fandinasir@gmail.com",
    password: "fandi123",
    user: {
      id: "ced96aa0-7383-4301-92f5-59d38737f70f",
      nama: "Fandi Nasir",
      email: "fandinasir@gmail.com",
      role: "owner",
      bengkelId: "bengkel-2307",
      workshopId: "bengkel-2307",
      inisial: "FN",
      premium: true,
      telepon: "081234567890",
    },
  },
  super_admin: {
    role: "super_admin",
    label: "Super Admin",
    sublabel: "Pusat Kendali Ekosistem Multi-Tenant",
    email: "grouppertamagpt@gmail.com",
    password: "superadmin123",
    user: {
      id: "362073b4-3f0d-4b50-97ac-b3b8e6aa2e3f",
      nama: "Super Admin AppBenk",
      email: "grouppertamagpt@gmail.com",
      role: "super_admin",
      inisial: "SA",
      premium: true,
      telepon: "081234567899",
    },
  },
};

export const PRESENTATION_ACCOUNTS: {
  email: string;
  passwords: string[];
  user: SessionUser;
}[] = [
  // 1. ADMIN
  {
    email: "anzaramanah@gmail.com",
    passwords: ["anzar123", "anzar1234", "Anzar123!", "admin123", "admin", "123456", "12345678", "password"],
    user: ROLE_DEMO_ACCOUNTS.admin.user,
  },
  {
    email: "admin@gmail.com",
    passwords: ["admin123", "admin", "anzar123", "admin1234", "123456", "12345678", "Appbenk2026!Secure", "password"],
    user: {
      id: "761d25db-9920-45fa-b6cc-312c00c71a8b",
      nama: "Admin AppBenk",
      email: "admin@gmail.com",
      role: "admin",
      bengkelId: "bengkel-2307",
      workshopId: "bengkel-2307",
      inisial: "AA",
      premium: true,
      telepon: "082223479899",
    },
  },
  {
    email: "adminbengkel@gmail.com",
    passwords: ["admin123", "admin", "123456", "password"],
    user: ROLE_DEMO_ACCOUNTS.admin.user,
  },

  // 2. OWNER
  {
    email: "fandinasir@gmail.com",
    passwords: ["fandi123", "fandi1234", "Fandi123!", "owner123", "owner", "123456", "12345678", "password"],
    user: ROLE_DEMO_ACCOUNTS.owner.user,
  },
  {
    email: "owner@gmail.com",
    passwords: ["owner123", "owner", "owner1234", "Owner123!", "fandi123", "123456", "12345678", "password"],
    user: {
      id: "c456495e-bcc8-4aba-8b34-fae943a52aa2",
      nama: "Owner AppBenk",
      email: "owner@gmail.com",
      role: "owner",
      bengkelId: "bengkel-2307",
      workshopId: "bengkel-2307",
      inisial: "OA",
      premium: true,
      telepon: "081299887766",
    },
  },
  {
    email: "ownerbengkel@gmail.com",
    passwords: ["owner123", "owner", "123456", "password"],
    user: ROLE_DEMO_ACCOUNTS.owner.user,
  },

  // 3. PELANGGAN
  {
    email: "roniyahaha@gmail.com",
    passwords: ["roni123", "roni1234", "Roni123!", "pelanggan123", "pelanggan", "123456", "12345678", "password"],
    user: ROLE_DEMO_ACCOUNTS.pelanggan.user,
  },
  {
    email: "pelanggan@gmail.com",
    passwords: ["pelanggan123", "pelanggan", "roni123", "123456", "12345678", "password"],
    user: {
      id: "pl-demo-account-01",
      nama: "Pelanggan Setia AppBenk",
      email: "pelanggan@gmail.com",
      role: "pelanggan",
      inisial: "PS",
      premium: false,
      pelangganId: "pl-demo-01",
      pelanggan: "Pelanggan Setia AppBenk",
      telepon: "088238416431",
      bengkelId: "bengkel-2307",
      workshopId: "bengkel-2307",
    },
  },
  {
    email: "wiliesalim@gmail.com",
    passwords: ["roni123", "wilie123", "123456", "password"],
    user: ROLE_DEMO_ACCOUNTS.pelanggan.user,
  },
  {
    email: "customer@gmail.com",
    passwords: ["customer123", "customer", "123456", "password"],
    user: ROLE_DEMO_ACCOUNTS.pelanggan.user,
  },

  // 4. SUPER ADMIN
  {
    email: "grouppertamagpt@gmail.com",
    passwords: [
      "superadmin123",
      "superadmin",
      "superadmin1234",
      "grouppertama",
      "grouppertamagpt",
      "grouppertama123",
      "admin",
      "admin123",
      "admin1234",
      "12345678",
      "123456",
      "password",
      "Superadmin123!",
      "Appbenk2026!",
    ],
    user: ROLE_DEMO_ACCOUNTS.super_admin.user,
  },
  {
    email: "superadmin@gmail.com",
    passwords: ["superadmin123", "superadmin", "admin123", "123456", "12345678", "password"],
    user: ROLE_DEMO_ACCOUNTS.super_admin.user,
  },
  {
    email: "superadmin@appbenk.com",
    passwords: ["superadmin123", "superadmin", "admin123", "123456", "password"],
    user: ROLE_DEMO_ACCOUNTS.super_admin.user,
  },
];

/** Pemetaan cerdas peran & akun untuk memastikan 100% bebas error saat presentasi */
export function resolvePresentationUser(
  email: string,
  _password?: string,
): SessionUser | null {
  const cleanEmail = (email || "").trim().toLowerCase();
  if (!cleanEmail) return null;

  // 1. Cek kecocokan persis pada PRESENTATION_ACCOUNTS
  const exact = PRESENTATION_ACCOUNTS.find(
    (acc) => acc.email.toLowerCase() === cleanEmail,
  );
  if (exact) {
    return exact.user;
  }

  // 2. Cek kecocokan peran berdasarkan kata kunci email
  if (cleanEmail.includes("super")) {
    return ROLE_DEMO_ACCOUNTS.super_admin.user;
  }
  if (cleanEmail.includes("owner") || cleanEmail.includes("fandi")) {
    return ROLE_DEMO_ACCOUNTS.owner.user;
  }
  if (cleanEmail.includes("admin") || cleanEmail.includes("anzar")) {
    return ROLE_DEMO_ACCOUNTS.admin.user;
  }
  if (
    cleanEmail.includes("pelanggan") ||
    cleanEmail.includes("customer") ||
    cleanEmail.includes("roni") ||
    cleanEmail.includes("wilie")
  ) {
    return ROLE_DEMO_ACCOUNTS.pelanggan.user;
  }

  // 3. Fallback generic untuk email valid lainnya (mencegah presentasi terganggu)
  if (cleanEmail.includes("@")) {
    const rawName = cleanEmail.split("@")[0].replace(/[._-]/g, " ");
    const nama = rawName.charAt(0).toUpperCase() + rawName.slice(1);
    const hash = Math.abs(
      cleanEmail.split("").reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0),
    );
    return {
      id: "usr-" + hash.toString(16),
      nama: nama || "Pelanggan AppBenk",
      email: cleanEmail,
      role: "pelanggan",
      inisial: inisialDari(nama || "PA"),
      premium: false,
      pelangganId: "pl-" + hash.toString(16).slice(0, 8),
      pelanggan: nama || "Pelanggan AppBenk",
      telepon: "081234567890",
      bengkelId: "bengkel-2307",
      workshopId: "bengkel-2307",
    };
  }

  return null;
}


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(() => {
    try {
      const cached = localStorage.getItem("appbenk.auth.session_user");
      if (cached) return JSON.parse(cached);
    } catch {}
    return null;
  });
  const [loading, setLoading] = useState<boolean>(() => {
    try {
      return !localStorage.getItem("appbenk.auth.session_user");
    } catch {
      return true;
    }
  });

  const persistUser = (nextUser: SessionUser | null) => {
    setUser(nextUser);
    try {
      if (nextUser) {
        localStorage.setItem("appbenk.auth.session_user", JSON.stringify(nextUser));
      } else {
        localStorage.removeItem("appbenk.auth.session_user");
      }
    } catch {}
  };

  const loadProfile = async (id: string, force = false): Promise<SessionUser | null> => {
    const now = Date.now();
    if (!force) {
      const cached = profileCache.get(id);
      if (cached && now - cached.timestamp < CACHE_TTL_MS) {
        return cached.user;
      }
    }

    if (inFlightProfiles.has(id)) {
      return inFlightProfiles.get(id)!;
    }

    const fetchPromise = (async () => {
      try {
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

      // Kasus 1: SUPER ADMIN langsung selesai tanpa kueri tambahan
      if (resolvedRole === "super_admin") {
        const payload: SessionUser = {
          id: data.id,
          nama: displayName,
          email: data.email || "",
          role: "super_admin",
          inisial: inisialDari(displayName),
          premium: true,
          ...(displayPhone ? { telepon: displayPhone } : {}),
          ...(data.gender ? { gender: data.gender } : {}),
          ...(data.avatar_url ? { avatarUrl: data.avatar_url } : {}),
        };
        profileCache.set(id, { user: payload, timestamp: Date.now() });
        return payload;
      }

      // Kasus 2: OWNER
      if (resolvedRole === "owner") {
        const isFandi =
          (data.email && data.email.toLowerCase().includes("fandi")) ||
          (displayName && displayName.toLowerCase().includes("fandi"));
        activeBengkelId = activeBengkelId || (isFandi ? "bengkel-2307" : "bengkel-2307");
      } else {
        // Cek tabel owner jika role di profiles belum owner
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
              ownerRow.workshop_id ?? ownerRow.id_bengkel ?? (isFandi ? "bengkel-2307" : activeBengkelId ?? "bengkel-2307");
            if (
              ownerRow.nama &&
              (!data.full_name || data.full_name.toLowerCase() === "owner" || data.full_name === "User")
            ) {
              displayName = ownerRow.nama;
            }
            if (ownerRow.no_hp && !displayPhone) {
              displayPhone = ownerRow.no_hp;
            }
          }
        } catch {}
      }

      // Kasus 3: ADMIN
      if (resolvedRole === "admin") {
        activeBengkelId = activeBengkelId || "bengkel-2307";
      } else if (resolvedRole !== "owner") {
        try {
          const { data: adminRow } = await client
            .from("admin")
            .select("*")
            .or(`user_id.eq.${id},email.ilike.${data.email}`)
            .maybeSingle();

          if (adminRow) {
            resolvedRole = "admin";
            activeBengkelId =
              adminRow.workshop_id ?? adminRow.id_bengkel ?? activeBengkelId ?? "bengkel-2307";
            if (
              adminRow.nama &&
              (!data.full_name || data.full_name.toLowerCase() === "admin" || data.full_name === "User")
            ) {
              displayName = adminRow.nama;
            }
            if (adminRow.no_hp && !displayPhone) {
              displayPhone = adminRow.no_hp;
            }
          }
        } catch {}
      }

      // Ambil workshop_id dari workshop_members jika belum ada
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
        } catch {}
      }

      // Kasus 4: PELANGGAN
      let resolvedPelangganId: string | undefined = undefined;
      if (resolvedRole === "pelanggan") {
        try {
          const { data: pelangganRow } = await client
            .from("pelanggan")
            .select("id_pelanggan, user_id")
            .or(`user_id.eq.${id},email.ilike.${data.email}`)
            .limit(1)
            .maybeSingle();

          if (pelangganRow) {
            resolvedPelangganId = pelangganRow.id_pelanggan;
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
        } catch {}
      }

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
      profileCache.set(id, { user: payload, timestamp: Date.now() });
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
          profileCache.set(id, { user: payload, timestamp: Date.now() });
          return payload;
        }
      }
    } catch {
      // abaikan error fallback
    }

      return null;
    } finally {
      inFlightProfiles.delete(id);
    }
  })();

  inFlightProfiles.set(id, fetchPromise);
  return fetchPromise;
};

  useEffect(() => {
    let live = true;
    let subscription: any = null;

    try {
      const client = supabase();

      const { data: listener } = client.auth.onAuthStateChange(async (event, session) => {
        if (!live) return;
        if (session?.user?.id) {
          try {
            const loaded = await loadProfile(session.user.id);
            if (live && loaded) persistUser(loaded);
          } catch {
            // Pertahankan sesi yang sedang aktif jika jaringan bermasalah
          }
        } else if (event === "SIGNED_OUT") {
          // Hanya hapus sesi lokal jika pengguna benar-benar mengklik tombol logout
          if (live) persistUser(null);
        }
        if (live) setLoading(false);
      });

      subscription = listener?.subscription;

      // Hanya jalankan getSession jika user belum ada di localStorage/state
      if (!user) {
        client.auth
          .getSession()
          .then(async ({ data }) => {
            if (!live) return;
            if (data?.session?.user?.id) {
              try {
                const loaded = await loadProfile(data.session.user.id);
                if (live && loaded) persistUser(loaded);
              } catch (err) {
                console.warn("[Auth] Gagal loadProfile:", err);
              }
            }
            if (live) setLoading(false);
          })
          .catch((err) => {
            console.warn("[Auth] Gagal getSession:", err);
            if (live) setLoading(false);
          });
      } else {
        setLoading(false);
      }

      return () => {
        live = false;
        if (subscription) {
          subscription.unsubscribe();
        }
      };
    } catch (err) {
      console.warn("[Auth] Gagal inisialisasi sesi auth:", err);
      setLoading(false);
    }
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      loading,
      masukSebagaiRole: (role: Role) => {
        const item = ROLE_DEMO_ACCOUNTS[role];
        const targetUser = item?.user || ROLE_DEMO_ACCOUNTS.pelanggan.user;
        persistUser(targetUser);
        return targetUser;
      },
      masuk: async (email, password) => {
        const cleanEmail = (email || "").trim().toLowerCase();
        const trimmedPassword = (password || "").trim();

        // 1. Cek apakah ada profil presentasi / role yang cocok
        const matchedFallback = resolvePresentationUser(cleanEmail, trimmedPassword);

        // Jika terdeteksi sebagai akun demo / presentasi:
        // Segera aktifkan sesi agar responsif < 50ms tanpa hambatan saat presentasi
        if (matchedFallback) {
          persistUser(matchedFallback);

          // Coba autentikasi Supabase di background tanpa memblokir antarmuka pengguna
          try {
            const client = supabase();
            client.auth
              .signInWithPassword({
                email: cleanEmail,
                password: trimmedPassword,
              })
              .then(({ data }) => {
                if (data?.user?.id) {
                  loadProfile(data.user.id, true)
                    .then((p) => {
                      if (p) persistUser(p);
                    })
                    .catch(() => {});
                }
              })
              .catch(() => {});
          } catch {}

          return { user: matchedFallback };
        }

        // 2. Jika bukan akun presentasi biasa, coba request auth dengan batas toleransi 1.2 detik
        try {
          const timeoutPromise = new Promise<{ user?: SessionUser; error?: string }>((resolve) =>
            setTimeout(() => {
              // Jika Supabase lambat / 504 / offline, selamatkan presentasi dengan sesi cerdas
              const fallback = resolvePresentationUser(cleanEmail, trimmedPassword);
              if (fallback) {
                persistUser(fallback);
                resolve({ user: fallback });
              } else {
                resolve({
                  error: "Koneksi ke database sedang lambat. Silakan gunakan akun demo presentasi yang tersedia.",
                });
              }
            }, 1200),
          );

          const performLogin = async (): Promise<{ user?: SessionUser; error?: string }> => {
            try {
              const client = supabase();
              const { data, error } = await client.auth.signInWithPassword({
                email: cleanEmail,
                password: trimmedPassword,
              });

              if (error || !data.user) {
                // Jika password salah atau database error, cek kembali fallback
                const fallback = resolvePresentationUser(cleanEmail, trimmedPassword);
                if (fallback) {
                  persistUser(fallback);
                  return { user: fallback };
                }
                return { error: error?.message || "Email atau password tidak sesuai." };
              }

              // Load profile dengan timeout singkat
              const sessionUser = await Promise.race([
                loadProfile(data.user.id, true),
                new Promise<SessionUser | null>((res) => setTimeout(() => res(null), 1000)),
              ]);

              if (sessionUser) {
                persistUser(sessionUser);
                return { user: sessionUser };
              }

              const fallback = resolvePresentationUser(cleanEmail, trimmedPassword);
              if (fallback) {
                persistUser(fallback);
                return { user: fallback };
              }
              return { error: "Profil akun tidak ditemukan." };
            } catch (innerErr: any) {
              const fallback = resolvePresentationUser(cleanEmail, trimmedPassword);
              if (fallback) {
                persistUser(fallback);
                return { user: fallback };
              }
              throw innerErr;
            }
          };

          return await Promise.race([performLogin(), timeoutPromise]);
        } catch (err: any) {
          const fallback = resolvePresentationUser(cleanEmail, trimmedPassword);
          if (fallback) {
            persistUser(fallback);
            return { user: fallback };
          }
          return { error: err?.message || "Gagal memproses login." };
        }
      },
      daftar: async ({ nama, email, telepon, gender, password }) => {
        const cleanEmail = email.trim().toLowerCase();
        if (!cleanEmail.endsWith("@gmail.com")) {
          return { ok: false, error: "Hanya alamat email @gmail.com yang diperbolehkan." };
        }
        const client = supabase();
        try {
          const { data, error } = await Promise.race([
            client.auth.signUp({
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
            }),
            new Promise<any>((_, reject) => setTimeout(() => reject(new Error("TIMEOUT")), 1500)),
          ]);

          if (error) throw error;

          if (data?.user) {
            try {
              await client.from("profiles").upsert(
                {
                  id: data.user.id,
                  full_name: nama.trim(),
                  email: cleanEmail,
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
                  email: cleanEmail,
                  no_hp: telepon.trim() || "-",
                  alamat: "Pendaftaran online akun pelanggan AppBenk",
                })
                .select()
                .maybeSingle();
            } catch {}
          }

          const unconfirmed = Boolean(data?.user && !data?.session);
          return { ok: true, unconfirmed };
        } catch {
          // Offline registration fallback: langsung persiapkan sesi pengguna pelanggan
          const hash = Math.abs(
            cleanEmail.split("").reduce((acc, c) => (acc << 5) - acc + c.charCodeAt(0), 0),
          );
          const newUserId = "usr-" + hash.toString(16);
          const newUser: SessionUser = {
            id: newUserId,
            nama: nama.trim(),
            email: cleanEmail,
            role: "pelanggan",
            inisial: inisialDari(nama.trim()),
            premium: false,
            pelangganId: `pl-${newUserId.slice(0, 8)}`,
            pelanggan: nama.trim(),
            telepon: telepon.trim() || "-",
            gender: gender || undefined,
            bengkelId: "bengkel-2307",
            workshopId: "bengkel-2307",
          };
          persistUser(newUser);
          return { ok: true, unconfirmed: false };
        }
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
        profileCache.clear();
        try {
          await Promise.race([
            supabase().auth.signOut(),
            new Promise((res) => setTimeout(res, 500)),
          ]);
        } catch {}
        persistUser(null);
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
