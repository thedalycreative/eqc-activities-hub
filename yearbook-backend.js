import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient("https://rkmagkdredobeexuctvr.supabase.co", "sb_publishable_iB1KJjbVw2flVNH3wpNaqQ_U1fHMW1t");
const rows = async () => {
  const { data, error } = await supabase.from("activity_items").select("item_id,payload").eq("activity", "yearbook");
  if (error) throw error;
  return Object.fromEntries((data || []).map(row => [row.item_id, row.payload]));
};
const keyFromPath = path => String(path).split("/").pop();
const makeSnapshot = value => ({ val: () => value });

export const yearbookBackend = {
  db: supabase,
  ref: (_db, path) => path,
  async set(path, value) {
    if (value === null) {
      const { error } = await supabase.from("activity_items").delete().eq("activity", "yearbook");
      if (error) throw error;
      return;
    }
    const itemId = keyFromPath(path);
    const { error } = await supabase.from("activity_items").upsert({ activity: "yearbook", item_id: itemId === "tiles" ? "root" : itemId, payload: value });
    if (error) throw error;
  },
  async remove(path) {
    const { error } = await supabase.from("activity_items").delete().eq("activity", "yearbook").eq("item_id", keyFromPath(path));
    if (error) throw error;
  },
  async onValue(path, callback) {
    const load = async () => callback(makeSnapshot(await rows()));
    await load();
    return supabase.channel("yearbook-wall-live").on("postgres_changes", { event: "*", schema: "public", table: "activity_items", filter: "activity=eq.yearbook" }, load).subscribe();
  }
};
