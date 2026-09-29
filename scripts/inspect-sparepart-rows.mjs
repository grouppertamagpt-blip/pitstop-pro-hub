import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = readFileSync(".env", "utf8");
const url = env.match(/^VITE_SUPABASE_URL=(.+)$/m)[1].trim();
const key = env.match(/^VITE_SUPABASE_ANON_KEY=(.+)$/m)[1].trim();
const sb = createClient(url, key);

async function run() {
  const { data, error } = await sb
    .from("sparepart")
    .select("id_sparepart, kode, nama, nama_sparepart, kategori, satuan, harga, stok, stok_minimum, status_stok");
  if (error) {
    console.error(error);
  } else {
    console.log("Found", data.length, "spareparts in DB:");
    console.table(data);
  }
}

run();
