import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const supabase = createClient(
  "https://rkmagkdredobeexuctvr.supabase.co",
  "sb_publishable_iB1KJjbVw2flVNH3wpNaqQ_U1fHMW1t"
);

export const paths = {
  yearbook: "yearbook",
  truths: "truths",
  slot: "slot",
  emoji: "emoji"
};

// The classroom flow uses the publishable key plus narrow table policies; no student login is required.
export const ensureConnection = () => Promise.resolve();
export const id = prefix => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const activityRows = async activity => {
  const { data, error } = await supabase.from("activity_items").select("item_id,payload").eq("activity", activity);
  if (error) throw error;
  return Object.fromEntries((data || []).map(row => [row.item_id, row.payload]));
};

// Every live view on this page, so a change made here (or a wake-up) can refresh them at once.
const refreshers = new Map(); // activity name -> Set of refresh functions
const poke = activity => refreshers.get(activity)?.forEach(fn => fn());
const pokeAll = () => refreshers.forEach(set => set.forEach(fn => fn()));
if (typeof document !== "undefined") {
  // Realtime events can be missed while a phone sleeps or the Wi-Fi drops, so re-read on wake-up.
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") pokeAll(); });
  window.addEventListener("online", pokeAll);
}

// Re-reads data and passes it on, ignoring answers that arrive after a newer one, and repeats.
function freshReader(read, callback) {
  let asked = 0;
  let shown = 0;
  let last = "";
  return async () => {
    const mine = ++asked;
    let value;
    try { value = await read(); } catch { return; }
    if (mine < shown) return;
    shown = mine;
    const text = JSON.stringify(value);
    if (text === last) return;
    last = text;
    callback(value);
  };
}

export const listen = async (activity, callback) => {
  await ensureConnection();
  const first = await activityRows(activity);
  const refresh = freshReader(() => activityRows(activity), callback);
  callback(first);
  const set = refreshers.get(activity) || new Set();
  set.add(refresh);
  refreshers.set(activity, set);
  const channel = supabase.channel(`activity-${activity}-${Math.random()}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "activity_items", filter: `activity=eq.${activity}` }, refresh)
    // Supabase can't filter DELETE events, so listen to all deletes and keep the ones for this activity.
    .on("postgres_changes", { event: "DELETE", schema: "public", table: "activity_items" }, payload => {
      if (!payload?.old?.activity || payload.old.activity === activity) refresh();
    })
    .subscribe(status => { if (status === "SUBSCRIBED") refresh(); });
  return { unsubscribe() { set.delete(refresh); channel.unsubscribe(); } };
};

export const write = async (path, value) => {
  await ensureConnection();
  const [activity, itemId] = String(path).split("/");
  const { error } = await supabase.from("activity_items").upsert({ activity, item_id: itemId || "root", payload: value });
  if (error) throw error;
  poke(activity);
};

export const removeAt = async path => {
  await ensureConnection();
  const [activity, itemId] = String(path).split("/");
  const { error } = await supabase.from("activity_items").delete().eq("activity", activity).eq("item_id", itemId);
  if (error) throw error;
  poke(activity);
};

export const updateAt = async (path, value) => {
  await ensureConnection();
  const [activity, itemId] = String(path).split("/");
  const { data, error: readError } = await supabase.from("activity_items").select("payload").eq("activity", activity).eq("item_id", itemId).single();
  if (readError) throw readError;
  const { error } = await supabase.from("activity_items").update({ payload: { ...data.payload, ...value } }).eq("activity", activity).eq("item_id", itemId);
  if (error) throw error;
  poke(activity);
};

// Deletes every row for one activity (used by "Clear board" and "Clear names").
export const removeActivity = async activity => {
  await ensureConnection();
  const { error } = await supabase.from("activity_items").delete().eq("activity", activity);
  if (error) throw error;
  poke(activity);
};

// Saves several rows for one activity in a single request. rows: { itemId: payload }
export const writeMany = async (activity, rows) => {
  await ensureConnection();
  const list = Object.entries(rows).map(([item_id, payload]) => ({ activity, item_id, payload }));
  if (!list.length) return;
  const { error } = await supabase.from("activity_items").upsert(list);
  if (error) throw error;
  poke(activity);
};

export const makeCode = () => Math.random().toString(36).slice(2, 6).toUpperCase();

export const createSession = async (game, code) => {
  await ensureConnection();
  const { error } = await supabase.from("game_sessions").insert({ code, game, status: "lobby" });
  if (error) throw error;
  return code;
};

export const listenSession = async (code, callback) => {
  await ensureConnection();
  const read = async () => {
    const [{ data: session, error: sessionError }, { data: players, error: playersError }] = await Promise.all([
      supabase.from("game_sessions").select("*").eq("code", code).maybeSingle(),
      supabase.from("game_players").select("*").eq("session_code", code).order("joined_at")
    ]);
    if (sessionError || playersError) throw sessionError || playersError;
    return { ...(session || {}), players: Object.fromEntries((players || []).map(player => [player.id, player])) };
  };
  const first = await read();
  const refresh = freshReader(read, callback);
  callback(first);
  const key = `session:${code}`;
  const set = refreshers.get(key) || new Set();
  set.add(refresh);
  refreshers.set(key, set);
  const channel = supabase.channel(`session-${code}-${Math.random()}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "game_sessions", filter: `code=eq.${code}` }, refresh)
    .on("postgres_changes", { event: "*", schema: "public", table: "game_players", filter: `session_code=eq.${code}` }, refresh)
    .subscribe(status => { if (status === "SUBSCRIBED") refresh(); });
  return { unsubscribe() { set.delete(refresh); channel.unsubscribe(); } };
};

export const setSessionStatus = async (code, status) => {
  await ensureConnection();
  const { error } = await supabase.from("game_sessions").update({ status }).eq("code", code);
  if (error) throw error;
  poke(`session:${code}`);
};

export const joinSession = async (code, player) => {
  await ensureConnection();
  const { error } = await supabase.from("game_players").upsert({ id: player.id, session_code: code, name: player.name, picks: 0 });
  if (error) throw error;
  poke(`session:${code}`);
};
