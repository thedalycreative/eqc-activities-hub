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

export const listen = async (activity, callback) => {
  await ensureConnection();
  callback(await activityRows(activity));
  return supabase.channel(`activity-${activity}-${Math.random()}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "activity_items", filter: `activity=eq.${activity}` }, async () => callback(await activityRows(activity)))
    .subscribe();
};

export const write = async (path, value) => {
  await ensureConnection();
  const [activity, itemId] = String(path).split("/");
  const { error } = await supabase.from("activity_items").upsert({ activity, item_id: itemId || "root", payload: value });
  if (error) throw error;
};

export const removeAt = async path => {
  await ensureConnection();
  const [activity, itemId] = String(path).split("/");
  const { error } = await supabase.from("activity_items").delete().eq("activity", activity).eq("item_id", itemId);
  if (error) throw error;
};

export const updateAt = async (path, value) => {
  await ensureConnection();
  const [activity, itemId] = String(path).split("/");
  const { data, error: readError } = await supabase.from("activity_items").select("payload").eq("activity", activity).eq("item_id", itemId).single();
  if (readError) throw readError;
  const { error } = await supabase.from("activity_items").update({ payload: { ...data.payload, ...value } }).eq("activity", activity).eq("item_id", itemId);
  if (error) throw error;
};

// Deletes every row for one activity (used by "Clear board" and "Clear names").
export const removeActivity = async activity => {
  await ensureConnection();
  const { error } = await supabase.from("activity_items").delete().eq("activity", activity);
  if (error) throw error;
};

// Saves several rows for one activity in a single request. rows: { itemId: payload }
export const writeMany = async (activity, rows) => {
  await ensureConnection();
  const list = Object.entries(rows).map(([item_id, payload]) => ({ activity, item_id, payload }));
  if (!list.length) return;
  const { error } = await supabase.from("activity_items").upsert(list);
  if (error) throw error;
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
  const refresh = async () => {
    const [{ data: session, error: sessionError }, { data: players, error: playersError }] = await Promise.all([
      supabase.from("game_sessions").select("*").eq("code", code).maybeSingle(),
      supabase.from("game_players").select("*").eq("session_code", code).order("joined_at")
    ]);
    if (sessionError || playersError) throw sessionError || playersError;
    callback({ ...(session || {}), players: Object.fromEntries((players || []).map(player => [player.id, player])) });
  };
  await refresh();
  return supabase.channel(`session-${code}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "game_sessions", filter: `code=eq.${code}` }, refresh)
    .on("postgres_changes", { event: "*", schema: "public", table: "game_players", filter: `session_code=eq.${code}` }, refresh)
    .subscribe();
};

export const setSessionStatus = async (code, status) => {
  await ensureConnection();
  const { error } = await supabase.from("game_sessions").update({ status }).eq("code", code);
  if (error) throw error;
};

export const joinSession = async (code, player) => {
  await ensureConnection();
  const { error } = await supabase.from("game_players").upsert({ id: player.id, session_code: code, name: player.name, picks: 0 });
  if (error) throw error;
};
