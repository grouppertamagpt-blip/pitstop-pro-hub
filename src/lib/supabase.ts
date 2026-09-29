import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | undefined;
let serverClient: SupabaseClient | undefined;

/**
 * Memory storage fallback untuk lingkungan Server-Side Rendering (Node.js/Nitro)
 * agar GoTrue/Supabase tidak pernah mengakses global window atau localStorage saat SSR.
 */
const memoryStorage = {
  getItem: (_key: string) => null,
  setItem: (_key: string, _value: string) => {},
  removeItem: (_key: string) => {},
};

/**
 * Storage aman di sisi browser dengan proteksi try-catch terhadap Private Browsing / SecurityError.
 */
function getClientStorage() {
  if (typeof window === "undefined") return memoryStorage;
  try {
    const testKey = "__appbenk_storage_test__";
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return window.localStorage;
  } catch {
    return memoryStorage;
  }
}

/**
 * Pembersih string URL Supabase:
 * Menangani kasus jika pengguna tidak sengaja menempelkan format markdown [url](url),
 * petik, atau trailing slash yang dapat menyebabkan error 'Must be a valid HTTP or HTTPS URL'.
 */
function sanitizeUrl(raw: string): string {
  let val = (raw || "").trim();
  // Tangani format link markdown: [url](url)
  const mdMatch = val.match(/\((https?:\/\/[^\s\)]+)\)/i) || val.match(/\[(https?:\/\/[^\]\s]+)\]/i);
  if (mdMatch && mdMatch[1]) {
    val = mdMatch[1];
  }
  // Bersihkan karakter pembungkus seperti kurung siku, petik tunggal/ganda
  val = val.replace(/^[\["'`]+|[\]"'`]+$/g, "").trim();
  if (val && !/^https?:\/\//i.test(val)) {
    val = `https://${val}`;
  }
  return val.replace(/\/+$/, "");
}

function sanitizeKey(raw: string): string {
  let val = (raw || "").trim();
  val = val.replace(/^[\["'`]+|[\]"'`]+$/g, "").trim();
  return val;
}

function isValidHttpUrl(string: string): boolean {
  try {
    const u = new URL(string);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Resolusi konfigurasi Supabase dengan dual fallback:
 * Mendukung pembacaan dari process.env (Vercel Serverless / Node.js) dan import.meta.env (Vite Client).
 */
export function getSupabaseConfig(): { url: string; anonKey: string; isConfigured: boolean } {
  const rawUrl =
    (typeof process !== "undefined" && (process.env?.VITE_SUPABASE_URL || process.env?.SUPABASE_URL)) ||
    (typeof import.meta !== "undefined" &&
      ((import.meta as any).env?.VITE_SUPABASE_URL || (import.meta as any).env?.SUPABASE_URL)) ||
    "";

  const rawKey =
    (typeof process !== "undefined" &&
      (process.env?.VITE_SUPABASE_ANON_KEY ||
        process.env?.SUPABASE_ANON_KEY ||
        process.env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
        process.env?.SUPABASE_PUBLISHABLE_KEY)) ||
    (typeof import.meta !== "undefined" &&
      ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
        (import.meta as any).env?.SUPABASE_ANON_KEY ||
        (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
        (import.meta as any).env?.SUPABASE_PUBLISHABLE_KEY)) ||
    "";

  const url = sanitizeUrl(rawUrl);
  const anonKey = sanitizeKey(rawKey);

  const isConfigured = Boolean(
    url &&
      anonKey &&
      isValidHttpUrl(url) &&
      !url.includes("YOUR_PROJECT_REF") &&
      !anonKey.includes("YOUR_SUPABASE_ANON_KEY") &&
      !url.includes("placeholder-project"),
  );

  return { url, anonKey, isConfigured };
}

/**
 * Inisialisasi Supabase client yang aman untuk SSR (Server-Side Rendering) dan Client Browser.
 * Mencegah unhandled exception jika environment variables salah format atau belum disetel.
 */
export function supabase(): SupabaseClient {
  const isServer = typeof window === "undefined";

  if (!isServer && browserClient) {
    return browserClient;
  }
  if (isServer && serverClient) {
    return serverClient;
  }

  const { url, anonKey, isConfigured } = getSupabaseConfig();

  // Jika URL atau Key belum terdefinisi atau tidak valid, gunakan placeholder aman
  const activeUrl = isConfigured && isValidHttpUrl(url) ? url : "https://placeholder-project.supabase.co";
  const activeKey = isConfigured && anonKey
    ? anonKey
    : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy-anon-key-safe-ssr";

  if (!isConfigured) {
    console.warn(
      `[Supabase] Kredensial Supabase (${isServer ? "SSR Node.js" : "Client Browser"}) belum valid. Menggunakan placeholder aman agar tidak crash.`,
    );
  }

  const authOptions = isServer
    ? {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storage: memoryStorage,
      }
    : {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: getClientStorage(),
      };

  let instance: SupabaseClient;
  try {
    instance = createClient(activeUrl, activeKey, { auth: authOptions });
  } catch (err) {
    console.error("[Supabase] Gagal inisialisasi createClient, fallback ke dummy instance:", err);
    instance = createClient("https://placeholder-project.supabase.co", "dummy-key-safe", {
      auth: { persistSession: false, autoRefreshToken: false, storage: memoryStorage },
    });
  }

  if (isServer) {
    serverClient = instance;
  } else {
    browserClient = instance;
  }

  return instance;
}

export type AppRole = "admin" | "pelanggan" | "owner" | "super_admin";
export type Profile = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  gender?: string | null;
  avatar_url?: string | null;
  role: AppRole;
  id_bengkel?: string | null;
  workshop_id?: string | null;
};
