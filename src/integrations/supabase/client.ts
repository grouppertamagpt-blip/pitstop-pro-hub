// This file provides the Lovable Supabase client with SSR safety and multi-fallback environment variables.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { brokeredPreviewStorage } from './previewAuthStorage';

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith('sb_publishable_') || value.startsWith('sb_secret_');
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    // New Supabase API keys are opaque strings, not bearer JWTs.
    if (isNewSupabaseApiKey(supabaseKey) && headers.get('Authorization') === `Bearer ${supabaseKey}`) {
      headers.delete('Authorization');
    }

    headers.set('apikey', supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

const memoryStorage = {
  getItem: (_key: string) => null,
  setItem: (_key: string, _value: string) => {},
  removeItem: (_key: string) => {},
};

function sanitizeUrl(raw: string): string {
  let val = (raw || '').trim();
  const mdMatch = val.match(/\((https?:\/\/[^\s\)]+)\)/i) || val.match(/\[(https?:\/\/[^\]\s]+)\]/i);
  if (mdMatch && mdMatch[1]) {
    val = mdMatch[1];
  }
  val = val.replace(/^[\["'`]+|[\]"'`]+$/g, '').trim();
  if (val && !/^https?:\/\//i.test(val)) {
    val = `https://${val}`;
  }
  return val.replace(/\/+$/, '');
}

function sanitizeKey(raw: string): string {
  let val = (raw || '').trim();
  val = val.replace(/^[\["'`]+|[\]"'`]+$/g, '').trim();
  return val;
}

function isValidHttpUrl(string: string): boolean {
  try {
    const u = new URL(string);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function createSupabaseClient() {
  const isServer = typeof window === 'undefined';

  // Resolusi fallback ganda: process.env (Vercel Serverless / SSR) & import.meta.env (Vite Client)
  const rawUrl =
    (typeof process !== 'undefined' && (process.env?.VITE_SUPABASE_URL || process.env?.SUPABASE_URL)) ||
    (typeof import.meta !== 'undefined' &&
      ((import.meta as any).env?.VITE_SUPABASE_URL || (import.meta as any).env?.SUPABASE_URL)) ||
    '';

  const rawKey =
    (typeof process !== 'undefined' &&
      (process.env?.VITE_SUPABASE_ANON_KEY ||
        process.env?.SUPABASE_ANON_KEY ||
        process.env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
        process.env?.SUPABASE_PUBLISHABLE_KEY)) ||
    (typeof import.meta !== 'undefined' &&
      ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
        (import.meta as any).env?.SUPABASE_ANON_KEY ||
        (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
        (import.meta as any).env?.SUPABASE_PUBLISHABLE_KEY)) ||
    '';

  const SUPABASE_URL = sanitizeUrl(rawUrl);
  const SUPABASE_PUBLISHABLE_KEY = sanitizeKey(rawKey);

  const isConfigured = Boolean(
    SUPABASE_URL &&
      SUPABASE_PUBLISHABLE_KEY &&
      isValidHttpUrl(SUPABASE_URL) &&
      !SUPABASE_URL.includes('YOUR_PROJECT_REF') &&
      !SUPABASE_URL.includes('placeholder-project')
  );

  const activeUrl = isConfigured && isValidHttpUrl(SUPABASE_URL)
    ? SUPABASE_URL.trim()
    : 'https://placeholder-project.supabase.co';
  const activeKey = isConfigured && SUPABASE_PUBLISHABLE_KEY
    ? SUPABASE_PUBLISHABLE_KEY.trim()
    : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy-anon-key-safe-ssr';

  if (!isConfigured) {
    console.warn(
      `[Supabase integration client] URL atau Anon Key belum terpasang (${isServer ? 'SSR Server' : 'Browser'}). Menggunakan placeholder aman agar tidak crash.`
    );
  }

  try {
    return createClient<Database>(activeUrl, activeKey, {
      global: {
        fetch: createSupabaseFetch(activeKey),
      },
      auth: isServer
        ? {
            storage: memoryStorage,
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          }
        : {
            storage: brokeredPreviewStorage() || memoryStorage,
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
    });
  } catch (err) {
    console.error('[Supabase integration client] Gagal createClient, fallback dummy:', err);
    return createClient<Database>('https://placeholder-project.supabase.co', 'dummy-key', {
      auth: { storage: memoryStorage, persistSession: false, autoRefreshToken: false },
    });
  }
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";
export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});
