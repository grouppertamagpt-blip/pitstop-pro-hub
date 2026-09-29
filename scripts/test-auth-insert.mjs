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

async function testAuthInsert() {
  const { data: auth, error: authErr } = await client.auth.signInWithPassword({
    email: "admin@bengkel.com",
    password: "admin123",
  });
  console.log("Login admin@bengkel.com:", auth?.user?.id, authErr);

  if (auth?.user) {
    const payload = {
      id: crypto.randomUUID(),
      workshop_id: "bengkel-001",
      id_bengkel: "bengkel-001",
      account_type: "bank_transfer",
      provider: "MANUAL",
      provider_account_id: "manual",
      bank_name: "BCA Test",
      account_number: "123456",
      account_holder_name: "Test",
      display_name: "BCA - 123456",
      is_active: true,
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const { data: insData, error: insErr } = await client
      .from("workshop_payment_accounts")
      .insert(payload)
      .select();
    console.log("Insert as authenticated user bengkel-001:", insData, insErr);
  }
}

testAuthInsert();
