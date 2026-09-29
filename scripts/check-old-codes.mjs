import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = readFileSync(".env", "utf8");
const url = env.match(/^VITE_SUPABASE_URL=(.+)$/m)[1].trim();
const key = env.match(/^VITE_SUPABASE_ANON_KEY=(.+)$/m)[1].trim();
const sb = createClient(url, key);

async function checkOldCodes() {
  const { data: riw } = await sb.from("riwayat_stok").select("id_riwayat_stok, keterangan").ilike("keterangan", "%OIL-%");
  console.log("riwayat_stok with OIL-:", riw?.length || 0);

  const { data: pemb } = await sb.from("pembelian_sparepart").select("id_pembelian_sparepart, nomor_pembelian");
  console.log("pembelian_sparepart count:", pemb?.length || 0);
}

checkOldCodes();
