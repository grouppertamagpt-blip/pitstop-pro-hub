import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = readFileSync(".env", "utf8");
const url = env.match(/^VITE_SUPABASE_URL=(.+)$/m)[1].trim();
const key = env.match(/^VITE_SUPABASE_ANON_KEY=(.+)$/m)[1].trim();
const sb = createClient(url, key);

async function inspectCSTickets() {
  const { data, error } = await sb.from("customer_service_tickets").select("*");
  if (error) {
    console.error("CS tickets error:", error);
  } else {
    console.log("Found", data.length, "tickets in DB:");
    console.table(data);
  }
}

inspectCSTickets();
