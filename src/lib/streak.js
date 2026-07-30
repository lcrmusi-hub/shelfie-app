// lib/streak.js
import { supabase } from "./supabase";

/** Call this whenever the user updates reading progress on a book. */
export async function logReadingSession(userId, bookId, pagesRead) {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // One row per user per day per book — if today's row already exists, add to it instead of duplicating.
  const { data: existing } = await supabase
    .from("reading_sessions")
    .select("id, pages_read")
    .eq("user_id", userId)
    .eq("book_id", bookId)
    .eq("date", today)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("reading_sessions")
      .update({ pages_read: existing.pages_read + Math.max(pagesRead, 0) })
      .eq("id", existing.id);
  } else {
    await supabase
      .from("reading_sessions")
      .insert({ user_id: userId, book_id: bookId, pages_read: Math.max(pagesRead, 0), date: today });
  }
}

/**
 * Returns the user's current consecutive-day reading streak.
 * A streak counts today (or yesterday, so it doesn't reset the moment
 * the clock ticks past midnight) plus every unbroken day before that
 * with at least one reading session.
 */
export async function getStreak(userId) {
  const { data, error } = await supabase
    .from("reading_sessions")
    .select("date")
    .eq("user_id", userId)
    .order("date", { ascending: false });

  if (error || !data || data.length === 0) return 0;

  const uniqueDates = [...new Set(data.map((r) => r.date))].sort().reverse();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const mostRecent = new Date(uniqueDates[0] + "T00:00:00");
  const dayDiff = Math.round((today - mostRecent) / 86400000);

  if (dayDiff > 1) return 0; // most recent session was more than a day ago — streak is broken

  let streak = 1;
  let cursor = mostRecent;
  for (let i = 1; i < uniqueDates.length; i++) {
    const prev = new Date(uniqueDates[i] + "T00:00:00");
    const diff = Math.round((cursor - prev) / 86400000);
    if (diff === 1) {
      streak++;
      cursor = prev;
    } else {
      break;
    }
  }
  return streak;
}
