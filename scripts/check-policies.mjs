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

async function checkPolicies() {
  const { data, error } = await client.rpc("exec_sql", { sql: "SELECT * FROM pg_policies WHERE tablename = 'workshop_payment_accounts';" });
  console.log("rpc exec_sql:", data, error);
}

checkPolicies();
