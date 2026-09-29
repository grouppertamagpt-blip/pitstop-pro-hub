import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = readFileSync(".env", "utf8");
const getEnv = (key) => {
  const match = env.match(new RegExp(`^${key}=(.+)$`, "m"));
  return match ? match[1].trim() : null;
};

const url = getEnv("VITE_SUPABASE_URL");
const anonKey = getEnv("VITE_SUPABASE_ANON_KEY");
const client = createClient(url, anonKey);

async function testStorageAndTable() {
  console.log("1. Try creating bucket payment-assets with anonKey:");
  const { data: bData, error: bErr } = await client.storage.createBucket("payment-assets", { public: true });
  console.log("createBucket result:", bData, bErr);

  console.log("2. Check if column qris_image_url exists in bengkel:");
  const { data: bCol, error: bColErr } = await client.from("bengkel").select("qris_image_url").limit(1);
  console.log("select qris_image_url from bengkel:", bCol, bColErr);

  console.log("3. Check RLS policies on workshop_payment_accounts & bengkel:");
  // Let's test update bengkel with anon client
  const { data: upB, error: upBErr } = await client.from("bengkel").update({ updated_at: new Date().toISOString() }).eq("id_bengkel", "bengkel-2307").select();
  console.log("update bengkel err:", upBErr);
}

testStorageAndTable();
