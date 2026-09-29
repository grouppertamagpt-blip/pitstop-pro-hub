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

async function inspectAll() {
  const { data: allWpa } = await client.from("workshop_payment_accounts").select("id, workshop_id, id_bengkel, account_type, qr_image_url, updated_at, created_at");
  console.log("ALL WPA:", allWpa?.map(x => ({
    id: x.id,
    workshop_id: x.workshop_id,
    id_bengkel: x.id_bengkel,
    account_type: x.account_type,
    qr_img_len: x.qr_image_url ? x.qr_image_url.length : 0,
    qr_img_start: x.qr_image_url ? x.qr_image_url.slice(0, 50) : null,
    updated_at: x.updated_at
  })));

  // Check columns of bengkel
  const { data: bList } = await client.from("bengkel").select("*");
  console.log("BENGKEL LIST:", bList);

  // Check admin user for Fandi Nasir
  const { data: admins } = await client.from("admin").select("*");
  console.log("ADMINS:", admins);

  const { data: owners } = await client.from("owner").select("*");
  console.log("OWNERS:", owners);

  const { data: profiles } = await client.from("profiles").select("*");
  console.log("PROFILES:", profiles);
}

inspectAll();
