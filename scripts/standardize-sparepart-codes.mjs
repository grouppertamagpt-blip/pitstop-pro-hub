import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = readFileSync(".env", "utf8");
const url = env.match(/^VITE_SUPABASE_URL=(.+)$/m)[1].trim();
const key = env.match(/^VITE_SUPABASE_ANON_KEY=(.+)$/m)[1].trim();
const sb = createClient(url, key);

const mapping = [
  { id: "sp-001", kode: "SP-001", nama: "Oli Mesin AHM MPX2 0.8L" },
  { id: "sp-005", kode: "SP-002", nama: "Oli Gardan AHM 120ml" },
  { id: "sp-003", kode: "SP-003", nama: "Busi NGK Laser Iridium" },
  { id: "sp-002", kode: "SP-004", nama: "Filter Udara Honda Matic" },
  { id: "sp-004", kode: "SP-005", nama: "Kampas Rem Depan Nissin" },
  { id: "sp-006", kode: "SP-006", nama: "V-Belt Kit Yamaha NMAX Original" },
];

async function updateCodes() {
  console.log("Standardizing sparepart codes in Supabase...");
  for (const item of mapping) {
    const { data, error } = await sb
      .from("sparepart")
      .update({
        kode: item.kode,
        nama: item.nama,
        nama_sparepart: item.nama,
        updated_at: new Date().toISOString()
      })
      .eq("id_sparepart", item.id)
      .select("id_sparepart, kode, nama");
    if (error) {
      console.error("Error updating", item.id, error);
    } else {
      console.log("Updated:", data[0]);
    }
  }

  const { data: allParts } = await sb.from("sparepart").select("id_sparepart, kode, nama").order("kode", { ascending: true });
  console.log("\nFinal spareparts in database:");
  console.table(allParts);
}

updateCodes();
