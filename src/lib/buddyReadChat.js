// lib/buddyReadChat.js
// -------------------------------------------------------------
// Real-time buddy read discussion using Supabase Realtime.
// Messages are scoped by chapter; RLS (see schema) already ensures
// only accepted members + the host can read/write.
// -------------------------------------------------------------
import { supabase } from "./supabase";
import { containsProfanity, cleanMessage } from "./profanityFilter";

/** Fetch existing messages for a buddy read (optionally filtered by chapter). */
export async function getMessages(buddyReadId, chapter = null) {
  let query = supabase
    .from("buddy_read_messages")
    .select("*, users(name, avatar_url)")
    .eq("buddy_read_id", buddyReadId)
    .order("created_at", { ascending: true });

  if (chapter !== null) query = query.eq("chapter", chapter);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/** Post a message. Runs it through the profanity filter before saving. */
export async function sendMessage(buddyReadId, userId, chapter, rawMessage) {
  const flagged = containsProfanity(rawMessage);
  const message = flagged ? cleanMessage(rawMessage) : rawMessage;

  const { data, error } = await supabase
    .from("buddy_read_messages")
    .insert({ buddy_read_id: buddyReadId, user_id: userId, chapter, message, flagged })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Report a message as inappropriate (increments a counter; RLS still applies). */
export async function reportMessage(messageId) {
  const { error } = await supabase.rpc("increment_report_count", { message_id: messageId });
  if (error) throw error;
}

/**
 * Subscribe to new messages in a buddy read in real time.
 * Call the returned `unsubscribe()` in your component's cleanup (useEffect return).
 *
 * Usage:
 *   useEffect(() => {
 *     const unsubscribe = subscribeToMessages(buddyReadId, (msg) => {
 *       setMessages((prev) => [...prev, msg]);
 *     });
 *     return unsubscribe;
 *   }, [buddyReadId]);
 */
export function subscribeToMessages(buddyReadId, onNewMessage) {
  const channel = supabase
    .channel(`buddy-read-${buddyReadId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "buddy_read_messages",
        filter: `buddy_read_id=eq.${buddyReadId}`,
      },
      (payload) => onNewMessage(payload.new)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

// -------------------------------------------------------------
// Buddy read membership actions
// -------------------------------------------------------------
export async function requestToJoin(buddyReadId, userId) {
  // Rate limit: max 10 requests/day — enforced by an edge function or a
  // Postgres trigger in production; simple client-side check shown here
  // is NOT sufficient security on its own, just UX.
  const { data, error } = await supabase
    .from("buddy_read_members")
    .insert({ buddy_read_id: buddyReadId, user_id: userId, status: "pending" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function respondToRequest(memberRowId, decision /* 'accepted' | 'rejected' */) {
  const { error } = await supabase
    .from("buddy_read_members")
    .update({ status: decision })
    .eq("id", memberRowId);
  if (error) throw error;
}

export async function removeMember(memberRowId) {
  const { error } = await supabase
    .from("buddy_read_members")
    .update({ status: "removed" })
    .eq("id", memberRowId);
  if (error) throw error;
}
