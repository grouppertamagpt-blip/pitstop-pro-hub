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

const anonClient = createClient(url, anonKey);
const adminClient = serviceKey ? createClient(url, serviceKey) : anonClient;

async function testInsert() {
  console.log("--- TEST INSERT ANON CLIENT ---");
  const testId = crypto.randomUUID();
  const payload = {
    id: testId,
    workshop_id: "bengkel-2307",
    id_bengkel: "bengkel-2307",
    account_type: "qris",
    provider: "MANUAL",
    provider_account_id: "qris-manual",
    qr_image_url: "https://example.com/test-qris.png",
    display_name: "QRIS Fandi Motor",
    is_active: true,
    status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data: anonRes, error: anonErr } = await anonClient
    .from("workshop_payment_accounts")
    .insert(payload)
    .select();
  console.log("Anon insert error:", anonErr);
  console.log("Anon insert data:", anonRes);

  if (anonErr) {
    console.log("--- TEST INSERT ADMIN CLIENT ---");
    const { data: adminRes, error: adminErr } = await adminClient
      .from("workshop_payment_accounts")
      .insert(payload)
      .select();
    console.log("Admin insert error:", adminErr);
    console.log("Admin insert data:", adminRes);
  }
}

testInsert();
