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

async function listRpcs() {
  const rpcs = [
    "handle_new_user",
    "is_super_admin",
    "approve_workshop_application",
    "reject_workshop_application",
    "create_admin_invitation",
    "get_invitation_by_token",
    "claim_admin_invitation",
    "update_qris",
    "save_qris",
    "set_qris",
    "save_workshop_payment_account",
  ];

  for (const rpc of rpcs) {
    const { data, error } = await client.rpc(rpc, {});
    console.log(`RPC ${rpc}:`, error ? error.message : "EXISTS (or executed)");
  }
}

listRpcs();
