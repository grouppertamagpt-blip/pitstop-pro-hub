import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

function getSupabaseConfig() {
  const supabaseUrl =
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    "https://oviiclcydeopilagbypq.supabase.co";
  const supabaseAnonKey =
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "sb_publishable_7PrjkC9a5svgKbRVQ5-xfQ_VoEB8GSZ";
  return { supabaseUrl, supabaseAnonKey };
}

function getAppBaseUrl(requestUrl: string): string {
  const configured = (process.env.VITE_APP_URL || process.env.APP_URL || "").trim().replace(/\/$/, "");
  if (configured) return configured;
  try {
    return new URL(requestUrl).origin;
  } catch {
    return "http://localhost:8080";
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const url = new URL(request.url);

    // Endpoint POST: Buat data undangan staf admin (Manual link generator tanpa kirim email)
    if (request.method === "POST" && (url.pathname === "/api/invite" || url.pathname === "/api/admin/invite")) {
      try {
        const body = (await request.json().catch(() => ({}))) as Record<string, any>;
        const nama = (body.nama || "").trim();
        const email = (body.email || "").trim().toLowerCase();
        const bengkelId = (body.bengkel_id || body.id_bengkel || "").trim();

        if (!nama) {
          return new Response(
            JSON.stringify({ ok: false, error: "Nama lengkap calon admin wajib diisi." }),
            { status: 400, headers: { "content-type": "application/json" } }
          );
        }
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return new Response(
            JSON.stringify({ ok: false, error: "Format alamat email calon admin tidak valid." }),
            { status: 400, headers: { "content-type": "application/json" } }
          );
        }

        const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
        const authHeader = request.headers.get("Authorization") || request.headers.get("authorization");

        const { createClient } = await import("@supabase/supabase-js");
        const client = createClient(supabaseUrl, supabaseAnonKey, {
          global: authHeader ? { headers: { Authorization: authHeader } } : undefined,
          auth: { persistSession: false },
        });

        let token = "";
        let invitationId: string | null = null;
        let resolvedBengkelId = bengkelId;
        let expiresAt = new Date(Date.now() + 48 * 3600 * 1000).toISOString();

        // 1. Coba RPC create_admin_invitation
        const { data: rpcData, error: rpcError } = await client.rpc("create_admin_invitation", {
          p_nama: nama,
          p_email: email,
        });

        if (!rpcError && rpcData && typeof rpcData === "object" && rpcData.ok !== false) {
          token = rpcData.token;
          invitationId = rpcData.invitation_id || null;
          resolvedBengkelId = rpcData.id_bengkel || bengkelId;
          expiresAt = rpcData.expires_at || expiresAt;
        } else {
          // 2. Direct insert fallback
          const { data: authData } = await client.auth.getUser();
          const userId = authData?.user?.id;
          if (!userId) {
            return new Response(
              JSON.stringify({ ok: false, error: "Sesi login tidak valid. Silakan login kembali." }),
              { status: 401, headers: { "content-type": "application/json" } }
            );
          }

          const { data: prof } = await client
            .from("profiles")
            .select("role, id_bengkel, workshop_id")
            .eq("id", userId)
            .maybeSingle();

          if (prof?.role === "admin") {
            const adminBengkel = prof.workshop_id || prof.id_bengkel || "bengkel-001";
            if (resolvedBengkelId && resolvedBengkelId !== adminBengkel) {
              return new Response(
                JSON.stringify({
                  ok: false,
                  error: "Akses ditolak: Admin hanya berhak membuat undangan untuk bengkel tempat ia terdaftar.",
                }),
                { status: 403, headers: { "content-type": "application/json" } }
              );
            }
            resolvedBengkelId = adminBengkel;
          } else if (!resolvedBengkelId) {
            resolvedBengkelId = prof?.workshop_id || prof?.id_bengkel || "bengkel-001";
          }

          token = (crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "")).slice(0, 48);

          await client
            .from("admin_invitations")
            .update({ status: "cancelled", updated_at: new Date().toISOString() })
            .eq("id_bengkel", resolvedBengkelId)
            .ilike("email", email)
            .eq("status", "pending");

          const { data: inserted, error: insError } = await client
            .from("admin_invitations")
            .insert({
              id_bengkel: resolvedBengkelId,
              nama,
              email,
              token,
              created_by: userId,
              expires_at: expiresAt,
              status: "pending",
            })
            .select()
            .single();

          if (insError) {
            return new Response(
              JSON.stringify({ ok: false, error: insError.message }),
              { status: 400, headers: { "content-type": "application/json" } }
            );
          }
          invitationId = inserted?.id || null;
        }

        const activationLink = `${getAppBaseUrl(request.url)}/accept-invite?token=${token}`;

        return new Response(
          JSON.stringify({
            ok: true,
            message: "Undangan staf admin berhasil dibuat tanpa pengiriman email.",
            token,
            activation_link: activationLink,
            data: {
              invitation_id: invitationId,
              nama,
              email,
              bengkel_id: resolvedBengkelId,
              token,
              status: "pending",
              expires_at: expiresAt,
              activation_link: activationLink,
            },
          }),
          { status: 201, headers: { "content-type": "application/json" } }
        );
      } catch (err: any) {
        return new Response(
          JSON.stringify({ ok: false, error: err?.message || "Terjadi kesalahan internal pada server." }),
          { status: 500, headers: { "content-type": "application/json" } }
        );
      }
    }

    // Endpoint POST: Verifikasi / Validasi aktivasi akun via token
    if (request.method === "POST" && (url.pathname === "/api/accept-invite" || url.pathname === "/api/invite/accept")) {
      try {
        const body = (await request.json().catch(() => ({}))) as Record<string, any>;
        const token = (body.token || "").trim();
        const password = body.password || "";

        if (!token) {
          return new Response(
            JSON.stringify({ ok: false, error: "Parameter token aktivasi wajib disertakan." }),
            { status: 400, headers: { "content-type": "application/json" } }
          );
        }

        if (!password || password.length < 8) {
          return new Response(
            JSON.stringify({ ok: false, error: "Kata sandi baru minimal 8 karakter." }),
            { status: 400, headers: { "content-type": "application/json" } }
          );
        }

        const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
        const authHeader = request.headers.get("Authorization") || request.headers.get("authorization");

        const { createClient } = await import("@supabase/supabase-js");
        const client = createClient(supabaseUrl, supabaseAnonKey, {
          global: authHeader ? { headers: { Authorization: authHeader } } : undefined,
          auth: { persistSession: false },
        });

        // Verifikasi keabsahan token
        const { data: invData, error: invError } = await client.rpc("get_invitation_by_token", {
          p_token: token,
        });

        if (invError) {
          return new Response(
            JSON.stringify({ ok: false, error: invError.message }),
            { status: 400, headers: { "content-type": "application/json" } }
          );
        }

        if (invData && typeof invData === "object" && invData.ok === false) {
          return new Response(
            JSON.stringify({ ok: false, error: invData.error || "Tautan undangan sudah tidak berlaku." }),
            { status: 400, headers: { "content-type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({
            ok: true,
            message: "Tautan undangan valid dan siap diaktifkan.",
            data: invData,
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      } catch (err: any) {
        return new Response(
          JSON.stringify({ ok: false, error: err?.message || "Terjadi kesalahan internal pada server." }),
          { status: 500, headers: { "content-type": "application/json" } }
        );
      }
    }

    // Endpoint POST: Upload & Simpan Gambar QRIS Bengkel
    if (request.method === "POST" && (url.pathname === "/api/upload/qris" || url.pathname === "/api/workshop/qris")) {
      try {
        const contentType = request.headers.get("content-type") || "";
        let workshopId = "bengkel-001";
        let fileBuffer: Buffer | null = null;
        let ext = "png";

        if (contentType.includes("multipart/form-data")) {
          const formData = await request.formData();
          const file = formData.get("file");
          const wbIdParam = formData.get("workshop_id") || formData.get("id_bengkel");
          if (wbIdParam) workshopId = wbIdParam.toString().trim();

          if (file && typeof file === "object" && "arrayBuffer" in file) {
            const ab = await (file as Blob).arrayBuffer();
            fileBuffer = Buffer.from(ab);
            const origName = (file as any).name || "";
            const matchedExt = origName.split(".").pop()?.toLowerCase();
            if (matchedExt && ["png", "jpg", "jpeg", "webp", "gif"].includes(matchedExt)) {
              ext = matchedExt === "jpeg" ? "jpg" : matchedExt;
            }
          }
        } else {
          const body = (await request.json().catch(() => ({}))) as Record<string, any>;
          const wbIdParam = body.workshop_id || body.id_bengkel;
          if (wbIdParam) workshopId = wbIdParam.toString().trim();

          const rawImage = body.image || body.qr_image_url || "";
          if (rawImage.startsWith("data:image/")) {
            const matches = rawImage.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
            if (matches) {
              const mimeSub = matches[1].toLowerCase();
              ext = mimeSub === "jpeg" ? "jpg" : mimeSub;
              fileBuffer = Buffer.from(matches[2], "base64");
            }
          }
        }

        if (!fileBuffer || fileBuffer.length === 0) {
          return new Response(
            JSON.stringify({ ok: false, error: "File gambar QRIS tidak ditemukan dalam request." }),
            { status: 400, headers: { "content-type": "application/json" } }
          );
        }

        const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
        const authHeader = request.headers.get("Authorization") || request.headers.get("authorization");

        const { createClient } = await import("@supabase/supabase-js");
        const client = createClient(supabaseUrl, supabaseAnonKey, {
          global: authHeader ? { headers: { Authorization: authHeader } } : undefined,
          auth: { persistSession: false },
        });

        // Verifikasi hak akses admin: pastikan workshopId identik dengan bengkel terdaftar admin
        const { data: authData } = await client.auth.getUser();
        const callerUserId = authData?.user?.id;
        if (callerUserId) {
          const { data: callerProf } = await client
            .from("profiles")
            .select("role, id_bengkel, workshop_id")
            .eq("id", callerUserId)
            .maybeSingle();

          if (callerProf?.role === "admin") {
            const registeredBengkelId = callerProf.workshop_id || callerProf.id_bengkel;
            if (registeredBengkelId && workshopId !== registeredBengkelId) {
              return new Response(
                JSON.stringify({
                  ok: false,
                  error: "Akses ditolak: Admin hanya berhak mengelola rekening bengkel tempat ia terdaftar.",
                }),
                { status: 403, headers: { "content-type": "application/json" } }
              );
            }
            if (registeredBengkelId) {
              workshopId = registeredBengkelId;
            }
          }
        }

        const fs = await import("node:fs");
        const path = await import("node:path");

        const uploadsDir = path.join(process.cwd(), "public", "uploads", "qris");
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const timestamp = Date.now();
        const filename = `qris-${workshopId}-${timestamp}.${ext}`;
        const latestFilename = `qris-${workshopId}.${ext}`;
        const filePath = path.join(uploadsDir, filename);
        const latestFilePath = path.join(uploadsDir, latestFilename);

        fs.writeFileSync(filePath, fileBuffer);
        fs.writeFileSync(latestFilePath, fileBuffer);

        const publicUrl = `/uploads/qris/${filename}`;

        // Simpan metadata JSON ke disk
        const metaPath = path.join(uploadsDir, `qris-${workshopId}.json`);
        fs.writeFileSync(
          metaPath,
          JSON.stringify({
            workshop_id: workshopId,
            id_bengkel: workshopId,
            url: publicUrl,
            updated_at: new Date().toISOString(),
          }, null, 2)
        );

        // 1. Update/Insert ke workshop_payment_accounts
        try {
          const { data: existingQris } = await client
            .from("workshop_payment_accounts")
            .select("id")
            .eq("account_type", "qris")
            .or(`workshop_id.eq.${workshopId},id_bengkel.eq.${workshopId}`)
            .limit(1)
            .maybeSingle();

          if (existingQris?.id) {
            await client
              .from("workshop_payment_accounts")
              .update({
                qr_image_url: publicUrl,
                is_active: true,
                updated_at: new Date().toISOString(),
              })
              .eq("id", existingQris.id);
          } else {
            await client
              .from("workshop_payment_accounts")
              .insert({
                id: crypto.randomUUID(),
                workshop_id: workshopId,
                id_bengkel: workshopId,
                account_type: "qris",
                provider: "MANUAL",
                provider_account_id: "qris-manual",
                qr_image_url: publicUrl,
                display_name: "QRIS Bengkel",
                is_active: true,
                status: "active",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              });
          }
        } catch (dbErr) {
          console.warn("DB update workshop_payment_accounts error (non-fatal):", dbErr);
        }

        // 2. Coba update ke bengkel jika ada kolom
        try {
          await client
            .from("bengkel")
            .update({
              qris_image_url: publicUrl,
              updated_at: new Date().toISOString(),
            } as any)
            .eq("id_bengkel", workshopId);
        } catch {}

        return new Response(
          JSON.stringify({
            ok: true,
            message: "Gambar QRIS berhasil di-upload dan disimpan.",
            url: publicUrl,
            id_bengkel: workshopId,
            timestamp,
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      } catch (err: any) {
        return new Response(
          JSON.stringify({ ok: false, error: err?.message || "Gagal mengupload QRIS." }),
          { status: 500, headers: { "content-type": "application/json" } }
        );
      }
    }

    // Endpoint POST: Upload Bukti Pembayaran Pelanggan (QRIS / Transfer)
    if (request.method === "POST" && (url.pathname === "/api/upload/bukti" || url.pathname === "/api/pembayaran/upload-bukti")) {
      try {
        const contentType = request.headers.get("content-type") || "";
        let workshopId = "bengkel-001";
        let noTransaksi = "TRX";
        let ext = "jpg";
        let fileBuffer: Buffer | null = null;

        if (contentType.includes("multipart/form-data")) {
          const formData = await request.formData();
          const file = formData.get("file");
          const wbIdParam = formData.get("workshop_id") || formData.get("id_bengkel");
          if (wbIdParam) workshopId = wbIdParam.toString().trim();
          const trxParam = formData.get("no_transaksi") || formData.get("nomor_transaksi");
          if (trxParam) noTransaksi = trxParam.toString().trim();

          if (file && typeof file === "object" && "arrayBuffer" in file) {
            const ab = await (file as Blob).arrayBuffer();
            fileBuffer = Buffer.from(ab);
            const origName = (file as any).name || "";
            const matchedExt = origName.split(".").pop()?.toLowerCase();
            if (matchedExt && ["png", "jpg", "jpeg", "webp", "pdf"].includes(matchedExt)) {
              ext = matchedExt === "jpeg" ? "jpg" : matchedExt;
            }
          }
        } else {
          const body = (await request.json().catch(() => ({}))) as Record<string, any>;
          const wbIdParam = body.workshop_id || body.id_bengkel;
          if (wbIdParam) workshopId = wbIdParam.toString().trim();
          const trxParam = body.no_transaksi || body.nomor_transaksi;
          if (trxParam) noTransaksi = trxParam.toString().trim();

          const rawImage = body.image || body.bukti_url || "";
          if (rawImage.startsWith("data:")) {
            const matches = rawImage.match(/^data:([a-zA-Z0-9/+-]+);base64,(.+)$/);
            if (matches) {
              const mimeSub = matches[1].toLowerCase().split("/")[1] || "jpg";
              ext = mimeSub === "jpeg" ? "jpg" : mimeSub;
              fileBuffer = Buffer.from(matches[2], "base64");
            }
          }
        }

        if (!fileBuffer || fileBuffer.length === 0) {
          return new Response(
            JSON.stringify({ ok: false, error: "File bukti pembayaran tidak ditemukan dalam request." }),
            { status: 400, headers: { "content-type": "application/json" } }
          );
        }

        const fs = await import("node:fs");
        const path = await import("node:path");

        const uploadsDir = path.join(process.cwd(), "public", "uploads", "bukti");
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const timestamp = Date.now();
        const safeTrx = noTransaksi.replace(/[^a-zA-Z0-9_-]/g, "_");
        const filename = `bukti-${safeTrx}-${timestamp}.${ext}`;
        const filePath = path.join(uploadsDir, filename);

        fs.writeFileSync(filePath, fileBuffer);

        const publicUrl = `/uploads/bukti/${filename}`;

        return new Response(
          JSON.stringify({
            ok: true,
            message: "Bukti pembayaran berhasil di-upload.",
            url: publicUrl,
            timestamp,
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      } catch (err: any) {
        return new Response(
          JSON.stringify({ ok: false, error: err?.message || "Gagal mengupload bukti pembayaran." }),
          { status: 500, headers: { "content-type": "application/json" } }
        );
      }
    }

    // Endpoint GET: Ambil QRIS Bengkel Aktif (Strict per-workshop isolation)
    if (request.method === "GET" && url.pathname === "/api/workshop/qris") {
      try {
        let workshopId = url.searchParams.get("id_bengkel") || url.searchParams.get("workshop_id") || "bengkel-001";
        const authHeader = request.headers.get("Authorization") || request.headers.get("authorization");
        if (authHeader) {
          try {
            const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
            const { createClient } = await import("@supabase/supabase-js");
            const client = createClient(supabaseUrl, supabaseAnonKey, {
              global: { headers: { Authorization: authHeader } },
              auth: { persistSession: false },
            });
            const { data: authData } = await client.auth.getUser();
            if (authData?.user?.id) {
              const { data: prof } = await client.from("profiles").select("role, id_bengkel, workshop_id").eq("id", authData.user.id).maybeSingle();
              if (prof?.role === "admin") {
                const registered = prof.workshop_id || prof.id_bengkel;
                if (registered) workshopId = registered;
              }
            }
          } catch {}
        }
        const fs = await import("node:fs");
        const path = await import("node:path");

        let qrisUrl: string | null = null;
        let isActive = true;
        let updatedAt = new Date().toISOString();

        // 1. Cek metadata file lokal
        const uploadsDir = path.join(process.cwd(), "public", "uploads", "qris");
        const metaPath = path.join(uploadsDir, `qris-${workshopId}.json`);
        if (fs.existsSync(metaPath)) {
          try {
            const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
            if (meta?.url) {
              qrisUrl = meta.url;
              if (meta.updated_at) updatedAt = meta.updated_at;
            }
          } catch {}
        }

        // Cek file gambar latest jika metadata tidak ada
        if (!qrisUrl) {
          for (const ext of ["png", "jpg", "jpeg", "webp"]) {
            const checkFile = path.join(uploadsDir, `qris-${workshopId}.${ext}`);
            if (fs.existsSync(checkFile)) {
              qrisUrl = `/uploads/qris/qris-${workshopId}.${ext}`;
              break;
            }
          }
        }

        // 2. Cek ke Supabase database (strict workshop query)
        const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
        const { createClient } = await import("@supabase/supabase-js");
        const client = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });

        try {
          const { data: qrisRow } = await client
            .from("workshop_payment_accounts")
            .select("qr_image_url, is_active, updated_at")
            .eq("account_type", "qris")
            .or(`workshop_id.eq.${workshopId},id_bengkel.eq.${workshopId}`)
            .limit(1)
            .maybeSingle();

          if (qrisRow?.qr_image_url) {
            // Gunakan gambar dari Supabase jika lebih baru atau jika lokal kosong
            qrisUrl = qrisRow.qr_image_url;
            isActive = qrisRow.is_active ?? true;
            if (qrisRow.updated_at) updatedAt = qrisRow.updated_at;
          }
        } catch {}

        return new Response(
          JSON.stringify({
            ok: Boolean(qrisUrl),
            id_bengkel: workshopId,
            qris_url: qrisUrl,
            is_active: isActive,
            updated_at: updatedAt,
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      } catch (err: any) {
        return new Response(
          JSON.stringify({ ok: false, error: err?.message }),
          { status: 500, headers: { "content-type": "application/json" } }
        );
      }
    }

    // Handler serve file statis upload (QRIS, Bukti Pembayaran, dll)
    if (request.method === "GET" && url.pathname.startsWith("/uploads/")) {
      try {
        const fs = await import("node:fs");
        const path = await import("node:path");
        const filePath = path.join(process.cwd(), "public", url.pathname);
        if (fs.existsSync(filePath)) {
          const ext = url.pathname.split(".").pop()?.toLowerCase();
          const mimeTypes: Record<string, string> = {
            png: "image/png",
            jpg: "image/jpeg",
            jpeg: "image/jpeg",
            webp: "image/webp",
            gif: "image/gif",
            pdf: "application/pdf",
          };
          const contentType = mimeTypes[ext || "png"] || "image/png";
          const buffer = fs.readFileSync(filePath);
          return new Response(buffer, {
            status: 200,
            headers: {
              "content-type": contentType,
              "cache-control": "no-cache, must-revalidate",
            },
          });
        }
      } catch {}
    }

    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
