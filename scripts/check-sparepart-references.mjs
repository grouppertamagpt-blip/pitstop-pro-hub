import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = readFileSync(".env", "utf8");
const url = env.match(/^VITE_SUPABASE_URL=(.+)$/m)[1].trim();
const key = env.match(/^VITE_SUPABASE_ANON_KEY=(.+)$/m)[1].trim();
const sb = createClient(url, key);

async function checkReferences() {
  const tables = ["detail_servis", "penggunaan_sparepart", "pembelian_sparepart", "retur_sparepart", "riwayat_stok"];
  for (const t of tables) {
    const { data, error } = await sb.from(t).select("*").limit(3);
    if (error) {
      console.log(t, "error:", error.message);
    } else {
      console.log(t, "columns:", data.length > 0 ? Object.keys(data[0]) : "empty table");
    }
  }
}

checkReferences();
