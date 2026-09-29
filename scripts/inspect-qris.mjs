import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = readFileSync(".env", "utf8");
const getEnv = (key) => {
  const match = env.match(new RegExp(`^${key}=(.+)$`, "m"));
  return match ? match[1].trim() : null;
};

const url = getEnv("VITE_SUPABASE_URL");
const anonKey = getEnv("VITE_SUPABASE_ANON_KEY");
const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

const client = createClient(url, serviceKey || anonKey);

async function inspect() {
  console.log("=== 1. CHECK BENGKEL COLUMNS & DATA ===");
  const { data: bengkels, error: bErr } = await client.from("bengkel").select("*").limit(5);
  console.log("bengkel err:", bErr);
  console.log("bengkel sample keys:", bengkels && bengkels[0] ? Object.keys(bengkels[0]) : []);
  console.log("bengkel sample data:", bengkels);

  console.log("\n=== 2. CHECK WORKSHOP_PAYMENT_ACCOUNTS ===");
  const { data: wpa, error: wpaErr } = await client.from("workshop_payment_accounts").select("*").limit(5);
  console.log("workshop_payment_accounts err:", wpaErr);
  console.log("workshop_payment_accounts sample:", wpa);

  console.log("\n=== 3. CHECK PENGATURAN_PEMBAYARAN ===");
  const { data: pp, error: ppErr } = await client.from("pengaturan_pembayaran").select("*").limit(5);
  console.log("pengaturan_pembayaran err:", ppErr);
  console.log("pengaturan_pembayaran sample:", pp);

  console.log("\n=== 4. CHECK STORAGE BUCKETS ===");
  const { data: buckets, error: bckErr } = await client.storage.listBuckets();
  console.log("storage buckets err:", bckErr);
  console.log("storage buckets:", buckets);

  console.log("\n=== 5. CHECK SERVIS FOR TRX-2026-0019 ===");
  const { data: srvList, error: srvErr } = await client.from("servis").select("*").or("nomor_servis.ilike.%0019%,id_servis.ilike.%0019%");
  console.log("servis err:", srvErr);
  console.log("servis matches:", srvList);
}

inspect();
