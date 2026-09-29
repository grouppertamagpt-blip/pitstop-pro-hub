// Server-side Supabase client with service role key - bypasses RLS.
// Use this for admin operations in server functions and server routes only.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

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

function createSupabaseAdminClient() {
  const rawUrl = process.env['SUPABASE_URL'] || process.env['VITE_SUPABASE_URL'] || '';
  const rawKey = process.env['SUPABASE_SERVICE_ROLE_KEY'] || '';

  const SUPABASE_URL = sanitizeUrl(rawUrl);
  const SUPABASE_SERVICE_ROLE_KEY = sanitizeKey(rawKey);

  const isConfigured = Boolean(
    SUPABASE_URL &&
      SUPABASE_SERVICE_ROLE_KEY &&
      !SUPABASE_URL.includes('placeholder')
  );
  const activeUrl = isConfigured ? SUPABASE_URL.trim() : 'https://placeholder-project.supabase.co';
  const activeKey = isConfigured ? SUPABASE_SERVICE_ROLE_KEY.trim() : 'dummy-service-role-key-safe-ssr';

  if (!isConfigured) {
    console.warn('[Supabase admin] SUPABASE_SERVICE_ROLE_KEY belum terpasang. Admin client menggunakan placeholder.');
  }

  try {
    return createClient<Database>(activeUrl, activeKey, {
      global: {
        fetch: createSupabaseFetch(activeKey),
      },
      auth: {
        storage: undefined,
        persistSession: false,
        autoRefreshToken: false,
      }
    });
  } catch (err) {
    console.error('[Supabase admin] Gagal createClient admin, fallback dummy:', err);
    return createClient<Database>('https://placeholder-project.supabase.co', 'dummy-key', {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
}

let _supabaseAdmin: ReturnType<typeof createSupabaseAdminClient> | undefined;

// Server-side Supabase client with service role - bypasses RLS
// SECURITY: Only use this for trusted server-side operations, never expose to client code
// Load inside server handlers: const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
// Top-level import is safe only in other .server.ts modules - route files and *.functions.ts ship to the client bundle.
export const supabaseAdmin = new Proxy({} as ReturnType<typeof createSupabaseAdminClient>, {
  get(_, prop, receiver) {
    if (!_supabaseAdmin) _supabaseAdmin = createSupabaseAdminClient();
    return Reflect.get(_supabaseAdmin, prop, receiver);
  },
});
